import * as d3 from "d3";
import {CurveFactory, CurveFactoryLineOnly, ScaleLinear, ScaleTime, Selection} from "d3";
import {LineChart, LineDataset, Point} from "./LineChart";
import {
	LoggedSubredditType_sections,
	LoggedSubredditType_timestamps,
	SubredditTypeActivityChart,
	TypeSection
} from "./subredditTypesChart";


async function main() {
	const ppmRes = await fetch("/api/postsPerMinute");
	const ppm: Point[] = await ppmRes.json() as Point[];
	const ppmDataset: LineDataset = {
		name: "Posts per minute",
		points: ppm,
	}
	const cpmRes = await fetch("/api/commentsPerMinute");
	const cpm: Point[] = await cpmRes.json() as Point[];
	const cpmDataset: LineDataset = {
		name: "Comments per minute",
		points: cpm,
	}
	const subredditTypesRes = await fetch("/api/subredditTypes?nsfw=true&sfw=true&limit=1000");
	const subredditTypes_timestamps = await subredditTypesRes.json() as LoggedSubredditType_timestamps[];
	const subredditTypes_sections = subredditTypes_timestamps.map(sub => {
		const typeSections = sub.typeHistory
			.slice(0, sub.typeHistory.length - 1)
			.map((timestamp, i) => (<TypeSection>{
				name: `r/${sub.name}`,
				startTime: timestamp.time,
				duration: sub.typeHistory[i + 1].time - timestamp.time,
				type: timestamp.type,
			}));
		// join sections of the same type
		const joinedTypeSections: TypeSection[] = [];
		let currentSection: TypeSection | null = null;
		for (const section of typeSections) {
			if (currentSection === null) {
				currentSection = section;
			} else if (currentSection.type === section.type) {
				currentSection.duration += section.duration;
			} else {
				joinedTypeSections.push(currentSection);
				currentSection = section;
			}
		}
		if (currentSection !== null) {
			joinedTypeSections.push(currentSection);
		}
		return (<LoggedSubredditType_sections>{
			name: `r/${sub.name}`,
			isNsfw: sub.isNsfw,
			subscribers: sub.subscribers,
			typeSections: joinedTypeSections
		});
	});

	const chart1Elem = document.getElementById("chart1")!;
	const chart1 = new LineChart({
		data: [ppmDataset, cpmDataset],
		element: chart1Elem,
		title: "Posts and comments per minute",
		xLabel: "Time",
		yLabel: "Count",
	});
	chart1.createChart();
	const chart2Elem = document.getElementById("chart2")!;
	const chart2 = new SubredditTypeActivityChart({
		data: subredditTypes_sections,
		element: chart2Elem,
		title: "Subreddit status",
		xLabel: "Time",
	});
	chart2.createChart();
}


window.addEventListener("load", async () => {
	await main();
});
