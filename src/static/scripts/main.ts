import {State} from "./state";
import {Panel_RedditPerMinuteActivity} from "./Panel_RedditPerMinuteActivity";
import {Panel_SubredditStatusTimeline} from "./Panel_SubredditStatusTimeline";
import {Panel_SubredditsBarChart} from "./Panel_SubredditsBarChart";
import {Panel_SubOptions} from "./Panel_SubOptions";
import {Panel_SubredditsList} from "./Panel_SubredditsList";
import {LayoutSwitcher} from "./LayoutSwitcher";
import {Panel_Welcome} from "./Panel_Welcome";
import {GlobalLoadingIndicator} from "./GlobalLoadingIndicator";


async function main() {
	const state = new State();
	const welcome = new Panel_Welcome();
	const subOptions = new Panel_SubOptions(state);
	const subredditsBarChart = new Panel_SubredditsBarChart(state);
	const redditPerMinuteActivity = new Panel_RedditPerMinuteActivity(state);
	const subredditsList = new Panel_SubredditsList(state);
	const subredditStatusTimeline = new Panel_SubredditStatusTimeline(state);
	const layout = new LayoutSwitcher([
		{ element: welcome, column: 0, row: 0 },
		{ element: subOptions, column: 0, row: 1 },
		{ element: subredditsBarChart, column: 0, row: 2 },
		{ element: redditPerMinuteActivity, column: 1, row: 0 },
		{ element: subredditsList, column: 0, row: 3 },
		{ element: subredditStatusTimeline, column: 1, row: 1 },
	]);
	const mainElement = document.querySelector("main");
	mainElement.appendChild(layout);
	document.body.append(GlobalLoadingIndicator.instance);
	await state.load();
	state.setRefreshInterval();
}

window.addEventListener("load", async () => {
	await main();
});
