import fs from "fs";
import {LoggedThing} from "../src/missions/PerMinuteLoggerMission";
import {saveJsonSafely} from "../src/utils";

const saveDir = "D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats\\";
const fileGroups: string[][] = [
	[
		"D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats-dev\\postsPerMinute.json",
		"D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats\\postsPerMinute.json"
	],
	[
		"D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats-dev\\commentsPerMinute.json",
		"D:\\Cloud\\Documents\\Programming\\js\\reddit-site-stats\\commentsPerMinute.json"
	]
];

for (const fileGroup of fileGroups) {
	const files = fileGroup.map(file => fs.readFileSync(file));
	const loadedFiles = files.map(file => JSON.parse(file.toString()) as LoggedThing[]);

	const allIds = new Set<string>();
	const merged: LoggedThing[] = [];
	for (const file of loadedFiles) {
		for (const thing of file) {
			if (allIds.has(thing.id))
				continue;
			allIds.add(thing.id);
			merged.push(thing);
		}
	}
	merged.sort((a, b) => a.created - b.created);
	console.log(`Merged ${merged.length} things`);

	const fileName = fileGroup[0].split("\\").pop();
	const savePath = saveDir + fileName;
	await saveJsonSafely(merged, savePath);
}
