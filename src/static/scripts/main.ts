import * as d3 from "d3";
import {CurveFactory, CurveFactoryLineOnly, ScaleLinear, ScaleTime, Selection} from "d3";

interface Point {
	x: number;
	y: number;
}

interface Dataset {
	name: string;
	points: Point[];
}

async function main() {
	const ppmRes = await fetch("/api/postsPerMinute");
	const ppm: Point[] = await ppmRes.json() as Point[];
	const ppmDataset: Dataset = {
		name: "Posts per minute",
		points: ppm,
	}
	const cpmRes = await fetch("/api/commentsPerMinute");
	const cpm: Point[] = await cpmRes.json() as Point[];
	const cpmDataset: Dataset = {
		name: "Comments per minute",
		points: cpm,
	}

	const chart1Elem = document.getElementById("chart1")!;
	const chart1 = new LineChart([ppmDataset, cpmDataset], chart1Elem);
	chart1.createChart();
	// setTimeout(() => {
	// 	chart1.updateData([ppm.slice(0, 1200), cpm.slice(0, 1000)]);
	// }, 1000);
}

interface LineChartOptions {
	x?: (d: Point[]) => number,
	y?: (d: Point[]) => number,
	z?: (d: Point[]) => number,
	title?: (d: Point) => string,
	defined?: (d: Point, i: number) => boolean,
	curve?: CurveFactory | CurveFactoryLineOnly,
	marginTop?: number,
	marginRight?: number,
	marginBottom?: number,
	marginLeft?: number,
	width?: number,
	height?: number,
	xType?: ScaleTime<number, number>,
	xDomain?: [number, number],
	xRange?: [number, number],
	yType?: ScaleLinear<number, number>,
	yDomain?: [number, number],
	yRange?: [number, number],
	yFormat?: (n: number) => string,
	yLabel?: string,
	zDomain?: number[],
	color?: string,
	strokeLinecap?: string,
	strokeLinejoin?: string,
	strokeWidth?: number,
	strokeOpacity?: number,
	mixBlendMode?: string,
	voronoi?: boolean
}

const formatMillisecond = d3.timeFormat(".%L");
const formatSecond = d3.timeFormat(":%S");
const formatMinute = d3.timeFormat("%H:%M");
const formatHour = d3.timeFormat("%H:00");
const formatDay = d3.timeFormat("%d. %b");
const formatWeek = formatDay;
const formatMonth = formatDay;
const formatYear = d3.timeFormat("%Y.%m.%d");
function formatTime(dateNum: number) {
	const date = new Date(dateNum);
	return (d3.timeSecond(date) < date ? formatMillisecond
		: d3.timeMinute(date) < date ? formatSecond
			: d3.timeHour(date) < date ? formatMinute
				: d3.timeDay(date) < date ? formatHour
					: d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
						: d3.timeYear(date) < date ? formatMonth
							: formatYear)(date);
}
class LineChart {
	private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
	private chartGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
	private margin = { top: 10, right: 30, bottom: 30, left: 60 };
	private width: number;
	private height: number;

	constructor(private data: Dataset[], private element: HTMLElement) {
		this.width = this.element.getBoundingClientRect().width - this.margin.left - this.margin.right;
		this.height = 400 - this.margin.top - this.margin.bottom;

		this.svg = d3.select(element)
			.append("svg")
			.attr("width", "100%")
			.attr("height", this.height + this.margin.top + this.margin.bottom);

		this.chartGroup = this.svg
			.append("g")
			.attr("transform",
				"translate(" + this.margin.left + "," + this.margin.top + ")");

		window.addEventListener("resize", () => this.resize());
	}

	createChart() {
		// X axis
		const datasetXMinmax: number[] = this.data.flatMap(d => [d.points[0].x, d.points[d.points.length - 1].x]);
		const xExtent = d3.extent(datasetXMinmax) as [number, number];
		const xAxisScale: d3.ScaleTime<number, number> = d3.scaleTime()
			.domain(xExtent)
			.range([0, this.width]);
		const xAxis = d3.axisBottom(xAxisScale)
			.tickFormat(formatTime);
		this.chartGroup.append("g")
			.attr("transform", "translate(0," + this.height + ")")
			.call(xAxis);

		for (let i = 0; i < this.data.length; i++){
			const dataset = this.data[i];
			let yMax = d3.max(dataset.points, p => p.y);
			yMax += Math.ceil(yMax / 10);
			const yAxisScale = d3.scaleLinear()
				.domain([0, yMax])
				.range([this.height, 0]);

			const yAxis = d3.axisLeft(yAxisScale)
				.ticks(0);

			this.chartGroup.append("g")
				.call(yAxis);

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

	updateData(newData: Dataset[]) {
		this.data = newData;
		this.chartGroup.selectAll("*").remove();
		this.createChart();
	}

	resize() {
		this.width = this.element.getBoundingClientRect().width - this.margin.left - this.margin.right;
		this.chartGroup.selectAll("*").remove();
		this.createChart();
	}
}

window.addEventListener("load", async () => {
	await main();
});
