import {State} from "./state";
import {Panel_RedditPerMinuteActivity} from "./Panel_RedditPerMinuteActivity";
import {Panel_SubredditStatusTimeline} from "./Panel_SubredditStatusTimeline";


async function main() {
	const state = new State();
	await state.load();
	state.setRefreshInterval();
	const panels: HTMLElement[] = [
		new Panel_RedditPerMinuteActivity(state),
		new Panel_SubredditStatusTimeline(state),
	];
	document.getElementById("panels")!.append(...panels);
}

window.addEventListener("load", async () => {
	await main();
});
