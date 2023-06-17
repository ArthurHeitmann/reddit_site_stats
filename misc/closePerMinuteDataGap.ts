import fs from "fs";
import {LoggedThing} from "../src/missions/PerMinuteLoggerMission";
import dotenv from "dotenv";
import {RedditAuth} from "../src/redditApi";
import {RedditListingObj, RedditPostObj} from "../src/redditTypes";
import {base36Decode, sleep} from "../src/sharedUtils";
import {saveJsonSafely} from "../src/utils";

dotenv.config();

function formatDate(date: Date) {
	return date.toISOString().replace(/T/, " ").replace(/\..+/, "")
}
const {clientId, secret} = process.env;
if (!clientId || !secret) {
	throw new Error("Missing clientId or secret in .env file");
}
const auth = new RedditAuth(clientId, secret);
await auth.loadFromFile();

async function apiInfo(ids: string[]): Promise<RedditListingObj<RedditPostObj>> {
	let res: RedditListingObj<RedditPostObj>;
	try {
		res = await auth.oauthRequest(
			"/api/info",
			{id: ids.join(",")}
		);
	} catch (e) {
		console.log("Error fetching comments, waiting 3 seconds and trying again", e);
		await sleep(1000 * 3);
		res = await auth.oauthRequest("/api/info", {id: ids.join(",")});
	}
	return res;
}


interface Config {
	fullNamePrefix: string;
	idStepSize: number;
	logFile: string;
}

const config = <Config[]> [
	{
		fullNamePrefix: "t1",
		idStepSize: 5000,
		logFile: "commentsPerMinute.json",
	},
	{
		fullNamePrefix: "t3",
		idStepSize: 600,
		logFile: "postsPerMinute.json",
	}
];

for (const {fullNamePrefix, logFile, idStepSize} of config) {
	console.log(`Filling gaps in ${logFile}`);
	const gapMinSize = 60 * 5;
	const log = fs.readFileSync(logFile, "utf8");
	const perMinute: LoggedThing[] = JSON.parse(log);

	// find gaps
	const gaps: [number, number][] = [];
	let lastTime = perMinute[0].created;
	let gapStart = perMinute[0].created;

	for (let i = 1; i < perMinute.length; i++) {
		const thing = perMinute[i];
		if (thing.created - lastTime > gapMinSize) {
			gaps.push([i - 1, i]);
			gapStart = thing.created;
		}
		lastTime = thing.created;
	}
	console.log(`Found ${gaps.length} gaps`);

	// close gaps
	const reversedGaps = gaps.reverse();
	for (const gap of reversedGaps) {
		// log
		const gapStartStr = formatDate(new Date(gapStart * 1000));
		const gapEndStr = formatDate(new Date(perMinute[gap[1]].created * 1000));
		const duration = (perMinute[gap[1]].created - perMinute[gap[0]].created) / 60;
		console.log(`Filling gap from ${gapStartStr} to ${gapEndStr} (${duration.toFixed(2)} minutes)`);

		let thingIdStepSize = idStepSize;
		const idsPerRequest = 100;
		const firstId = base36Decode(perMinute[gap[0]].id) + thingIdStepSize;
		const lastId = base36Decode(perMinute[gap[1]].id);
		if (lastId - firstId < 3) {
			thingIdStepSize = Math.floor(thingIdStepSize / 2);
		}
		const ids: string[] = [];
		for (let i = firstId + 1; i < lastId; i += thingIdStepSize) {
			ids.push(i.toString(36));
		}
		// load data
		const newThings: LoggedThing[] = [];
		const requestCount = Math.ceil(ids.length / idsPerRequest);
		console.log(`Making ${requestCount} requests`);
		for (let i = 0; i < ids.length; i += idsPerRequest) {
			const idsBatch = ids.slice(i, i + idsPerRequest).map(id => `${fullNamePrefix}_${id}`);
			const res = await apiInfo(idsBatch);
			const successRate = res.data.children.length / Math.min(ids.length, idsPerRequest);
			if (successRate < 0.9) {
				console.log(`Warning: api_info success rate was ${successRate}`);
			}
			newThings.push(...res.data.children.map(c => ({
				id: c.data.id,
				url: c.data.permalink,
				created: c.data.created_utc,
				perMinute: null
			})));
		}
		if (newThings.length === 0) {
			console.log("No new things found, skipping");
			continue;
		}
		// calculate things per minute
		let previousCreated = perMinute[gap[0]].created;
		let previousId = base36Decode(perMinute[gap[0]].id);
		for (const thing of newThings) {
			const timeSinceLastPost = thing.created - previousCreated;
			const newId = base36Decode(thing.id);
			const postsSinceLastPost = newId - previousId;
			const postsPerMinute = postsSinceLastPost / (timeSinceLastPost / 60);
			thing.perMinute = postsPerMinute;
			previousCreated = thing.created;
			previousId = newId;
		}
		// fix perMinute after gap
		perMinute[gap[1]].perMinute = newThings[newThings.length - 1].perMinute;
		// insert into array
		perMinute.splice(gap[1], 0, ...newThings);
	}

	await saveJsonSafely(perMinute, logFile);
}

console.log("Done");
