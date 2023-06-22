import * as d3 from "d3";
import {scaleOrdinal, Selection} from "d3";
import * as d3Sankey from "d3-sankey";
import {SankeyLink, SankeyNode} from "d3-sankey";
import {numberToShort, throttle, windowWidthResizeEvents} from "../utils";

export type SankeyNodeData = SankeyNode<{}, {}> & {	name: string, title?: string };
export type SankeyLinkData = SankeyLink<{}, {}> & {	source: SankeyNodeData, target: SankeyNodeData };
export interface SankeyData {
	nodes: SankeyNodeData[];
	links: SankeyLinkData[];
}
export interface SankeyChartOptions {
	data: SankeyData;
	element: HTMLElement;
	title?: string;
	getColor?: (inName: string, outName: string) => string;
}
export class SankeyChart {
	private element: HTMLElement;
	private data: SankeyData;
	private title: string|undefined;
	private getColor: (inName: string, outName: string) => string;

	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 0, right: 0, bottom: 0, left: 0 };
	private fullWidth: number;
	private height: number;

	constructor(options: SankeyChartOptions) {
		this.element = options.element;
		this.data = options.data;
		this.title = options.title;
		this.getColor = options.getColor ?? scaleOrdinal(d3.schemeCategory10);
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

		const sankey = d3Sankey.sankey()
			.nodes(this.data.nodes)
			.links(this.data.links)
			.nodeSort((a, b) => 0)
			.nodeWidth(15)
			.nodePadding(10)
			.nodeAlign(d3Sankey.sankeyLeft)
			.extent([[1, 5], [this.width - 1, this.height - 5]]);
		sankey(this.data);

		const link = this.chartGroup.append("g")
			.attr("fill", "none")
			.attr("stroke-opacity", 0.5)
			.selectAll("g")
			.data(sankey.links())
			.join("g");
		link.append("path")
			.attr("d", d3Sankey.sankeyLinkHorizontal())
			.attr("stroke", (d: SankeyLinkData) => this.getColor(d.source.name, d.target.name))
			.attr("stroke-width", (d) => Math.max(1, d.width));

		const node = this.chartGroup
			.selectAll(".node")
			.data(sankey.nodes())
			.enter()
			.append("g")
			.attr("class", "node")
			.attr("transform", (d) => `translate(${d.x0}, ${d.y0})`);
		node.append("rect")
			.attr("height", (d) => d.y1 - d.y0)
			.attr("width", sankey.nodeWidth())
			.attr("fill", (d: SankeyNodeData) => this.getColor(d.name, d.name))
			.attr("stroke", "transparent");
		node.append("text")
			.attr("x", (d) => d.x0 < this.width * 2/3 ? 6 + sankey.nodeWidth() : -6)
			.attr("y", (d) => (d.y1 - d.y0) / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", (d) => d.x0 < this.width * 2/3 ? "start" : "end")
			.text((d: SankeyNodeData) => `${d.title ?? d.name} (${numberToShort(d.value)})`);
	}

	updateData(newData: SankeyData) {
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