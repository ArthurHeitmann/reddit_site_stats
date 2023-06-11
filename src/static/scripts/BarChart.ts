import * as d3 from "d3";
import {Axis, Selection} from "d3";
import {formatTime, isJsonEqual, throttle, windowWidthResizeEvents} from "./utils";

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
export type BarYAxisFormat = (value: number) => string;
export interface BarChartDataset {
	label: string;
	padding?: number;
	colorOf?: (label: string) => string;
	yAxisFormat?: BarYAxisFormat[];
	groups: BarGroup[];
}

export class BarChart {
	private element: HTMLElement;
	private data: BarChartDataset;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 50, right: 40, bottom: 40, left: 40 };
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
		if (this.data.yAxisFormat != undefined) {
			if (this.data.yAxisFormat.length !== stackLabels.length) {
				console.error("yAxisFormat must have the same length as the number of stacks");
				return;
			}
		}

		// Title
		if (this.data.label) {
			this.svg.append("text")
				.attr("x", this.fullWidth / 2)
				.attr("y", this.margin.top / 3)
				.attr("text-anchor", "middle")
				.classed("title", true)
				.text(this.data.label);
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
			if (allStackSums.length == 0)
				allStackSums.push(1);
			const yScale = d3.scaleLinear()
				.domain([0, d3.max(allStackSums)])
				.range([this.height, 0]);
			let yAxis: Axis<number | { valueOf(): number }>;
			if (stackLabels.length != 2 || i == 0)
				yAxis = d3.axisLeft(yScale);
			else
				yAxis = d3.axisRight(yScale);
			if (this.data.yAxisFormat != undefined && this.data.yAxisFormat[i] != undefined)
				yAxis.tickFormat(this.data.yAxisFormat[i]);
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
