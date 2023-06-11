import {State} from "./state";
import {BarChart, BarChartDataset} from "./BarChart";
import {ToggleButton, ToggleButtonRoundCorners} from "./ToggleButton";
import {makeElement} from "./utils";

export enum SubredditsBarChartCategory {
	count,
	percent,
	subscribers,
}
const categoriesConfig = [
	{
		category: SubredditsBarChartCategory.count,
		label: "Total",
		border: ToggleButtonRoundCorners.left,
	},
	{
		category: SubredditsBarChartCategory.percent,
		label: "Percent",
		border: ToggleButtonRoundCorners.none,
	},
	{
		category: SubredditsBarChartCategory.subscribers,
		label: "Subscribers",
		border: ToggleButtonRoundCorners.right,
	}
]
export class Panel_SubredditsBarChart extends HTMLElement {
	state: State;
	chart: BarChart;
	data: BarChartDataset;

	constructor(state: State) {
		super();
		this.state = state;
		this.data = this.chartDataset;
		this.state.addListener(() => {
			this.chart.updateData(this.chartDataset);
		});
		this.state.settings.subredditsBarChartCategory.addListener(() => {
			this.chart.updateData(this.chartDataset);
		});

		this.classList.add("panel");

		let categoryButtons: ToggleButton[];
		this.append(makeElement("div", {class: "options"}, [
			makeElement("div", {class: "expand"}),
			makeElement("div", {class: "group"}, (categoryButtons = categoriesConfig.map((config) => {
				return new ToggleButton(
					this.state.settings.subredditsBarChartCategory.value === config.category,
					config.label,
					() => this.setCategory(config.category),
					config.border,
				);
			}))),
		]));
		for (const button of categoryButtons) {
			button.setButtonsGroup(categoryButtons);
		}
	}

	connectedCallback() {
		this.chart = new BarChart(this.data, this);
		this.chart.createChart();
	}

	private setCategory(category: SubredditsBarChartCategory) {
		this.state.settings.subredditsBarChartCategory.value = category;
	}

	private get chartDataset(): BarChartDataset {
		const selectedCategory = this.state.settings.subredditsBarChartCategory.value;
		return this.state.subredditsBarCharts[selectedCategory];
	}
}

customElements.define("reddit-stats-panel-subreddits-bar-chart", Panel_SubredditsBarChart);
