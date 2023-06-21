import {State} from "./state";
import {Panel_RedditPerMinuteActivity} from "./panels/Panel_RedditPerMinuteActivity";
import {Panel_SubredditStatusTimeline} from "./panels/Panel_SubredditStatusTimeline";
import {Panel_SubredditsBarChart} from "./panels/Panel_SubredditsBarChart";
import {Panel_SubOptions} from "./panels/Panel_SubOptions";
import {Panel_PrivateSubredditsList} from "./panels/Panel_PrivateSubredditsList";
import {LayoutSwitcher} from "./LayoutSwitcher";
import {Panel_Welcome} from "./panels/Panel_Welcome";
import {GlobalLoadingIndicator} from "./GlobalLoadingIndicator";
import {Panel_NoLongerPrivateSubredditsList} from "./panels/Panel_NoLongerPrivateSubredditsList";
import {Panel_ArchivedSubredditsList} from "./panels/Panel_ArchivedSubreddits";
import {Panel_Changelog} from "./panels/Panel_Changelog";


async function main() {
	const state = new State();
	const welcome = new Panel_Welcome();
	const changelog = new Panel_Changelog();
	const subOptions = new Panel_SubOptions(state);
	const subredditsBarChart = new Panel_SubredditsBarChart(state);
	const redditPerMinuteActivity = new Panel_RedditPerMinuteActivity(state);
	const privateSubredditsList = new Panel_PrivateSubredditsList(state);
	const noLongerPrivateSubredditsList = new Panel_NoLongerPrivateSubredditsList(state);
	const archivedSubredditsList = new Panel_ArchivedSubredditsList(state);
	const subredditStatusTimeline = new Panel_SubredditStatusTimeline(state);
	const layout = new LayoutSwitcher([
		{ element: welcome, column: 0, row: 0 },
		{ element: changelog, column: 0, row: 1 },
		{ element: subOptions, column: 0, row: 2 },
		{ element: subredditsBarChart, column: 0, row: 3 },
		{ element: redditPerMinuteActivity, column: 1, row: 0 },
		{ element: privateSubredditsList, column: 0, row: 4 },
		{ element: noLongerPrivateSubredditsList, column: 0, row: 5 },
		{ element: archivedSubredditsList, column: 0, row: 6 },
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
