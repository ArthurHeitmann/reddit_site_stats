import {State} from "../state";
import {LineChart, LineDataset} from "../charts/LineChart";
import {CustomHtmlElement} from "../CustomHtmlElement";
import {deepCopy, makeElement} from "../utils";
import {ToggleButton, ToggleButtonRoundCorners} from "../ToggleButton";
import {base36Decode, base36Encode} from "../../../sharedUtils";

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

		const chartWrapper = makeElement("div", {class: "chart-wrapper"});
		this.append(chartWrapper);
		this.onFirstConnected.addListener(() => {
			this.chart = new LineChart({
				data: [this.state.ppmFiltered, this.state.cpmFiltered],
				element: chartWrapper,
				title: "Posts and comments per minute",
				// xLabel: "Time",
			});
			this.chart.createChart();
		});

		const notes = makeElement("div", {class: "collapsed-notes"}, [
			makeElement("div", {class: "visible-row"}, [
				makeElement("span", {}, "Be careful drawing conclusions from this data."),
				makeElement("button", {class: "single-button round-corners-both", onclick: () => notes.classList.toggle("expanded")}, "More info"),
			]),
			makeElement("div", {class: "expanded-notes"}, [
				makeElement("ul", {}, [
					makeElement("li", {}, "This data includes all of reddit, whereas the other statistics only include the most popular subreddits"),
					makeElement("li", {}, "A lot of activity comes from bots or very obscure subreddits"),
					makeElement("li", {class: "random-post-row"}, [
						makeElement("span", {}, "If you want to view a random post to get a feeling for it, click here (WARNING: high chance of being NSFW) "),
						makeElement("button", {class: "single-button round-corners-both", onclick: this.randomPost}, "Random post"),
					]),
					makeElement("li", {}, "A lot of other factors affect the activity, such as: day of week, holidays, current events, etc."),
					makeElement("li", {}, "This is just one statistic. More important statistics that we don't have are: voting activity, daily active users, average time spent on the site, ad revenue, etc."),

				]),
			]),
		]);
		this.append(notes);
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

	private randomPost() {
		const idStartRange = base36Decode("143nj2q");
		const idEndRange = base36Decode("149dbfe");
		const id = Math.floor(Math.random() * (idEndRange - idStartRange)) + idStartRange;
		const idEncoded = base36Encode(id);
		window.open(`https://www.reddit.com/comments/${idEncoded}/`);
	}
}

customElements.define("panel-reddit-per-minute-activity", Panel_RedditPerMinuteActivity);
