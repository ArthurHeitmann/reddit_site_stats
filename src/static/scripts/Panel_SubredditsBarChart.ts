import {State} from "./state";
import {BarChart, BarChartDataset, BarData, BarGroup, BarStack} from "./BarChart";
import {LoggedSubredditType_sections} from "./subredditTypesChart";

export class Panel_SubredditsBarChart extends HTMLElement {
	state: State;
	chart: BarChart;
	data: BarChartDataset|null = null;

	constructor(state: State) {
		super();
		this.state = state;
		this.data = this.transformSubsData(state.subredditTypes);
		this.state.addListener(() => {
			// this.chart.updateData(this.transformSubsData(this.state.subredditTypes));
		});

		this.classList.add("panel");
	}

	connectedCallback() {
		this.chart = new BarChart(this.data, this);
		// this.chart = new BarChart(testDataSet, this);
		this.chart.createChart();
	}

	private transformSubsData(subs: LoggedSubredditType_sections[]): BarChartDataset {
		// transform subreddit type timestamps into stacked bar groups
		// each group is a timestamp bucket
		// each group has the groups/stacks: total subs, sum of sub subscribers
		// each stack has the following bars: private, restricted
		// public subs are not shown
		const hourResolution = 1;
		const timeResolution = 1000 * 60 * 60 * hourResolution;
		let timeStart = Math.min(...subs.map(sub => sub.typeSections[0].startTime));
		let timeEnd = Math.max(...subs.map(sub => {
			const lastSection = sub.typeSections[sub.typeSections.length - 1];
			return lastSection.startTime + lastSection.duration;
		}));
		const roundedStartDate = new Date(timeStart);
		roundedStartDate.setMilliseconds(0);
		roundedStartDate.setSeconds(0);
		roundedStartDate.setMinutes(0);
		roundedStartDate.setHours(roundedStartDate.getHours() - roundedStartDate.getHours() % hourResolution);
		const offset = timeStart - roundedStartDate.getTime();
		timeStart -= offset;
		timeEnd -= offset;
		const timeFrame = timeEnd - timeStart;
		const timeBuckets = Math.ceil(timeFrame / timeResolution);
		// create empty buckets
		const dataset: BarChartDataset = {
			label: "Subreddits",
			groups: new Array(timeBuckets).fill(0).map((_, i) => (<BarGroup> {
				time: (new Date(timeStart + i * timeResolution)).getTime(),
				stacks: <BarStack[]> [
					{
						label: "Total",
						data: <BarData[]> [
							{
								label: "private",
								value: 0,
							},
							{
								label: "restricted",
								value: 0,
							},
						],
					},
					{
						label: "Subscribers",
						data: <BarData[]> [
							{
								label: "private",
								value: 0,
							},
							{
								label: "restricted",
								value: 0,
							},
						],
					},
				],
			}))
		};
		// fill buckets
		// within a bucket only the first section is counted
		for (const sub of subs) {
			let currentBucketI = 0;
			let currentBucketStartTime = timeStart;
			for (const section of sub.typeSections) {
				// find bucket
				while (section.startTime > currentBucketStartTime) {
					currentBucketI++;
					currentBucketStartTime += timeResolution;
				}
				// iterate over all buckets that are covered by the section
				const sectionEndTime = section.startTime + section.duration;
				while (sectionEndTime > currentBucketStartTime) {
					// add to bucket
					const bucket = dataset.groups[currentBucketI];
					const totalStack = bucket.stacks[0];
					const subscribersStack = bucket.stacks[1];
					if (section.type === "private") {
						totalStack.data[0].value++;
						subscribersStack.data[0].value += sub.subscribers;
					} else if (section.type === "restricted") {
						totalStack.data[1].value++;
						subscribersStack.data[1].value += sub.subscribers;
					}
					// next bucket
					currentBucketI++;
					currentBucketStartTime += timeResolution;
				}
			}
		}

		return dataset;
	}
}

customElements.define("reddit-stats-panel-subreddits-bar-chart", Panel_SubredditsBarChart);
