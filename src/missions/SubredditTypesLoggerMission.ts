import {IntervalMission} from "./IntervalMission";
import fs, {promises as fsp} from "fs";
import {topSubreddits} from "./topSubreddits";
import {getSubredditsAbout, RedditAuth} from "../redditApi";
import {SubredditDetails} from "../redditTypes";
import {sleep} from "../utils";

interface LoggedSubredditType {
	name: string;
	isNsfw: boolean;
	typeHistory: {
		time: number;
		type: "public" | "private" | "restricted" | "gold_only" | string;
	}[];
}

export class SubredditTypesLoggerMission extends IntervalMission {
	static readonly INTERVAL = 1000 * 60 * 10;
	static readonly saveFile = "subredditTypes.json";
	private readonly auth: RedditAuth;
	subreddits: {[subreddit: string]: LoggedSubredditType};

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
		while (remainingSubreddits.length > 0) {
			console.log(`Fetching... ${remainingSubreddits.length} remaining remaining`);
			const currentSubreddits = remainingSubreddits
				.splice(0, 100)
				.map(s => s.name);
			let subsInfo: SubredditDetails[];
			try {
				subsInfo = await getSubredditsAbout(this.auth, currentSubreddits);
			} catch (e) {
				console.log("Error fetching subreddits, waiting 30 seconds and trying again", e);
				await sleep(1000 * 30);
				try {
					subsInfo = await getSubredditsAbout(this.auth, currentSubreddits);
				} catch (e) {
					console.log("Failed again, skipping", e);
					continue;
				}
			}
			for (const subInfo of subsInfo) {
				const subName = subInfo.url.split("/")[2];
				let loggedSub: LoggedSubredditType;
				if (subName in this.subreddits)
					loggedSub = this.subreddits[subName];
				else {
					loggedSub = {
						name: subName,
						isNsfw: subInfo.over18,
						typeHistory: []
					};
					this.subreddits[subName] = loggedSub;
				}
				loggedSub.typeHistory.push({
					time: Date.now(),
					type: subInfo.subreddit_type
				});
			}
		}
		await this.saveToFile();
	}

	private async saveToFile() {
		const jsonStr = JSON.stringify(this.subreddits, null, "\t");
		await fsp.writeFile(SubredditTypesLoggerMission.saveFile, jsonStr);
	}

	private async loadFromFile() {
		const fileExists = fs.existsSync(SubredditTypesLoggerMission.saveFile);
		if (!fileExists) {
			this.subreddits = {};
			return;
		}
		const jsonStr = await fsp.readFile(SubredditTypesLoggerMission.saveFile, "utf8");
		this.subreddits = JSON.parse(jsonStr);
	}
}
