import {Selection} from "d3";
import * as d3 from "d3";
import {formatTime, numberToShort} from "./utils";

type SubredditType = "public" | "private" | "restricted" | "gold_only" | string;
export interface TypeTimestamp {
	time: number;
	type: SubredditType;
}
export interface LoggedSubredditType_timestamps {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeHistory: TypeTimestamp[];
}
export interface TypeSection {
	name: string;
	startTime: number;
	duration: number;
	type: SubredditType;
}
export interface LoggedSubredditType_sections {
	name: string;
	isNsfw: boolean;
	subscribers: number;
	typeSections: TypeSection[];
}
export interface SubredditTypeChartOptions {
	data: LoggedSubredditType_sections[];
	element: HTMLElement;
	title?: string;
	xLabel?: string;
	barHeight?: number;
}
export class SubredditTypeActivityChart {
	private element: HTMLElement;
	private data: LoggedSubredditType_sections[];
	private title: string|undefined;
	private xLabel: string|undefined;
	private barHeight: number;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 50, right: 30, bottom: 30, left: 30 };
	private width: number;
	private height: number;

	constructor(options: SubredditTypeChartOptions) {
		this.element = options.element;
		this.data = options.data;
		this.title = options.title;
		this.xLabel = options.xLabel;
		this.barHeight = options.barHeight || 15;
		if (this.barHeight >= 15) {
			const estimatedAdditionalLeftPadding = Math.max(...this.data.map(d => d.name.length)) * 5;
			this.margin.left += estimatedAdditionalLeftPadding;
		}
		this.width = this.element.getBoundingClientRect().width - this.margin.left - this.margin.right;
		this.height = this.barHeight * this.data.length - this.margin.top - this.margin.bottom;

		this.svg = d3.select(this.element)
			.append("svg")
			.attr("width", "100%")
			.attr("height", this.height + this.margin.top + this.margin.bottom);

		this.setupChartGroup();

		window.addEventListener("resize", () => this.resize());
	}

	createChart() {
		// Title
		if (this.title) {
			this.svg.append("text")
				.attr("x", this.width / 2)
				.attr("y", this.margin.top / 3)
				.attr("text-anchor", "middle")
				.classed("title", true)
				.text(this.title);
		}
		// X axis label
		if (this.xLabel) {
			this.svg.append("text")
				.attr("x", this.width / 2)
				.attr("y", this.height + this.margin.top + this.margin.bottom)
				.attr("text-anchor", "middle")
				.classed("label", true)
				.text(this.xLabel);
		}

		// X axis
		const datasetXMinmax: number[] = this.data.flatMap(d => {
			const first = d.typeSections[0];
			const last = d.typeSections[d.typeSections.length - 1];
			return [
				first.startTime,
				last.startTime + last.duration
			];
		});
		const xExtent = d3.extent(datasetXMinmax) as [number, number];
		const xAxisScale: d3.ScaleTime<number, number> = d3.scaleTime()
			.domain(xExtent)
			.range([0, this.width]);
		const xAxis = d3.axisBottom(xAxisScale)
			.tickFormat(formatTime);
		this.chartGroup.append("g")
			.attr("transform", "translate(0," + this.height + ")")
			.call(xAxis);

		// Y axis
		const yAxisScale = d3.scaleBand()
			.domain(this.data.map(d => d.name))
			.range([0, this.height])
			.padding(0.0);
		const yAxis = d3.axisLeft(yAxisScale)
			.tickSize(0);
		const yAxisGroup = this.chartGroup.append("g")
			.call(yAxis);
		const yAxisTick = yAxisGroup.selectAll(".tick");
		if (this.barHeight < 15) {
			yAxisTick.attr("visibility", "hidden");
		}
		if (this.barHeight >= 40) {
			yAxisTick.select("text")
				.classed("name", true)
				.attr("x", -9)
				.attr("y", -7)
			yAxisTick.data(this.data)
				.append("svg:text")
				.classed("subscribers", true)
				.attr("x", -9)
				.attr("y", +7)
				.attr("dy", ".35em")
				.attr("text-anchor", "end")
				.attr("fill", "currentColor")
				.text(d => numberToShort(d.subscribers))
		}

		// tooltip
		// const tooltip = d3.select(this.element)
		// 	.append("div")
		// 	.classed("tooltip", true)
		// 	.classed("hidden", true);
		// const tooltipTitle = tooltip.append("div")
		// 	.classed("title", true);
		// const tooltipBody = tooltip.append("div")
		// 	.classed("body", true);
		// const tooltipTime = tooltipBody.append("div")
		// 	.classed("time", true);
		// const tooltipSubscribers = tooltipBody.append("div")
		// 	.classed("subscribers", true);
		// const tooltipType = tooltipBody.append("div")
		// 	.classed("type", true);
		// const tooltipDuration = tooltipBody.append("div")
		// 	.classed("duration", true);

		// function onMouseover(d: TypeSection) {
		// 	tooltipTitle.text(d.name);
		// 	tooltipTime.text(formatTime(d.startTime));
		// 	// tooltipSubscribers.text(numberToShort(d.subscribers));
		// 	tooltipType.text(d.type);
		// 	tooltipDuration.text(d.duration.toString());
		// 	tooltip.classed("hidden", false);
		// }
		// function onMousemove() {
		// 	tooltip.style("left", (d3.mouse(this)[0] + 10) + "px")
		// 		.style("top", (d3.mouse(this)[1] - 10) + "px");
		// }
		// function onMouseout() {
		// 	tooltip.classed("hidden", true);
		// }

		// Bars
		this.chartGroup.selectAll(".barGroup")
			.data(this.data)
			.enter()
			.append("g")
			.attr("class", "barGroup")
			.selectAll(".bar")
			.data(d => d.typeSections)
			.enter()
			.append("rect")
			.attr("class", d => "bar " + d.type)
			.attr("x", d => xAxisScale(d.startTime))
			.attr("y", d => yAxisScale(d.name) as number)
			.attr("width", d => xAxisScale(d.startTime + d.duration) - xAxisScale(d.startTime))
			.attr("height", yAxisScale.bandwidth() + 1)
			.attr("fill", d => {
				switch (d.type) {
					case "public": return "#1f77b4";
					case "private": return "#252525";
					case "restricted": return "#bd812a";
					case "gold_only": return "#d62728";
					default: return "#000000";
				}
			})
			// .on("mouseover", onMouseover)
			// .on("mousemove", onMousemove)
			// .on("mouseout", onMouseout);

	}

	updateData(newData: LoggedSubredditType_sections[]) {
		this.data = newData;
		this.clearChart();
		this.createChart();
	}

	resize() {
		this.width = this.element.getBoundingClientRect().width - this.margin.left - this.margin.right;
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
}