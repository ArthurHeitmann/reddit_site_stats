import * as d3 from "d3";
import {Selection} from "d3";
import {formatTime, throttle, windowWidthResizeEvents} from "./utils";

export interface Point {
	x: number;
	y: number;
}

export interface LineDataset {
	name: string;
	points: Point[];
}
export interface LineChartOptions {
	data: LineDataset[];
	element: HTMLElement;
	title?: string;
	xLabel?: string;
	yLabel?: string;
}
export class LineChart {
	private element: HTMLElement;
	private data: LineDataset[];
	private title: string|undefined;
	private xLabel: string|undefined;
	private yLabel: string|undefined;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 50, right: 30, bottom: 40, left: 30 };
	private fullWidth: number;
	private height: number;

	constructor(options: LineChartOptions) {
		this.element = options.element;
		this.data = options.data;
		this.title = options.title;
		this.xLabel = options.xLabel;
		this.yLabel = options.yLabel;
		this.height = Math.min(400, window.innerHeight) - this.margin.top - this.margin.bottom;

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
		// Title
		if (this.title) {
			this.svg.append("text")
				.attr("x", this.fullWidth / 2)
				.attr("y", this.margin.top / 3)
				.attr("text-anchor", "middle")
				.classed("title", true)
				.text(this.title);
		}
		// X axis label
		if (this.xLabel) {
			this.svg.append("text")
				.attr("x", this.width / 2 + this.margin.left)
				.attr("y", this.height + this.margin.top + this.margin.bottom)
				.attr("text-anchor", "middle")
				.classed("label", true)
				.text(this.xLabel);
		}

		// Y axis label
		if (this.yLabel && this.data.length === 1) {
			this.svg.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", this.margin.left - 20)
				.attr("x", 0 - (this.height / 2))
				.attr("dy", "1em")
				.style("text-anchor", "middle")
				.classed("label", true)
				.text(this.yLabel);
		}
		// legend (in the top right)
		if (this.data.length > 1) {
			const maxNameLength = d3.max(this.data.map(d => d.name.length));
			const legendWidth = maxNameLength * 8 + 20;
			const legendHeight = this.data.length * 15 + 20;
			const legend = this.svg.append("g")
				.attr("transform", "translate(" + (this.fullWidth - legendWidth - this.margin.right) + "," + (this.margin.top - 10) + ")");
			// legend.append("rect")
			// 	.attr("width", legendWidth)
			// 	.attr("height", legendHeight)
			// 	.attr("fill", "white")
			// 	.attr("stroke", "black");
			const legendItem = legend.selectAll("g")
				.data(this.data)
				.enter()
				.append("g")
				.classed("legend-item", true)
				.attr("transform", (d, i) => "translate(10," + (i * 15 + 10) + ")");
			legendItem
				.append("rect")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", 10)
				.attr("height", 10)
				.attr("fill", (d, i) => d3.schemeCategory10[i]);
			legendItem
				.append("text")
				.attr("x", 15)
				.attr("y", 10)
				.text(d => d.name);
		}

		// X axis
		const datasetXMinMax: number[] = this.data.flatMap(d => {
			if (d.points.length === 0)
				return [0, 1];
			return [d.points[0].x, d.points[d.points.length - 1].x];
		});
		if (datasetXMinMax.length === 0)
			datasetXMinMax.push(0, 1);
		const xExtent = d3.extent(datasetXMinMax) as [number, number];
		const xAxisScale: d3.ScaleTime<number, number> = d3.scaleTime()
			.domain(xExtent)
			.range([0, this.width]);
		const xAxis = d3.axisBottom(xAxisScale)
			.tickFormat(formatTime);
		this.chartGroup.append("g")
			.attr("transform", "translate(0," + this.height + ")")
			.classed("x-axis", true)
			.call(xAxis);

		// Datasets
		for (let i = 0; i < this.data.length; i++){
			const dataset = this.data[i];
			// Y axis
			let yMax = d3.max(dataset.points, p => p.y);
			yMax += Math.ceil(yMax / 10);
			const yAxisScale = d3.scaleLinear()
				.domain([0, yMax])
				.range([this.height, 0]);
			const yAxis = d3.axisLeft(yAxisScale)
				.ticks(0);
			this.chartGroup.append("g")
				.classed("y-axis", true)
				.call(yAxis);

			// Y axis label
			this.chartGroup.append("path")
				.datum(dataset.points)
				.attr("d", d3.line<Point>()
					.x(point => xAxisScale(point.x))
					.y(point => yAxisScale(point.y))
					.curve(d3.curveMonotoneX)
				)
				.attr("stroke", d3.schemeCategory10[i])
				.style("stroke-width", 2)
				.style("fill", "none");
		}
	}

	updateData(newData: LineDataset[]) {
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