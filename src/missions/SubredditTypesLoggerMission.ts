import {IntervalMission} from "./IntervalMission";
import fs, {promises as fsp} from "fs";
import {topSubreddits, topSubredditsByName} from "./topSubreddits";
import {getSubredditsAbout, RedditAuth} from "../redditApi";
import {SubredditDetails, SubredditType} from "../redditTypes";
import {saveJsonSafely} from "../utils";
import {sleep} from "../sharedUtils";

export interface LoggedSubredditType_timestamps {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeHistory: {
		time: number;
		type: "public" | "private" | "restricted" | "gold_only" | string;
		isNsfw?: boolean;
	}[];
}

export interface TypeSection {
	name: string;
	startTime: number;
	duration: number;
	type: SubredditType|string;
	isNsfw: boolean|null;
}
export interface LoggedSubredditType_sections {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeSections: TypeSection[];
}

export class SubredditTypesLoggerMission extends IntervalMission {
	static readonly INTERVAL = 1000 * 60 * 10;
	static readonly saveFile = "subredditTypes.json";
	private readonly auth: RedditAuth;
	subreddits: {[subreddit: string]: LoggedSubredditType_timestamps};
	subredditSections: {[subreddit: string]: LoggedSubredditType_sections};

	constructor(auth: RedditAuth) {
		super(SubredditTypesLoggerMission.INTERVAL);
		this.auth = auth;
	}

	async init(): Promise<void> {
		await this.loadFromFile();
		// avoid repeated work when restarting the server
		if (Object.values(this.subreddits).length > 0) {
			const firstSub = Object.values(this.subreddits)[0];
			if (firstSub.typeHistory.length > 0) {
				const lastType = firstSub.typeHistory[firstSub.typeHistory.length - 1];
				if (lastType.time > Date.now() - SubredditTypesLoggerMission.INTERVAL) {
					this.shouldRunAtStart = false;
				}
			}
		}
	}

	async run() {
		console.log("Logging subreddit types")
		if (this.subreddits === undefined)
			await this.loadFromFile();
		let remainingSubreddits = Array.from(topSubreddits);
		const loadedSubInfos: SubredditDetails[] = [];
		const fetchStartTime = Date.now();
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
		const now = Date.now();
		for (const subInfo of loadedSubInfos) {
			const subName = subInfo.url.split("/")[2];
			let loggedSub: LoggedSubredditType_timestamps;
			let loggedSubSections: LoggedSubredditType_sections;
			if (subName in this.subreddits) {
				loggedSub = this.subreddits[subName];
				loggedSubSections = this.subredditSections[subName];
				// fix for previously missing subscribers
				// if (loggedSub.subscribers === undefined) {
				// 	loggedSub.subscribers = topSubredditsByName[subName]?.subscriberCount ?? subInfo.subscribers ?? 0;
				// }
			}
			else {
				loggedSub = {
					name: subName,
					isNsfw: subInfo.over18 ?? topSubredditsByName[subName]?.over18,
					subscribers: topSubredditsByName[subName]?.subscriberCount ?? subInfo.subscribers ?? 0,
					typeHistory: []
				};
				loggedSubSections = {
					name: subName,
					isNsfw: subInfo.over18 ?? topSubredditsByName[subName]?.over18,
					subscribers: topSubredditsByName[subName]?.subscriberCount ?? subInfo.subscribers ?? 0,
					typeSections: []
				};
				this.subreddits[subName] = loggedSub;
				this.subredditSections[subName] = loggedSubSections;
			}
			loggedSub.typeHistory.push({
				time: fetchStartTime,
				type: subInfo.subreddit_type,
				isNsfw: subInfo.over18
			});
			if (loggedSubSections.typeSections.length > 0) {
				const lastSection = loggedSubSections.typeSections[loggedSubSections.typeSections.length - 1];
				lastSection.duration = fetchStartTime - lastSection.startTime;
				if (
					lastSection.type !== subInfo.subreddit_type ||
					Boolean(lastSection.isNsfw ?? loggedSubSections.isNsfw) !== Boolean(subInfo.over18 ?? loggedSubSections.isNsfw)
				) {
					loggedSubSections.typeSections.push({
						name: `r/${subName}`,
						startTime: fetchStartTime,
						duration: now - fetchStartTime,
						type: subInfo.subreddit_type,
						isNsfw: subInfo.over18
					});
				}
			}
			else {
				loggedSubSections.typeSections.push({
					name: `r/${subName}`,
					startTime: fetchStartTime,
					duration: now - fetchStartTime,
					type: subInfo.subreddit_type,
					isNsfw: subInfo.over18
				});
			}
		}
		console.log("Saving to file...")
		await this.saveToFile();
		console.log("Subreddit types logged")
	}

	private async saveToFile() {
		await saveJsonSafely(this.subreddits, SubredditTypesLoggerMission.saveFile);
	}

	private async loadFromFile() {
		const fileExists = fs.existsSync(SubredditTypesLoggerMission.saveFile);
		if (!fileExists) {
			this.subreddits = {};
			this.subredditSections = {};
			return;
		}
		const jsonStr = await fsp.readFile(SubredditTypesLoggerMission.saveFile, "utf8");
		this.subreddits = JSON.parse(jsonStr);
		// fix for previously missing isNsfw in some subreddits
		// for (const subName in this.subreddits) {
		// 	if (typeof this.subreddits[subName].isNsfw === "boolean")
		// 		continue;
		// 	this.subreddits[subName].isNsfw = topSubredditsByName[subName]?.over18;
		// }
		this.subredditSections = this.timestampsToSections(this.subreddits);
	}

	private timestampsToSections(subs: {[subreddit: string]: LoggedSubredditType_timestamps}): {[subreddit: string]: LoggedSubredditType_sections} {
		const now = Date.now();
		const sections: {[subreddit: string]: LoggedSubredditType_sections} = {};
		for (const subName in subs) {
			const sub = subs[subName];
			const typeSections = sub.typeHistory
				.map((timestamp, i) => {
					let duration: number;
					if (i < sub.typeHistory.length - 1)
						duration = sub.typeHistory[i + 1].time - timestamp.time;
					else
						duration = now - timestamp.time;
					return (<TypeSection>{
						name: `r/${sub.name}`,
						startTime: timestamp.time,
						duration: duration,
						type: timestamp.type,
						isNsfw: timestamp.isNsfw,
					});
				});
			// join sections of the same type
			const joinedTypeSections: TypeSection[] = [];
			let currentSection: TypeSection | null = null;
			for (const section of typeSections) {
				if (currentSection === null) {
					currentSection = section;
				} else if (
					currentSection.type === section.type &&
					Boolean(currentSection.isNsfw ?? sub.isNsfw) === Boolean(section.isNsfw ?? sub.isNsfw)
				) {
					currentSection.duration += section.duration;
				} else {
					joinedTypeSections.push(currentSection);
					currentSection = section;
				}
			}
			if (currentSection !== null) {
				joinedTypeSections.push(currentSection);
			}
			const section = (<LoggedSubredditType_sections>{
				name: `r/${sub.name}`,
				isNsfw: sub.isNsfw,
				subscribers: sub.subscribers,
				typeSections: joinedTypeSections
			});
			sections[subName] = section;
		}
		return sections;
	}
}
