import {LineDataset, Point} from "./LineChart";
import {
	LoggedSubredditType_sections,
	LoggedSubredditType_timestamps,
	SubredditTypeChartDensity,
	TypeSection
} from "./subredditTypesChart";
import {ChangeNotifier} from "./ChangeNotifier";
import {Prop} from "./Prop";
import {debounce} from "./utils";

interface CombinedResponse {
	ppm: Point[];
	cpm: Point[];
	subs: LoggedSubredditType_timestamps[];
}
interface StoredSettings {
	includeSfw: boolean
	includeNsfw: boolean
	subredditsLimit: number
	subredditTypeChartDensity: SubredditTypeChartDensity
}
export class Settings {
	includeSfw: Prop<boolean>;
	includeNsfw: Prop<boolean>;
	subredditsLimit: Prop<number>;
	subredditTypeChartDensity: Prop<SubredditTypeChartDensity>;
	onRequiresRefresh: ChangeNotifier;
	private static LOCAL_STORAGE_KEY = "reddit_stats_settings";

	constructor() {
		this.onRequiresRefresh = new ChangeNotifier();
		this.includeSfw = new Prop(true);
		this.includeNsfw = new Prop(true);
		this.subredditsLimit = new Prop(1500);
		this.subredditTypeChartDensity = new Prop(SubredditTypeChartDensity.tiny);
		this.loadFromLocalStorage();

		this.includeSfw.addListener(() => this.onPropChange(true));
		this.includeNsfw.addListener(() => this.onPropChange(true));
		this.subredditsLimit.addListener(() => this.onPropChange(true));
		this.subredditTypeChartDensity.addListener(() => this.onPropChange(false));
	}

	private loadFromLocalStorage() {
		try {
			const settings = localStorage.getItem(Settings.LOCAL_STORAGE_KEY);
			if (settings) {
				const parsed = JSON.parse(settings);
				this.includeSfw.value = parsed.includeSfw;
				this.includeNsfw.value = parsed.includeNsfw;
				this.subredditsLimit.value = parsed.subredditsLimit;
				this.subredditTypeChartDensity.value = parsed.subredditTypeChartDensity;
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
		}
		localStorage.setItem(Settings.LOCAL_STORAGE_KEY, JSON.stringify(settings));
	}

	private onPropChange(requireRefresh: boolean) {
		this.saveToLocalStorage();
		if (requireRefresh)
			this.onRequiresRefresh.notifyListeners();
	}
}

export class State extends ChangeNotifier {
	settings: Settings;
	ppm: LineDataset;
	cpm: LineDataset;
	subredditTypes: LoggedSubredditType_sections[];

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
	}

	async load(): Promise<void> {
		const params = new URLSearchParams({
			nsfw: this.settings.includeNsfw.value.toString(),
			sfw: this.settings.includeSfw.value.toString(),
			limit: this.settings.subredditsLimit.value.toString(),
		})
		const allRes = await fetch("/api/all?" + params.toString());
		const all = await allRes.json() as CombinedResponse;

		this.ppm.points = all.ppm;
		this.cpm.points = all.cpm;
		// convert timestamps to sections
		this.subredditTypes = all.subs.map(sub => {
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

		this.notifyListeners();
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

	private loadFromLocalStorage(): void {

	}
}
