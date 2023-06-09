import * as d3 from "d3";

const formatMillisecond = d3.timeFormat(".%L");
const formatSecond = d3.timeFormat(":%S");
const formatMinute = d3.timeFormat("%H:%M");
const formatHour = d3.timeFormat("%H:00");
const formatDay = d3.timeFormat("%b %d");
const formatWeek = formatDay;
const formatMonth = formatDay;
const formatYear = d3.timeFormat("%Y.%m.%d");
export function formatTime(dateNum: number) {
	const date = new Date(dateNum);
	return (d3.timeSecond(date) < date ? formatMillisecond
		: d3.timeMinute(date) < date ? formatSecond
			: d3.timeHour(date) < date ? formatMinute
				: d3.timeDay(date) < date ? formatHour
					: d3.timeMonth(date) < date ? (d3.timeWeek(date) < date ? formatDay : formatWeek)
						: d3.timeYear(date) < date ? formatMonth
							: formatYear)(date);
}

export function floorTo(number: number, precision: number): number {
	return Math.floor(number * Math.pow(10, precision)) / Math.pow(10, precision);
}

function _numberToShort(num: number): { n: number, s?: string } {
	switch (Math.abs(num).toString().length) {
		case 0:
		case 1:
		case 2:
		case 3:
			return { n: num };
		case 4:
			return { n: floorTo(num / 1000, 2), s: "k"};
		case 5:
		case 6:
			return { n: floorTo(num / 1000, 0), s: "k"};
		case 7:
			return { n: floorTo(num / 1000000, 2), s: "m"};
		case 8:
		case 9:
			return { n: floorTo(num / 1000000, 0), s: "m"};
		case 10:
			return { n: floorTo(num / 1000000000, 2), s: "b"};
		case 11:
		case 12:
			return { n: floorTo(num / 1000000000, 0), s: "b"};
		case 13:
			return { n: floorTo(num / 1000000000000, 2), s: "t"};
		case 14:
		case 15:
			return { n: floorTo(num / 1000000000000, 0), s: "t"};
		default:
			return { n: 0, s: " - ∞" }
	}
}

/** convert long numbers like 11,234 to 11k */
export function numberToShort(num: number): string {
	return Object.values(_numberToShort(num)).join("");
}