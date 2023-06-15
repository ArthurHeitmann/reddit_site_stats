import {IntervalMission} from "./IntervalMission";
import fs, {promises as fsp} from "fs";
import {topSubreddits, topSubredditsByName} from "./topSubreddits";
import {getSubredditsAbout, RedditAuth} from "../redditApi";
import {SubredditDetails} from "../redditTypes";
import {saveJsonSafely} from "../utils";
import {sleep} from "../sharedUtils";

export interface LoggedSubredditType_timestamps {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeHistory: {
		time: number;
		type: "public" | "private" | "restricted" | "gold_only" | string;
	}[];
}

export class SubredditTypesLoggerMission extends IntervalMission {
	static readonly INTERVAL = 1000 * 60 * 2.5;
	static readonly saveFile = "subredditTypes.json";
	private readonly auth: RedditAuth;
	subreddits: {[subreddit: string]: LoggedSubredditType_timestamps};

	constructor(auth: RedditAuth) {
		super(SubredditTypesLoggerMission.INTERVAL);
		this.auth = auth;
	}

	init(): Promise<void> {
		return this.loadFromFile();
	}

	async run() {
		console.log("Logging subreddit types")
		if (this.subreddits === undefined)
			await this.loadFromFile();
		let remainingSubreddits = Array.from(topSubreddits);
		const loadedSubInfos: SubredditDetails[] = [];
		while (remainingSubreddits.length > 0) {
			console.log(`Fetching... ${remainingSubreddits.length} subreddits remaining`);
			const currentSubreddits = remainingSubreddits
				.splice(0, 100)
				.map(s => s.name);
			let newSubsInfo: SubredditDetails[];
			try {
				newSubsInfo = await getSubredditsAbout(this.auth, currentSubreddits);
			} catch (e) {
				console.log("Error fetching subreddits, waiting 10 seconds and trying again", e);
				await sleep(1000 * 10);
				try {
					newSubsInfo = await getSubredditsAbout(this.auth, currentSubreddits);
				} catch (e) {
					console.log("Failed again, skipping", e);
					continue;
				}
			}
			loadedSubInfos.push(...newSubsInfo);
		}
		for (const subInfo of loadedSubInfos) {
			const subName = subInfo.url.split("/")[2];
			let loggedSub: LoggedSubredditType_timestamps;
			if (subName in this.subreddits) {
				loggedSub = this.subreddits[subName];
				// fix for previously missing subscribers
				if (loggedSub.subscribers === undefined) {
					loggedSub.subscribers = topSubredditsByName[subName]?.subscriberCount ?? subInfo.subscribers ?? 0;
				}
			}
			else {
				loggedSub = {
					name: subName,
					isNsfw: subInfo.over18 ?? topSubredditsByName[subName]?.over18,
					subscribers: topSubredditsByName[subName]?.subscriberCount ?? subInfo.subscribers ?? 0,
					typeHistory: []
				};
				this.subreddits[subName] = loggedSub;
			}
			loggedSub.typeHistory.push({
				time: Date.now(),
				type: subInfo.subreddit_type
			});
		}
		await this.saveToFile();
	}

	private async saveToFile() {
		await saveJsonSafely(this.subreddits, SubredditTypesLoggerMission.saveFile);
	}

	private async loadFromFile() {
		const fileExists = fs.existsSync(SubredditTypesLoggerMission.saveFile);
		if (!fileExists) {
			this.subreddits = {};
			return;
		}
		const jsonStr = await fsp.readFile(SubredditTypesLoggerMission.saveFile, "utf8");
		this.subreddits = JSON.parse(jsonStr);
		// fix for previously missing isNsfw in some subreddits
		for (const subName in this.subreddits) {
			if (typeof this.subreddits[subName].isNsfw === "boolean")
				continue;
			this.subreddits[subName].isNsfw = topSubredditsByName[subName]?.over18;
		}
	}
}
