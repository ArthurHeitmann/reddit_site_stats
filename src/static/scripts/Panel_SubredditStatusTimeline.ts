import {State} from "./state";
import {SubredditTypeActivityChart} from "./subredditTypesChart";
import {makeElement} from "./utils";

export class Panel_SubredditStatusTimeline extends HTMLElement {
	state: State;
	chart: SubredditTypeActivityChart;

	constructor(state: State) {
		super();
		this.state = state;
		this.state.addListener(() => this.chart.updateData(this.state.subredditTypes));

		this.classList.add("panel");
		this.classList.add("subreddit-status-timeline");

		this.append(makeElement("div", {class: "options"}, [

		]));
	}

	connectedCallback() {
		this.chart = new SubredditTypeActivityChart({
			data: this.state.subredditTypes,
			element: this,
			title: "Subreddit status",
			xLabel: "Time",
			density: this.state.settings.subredditTypeChartDensity.value,
		});
		this.chart.createChart();
	}
}

customElements.define("panel-subreddit-status-timeline", Panel_SubredditStatusTimeline);
