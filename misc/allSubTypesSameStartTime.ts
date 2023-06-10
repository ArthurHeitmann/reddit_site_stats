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

const subsPath = "./subredditTypes.json";
const subsSavePath = "./subredditTypes2.json";
const subsStr = fs.readFileSync(subsPath).toString();
const subs = JSON.parse(subsStr) as { [name: string]: LoggedSubredditType };

const allStartTimes = Object.values(subs)
	.map(sub => sub.typeHistory[0].time);
const minStartTime = Math.min(...allStartTimes);

for (const sub of Object.values(subs)) {
	sub.typeHistory[0].time = minStartTime;
}

fs.writeFileSync(subsSavePath, JSON.stringify(subs, null, "\t"));

