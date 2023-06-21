import {State} from "../state";
import {colorOfSubType, makeElement, numberToShort, timePeriodReadable} from "../utils";
import {LoggedSubredditType_sections} from "../charts/subredditTypesChart";
import {Panel_TableData} from "./Panel_TableData";
import {SubredditType} from "../../../redditTypes";

interface ArchivedSubData {
	subreddit: string;
	subscribers: number;
	isNsfw: boolean;
	wasArchivedFor: number;
	currentState: SubredditType;
}

export class Panel_ArchivedSubredditsList extends Panel_TableData<ArchivedSubData> {
	constructor(state: State) {
		super(
			state,
			"Subreddits that are or were archived",
			["subreddit", "subscribers", "wasArchivedFor", "currentState"],
			["Subreddit", "Subscribers", "Archived for", "Currently is"],
			null
		);
	}

	protected makeRow(sub: ArchivedSubData): HTMLElement {
		const tr = makeElement("tr");
		const tdSub = makeElement("td", {}, sub.subreddit);
		const tdSubs = makeElement("td", {}, numberToShort(sub.subscribers));
		const tdPrivateTime = makeElement("td", {}, timePeriodReadable(sub.wasArchivedFor / 1000));
		const tdPublicTime = makeElement("td", {}, [
			makeElement("div", {class: "item"}, [
				makeElement("div", {class: "color-box", style: `--color: ${colorOfSubType(sub.currentState)}`}),
				makeElement("div", {class: "label"}, sub.currentState),
			])
		]);
		tr.append(tdSub, tdSubs, tdPrivateTime, tdPublicTime);
		return tr;
	}

	protected transformData(subredditTypes: LoggedSubredditType_sections[]): ArchivedSubData[] {
		const data: ArchivedSubData[] = [];
		for (const sub of subredditTypes) {
			const totalTimeArchived = sub.typeSections
				.filter(section => section.type == "archived")
				.reduce((acc, section) => acc + section.duration, 0);
			if (totalTimeArchived == 0)
				continue;
			const privateTimeThreshold = 1000 * 60 * 60;
			if (totalTimeArchived < privateTimeThreshold)
				continue;

			data.push({
				subreddit: sub.name,
				subscribers: sub.subscribers,
				isNsfw: sub.isNsfw,
				wasArchivedFor: totalTimeArchived,
				currentState: sub.typeSections[sub.typeSections.length - 1].type,
			});
		}
		return data;
	}
}

customElements.define("panel-archived-subreddits-list", Panel_ArchivedSubredditsList);
