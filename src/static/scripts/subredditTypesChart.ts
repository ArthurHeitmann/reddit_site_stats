import * as d3 from "d3";
import {Selection} from "d3";
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
export enum SubredditTypeChartDensity {
	tiny = "tiny",
	small = "small",
	medium = "medium",
}
const barHeightByDensity = {
	[SubredditTypeChartDensity.tiny]: 5,
	[SubredditTypeChartDensity.small]: 15,
	[SubredditTypeChartDensity.medium]: 50,
}
export interface SubredditTypeChartOptions {
	data: LoggedSubredditType_sections[];
	element: HTMLElement;
	title?: string;
	xLabel?: string;
	density?: SubredditTypeChartDensity;
}
export class SubredditTypeActivityChart {
	private element: HTMLElement;
	private data: LoggedSubredditType_sections[];
	private title: string|undefined;
	private xLabel: string|undefined;
	private density: SubredditTypeChartDensity;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 50, right: 30, bottom: 40, left: 30 };
	private fullWidth: number;
	private fullHeight: number;

	constructor(options: SubredditTypeChartOptions) {
		this.element = options.element;
		this.data = options.data;
		this.title = options.title;
		this.xLabel = options.xLabel;
		this.density = options.density || SubredditTypeChartDensity.medium;
		this.fullWidth = this.element.getBoundingClientRect().width;
		const barHeight = barHeightByDensity[this.density];
		this.calculateFullHeight(barHeight);
		if (barHeight >= 15) {
			const estimatedAdditionalLeftPadding = Math.max(...this.data.map(d => d.name.length)) * 5;
			this.margin.left += estimatedAdditionalLeftPadding;
		}

		this.svg = d3.select(this.element)
			.append("svg")
			.classed("chart", true)
			.classed("subreddit-type-chart", true)
			.attr("width", "100%")
			.attr("height", this.fullHeight);

		this.setupChartGroup();

		window.addEventListener("resize", () => this.resize());
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
			.padding(this.density == SubredditTypeChartDensity.medium ? 0.1 : 0);
		const yAxis = d3.axisLeft(yAxisScale)
			.tickSize(0);
		const yAxisGroup = this.chartGroup.append("g")
			.call(yAxis);
		const yAxisTick = yAxisGroup.selectAll(".tick");
		if (this.density == SubredditTypeChartDensity.tiny) {
			yAxisTick.attr("visibility", "hidden");
		}
		if (this.density == SubredditTypeChartDensity.medium) {
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

		// Bars
		const bandWidth = this.height / this.data.length;
		const padding = this.density == SubredditTypeChartDensity.medium ? 2 : 0;
		const nameToIndex = new Map<string, number>();
		for (let i = 0; i < this.data.length; i++)
			nameToIndex.set(this.data[i].name, i);
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
			.attr("y", d => nameToIndex.get(d.name) * bandWidth + padding)
			.attr("width", d => xAxisScale(d.startTime + d.duration) - xAxisScale(d.startTime))
			.attr("height", bandWidth + (this.density == SubredditTypeChartDensity.tiny ? 0.5 : 1) - padding*2)
			.attr("fill", d => {
				switch (d.type) {
					case "public": return "#1f77b4";
					case "private": return "#252525";
					case "restricted": return "#bd812a";
					case "gold_only": return "#d62728";
					default: return "#000000";
				}
			})

		// tooltip
		const tooltip = this.chartGroup
			.append("g")
			.classed("tooltip", true)
			.classed("hidden", true);
		const tooltipRect = tooltip.append("rect")
			.attr("width", 100)
			.attr("height", 50)
			.attr("rx", 5)
			.attr("ry", 5);
		const tooltipSubreddit = tooltip.append("text")
			.classed("subreddit", true)
			.attr("x", 5)
			.attr("y", 15);
		const tooltipSubscribers = tooltip.append("text")
			.classed("subscribers", true)
			.attr("x", 5)
			.attr("y", 30);
		const tooltipStatusFrom = tooltip.append("text")
			.classed("statusFrom", true)
			.attr("x", 5)
			.attr("y", 45);
		const tooltipUntil = tooltip.append("text")
			.classed("until", true)
			.attr("x", 5)
			.attr("y", 60);


		const onMouseover = (event: MouseEvent) => {
			const target = event.target as SVGRectElement;
			if (!target.classList.contains("bar"))
				return;
			const bar = d3.select(target);
			const barGroup = d3.select(target.parentNode as SVGGElement);
			const barGroupData = barGroup.data()[0] as LoggedSubredditType_sections;
			const barData = bar.data()[0] as TypeSection;
			const timeFormat = d3.timeFormat("%b %d, %H:%M");
			const startTimeStr = timeFormat(new Date(barData.startTime));
			let endTimeStr: string;
			if (barGroupData.typeSections[barGroupData.typeSections.length - 1] === barData)
				endTimeStr = "now";
			else
				endTimeStr = timeFormat(new Date(barData.startTime + barData.duration));

			tooltip.classed("hidden", false);
			tooltipSubreddit.text(barData.name);
			tooltipSubscribers.text(numberToShort(barGroupData.subscribers) + " subscribers");
			tooltipStatusFrom.text(`${barData.type} from ${startTimeStr}`);
			tooltipUntil.text(`until ${endTimeStr}`);

			const allTextBBoxes = [
				tooltipSubreddit,
				tooltipSubscribers,
				tooltipStatusFrom,
				tooltipUntil
			].map(e => e.node().getBBox());
			const minLeft = Math.min(...allTextBBoxes.map(b => b.x));
			const maxRight = Math.max(...allTextBBoxes.map(b => b.x + b.width));
			const minTop = Math.min(...allTextBBoxes.map(b => b.y));
			const maxBottom = Math.max(...allTextBBoxes.map(b => b.y + b.height));
			const tooltipWidth = maxRight - minLeft;
			const tooltipHeight = maxBottom - minTop;
			tooltipRect
				.attr("width", tooltipWidth + 10)
				.attr("height", tooltipHeight + 10);

		};
		const onMousemove = (event: MouseEvent) => {
			let [xm, ym] = d3.pointer(event);
			xm += 12;
			const tooltipWidth = parseInt(tooltipRect.attr("width"));
			const tooltipHeight = parseInt(tooltipRect.attr("height"));
			const { width: svgWidth, height: svgHeight } = this.svg.node().getBoundingClientRect();
			if (xm + tooltipWidth > svgWidth - this.margin.left)
				xm -= tooltipWidth + 24;
			if (ym + tooltipHeight > svgHeight - this.margin.top)
				ym -= tooltipHeight + 24;
			tooltip.attr("transform", `translate(${xm}, ${ym})`);
		};
		function onMouseout() {
			tooltip.classed("hidden", true);
		}

		this.chartGroup
			.on("mouseover", onMouseover)
			.on("mousemove", onMousemove)
			.on("mouseout", onMouseout);
	}

	updateData(newData: LoggedSubredditType_sections[]) {
		this.data = newData;
		this.clearChart();
		this.createChart();
	}

	updateDensity(newDensity: SubredditTypeChartDensity) {
		this.density = newDensity;
		const barHeight = barHeightByDensity[this.density];
		this.calculateFullHeight(barHeight);
		this.clearChart();
		this.createChart();
	}

	resize() {
		this.fullWidth = this.element.getBoundingClientRect().width;
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

	private calculateFullHeight(barHeight: number) {
		this.fullHeight = this.margin.top + this.margin.bottom + barHeight * this.data.length;
	}

	get width(): number {
		return this.fullWidth - this.margin.left - this.margin.right;
	}

	get height(): number {
		const height = this.fullHeight - this.margin.top - this.margin.bottom;
		return Math.max(height, 50);
	}
}