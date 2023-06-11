import {State} from "./state";
import {Panel_RedditPerMinuteActivity} from "./Panel_RedditPerMinuteActivity";
import {Panel_SubredditStatusTimeline} from "./Panel_SubredditStatusTimeline";
import {Panel_SubredditsBarChart} from "./Panel_SubredditsBarChart";
import {Panel_SubOptions} from "./Panel_SubOptions";


async function main() {
	const state = new State();
	const panels: HTMLElement[] = [
		new Panel_RedditPerMinuteActivity(state),
		new Panel_SubOptions(state),
		new Panel_SubredditsBarChart(state),
		new Panel_SubredditStatusTimeline(state),
	];
	document.getElementById("panels")!.append(...panels);
	await state.load();
	state.setRefreshInterval();
}

window.addEventListener("load", async () => {
	await main();
});
