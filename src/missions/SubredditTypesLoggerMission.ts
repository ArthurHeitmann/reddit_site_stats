import {IntervalMission} from "./IntervalMission";
import fs, {promises as fsp} from "fs";
import readline from "readline";
import {topSubreddits, topSubredditsByName} from "./topSubreddits";
import {getSubredditsAbout, RedditAuth} from "../redditApi";
import {SubredditDetails, SubredditType} from "../redditTypes";
import {saveJsonSafely} from "../utils";
import {sleep} from "../sharedUtils";
import { stdout } from "process";

interface SubredditTypeTimestamp {
	time: number;
	type: "public" | "private" | "restricted" | "gold_only" | string;
	isNsfw?: boolean;
}

export interface LoggedSubredditType_timestamps {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeHistory: SubredditTypeTimestamp[];
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
	static readonly INTERVAL = 1000 * 60 * 60;
	static readonly infoSaveFile = "subredditTypes_info.json";
	static readonly historySaveFile = "subredditTypes_history.txt";
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
		console.log("Saving subreddit types");
		const t1 = Date.now();
		const subsInfo = Object.entries(this.subreddits)
			.map(([name, info]) => [
				name,
				{
					name: info.name,
					isNsfw: info.isNsfw,
					subscribers: info.subscribers,
				}
			]);
		await saveJsonSafely(subsInfo, SubredditTypesLoggerMission.infoSaveFile);
		const tempFilePath = SubredditTypesLoggerMission.historySaveFile + ".tmp";
		const writeFile = await fsp.open(tempFilePath, "w");
		try {
			for (const [subName, subData] of Object.entries(this.subreddits)) {
				await writeFile.write(`r/${subName}\n`);
				await writeFile.write(JSON.stringify(subData.typeHistory) + "\n");
			}
		}
		finally {
			await writeFile.close();
		}
		await fsp.rename(tempFilePath, SubredditTypesLoggerMission.historySaveFile);
		const t2 = Date.now();
		console.log(`Saved subreddit types in ${Math.round((t2 - t1) / 100) / 10} seconds`);
	}

	private async loadFromFile() {
		const infoFileExists = fs.existsSync(SubredditTypesLoggerMission.infoSaveFile);
		const historyFileExists = fs.existsSync(SubredditTypesLoggerMission.historySaveFile);
		if (!infoFileExists || !historyFileExists) {
			this.subreddits = {};
			this.subredditSections = {};
			return;
		}
		// const jsonStr = await fsp.readFile(SubredditTypesLoggerMission.saveFile, "utf8");
		// this.subreddits = JSON.parse(jsonStr);
		// this.subredditSections = this.timestampsToSections(this.subreddits);

		const t1 = Date.now();
		console.log("Loading subreddit types");
		const subsInfoStr = await fsp.readFile(SubredditTypesLoggerMission.infoSaveFile, "utf8");
		const subsInfo = JSON.parse(subsInfoStr) as { [subName: string]: LoggedSubredditType_timestamps };
		this.subreddits = {};
		for (const [subName, subInfo] of Object.entries(subsInfo)) {
			subInfo.typeHistory = [];
			this.subreddits[subName] = subInfo;
		}

		const historyFile = fs.createReadStream(SubredditTypesLoggerMission.historySaveFile);
		const rl = readline.createInterface({
			input: historyFile,
			crlfDelay: Infinity
		});
		let subName: string | undefined;
		for await (const line of rl) {
			if (subName === undefined) {
				subName = line.slice(2);
				stdout.write(`\rLoading r/${subName}`);
			}
			else {
				const history = JSON.parse(line) as SubredditTypeTimestamp[];
				this.subreddits[subName].typeHistory = history;
				subName = undefined;
			}
		}
		stdout.write("\n");
		const t2 = Date.now();
		console.log(`Loaded subreddit types in ${Math.round((t2 - t1) / 100) / 10} seconds`);

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
