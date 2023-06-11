import * as d3 from "d3";
import {Axis, Selection} from "d3";
import {formatTime, isJsonEqual, numberToShort, throttle, windowWidthResizeEvents} from "./utils";

export interface BarData {
	label: string;
	value: number;
}
export interface BarStack {
	label: string;
	data: BarData[];
}
export interface BarGroup {
	time: number;
	stacks: BarStack[];
}
export interface BarChartDataset {
	label: string;
	groups: BarGroup[];
	padding?: number;
	colorOf?: (label: string) => string;
}
export const testDataSet: BarChartDataset = {
	label: "test",
	groups: [
		{
			time: Date.now(),
			stacks: [
				{
					label: "absolute",
					data: [
						{ label: "sub1", value: 10 },
						{ label: "sub2", value: 30 },
						{ label: "sub3", value: 60 },
					],
				},
				{
					label: "relative",
					data: [
						{ label: "sub1", value: 0.2 },
						{ label: "sub2", value: 0.3 },
						{ label: "sub3", value: 0.5 },
					],
				}
			],
		},
		{
			time: Date.now() + 1000 * 60 * 60 * 24,
			stacks: [
				{
					label: "absolute",
					data: [
						{ label: "sub1", value: 20 },
						{ label: "sub2", value: 40 },
					],
				},
				{
					label: "relative",
					data: [
					],
				}
			],
		},
	],
};

export class BarChart {
	private element: HTMLElement;
	private data: BarChartDataset;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 50, right: 40, bottom: 40, left: 30 };
	private fullWidth: number;
	private height: number;

	constructor(data: BarChartDataset, element: HTMLElement) {
		this.element = element;
		this.data = data;
		this.height = 600 - this.margin.top - this.margin.bottom;

		this.svg = d3.select(this.element)
			.append("svg")
			.classed("chart", true)
			.attr("width", "100%")
			.attr("height", this.height + this.margin.top + this.margin.bottom);

		this.fullWidth = this.svg.node().getBoundingClientRect().width;
		this.setupChartGroup();

		windowWidthResizeEvents.addListener(throttle(this.resize.bind(this), 100));
	}

	createChart() {
		if (this.data.groups.length <= 0)
			return;

		// assert that all groups have the same stacks
		const stackLabels = this.data.groups[0].stacks.map(s => s.label);
		for (const group of this.data.groups) {
			const groupStackLabels = group.stacks.map(s => s.label);
			if (!isJsonEqual(groupStackLabels, stackLabels)) {
				console.error("All groups must have the same stacks");
				return;
			}
		}

		// X axis
		const xAxisScale = d3.scaleTime()
			.domain(d3.extent(this.data.groups.map(g => g.time)))
			.range([0, this.width]);
		const xAxis = d3.axisBottom(xAxisScale)
			.tickFormat(formatTime);
		this.chartGroup.append("g")
			.attr("transform", "translate(0," + this.height + ")")
			.call(xAxis);

		// Y axes (one for each stack)
		const yAxes = stackLabels.map((stackLabel, i) => {
			const allStackSums = this.data.groups.map(g => g.stacks[i].data.map(d => d.value).reduce((a, b) => a + b, 0));
			const yScale = d3.scaleLinear()
				.domain([0, d3.max(allStackSums.concat(1))])
				.range([this.height, 0]);
			let yAxis: Axis<number | { valueOf(): number }>;
			if (stackLabels.length != 2 || i == 0)
				yAxis = d3.axisLeft(yScale).tickFormat(numberToShort);
			else
				yAxis = d3.axisRight(yScale).tickFormat(numberToShort);
			if (stackLabels.length > 2)
				yAxis.ticks(0);
			const yAxisGroup = this.chartGroup.append("g")
				.call(yAxis);
			if (stackLabels.length == 2 && i == 1)
				yAxisGroup.attr("transform", "translate(" + this.width + ",0)");
			return yScale;
		});

		// Bars
		const padding = this.data.padding ?? 0;
		const bandWidth = this.width / this.data.groups.length;
		const groupWidth = bandWidth - padding * 2;
		const stackWidth = groupWidth / stackLabels.length;
		const barGroups = this.chartGroup.selectAll()
			.data(this.data.groups)
			.enter()
			.append("g")
			.classed("bar-group", true)
			.attr("transform", (g, i) => "translate(" + (i * bandWidth + padding) + ",0)")
		const bars = barGroups.selectAll()
			.data(g => g.stacks)
			.enter()
			.append("g")
			.classed("bar-stack", true)
			.attr("transform", (s, i) => "translate(" + (i * stackWidth) + ",0)")
			.attr("data-label", s => s.label);
		const chartHeight = this.height;
		bars.selectAll()
			.data(s => s.data)
			.enter()
			.append("rect")
			.classed("bar", true)
			.attr("x", "0")
			.attr("y", function (this: SVGRectElement, d) {
				const stackData = d3.select(this.parentElement).datum() as BarStack;
				const barIndex = stackData.data.indexOf(d);
				let y = 0;
				for (let i = 0; i < barIndex; i++)
					y += stackData.data[i].value;
				const stackIndex = stackLabels.indexOf(stackData.label);
				const yEnd = y + d.value;
				return yAxes[stackIndex](yEnd);
			})
			.attr("width", stackWidth + 1)
			.attr("height", function (this: SVGRectElement, d) {
				const stackData = d3.select(this.parentElement).datum() as BarStack;
				const stackIndex = stackLabels.indexOf(stackData.label);
				return chartHeight - yAxes[stackIndex](d.value);
			})
			// .attr("fill", (d, i) => d3.schemeCategory10[Math.floor(Math.random() * 10)]);
			.attr("fill", (d, i) => {
				if (this.data.colorOf === undefined)
					return d3.schemeCategory10[i];
				else
					return this.data.colorOf(d.label);
			});


	}

	updateData(newData: BarChartDataset) {
		this.data = newData;
		this.clearChart();
		this.createChart();
	}

	resize() {
		this.fullWidth = this.svg.node().getBoundingClientRect().width;
		this.clearChart();
		this.createChart();
	}

	private clearChart() {
		this.svg.selectAll("*").remove();
		this.setupChartGroup();
	}

	private setupChartGroup() {
		this.chartGroup = this.svg
			.append("g")
			.attr("transform",
				"translate(" + this.margin.left + "," + this.margin.top + ")");
	}

	get width(): number {
		return this.fullWidth - this.margin.left - this.margin.right;
	}
}
