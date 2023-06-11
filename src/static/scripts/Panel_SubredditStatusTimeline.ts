import {State} from "./state";
import {SubredditTypeActivityChart, SubredditTypeChartDensity} from "./subredditTypesChart";
import {makeElement} from "./utils";
import {ToggleButton, ToggleButtonRoundCorners} from "./ToggleButton";
import {CustomHtmlElement} from "./CustomHtmlElement";

const densityConfig: {
	density: SubredditTypeChartDensity,
	label: string
	border: ToggleButtonRoundCorners;
}[] = [
	{
		density: SubredditTypeChartDensity.micro,
		label: "Tiny",
		border: ToggleButtonRoundCorners.left,
	},
	{
		density: SubredditTypeChartDensity.tiny,
		label: "Small",
		border: ToggleButtonRoundCorners.none,
	},
	{
		density: SubredditTypeChartDensity.small,
		label: "Compact",
		border: ToggleButtonRoundCorners.none,
	},
	{
		density: SubredditTypeChartDensity.medium,
		label: "Full",
		border: ToggleButtonRoundCorners.right,
	}
];

export class Panel_SubredditStatusTimeline extends CustomHtmlElement {
	state: State;
	chart: SubredditTypeActivityChart;

	constructor(state: State) {
		super();
		this.state = state;
		this.state.addListener(() => this.chart.updateData(this.state.subredditTypes));
		this.state.settings.subredditTypeChartDensity.addListener(() => {
			this.chart.updateDensity(this.state.settings.subredditTypeChartDensity.value);
		});

		this.classList.add("panel");
		this.classList.add("subreddit-status-timeline");

		let densityButtons: ToggleButton[];
		this.append(makeElement("div", {class: "options"}, [
			makeElement("div", {class: "expand"}),
			makeElement("div", {class: "group"}, (densityButtons = densityConfig.map((config) => {
				return new ToggleButton(
					this.state.settings.subredditTypeChartDensity.value === config.density,
					config.label,
					() => this.toggleDensity(config.density),
					config.border,
				);
			}))),
		]));
		for (const button of densityButtons) {
			button.setButtonsGroup(densityButtons);
		}

		this.onFirstConnected.addListener(() => {
			this.chart = new SubredditTypeActivityChart({
				data: this.state.subredditTypes,
				element: this,
				title: "Subreddit status",
				// xLabel: "Time",
				density: this.state.settings.subredditTypeChartDensity.value,
			});
			this.chart.createChart();
		});
	}

	private toggleDensity(density: SubredditTypeChartDensity) {
		this.state.settings.subredditTypeChartDensity.value = density;
	}
}

customElements.define("panel-subreddit-status-timeline", Panel_SubredditStatusTimeline);
