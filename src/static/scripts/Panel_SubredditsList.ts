import {State} from "./state";
import {colorOfSubType, makeElement, numberToShort, timePeriodReadable} from "./utils";
import {LoggedSubredditType_sections} from "./subredditTypesChart";

interface PrivateSubData {
	subreddit: string;
	subscribers: number;
	isNsfw: boolean;
	type: string;
	privateFor: number;
}
const columnIndexToKey = [
	"subreddit",
	"subscribers",
	"type",
	"privateFor",
]

export class Panel_SubredditsList extends HTMLElement {
	state: State;
	content: HTMLElement;
	data: PrivateSubData[] = [];
	sortColumnIndex: number|null = null;
	sortAscending: boolean = true;

	constructor(state: State) {
		super();
		this.state = state;
		this.state.addListener(() => {
			this.data = this.transformData(state.subredditTypes);
			this.display();
		});
		this.data = this.transformData(state.subredditTypes);
		this.sortColumnIndex = 3;

		this.classList.add("panel");
		this.append(makeElement("h2", {}, "Private Subreddits"));
		this.content = makeElement("div", {class: "content table-wrapper"});
		this.append(this.content);

		this.display();
	}

	display() {
		this.content.innerText = "";
		const table = makeElement("table", {class: "subreddits-list"});
		const thead = makeElement("thead");
		const tbody = makeElement("tbody");
		const trHead = makeElement("tr");
		const columnHeaderNames = ["Subreddit", "Subscribers", "Type", "Private For"];
		const columnHeaders: HTMLElement[] = columnHeaderNames.map((name, i) => {
			const th = makeElement("th", {
				class: "sortable",
				onclick: () => this.sort(i),
			}, name);
			let indicatorText: string;
			if (this.sortColumnIndex === i)
				indicatorText = this.sortAscending ? "▲" : "▼";
			else
				indicatorText = "▲▼";
			th.append(makeElement(
				"span",
				{class: "sort-indicator" + (this.sortColumnIndex === i ? " active" : "")},
				indicatorText
			));
			return th;
		});
		trHead.append(...columnHeaders);
		thead.append(trHead);
		table.append(thead, tbody);
		for (const sub of this.getSortedData()) {
			const tr = makeElement("tr");
			const tdSub = makeElement("td", {}, sub.subreddit);
			const tdSubs = makeElement("td", {}, numberToShort(sub.subscribers));
			const tdType = makeElement("td", {class: "type", style: `--color: ${colorOfSubType(sub.type)}`}, sub.type);
			const tdPrivateFor = makeElement("td", {}, timePeriodReadable(sub.privateFor / 1000));
			tr.append(tdSub, tdSubs, tdType, tdPrivateFor);
			tbody.append(tr);
		}
		this.content.append(table);
	}

	private transformData(subredditTypes: LoggedSubredditType_sections[]): PrivateSubData[] {
		const restrictionTypes = ["private", "restricted"];
		const data: PrivateSubData[] = [];
		for (const sub of subredditTypes) {
			const lastSection = sub.typeSections[sub.typeSections.length - 1];
			if (!restrictionTypes.includes(lastSection.type))
				continue;
			const privateSince = lastSection.startTime;
			const privateFor = Date.now() - privateSince;
			data.push({
				subreddit: sub.name,
				subscribers: sub.subscribers,
				isNsfw: sub.isNsfw,
				type: lastSection.type,
				privateFor: privateFor,
			});
		}
		return data;
	}

	private getSortedData(): PrivateSubData[] {
		if (this.sortColumnIndex === null)
			return this.data;
		const sortColumnIndex = this.sortColumnIndex;
		const sortAscending = this.sortAscending;
		return this.data.sort((a, b) => {
			let aValue = a[columnIndexToKey[sortColumnIndex]];
			let bValue = b[columnIndexToKey[sortColumnIndex]];
			if (typeof aValue === "string" && typeof bValue === "string") {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}
			if (aValue < bValue)
				return sortAscending ? -1 : 1;
			if (aValue > bValue)
				return sortAscending ? 1 : -1;
			return 0;
		});
	}

	private sort(columnIndex: number) {
		if (this.sortColumnIndex === columnIndex) {
			if (this.sortAscending)
				this.sortAscending = false;
			else
				this.sortColumnIndex = null;
		} else {
			this.sortColumnIndex = columnIndex;
			this.sortAscending = true;
		}
		this.display();
	}
}

customElements.define("panel-subreddits-list", Panel_SubredditsList);
