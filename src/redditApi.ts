import fetch, {Headers, RequestInit} from "node-fetch";
import {RedditListingObj, RedditPostData, RedditPostObj, RedditSubredditObj, SubredditDetails} from "./redditTypes";
import fs, {promises as fsp} from "fs";
import {sleep} from "./utils";

const userAgent = "script:redditStats:v0.0.1 (by /u/RaiderBDev)";
const saveFilePath = "redditAuth.json";
const endpointAccessToken = "https://www.reddit.com/api/v1/access_token";

export class RedditAuth {
	private readonly clientId: string;
	private readonly secret: string;
	private accessToken: string = "";
	private accessTokenExpires: number = 0;

	constructor(clientId: string, secret: string) {
		this.clientId = clientId;
		this.secret = secret;
	}

	async getAccessTokenWithRefresh(): Promise<string> {
		const now = Date.now();
		if (this.accessToken && this.accessTokenExpires > now)
			return this.accessToken;
		this.accessToken = await this.getAccessToken();
		this.accessTokenExpires = now + 1000 * 60 * 60;
		await this.saveToFile();
		return this.accessToken;
	}

	async oauthRequest<T>(endpoint: string, params: { [q: string]: string }, method: string = "GET"): Promise<T> {
		const fetchOptions: RequestInit = {
			method: method,
			headers: {
				"Authorization": "Bearer " + await this.getAccessTokenWithRefresh(),
			},
		};
		if (method !== "GET") {
			fetchOptions.body = JSON.stringify(params);
		}
		const url = new URL(`https://oauth.reddit.com${endpoint}`);
		for (const key in params) {
			url.searchParams.append(key, params[key]);
		}
		const response = await fetch(url.toString(), fetchOptions);
		this.rateLimitCheck(response.headers);
		const text = await response.text();
		return JSON.parse(text);
	}

	private async getAccessToken(): Promise<string> {
		const response = await fetch(endpointAccessToken, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": "Basic " + btoa(this.clientId + ":" + this.secret),
				"User-Agent": userAgent
			},
			body: "grant_type=client_credentials"
		});
		const json = await response.json();
		const accessToken = json["access_token"];
		if (typeof accessToken !== "string" || accessToken.length === 0)
			throw new Error("Invalid access token");
		return accessToken;
	}

	private rateLimitCheck(headers: Headers) {
		const rlReqRemaining = parseInt(headers.get("x-ratelimit-remaining"));
		const rlTimeRemaining = parseInt(headers.get("x-ratelimit-reset"));
		if (rlReqRemaining < 30)
			console.log(`Rate limit: ${rlReqRemaining} requests remaining, ${rlTimeRemaining} seconds until reset`);
	}

	private async saveToFile() {
		const jsonStr = JSON.stringify({
			accessToken: this.accessToken,
			accessTokenExpires: this.accessTokenExpires
		}, null, "\t");
		await fsp.writeFile(saveFilePath, jsonStr);
	}

	async loadFromFile() {
		const fileExists = fs.existsSync(saveFilePath);
		if (!fileExists)
			return;
		const jsonStr = await fsp.readFile(saveFilePath, "utf8");
		const json = JSON.parse(jsonStr);
		this.accessToken = json["accessToken"];
		this.accessTokenExpires = json["accessTokenExpires"];
	}
}

export async function getMostRecentPost(auth: RedditAuth): Promise<RedditPostData> {
	let response: RedditListingObj<RedditPostObj>;
	let attempt = 0;
	do {
		response = await auth.oauthRequest<RedditListingObj<RedditPostObj>>(
			"/r/all/new",
			{ limit: ((attempt+1)*5).toString() },
		);
		if (!response?.data) {
			console.log("No response data");
			console.log({ response });
			console.log("Sleeping for 10 seconds")
			await sleep(1000 * 10)
		}
		if (attempt > 3)
			throw new Error("Failed to get most recent post");
		attempt++;
	} while (!response.data || response.data.children.length === 0);
	return response.data.children[0].data;
}

export async function getMostRecentComment(auth: RedditAuth): Promise<RedditPostData> {
	let response: RedditListingObj<RedditPostObj>;
	let attempt = 0;
	do {
		response = await auth.oauthRequest<RedditListingObj<RedditPostObj>>(
			"/comments",
			{ limit: ((attempt+1)*5).toString() },
		);
		if (!response?.data) {
			console.log("No response data");
			console.log({ response });
			console.log("Sleeping for 10 seconds")
			await sleep(1000 * 10)
		}
		if (attempt > 3)
			throw new Error("Failed to get most recent post");
		attempt++;
	} while (!response?.data || response.data.children.length === 0);
	return response.data.children[0].data;
}

export async function getRecentSubredditPosts(auth: RedditAuth, subreddit: string, limit: number = 100): Promise<RedditPostData[]> {
	limit = Math.min(limit, 100);
	const response = await auth.oauthRequest<RedditListingObj<RedditPostObj>>(`/r/${subreddit}`, { limit: limit.toString() });
	return response.data.children.map(c => c.data);
}

export async function getSubredditsAbout(auth: RedditAuth, subreddits: string[]): Promise<SubredditDetails[]> {
	let remainingSubreddits = subreddits;
	const subredditsAbout: SubredditDetails[] = [];
	while (remainingSubreddits.length > 0) {
		const subredditsToQuery = remainingSubreddits.splice(0, 100);
		let subredditsList = subredditsToQuery.join(",");
		const response = await auth.oauthRequest<RedditListingObj<RedditSubredditObj>>("/api/info", { sr_name: subredditsList });
		subredditsAbout.push(...response.data.children.map(c => c.data as SubredditDetails));
	}
	return subredditsAbout;
}
