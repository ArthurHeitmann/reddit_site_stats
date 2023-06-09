import {State} from "./state";
import {LineChart} from "./LineChart";

export class Panel_RedditPerMinuteActivity extends HTMLElement {
	state: State;
	chart: LineChart;

	constructor(state: State) {
		super();
		this.state = state;
		this.state.addListener(() => this.chart.updateData([this.state.ppm, this.state.cpm]));

		this.classList.add("panel");
	}

	connectedCallback() {
		this.chart = new LineChart({
			data: [this.state.ppm, this.state.cpm],
			element: this,
			title: "Posts and comments per minute",
			xLabel: "Time",
			yLabel: "Count",
		});
		this.chart.createChart();
	}
}

customElements.define("panel-reddit-per-minute-activity", Panel_RedditPerMinuteActivity);