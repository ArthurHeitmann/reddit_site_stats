import {LineDataset, Point} from "./LineChart";
import {LoggedSubredditType_sections, SubredditTypeChartDensity} from "./subredditTypesChart";
import {ChangeNotifier} from "./ChangeNotifier";
import {Prop} from "./Prop";
import {colorOfSubType, debounce, formatPercent, numberToShort} from "./utils";
import {BarChartDataset, BarData, BarGroup, BarStack, BarYAxisFormat} from "./BarChart";
import {SubredditsBarChartCategory} from "./Panel_SubredditsBarChart";
import {GlobalLoadingIndicator} from "./GlobalLoadingIndicator";

interface CombinedResponse {
	ppm: Point[];
	cpm: Point[];
	subs: LoggedSubredditType_sections[];
}
interface StoredSettings {
	includeSfw: boolean;
	includeNsfw: boolean;
	subredditsLimit: number;
	subredditTypeChartDensity: SubredditTypeChartDensity;
	subredditsBarChartCategory: SubredditsBarChartCategory;
}
export class Settings {
	includeSfw: Prop<boolean>;
	includeNsfw: Prop<boolean>;
	subredditsLimit: Prop<number>;
	subredditTypeChartDensity: Prop<SubredditTypeChartDensity>;
	subredditsBarChartCategory: Prop<SubredditsBarChartCategory>;
	onRequiresRefresh: ChangeNotifier;
	private static LOCAL_STORAGE_KEY = "reddit_stats_settings";

	constructor() {
		this.onRequiresRefresh = new ChangeNotifier();
		this.includeSfw = new Prop(true);
		this.includeNsfw = new Prop(false);
		this.subredditsLimit = new Prop(500);
		this.subredditTypeChartDensity = new Prop(SubredditTypeChartDensity.small);
		this.subredditsBarChartCategory = new Prop(SubredditsBarChartCategory.count);
		this.loadFromLocalStorage();

		this.includeSfw.addListener(() => this.onPropChange(true));
		this.includeNsfw.addListener(() => this.onPropChange(true));
		this.subredditsLimit.addListener(() => this.onPropChange(true));
		this.subredditTypeChartDensity.addListener(() => this.onPropChange(false));
		this.subredditsBarChartCategory.addListener(() => this.onPropChange(false));
	}

	private loadFromLocalStorage() {
		try {
			const settings = localStorage.getItem(Settings.LOCAL_STORAGE_KEY);
			if (settings) {
				const parsed = JSON.parse(settings);
				this.includeSfw.value = parsed.includeSfw ?? this.includeSfw.value
				this.includeNsfw.value = parsed.includeNsfw ?? this.includeNsfw.value;
				this.subredditsLimit.value = parsed.subredditsLimit ?? this.subredditsLimit.value;
				this.subredditTypeChartDensity.value = parsed.subredditTypeChartDensity ?? this.subredditTypeChartDensity.value;
				this.subredditsBarChartCategory.value = parsed.subredditsBarChartCategory ?? this.subredditsBarChartCategory.value;
			}
		} catch (e) {
			console.error(e);
		}
	}

	private saveToLocalStorage() {
		const settings: StoredSettings = {
			includeSfw: this.includeSfw.value,
			includeNsfw: this.includeNsfw.value,
			subredditsLimit: this.subredditsLimit.value,
			subredditTypeChartDensity: this.subredditTypeChartDensity.value,
			subredditsBarChartCategory: this.subredditsBarChartCategory.value,
		}
		localStorage.setItem(Settings.LOCAL_STORAGE_KEY, JSON.stringify(settings));
	}

	private onPropChange(requireRefresh: boolean) {
		this.saveToLocalStorage();
		if (requireRefresh)
			this.onRequiresRefresh.notifyListeners();
	}
}

type GroupedSubredditBarChartDataSets = { [category in SubredditsBarChartCategory]?: BarChartDataset; };

export class State extends ChangeNotifier {
	settings: Settings;
	ppm: LineDataset;
	cpm: LineDataset;
	subredditTypes: LoggedSubredditType_sections[];
	subredditsBarCharts: GroupedSubredditBarChartDataSets

	private refreshInterval: NodeJS.Timeout | null = null;

	constructor() {
		super();

		this.settings = new Settings();
		this.settings.onRequiresRefresh.addListener(debounce(this.load.bind(this), 500));

		this.ppm = {
			name: "Posts per minute",
			points: [],
		};
		this.cpm = {
			name: "Comments per minute",
			points: [],
		};
		this.subredditTypes = [];
		this.subredditsBarCharts = this.transformSubsData(this.subredditTypes);
	}

	async load(): Promise<void> {
		const params = new URLSearchParams({
			nsfw: this.settings.includeNsfw.value.toString(),
			sfw: this.settings.includeSfw.value.toString(),
			limit: this.settings.subredditsLimit.value.toString(),
		});
		let allRes: Response;
		try {
			GlobalLoadingIndicator.pushIsLoading();
			allRes = await fetch("/api/all?" + params.toString());
		} finally {
			GlobalLoadingIndicator.popIsLoading();
		}
		const all = await allRes.json() as CombinedResponse;

		this.ppm.points = all.ppm;
		this.cpm.points = all.cpm;
		// convert timestamps to sections
		this.subredditTypes = all.subs;
		this.subredditsBarCharts = this.transformSubsData(this.subredditTypes);

		this.notifyListeners();
	}

	private transformSubsData(subs: LoggedSubredditType_sections[]): GroupedSubredditBarChartDataSets {
		// transform subreddit type timestamps into stacked bar groups
		// each group is a timestamp bucket
		// each group has the groups/stacks: total subs, sum of sub subscribers
		// each stack has the following bars: private, restricted
		// public subs are not shown
		// const hourResolution = 1;
		const timeResolution = 1000 * 60 * 30;
		let timeStart = Math.min(...subs.map(sub => sub.typeSections[0].startTime));
		let timeEnd = Math.max(...subs.map(sub => {
			const lastSection = sub.typeSections[sub.typeSections.length - 1];
			return lastSection.startTime + lastSection.duration;
		}));
		function roundDateToHour(timestamp: number, roundDown = true): Date {
			const date = new Date(timestamp);
			date.setMilliseconds(0);
			date.setSeconds(0);
			date.setMinutes(0);
			if (roundDown)
				date.setHours(date.getHours());
			else
				date.setHours(date.getHours() + 1);
			return date;
		}
		const roundedStartDate = roundDateToHour(timeStart);
		const startOffset = timeStart - roundedStartDate.getTime();
		timeStart -= startOffset;
		const roundedEndDate = roundDateToHour(timeEnd, false);
		const endOffset = roundedEndDate.getTime() - timeEnd;
		timeEnd += endOffset;
		let timeFrame = timeEnd - timeStart;
		if (isNaN(timeFrame)) {
			timeStart = 0;
			timeEnd = 0;
			timeFrame = 0;
		}
		const timeBuckets = Math.ceil(timeFrame / timeResolution);
		// create empty buckets
		function createEmptyDataset(datasetName: string, category: string, numberFormat?: BarYAxisFormat): BarChartDataset {
			return {
				label: datasetName,
				colorOf: colorOfSubType,
				yAxisFormat: numberFormat ? [numberFormat] : undefined,
				groups: new Array(timeBuckets).fill(0).map((_, i) => (<BarGroup>{
					time: (new Date(timeStart + i * timeResolution)).getTime(),
					stacks: <BarStack[]>[
						{
							label: category,
							data: <BarData[]>[
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
		}
		const totalDataset = createEmptyDataset("Total Subreddits", "Total", numberToShort);
		const relativeDataset = createEmptyDataset("% of Total", "Relative", formatPercent);
		const subscribersDataset = createEmptyDataset("Total Subreddit Subscribers", "Subscribers", numberToShort);
		const datasets: GroupedSubredditBarChartDataSets = {
			[SubredditsBarChartCategory.count]: totalDataset,
			[SubredditsBarChartCategory.percent]: relativeDataset,
			[SubredditsBarChartCategory.subscribers]: subscribersDataset,
		}
		function addToDataset(key: SubredditsBarChartCategory, bucketI: number, categoryI: number, value: number) {
			const dataset = datasets[key];
			const bucket = dataset.groups[bucketI];
			const stack = bucket.stacks[0];
			const data = stack.data;
			data[categoryI].value += value;
		}
		const categoryToIndex = {
			"private": 0,
			"restricted": 1,
		}
		const oneSubPercent = 1 / subs.length;
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
					// add to buckets
					const categoryI = categoryToIndex[section.type];
					if (categoryI !== undefined) {
						addToDataset(SubredditsBarChartCategory.count, currentBucketI, categoryI, 1);
						addToDataset(SubredditsBarChartCategory.percent, currentBucketI, categoryI, oneSubPercent);
						addToDataset(SubredditsBarChartCategory.subscribers, currentBucketI, categoryI, sub.subscribers);
					}
					// next bucket
					currentBucketI++;
					currentBucketStartTime += timeResolution;
				}
			}
		}

		return datasets;
	}

	setRefreshInterval(interval: number = 1000 * 60): void {
		if (this.refreshInterval !== null)
			clearInterval(this.refreshInterval);
		this.refreshInterval = setInterval(() => this.load(), interval);
	}

	clearRefreshInterval(): void {
		if (this.refreshInterval !== null)
			clearInterval(this.refreshInterval);
		this.refreshInterval = null;
	}
}
