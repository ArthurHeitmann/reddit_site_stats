import express, {Express} from "express";
import {LoggingMissions} from "./missions/LoggingMissions";
import {PerMinuteLoggerMission} from "./missions/PerMinuteLoggerMission";
import {topSubredditsByName} from "./missions/topSubreddits";

interface Point {
	x: number;
	y: number;
}

export class Server {
	app: Express;
	port: number;
	missions: LoggingMissions;

	constructor(port: number, loggingMissions: LoggingMissions) {
		this.port = port;
		this.missions = loggingMissions;
		this.app = express();
	}

	start() {
		this.app.use(express.static("src/static"));

		this.app.get("/api/postsPerMinute", this.postsPerMinuteRoute.bind(this));
		this.app.get("/api/commentsPerMinute", this.commentsPerMinuteRoute.bind(this));
		this.app.get("/api/subredditTypes", this.subredditTypesRoute.bind(this));
		this.app.get("/api/all", this.all.bind(this));

		this.app.listen(this.port, () => {
			console.log(`Started app on port ${this.port}`)
		});
	}

	private pointsFromPerMinuteData(mission: PerMinuteLoggerMission) {
		return mission.logged
			.map(thing => ({
				x: thing.created * 1000,
				y: thing.perMinute,
			}))
			.filter(point => typeof point.y === "number");
	}

	private perMinuteRoute(req: express.Request, res: express.Response, mission: PerMinuteLoggerMission) {
		const points = this.pointsFromPerMinuteData(mission);
		res.json(points);
	}

	private postsPerMinuteRoute(req: express.Request, res: express.Response) {
		this.perMinuteRoute(req, res, this.missions.ppm);
	}

	private commentsPerMinuteRoute(req: express.Request, res: express.Response, mission: PerMinuteLoggerMission) {
		this.perMinuteRoute(req, res, this.missions.cpm);
	}

	private filterAndSortSubs(includeSfw: boolean, includeNsfw: boolean, limit: number) {
		return Object.values(this.missions.subTypes.subreddits)
			.filter(sub => (
				(includeSfw && !sub.isNsfw) ||
				(includeNsfw && sub.isNsfw)
			))
			.sort((a, b) => topSubredditsByName[b.name].subscriberCount - topSubredditsByName[a.name].subscriberCount)
			.slice(0, limit);
	}

	private subredditTypesRoute(req: express.Request, res: express.Response) {
		const includeSfw = req.query.sfw === "true";
		const includeNsfw = req.query.nsfw === "true";
		const limit = parseInt(req.query.limit as string) || 100;
		const subs = this.filterAndSortSubs(includeSfw, includeNsfw, limit);
		res.json(subs);
	}

	private all(req: express.Request, res: express.Response) {
		const includeSfw = req.query.sfw === "true";
		const includeNsfw = req.query.nsfw === "true";
		const limit = parseInt(req.query.limit as string) || 100;
		const subs = this.filterAndSortSubs(includeSfw, includeNsfw, limit);
		const ppm = this.pointsFromPerMinuteData(this.missions.ppm);
		const cpm = this.pointsFromPerMinuteData(this.missions.cpm);
		res.json({
			ppm,
			cpm,
			subs,
		});
	}
}
