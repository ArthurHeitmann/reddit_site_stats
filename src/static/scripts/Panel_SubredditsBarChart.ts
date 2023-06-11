import {State} from "./state";
import {BarChart, BarChartDataset} from "./BarChart";

export enum SubredditsBarChartCategory {
	count,
	percent,
	subscribers,
}
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

		this.classList.add("panel");
	}

	connectedCallback() {
		this.chart = new BarChart(this.data, this);
		this.chart.createChart();
	}

	private get chartDataset(): BarChartDataset {
		const selectedCategory = this.state.settings.subredditsBarChartCategory.value;
		return this.state.subredditsBarCharts[selectedCategory];
	}
}

customElements.define("reddit-stats-panel-subreddits-bar-chart", Panel_SubredditsBarChart);
