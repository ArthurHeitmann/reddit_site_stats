import express, {Express, Request} from "express";
import compression from "compression";
import helmet from "helmet";
import apiCache from "apicache";
import {LoggingMissions} from "./missions/LoggingMissions";
import {PerMinuteLoggerMission} from "./missions/PerMinuteLoggerMission";
import {LogMiddleWare} from "./serverLog";
import {LoggedSubredditType_sections} from "./missions/SubredditTypesLoggerMission";
import {findClosestIndex} from "./utils";

export class Server {
	private readonly cacheDuration = 30;
	app: Express;
	port: number;
	missions: LoggingMissions;
	commonStartTime: number;
	logMiddleware: LogMiddleWare;

	constructor(port: number, loggingMissions: LoggingMissions) {
		this.port = port;
		this.missions = loggingMissions;
		this.app = express();
		this.logMiddleware = new LogMiddleWare();
		this.logMiddleware.init().then(() => console.log("Log middleware initialized"));
	}

	start() {
		this.app.use(helmet({
			contentSecurityPolicy: false,
			crossOriginEmbedderPolicy: false,
		}));
		apiCache.options({
			headers: {
				"cache-control": `public, max-age=${this.cacheDuration}`,
			}
		})
		const cache = apiCache.middleware;
		// const baseRateLimit = RateLimit({
		// 	message: "A little fast huh?",
		// 	windowMs: 5 * 1000,
		// 	max: 60,
		// });

		this.app.use(this.logMiddleware.middleWare.bind(this.logMiddleware));
		this.app.use(compression(), express.static("src/static"));

		this.app.get("", compression(), (req, res) => {
			res.sendFile("src/static/index.html");
		});

		const apiRoute = express.Router();
		apiRoute.use(cache(
			"10 seconds",
			(req, res) => res.statusCode === 200),
		);
		// apiRoute.use(RateLimit({
		// 	message: "A little fast huh?",
		// 	windowMs: 10 * 1000,
		// 	max: 30,
		// }));
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

	private pointsFromPerMinuteData(mission: PerMinuteLoggerMission, minCreated: number|null = null, maxCreated: number|null = null, resolution: number|null = null): { x: number; y: number }[] {
		let startIndex = 1;
		let endIndex = mission.logged.length;

		let logged = mission.logged;
		if (minCreated !== null)
			startIndex = findClosestIndex(logged, minCreated, e => e.created);
		if (maxCreated !== null)
			endIndex = findClosestIndex(logged, maxCreated, e => e.created);
		if (startIndex !== 0 || endIndex !== mission.logged.length)
			logged = logged.slice(startIndex, endIndex);
		if (resolution !== null) {
			const stepSize = (endIndex - startIndex) / resolution;
			logged = Array.from({length: resolution}, (_, i) => {
				const index = Math.floor(i * stepSize);
				return logged[index];
			});
		}
		if (logged[0] !== mission.logged[1])
			logged.splice(0, 0, mission.logged[1]);
		if (logged[logged.length - 1] !== mission.logged[mission.logged.length - 1])
			logged.push(mission.logged[mission.logged.length - 1]);

		return logged
			.filter(thing => typeof thing.perMinute === "number")
			.map(thing => ({
				x: thing.created * 1000,
				y: thing.perMinute,
			}));
			// .filter(point => point.x >= this.commonStartTime);
	}

	private perMinuteRoute(req: express.Request, res: express.Response, mission: PerMinuteLoggerMission) {
		const {minCreated, maxCreated, resolution} = this.extractPointsParams(req);
		const points = this.pointsFromPerMinuteData(mission, minCreated, maxCreated, resolution);
		res.json(points);
	}

	private postsPerMinuteRoute(req: express.Request, res: express.Response) {
		this.perMinuteRoute(req, res, this.missions.ppm);
	}

	private commentsPerMinuteRoute(req: express.Request, res: express.Response) {
		this.perMinuteRoute(req, res, this.missions.cpm);
	}

	private filterAndSortSubs(includeSfw: boolean, includeNsfw: boolean, limit: number): LoggedSubredditType_sections[] {
		return Object.values(this.missions.subTypes.subredditSections)
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
		// console.time("all");
		const includeSfw = req.query.sfw === "true";
		const includeNsfw = req.query.nsfw === "true";
		const limit = parseInt(req.query.limit as string) || 100;
		console.log(`/all includeSfw: ${includeSfw}, includeNsfw: ${includeNsfw}, limit: ${limit}`)
		const ppm = this.pointsFromPerMinuteData(this.missions.ppm);
		const cpm = this.pointsFromPerMinuteData(this.missions.cpm);
		const subs = this.filterAndSortSubs(includeSfw, includeNsfw, limit);
		res.json({
			ppm,
			cpm,
			subs,
		});
		// console.timeEnd("all");
	}

	private extractPointsParams(req: Request): { minCreated: number|null, maxCreated: number|null, resolution: number|null } {
		const nonNanOrNull = (val: string | string[] | undefined) => {
			if (val === undefined)
				return null;
			const num = Number(val as string);
			if (isNaN(num))
				return null;
			return num;
		}
		const minCreated = nonNanOrNull(req.query.minCreated as string);
		const maxCreated = nonNanOrNull(req.query.maxCreated as string);
		const resolution = nonNanOrNull(req.query.resolution as string);
		return {minCreated, maxCreated, resolution};
	}
}
