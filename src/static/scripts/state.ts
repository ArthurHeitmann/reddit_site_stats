import {LineDataset, Point} from "./LineChart";
import {LoggedSubredditType_sections, LoggedSubredditType_timestamps, TypeSection} from "./subredditTypesChart";

interface CombinedResponse {
	ppm: Point[];
	cpm: Point[];
	subs: LoggedSubredditType_timestamps[];
}

export class State {
	includeSfw: boolean;
	includeNsfw: boolean;
	subredditsLimit: number;

	ppm: LineDataset;
	cpm: LineDataset;
	subredditTypes: LoggedSubredditType_sections[];

	private listeners: (() => void)[] = [];
	private refreshInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.includeSfw = true;
		this.includeNsfw = true;
		this.subredditsLimit = 10;

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
			nsfw: this.includeNsfw.toString(),
			sfw: this.includeSfw.toString(),
			limit: this.subredditsLimit.toString(),
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

	addListener(listener: () => void): void {
		this.listeners.push(listener);
	}

	removeListener(listener: () => void): void {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (e) {
				console.error(e);
			}
		}
	}
}
