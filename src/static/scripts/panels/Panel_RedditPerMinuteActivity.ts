import {State} from "../state";
import {LineChart, LineDataset} from "../charts/LineChart";
import {CustomHtmlElement} from "../CustomHtmlElement";
import {deepCopy, makeElement} from "../utils";
import {ToggleButton, ToggleButtonRoundCorners} from "../ToggleButton";

export class Panel_RedditPerMinuteActivity extends CustomHtmlElement {
	state: State;
	chart: LineChart;

	constructor(state: State) {
		super();
		this.state = state;
		this.state.addListener(() => this.chart.updateData(this.transformData()));
		this.state.settings.smoothPerMinuteData.addListener(() => this.chart.updateData(this.transformData()));

		this.classList.add("panel");

		this.append(makeElement("div", {class: "options"}, [
			makeElement("div", {class: "expand"}),
			new ToggleButton(
			this.state.settings.smoothPerMinuteData.value,
			"Reduce noise",
			() => this.state.settings.smoothPerMinuteData.value = !this.state.settings.smoothPerMinuteData.value,
			ToggleButtonRoundCorners.both,
		)
		]));

		this.onFirstConnected.addListener(() => {
			this.chart = new LineChart({
				data: [this.state.ppmFiltered, this.state.cpmFiltered],
				element: this,
				title: "Posts and comments per minute",
				// xLabel: "Time",
			});
			this.chart.createChart();
		});
	}

	private transformData(): LineDataset[] {
		if (!this.state.settings.smoothPerMinuteData.value) {
			return [this.state.ppmFiltered, this.state.cpmFiltered];
		}
		const smoothDatasets = [
			deepCopy(this.state.ppmFiltered),
			deepCopy(this.state.cpmFiltered),
		];
		const windowSize = 4;
		for (const dataset of smoothDatasets) {
			for (let i = 0; i < dataset.points.length; i++) {
				const window = dataset.points.slice(Math.max(i - windowSize, 0), Math.min(i + windowSize, dataset.points.length));
				let sum = 0;
				for (const point of window) {
					sum += point.y;
				}
				dataset.points[i].y = sum / window.length;
			}
		}
		return smoothDatasets;
	}
}

customElements.define("panel-reddit-per-minute-activity", Panel_RedditPerMinuteActivity);
