import fs from "fs";

interface LoggedSubredditType {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeHistory: {
		time: number;
		type: "public" | "private" | "restricted" | "gold_only" | string;
	}[];
}

const files = [
	"C:\\Users\\Arthur\\subredditTypes.json",
	"D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats\\subredditTypes.json"
]

const loadedFiles = files
	.map(file => fs.readFileSync(file))
	.map(file => JSON.parse(file.toString()) as { [name: string]: LoggedSubredditType });

const allKeys = new Set<string>();
for (const file of loadedFiles) {
	for (const key of Object.keys(file)) {
		allKeys.add(key);
	}
}

const merged: { [name: string]: LoggedSubredditType } = {};
for (const key of allKeys) {
	const subreddits = loadedFiles
		.map(file => file[key])
		.filter(sub => sub !== undefined);
	if (subreddits.length === 0) {
		console.log(`No subreddits found for ${key}`);
		continue;
	}
	const mergedSubreddit: LoggedSubredditType = {
		name: subreddits[0].name,
		isNsfw: subreddits[0].isNsfw,
		subscribers: subreddits[0].subscribers,
		typeHistory: []
	};
	for (const sub of subreddits) {
		mergedSubreddit.typeHistory.push(...sub.typeHistory);
	}
	mergedSubreddit.typeHistory.sort((a, b) => a.time - b.time);
	merged[key] = mergedSubreddit;
}

fs.writeFileSync("mergedSubredditTypes.json", JSON.stringify(merged, null, "\t"));
