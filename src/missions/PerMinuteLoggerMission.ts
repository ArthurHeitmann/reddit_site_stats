import {IntervalMission} from "./IntervalMission";
import {RedditAuth} from "../redditApi";
import fs, {promises as fsp} from "fs";
import {base36Decode} from "../utils";

export interface LoggedThing {
	id: string;
	url: string;
	created: number;
	perMinute: number|null;
}

export abstract class PerMinuteLoggerMission extends IntervalMission {
	static readonly INTERVAL = 1000 * 60;
	private readonly logFile;
	protected readonly auth: RedditAuth;
	logged: LoggedThing[] = [];

	protected constructor(auth: RedditAuth, logFile: string) {
		super(PerMinuteLoggerMission.INTERVAL);
		this.auth = auth;
		this.logFile = logFile;
	}

	abstract getNewThing(): Promise<LoggedThing>;

	async init(): Promise<void> {
		this.logged = await this.loadFromFile();
	}

	async run() {
		console.log("Logging");
		const newThing = await this.getNewThing();
		if (this.logged.length === 0)
			this.logged = await this.loadFromFile();
		let postsPerMinute: number|null = null;
		const previousThing: LoggedThing|undefined = this.logged[this.logged.length - 1];
		if (previousThing !== undefined) {
			const timeSinceLastPost = newThing.created - previousThing.created;
			const previousId = base36Decode(previousThing.id);
			const newId = base36Decode(newThing.id);
			const postsSinceLastPost = newId - previousId;
			postsPerMinute = postsSinceLastPost / (timeSinceLastPost / 60);
		}
		newThing.perMinute = postsPerMinute;
		this.logged.push(newThing);
		await this.saveToFile();
	}

	private async loadFromFile(): Promise<LoggedThing[]> {
		const fileExists = fs.existsSync(this.logFile);
		if (!fileExists)
			return [];
		const jsonStr = await fsp.readFile(this.logFile, "utf8");
		return JSON.parse(jsonStr);
	}

	private async saveToFile() {
		const jsonStr = JSON.stringify(this.logged, null, "\t");
		await fsp.writeFile(this.logFile, jsonStr);
	}
}
