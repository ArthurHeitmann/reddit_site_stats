import {State} from "../state";
import {makeElement} from "../utils";
import {LoggedSubredditType_sections} from "../charts/subredditTypesChart";

export abstract class Panel_TableData<T> extends HTMLElement {
	private state: State;
	private readonly columnIndexToKey: string[];
	private readonly columnHeaderNames: string[];
	private readonly content: HTMLElement;
	private data: T[] = [];
	private sortColumnIndex: number|null = null;
	private sortAscending: boolean = true;

	constructor(
		state: State,
		title: string,
		columnIndexToKey: string[],
		columnHeaderNames: string[],
		sortColumnIndex: number|null = null
	) {
		super();
		this.state = state;
		this.columnIndexToKey = columnIndexToKey;
		this.columnHeaderNames = columnHeaderNames;
		this.sortColumnIndex = sortColumnIndex;
		this.state.addListener(() => {
			this.data = this.transformData(state.subredditTypes);
			this.display();
		});
		this.data = this.transformData(state.subredditTypes);

		this.classList.add("panel");
		this.append(makeElement("h2", {}, title));
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
		const columnHeaders: HTMLElement[] = this.columnHeaderNames.map((name, i) => {
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
			tbody.append(this.makeRow(sub));
		}
		this.content.append(table);
	}

	protected abstract makeRow(sub: T): HTMLElement;

	protected abstract transformData(subredditTypes: LoggedSubredditType_sections[]): T[];

	private getSortedData(): T[] {
		if (this.sortColumnIndex === null)
			return this.data;
		const sortColumnIndex = this.sortColumnIndex;
		const sortAscending = this.sortAscending;
		return this.data.sort((a, b) => {
			let aValue = a[this.columnIndexToKey[sortColumnIndex]];
			let bValue = b[this.columnIndexToKey[sortColumnIndex]];
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
