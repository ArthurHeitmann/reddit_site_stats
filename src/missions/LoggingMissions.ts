import {Mission} from "./Mission";
import {PerMinuteLoggerMission} from "./PerMinuteLoggerMission";
import {RedditAuth} from "../redditApi";
import {PostsPerMinuteLoggerMission} from "./PostsPerMinuteLoggerMission";
import {CommentsPerMinuteLoggerMission} from "./CommentsPerMinuteLoggerMission";

export class LoggingMissions implements Mission {
	private missions: Mission[] = [];
	readonly ppm: PerMinuteLoggerMission;
	readonly cpm: CommentsPerMinuteLoggerMission;

	constructor(auth: RedditAuth) {
		this.ppm = new PostsPerMinuteLoggerMission(auth);
		this.cpm = new CommentsPerMinuteLoggerMission(auth);
		this.missions.push(this.ppm);
		this.missions.push(this.cpm);
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
