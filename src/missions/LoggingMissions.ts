import {Mission} from "./Mission";
import {PerMinuteLoggerMission} from "./PerMinuteLoggerMission";
import {RedditAuth} from "../redditApi";
import {PostsPerMinuteLoggerMission} from "./PostsPerMinuteLoggerMission";
import {CommentsPerMinuteLoggerMission} from "./CommentsPerMinuteLoggerMission";
import {SubredditTypesLoggerMission} from "./SubredditTypesLoggerMission";

export class LoggingMissions implements Mission {
	private missions: Mission[] = [];
	readonly ppm: PerMinuteLoggerMission;
	readonly cpm: CommentsPerMinuteLoggerMission;
	readonly subTypes: SubredditTypesLoggerMission;

	constructor(auth: RedditAuth) {
		this.ppm = new PostsPerMinuteLoggerMission(auth);
		this.cpm = new CommentsPerMinuteLoggerMission(auth);
		this.subTypes = new SubredditTypesLoggerMission(auth);
		this.missions.push(this.ppm);
		this.missions.push(this.cpm);
		this.missions.push(this.subTypes);
	}

	init(): Promise<any> {
		return Promise.all(
			this.missions.map(m => m.init())
		);
	}

	start(): void {
		for (const mission of this.missions) {
			try {
				mission.start();
			} catch (e) {
				console.error(e);
			}
		}
	}

	stop(): void {
		for (const mission of this.missions) {
			try {
				mission.stop();
			} catch (e) {
				console.error(e);
			}
		}
	}
}
