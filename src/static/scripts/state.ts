import {LineDataset, Point} from "./charts/LineChart";
import {LoggedSubredditType_sections, SubredditTypeChartDensity} from "./charts/subredditTypesChart";
import {ChangeNotifier} from "./ChangeNotifier";
import {Prop} from "./Prop";
import {colorOfSubType, debounce, deepCopy, formatPercent, numberToShort} from "./utils";
import {BarChartDataset, BarData, BarGroup, BarStack, BarYAxisFormat} from "./charts/BarChart";
import {SubredditsBarChartCategory} from "./panels/Panel_SubredditsBarChart";
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
	startDate: number|null;
	endDate: number|null;
	smoothPerMinuteData: boolean;
}
export class Settings {
	includeSfw: Prop<boolean>;
	includeNsfw: Prop<boolean>;
	subredditsLimit: Prop<number>;
	subredditTypeChartDensity: Prop<SubredditTypeChartDensity>;
	subredditsBarChartCategory: Prop<SubredditsBarChartCategory>;
	startDate: Prop<number|null>;
	endDate: Prop<number|null>;
	smoothPerMinuteData: Prop<boolean>;
	perMinuteResolution: Prop<number>;
	onActivityRequiresRefresh: ChangeNotifier;
	onSubsRequiresRefresh: ChangeNotifier;
	private static LOCAL_STORAGE_KEY = "reddit_stats_settings";

	constructor() {
		this.onActivityRequiresRefresh = new ChangeNotifier();
		this.onSubsRequiresRefresh = new ChangeNotifier();
		this.includeSfw = new Prop(true);
		this.includeNsfw = new Prop(false);
		this.subredditsLimit = new Prop(1500);
		this.subredditTypeChartDensity = new Prop(SubredditTypeChartDensity.small);
		this.subredditsBarChartCategory = new Prop(SubredditsBarChartCategory.count);
		this.startDate = new Prop(null);
		this.endDate = new Prop(null);
		this.smoothPerMinuteData = new Prop(true);
		this.loadFromLocalStorage();

		this.includeSfw.addListener(() => this.onSubredditPropChange(true));
		this.includeNsfw.addListener(() => this.onSubredditPropChange(true));
		this.subredditsLimit.addListener(() => this.onSubredditPropChange(true));
		this.subredditTypeChartDensity.addListener(() => this.onSubredditPropChange(true));
		this.subredditsBarChartCategory.addListener(() => this.onSubredditPropChange(false));
		this.startDate.addListener(() => this.onDatePropChange());
		this.endDate.addListener(() => this.onDatePropChange());
		this.smoothPerMinuteData.addListener(() => this.onActivityPropChange());
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
				this.startDate.value = parsed.startDate ?? this.startDate.value;
				this.endDate.value = parsed.endDate ?? this.endDate.value;
				this.smoothPerMinuteData.value = parsed.smoothPerMinuteData ?? this.smoothPerMinuteData.value;
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
			startDate: this.startDate.value,
			endDate: this.endDate.value,
			smoothPerMinuteData: this.smoothPerMinuteData.value,
		}
		localStorage.setItem(Settings.LOCAL_STORAGE_KEY, JSON.stringify(settings));
	}

	private onSubredditPropChange(requireRefresh: boolean) {
		this.saveToLocalStorage();
		if (requireRefresh)
			this.onSubsRequiresRefresh.notifyListeners();
	}

	private onDatePropChange() {
		this.saveToLocalStorage();
		this.onActivityRequiresRefresh.notifyListeners();
	}

	private onActivityPropChange() {
		this.saveToLocalStorage();
	}
}

type GroupedSubredditBarChartDataSets = { [category in SubredditsBarChartCategory]?: BarChartDataset; };

export class State extends ChangeNotifier {
	settings: Settings;
	ppmFull: LineDataset;
	cpmFull: LineDataset;
	ppmFiltered: LineDataset;
	cpmFiltered: LineDataset;
	subredditTypesFull: LoggedSubredditType_sections[];
	subredditsBarChartsFull: GroupedSubredditBarChartDataSets
	subredditTypesFiltered: LoggedSubredditType_sections[];
	subredditsBarChartsFiltered: GroupedSubredditBarChartDataSets

	private refreshInterval: NodeJS.Timeout | null = null;

	constructor() {
		super();

		this.settings = new Settings();
		this.settings.onSubsRequiresRefresh.addListener(debounce(this.loadSubs.bind(this), 500));
		this.settings.onActivityRequiresRefresh.addListener(debounce(this.loadActivity.bind(this), 500));
		this.settings.startDate.addListener(this.onDateChange.bind(this));
		this.settings.endDate.addListener(this.onDateChange.bind(this));

		this.ppmFull = {
			name: "Posts",
			yLabel: "Posts per minute",
			points: [],
		};
		this.cpmFull = {
			name: "Comments",
			yLabel: "Comments per minute",
			points: [],
		};
		this.ppmFiltered = deepCopy(this.ppmFull);
		this.cpmFiltered = deepCopy(this.cpmFull);
		this.subredditTypesFull = [];
		this.subredditsBarChartsFull = this.transformSubsData(this.subredditTypesFull);
		this.subredditTypesFiltered = [];
		this.subredditsBarChartsFiltered = this.transformSubsData(this.subredditTypesFiltered);
		this.filterSubsData();
		this.filterActivityData();
	}

	async loadAll(): Promise<void> {
		await Promise.all([
			this.loadActivity(),
			this.loadSubs(),
		]);
		this.notifyListeners();
	}

	private async loadSubs(): Promise<void> {
		const params = new URLSearchParams({
			nsfw: this.settings.includeNsfw.value.toString(),
			sfw: this.settings.includeSfw.value.toString(),
			limit: this.settings.subredditsLimit.value.toString(),
		});
		let res: Response;
		try {
			GlobalLoadingIndicator.pushIsLoading();
			res = await fetch("/api/subredditTypes?" + params.toString());
		} finally {
			GlobalLoadingIndicator.popIsLoading();
		}
		const subsData = await res.json() as LoggedSubredditType_sections[];

		// convert timestamps to sections
		this.subredditTypesFull = subsData;
		this.subredditsBarChartsFull = this.transformSubsData(this.subredditTypesFull);
		this.filterSubsData();

		this.notifyListeners();
	}

	private async loadActivity(): Promise<void> {
		const params = new URLSearchParams({
			resolution: window.innerWidth.toString(),
		});
		if (this.settings.startDate.value != null)
			params.set("minCreated", `${this.settings.startDate.value / 1000}`);
		if (this.settings.endDate.value != null)
			params.set("maxCreated", `${this.settings.endDate.value / 1000}`);
		let allRes: Response[];
		try {
			GlobalLoadingIndicator.pushIsLoading();
			allRes = await Promise.all([
				fetch("/api/postsPerMinute?" + params.toString()),
				fetch("/api/commentsPerMinute?" + params.toString()),
			]);
		} finally {
			GlobalLoadingIndicator.popIsLoading();
		}
		const [ppm, cpm] = (await Promise.all([
			allRes[0].json(),
			allRes[1].json(),
		])) as Point[][];

		this.ppmFull.points = ppm;
		this.cpmFull.points = cpm;
		this.filterActivityData();

		this.notifyListeners();
	}

	private transformSubsData(subs: LoggedSubredditType_sections[]): GroupedSubredditBarChartDataSets {
		// transform subreddit type timestamps into stacked bar groups
		// each group is a timestamp bucket
		// each group has the groups/stacks: total subs, sum of sub subscribers
		// each stack has the following bars: private, restricted
		// public subs are not shown
		let timeStart = Math.min(...subs.map(sub => sub.typeSections[0].startTime));
		let timeEnd = Math.max(...subs.map(sub => {
			const lastSection = sub.typeSections[sub.typeSections.length - 1];
			return lastSection.startTime + lastSection.duration;
		}));
		const timeResolution = 1000 * 60 * 60 * 4;
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
			// timeEnd = 0;
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
		const relativeDataset = createEmptyDataset("% of Total", "", formatPercent);
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

	private filterSubsData(): void {
		if (this.settings.startDate.value == null && this.settings.endDate.value == null) {
			this.subredditTypesFiltered = this.subredditTypesFull;
			this.subredditsBarChartsFiltered = copyGroupedSubredditBarChartDataSets(this.subredditsBarChartsFull);
			return;
		}

		const startDate = this.settings.startDate.value || 0;
		const endDate = this.settings.endDate.value || Number.MAX_SAFE_INTEGER;
		this.subredditTypesFiltered = deepCopy(this.subredditTypesFull).map(sub => {
			sub.typeSections = sub.typeSections.filter(section => section.startTime + section.duration >= startDate && section.startTime <= endDate);
			for (const section of sub.typeSections) {
				if (startDate != 0) {
					if (section.startTime < startDate) {
						section.duration -= startDate - section.startTime;
						section.startTime = startDate;
					}
				}
				if (endDate != Number.MAX_SAFE_INTEGER) {
					if (section.startTime + section.duration > endDate) {
						section.duration -= section.startTime + section.duration - endDate;
					}
				}
			}
			return sub;
		});
		for (const category in this.subredditsBarChartsFull) {
			const fullDataset = this.subredditsBarChartsFull[category];
			const filteredDataset = this.subredditsBarChartsFiltered[category];
			filteredDataset.groups = fullDataset.groups.filter(group => group.time >= startDate && group.time <= endDate);
		}
	}

	private filterActivityData(): void {
		const cutoffThreshold = 50_000;
		const ppm = this.ppmFull.points.filter(point => point.y < cutoffThreshold);
		const cpm = this.cpmFull.points.filter(point => point.y < cutoffThreshold);
		if (this.settings.startDate.value == null && this.settings.endDate.value == null) {
			this.ppmFiltered.points = ppm;
			this.cpmFiltered.points = cpm;
			return;
		}

		const startDate = this.settings.startDate.value || 0;
		const endDate = this.settings.endDate.value || Number.MAX_SAFE_INTEGER;
		this.ppmFiltered.points = ppm.filter(point => point.x >= startDate && point.x <= endDate);
		this.cpmFiltered.points = cpm.filter(point => point.x >= startDate && point.x <= endDate);
	}

	private onDateChange(): void {
		this.filterSubsData();
		this.filterActivityData();
		this.loadActivity();
		this.notifyListeners();
	}

	setRefreshInterval(interval: number = 1000 * 60): void {
		if (this.refreshInterval !== null)
			clearInterval(this.refreshInterval);
		this.refreshInterval = setInterval(() => this.loadAll(), interval);
	}

	clearRefreshInterval(): void {
		if (this.refreshInterval !== null)
			clearInterval(this.refreshInterval);
		this.refreshInterval = null;
	}
}

function copyGroupedSubredditBarChartDataSets(data: GroupedSubredditBarChartDataSets): GroupedSubredditBarChartDataSets {
	const result: GroupedSubredditBarChartDataSets = {};
	for (const key in data)
		result[key] = copyBarChartData(data[key]);
	return result;
}

function copyBarChartData(data: BarChartDataset): BarChartDataset {
	return {
		label: data.label,
		padding: data.padding,
		yAxisFormat: data.yAxisFormat,
		colorOf: data.colorOf,
		groups: deepCopy(data.groups),
	}
}
