import fetch from "node-fetch";
import {SubredditEntry} from "./missions/topSubreddits";
import fs from "fs";

async function loadSubreddits(showSfw: boolean, showNsfw: boolean, limit: number, skip: number): Promise<SubredditEntry[]> {
	const params = new URLSearchParams({
		sort: "subscriberCount",
		sortDirection: "-1",
		project: "subscriberCount",
		showSfw: showSfw ? "true" : "false",
		showNsfw: showNsfw ? "true" : "false",
		limit: limit.toString(),
		skip: skip.toString(),
	});
	const url = new URL(`https://subredditstats.com/api/list?${params.toString()}`);
	const response = await fetch(url.toString());
	return await response.json() as SubredditEntry[];
}

async function loadTopSubreddits(showSfw: boolean, showNsfw: boolean, limit: number): Promise<SubredditEntry[]> {
	const maxLimit = 50;
	const subreddits: any[] = [];
	for (let skip = 0; skip < limit; skip += maxLimit) {
		console.log(`Loading subreddits ${skip} to ${skip + maxLimit}`);
		const json = await loadSubreddits(showSfw, showNsfw, maxLimit, skip);
		subreddits.push(...json);
	}
	return subreddits;
}

async function main() {
	const queries = [
		{
			showSfw: true,
			showNsfw: false,
			limit: 1000,
		},
		{
			showSfw: false,
			showNsfw: true,
			limit: 500,
		}
	];
	const subreddits: SubredditEntry[] = [];
	for (const query of queries) {
		const json = await loadTopSubreddits(query.showSfw, query.showNsfw, query.limit);
		subreddits.push(...json);
	}
	subreddits.sort((a, b) => b.subscriberCount - a.subscriberCount);
	const json = JSON.stringify(subreddits, null, "\t");
	fs.writeFileSync("topSubreddits.json", json);
}

main().catch(console.error);
