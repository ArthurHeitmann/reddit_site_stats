import {LoggedThing, PerMinuteLoggerMission} from "./PerMinuteLoggerMission";
import {getMostRecentComment, RedditAuth} from "../redditApi";

export class CommentsPerMinuteLoggerMission extends  PerMinuteLoggerMission{
	constructor(auth: RedditAuth) {
		super(auth, "commentsPerMinute.json");
	}

	async getNewThing(): Promise<LoggedThing> {
		const thing = await getMostRecentComment(this.auth);
		return {
			id: thing.id,
			url: thing.permalink,
			created: thing.created_utc,
			perMinute: null
		};
	}
}
