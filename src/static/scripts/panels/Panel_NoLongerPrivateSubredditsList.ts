import {State} from "../state";
import {makeElement, numberToShort, timePeriodReadable} from "../utils";
import {LoggedSubredditType_sections} from "../charts/subredditTypesChart";
import {Panel_TableData} from "./Panel_TableData";

interface NoLongerPrivateSubData {
	subreddit: string;
	subscribers: number;
	isNsfw: boolean;
	wasPrivateFor: number;
	publicFor: number;
}

export class Panel_NoLongerPrivateSubredditsList extends Panel_TableData<NoLongerPrivateSubData> {
	constructor(state: State) {
		super(
			state,
			"Subreddits out of blackout",
			["subreddit", "subscribers", "wasPrivateFor", "publicFor"],
			["Subreddit", "Subscribers", "Blackout duration", "Public for"],
			3
		);
	}

	protected makeRow(sub: NoLongerPrivateSubData): HTMLElement {
		const tr = makeElement("tr");
		const tdSub = makeElement("td", {}, sub.subreddit);
		const tdSubs = makeElement("td", {}, numberToShort(sub.subscribers));
		const tdPrivateTime = makeElement("td", {}, timePeriodReadable(sub.wasPrivateFor / 1000));
		const tdPublicTime = makeElement("td", {}, timePeriodReadable(sub.publicFor / 1000));
		tr.append(tdSub, tdSubs, tdPrivateTime, tdPublicTime);
		return tr;
	}

	protected transformData(subredditTypes: LoggedSubredditType_sections[]): NoLongerPrivateSubData[] {
		const restrictionTypes = ["private", "restricted"];
		const data: NoLongerPrivateSubData[] = [];
		for (const sub of subredditTypes) {
			const lastSection = sub.typeSections[sub.typeSections.length - 1];
			if (restrictionTypes.includes(lastSection.type))
				continue;
			const totalTimeRestricted = sub.typeSections
				.filter(section => restrictionTypes.includes(section.type))
				.reduce((acc, section) => acc + section.duration, 0);
			const privateTimeThreshold = 1000 * 60 * 60;
			if (totalTimeRestricted < privateTimeThreshold)
				continue;

			data.push({
				subreddit: sub.name,
				subscribers: sub.subscribers,
				isNsfw: sub.isNsfw,
				wasPrivateFor: totalTimeRestricted,
				publicFor: lastSection.duration,
			});
		}
		return data;
	}
}

customElements.define("panel-no-longer-subreddits-list", Panel_NoLongerPrivateSubredditsList);
