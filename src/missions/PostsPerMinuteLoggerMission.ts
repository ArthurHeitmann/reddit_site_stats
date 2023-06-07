import {LoggedThing, PerMinuteLoggerMission} from "./PerMinuteLoggerMission";
import {getMostRecentPost, RedditAuth} from "../redditApi";

export class PostsPerMinuteLoggerMission extends  PerMinuteLoggerMission{
	constructor(auth: RedditAuth) {
		super(auth, "postsPerMinute.json");
	}

	async getNewThing(): Promise<LoggedThing> {
		const thing = await getMostRecentPost(this.auth);
		return {
			id: thing.id,
			url: thing.permalink,
			created: thing.created_utc,
			perMinute: null
		};
	}
}
