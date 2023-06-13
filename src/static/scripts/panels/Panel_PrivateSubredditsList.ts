import {State} from "../state";
import {colorOfSubType, makeElement, numberToShort, timePeriodReadable} from "../utils";
import {LoggedSubredditType_sections} from "../charts/subredditTypesChart";
import {Panel_TableData} from "./Panel_TableData";

interface PrivateSubData {
	subreddit: string;
	subscribers: number;
	isNsfw: boolean;
	type: string;
	privateFor: number;
}

export class Panel_PrivateSubredditsList extends Panel_TableData<PrivateSubData> {
	constructor(state: State) {
		super(
			state,
			"Private Subreddits",
			["subreddit", "subscribers", "type", "privateFor"],
			["Subreddit", "Subscribers", "Type", "Private For"],
			3
		);
	}

	protected makeRow(sub: PrivateSubData): HTMLElement {
		const tr = makeElement("tr");
		const tdSub = makeElement("td", {}, sub.subreddit);
		const tdSubs = makeElement("td", {}, numberToShort(sub.subscribers));
		const tdType = makeElement("td", {class: "type", style: `--color: ${colorOfSubType(sub.type)}`}, sub.type);
		const tdPrivateFor = makeElement("td", {}, timePeriodReadable(sub.privateFor / 1000));
		tr.append(tdSub, tdSubs, tdType, tdPrivateFor);
		return tr;
	}

	protected transformData(subredditTypes: LoggedSubredditType_sections[]): PrivateSubData[] {
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

}

customElements.define("panel-private-subreddits-list", Panel_PrivateSubredditsList);
