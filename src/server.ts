import express, {Express} from "express";
import compression from "compression";
import helmet from "helmet";
import apiCache from 'apicache';
import {LoggingMissions} from "./missions/LoggingMissions";
import {PerMinuteLoggerMission} from "./missions/PerMinuteLoggerMission";
import {LoggedSubredditType} from "./missions/SubredditTypesLoggerMission";

export class Server {
	app: Express;
	port: number;
	missions: LoggingMissions;
	commonStartTime: number;

	constructor(port: number, loggingMissions: LoggingMissions) {
		this.port = port;
		this.missions = loggingMissions;
		this.app = express();
	}

	start() {
		this.app.use(helmet({
			contentSecurityPolicy: false,
			crossOriginEmbedderPolicy: false,
		}));
		const cache = apiCache.middleware;


		this.app.use(express.static("src/static"));
		this.app.get("", (req, res) => {
			res.sendFile("src/static/index.html");
		});

		const apiRoute = express.Router();
		apiRoute.use(cache("30 seconds"));	// this order, so that the compression is cached
		apiRoute.use(compression());
		apiRoute.get("/postsPerMinute", this.postsPerMinuteRoute.bind(this));
		apiRoute.get("/commentsPerMinute", this.commentsPerMinuteRoute.bind(this));
		apiRoute.get("/subredditTypes", this.subredditTypesRoute.bind(this));
		apiRoute.get("/all", this.all.bind(this));
		this.app.use("/api", apiRoute);

		this.app.listen(this.port, () => {
			console.log(`Started app on port ${this.port}`)
		});

		const allStartTimes = [
			this.missions.ppm.logged[0].created,
			this.missions.cpm.logged[0].created,
			Object.values(this.missions.subTypes.subreddits)
				.map(sub => sub.typeHistory[0].time)
				.reduce((a, b) => Math.max(a, b))
		];
		this.commonStartTime = Math.max(...allStartTimes);
	}

	private pointsFromPerMinuteData(mission: PerMinuteLoggerMission): { x: number; y: number }[] {
		return mission.logged
			.map(thing => ({
				x: thing.created * 1000,
				y: thing.perMinute,
			}))
			.filter(point => typeof point.y === "number")
			.filter(point => point.x >= this.commonStartTime);
	}

	private perMinuteRoute(req: express.Request, res: express.Response, mission: PerMinuteLoggerMission) {
		const points = this.pointsFromPerMinuteData(mission);
		res.json(points);
	}

	private postsPerMinuteRoute(req: express.Request, res: express.Response) {
		this.perMinuteRoute(req, res, this.missions.ppm);
	}

	private commentsPerMinuteRoute(req: express.Request, res: express.Response) {
		this.perMinuteRoute(req, res, this.missions.cpm);
	}

	private filterAndSortSubs(includeSfw: boolean, includeNsfw: boolean, limit: number): LoggedSubredditType[] {
		return Object.values(this.missions.subTypes.subreddits)
			.filter(sub => (
				(includeSfw && !sub.isNsfw) ||
				(includeNsfw && sub.isNsfw)
			))
			.sort((a, b) => b.subscribers - a.subscribers)
			.slice(0, limit)
			/*.map(sub => (<LoggedSubredditType>{
				name: sub.name,
				isNsfw: sub.isNsfw,
				subscribers: sub.subscribers,
				typeHistory: sub.typeHistory
					.filter(type => type.time >= this.commonStartTime)
			}))*/;
	}

	private subredditTypesRoute(req: express.Request, res: express.Response) {
		const includeSfw = req.query.sfw === "true";
		const includeNsfw = req.query.nsfw === "true";
		const limit = parseInt(req.query.limit as string) || 100;
		const subs = this.filterAndSortSubs(includeSfw, includeNsfw, limit);
		res.json(subs);
	}

	private all(req: express.Request, res: express.Response) {
		console.time("all");
		const includeSfw = req.query.sfw === "true";
		const includeNsfw = req.query.nsfw === "true";
		const limit = parseInt(req.query.limit as string) || 100;
		const ppm = this.pointsFromPerMinuteData(this.missions.ppm);
		const cpm = this.pointsFromPerMinuteData(this.missions.cpm);
		const subs = this.filterAndSortSubs(includeSfw, includeNsfw, limit);
		res.json({
			ppm,
			cpm,
			subs,
		});
		// const jsonStr = JSON.stringify({
		// 	ppm,
		// 	cpm,
		// 	subs,
		// });
		// res.header("Content-Type", "application/json");
		// res.send(jsonStr);
		console.timeEnd("all");
	}
}
