import * as d3 from "d3";
import {ChangeNotifier} from "./ChangeNotifier";

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

function _timePassedSince(time: number): { n: number, s: string } {
	const s = Math.round(Date.now() / 1000 - time);
	if (s < 60)
		return { n: s, s: "seconds" };
	else if (s < 3600)
		return { n: Math.floor(s / 60), s: "minutes" };
	else if (s < 86400)
		return { n: Math.floor(s / 3600), s: "hours" };
	else if (s < 2592000)
		return { n: Math.floor(s / 86400), s: "days" };
	else if (s < 31557600)
		return { n: Math.floor(s / 2592000), s: "months" };
	else
		return { n: Math.floor(s / 31557600), s: "years" };
}

/**
 * 	1 - 59		 	 1s
 *	60 - 3599	 	 1 - 59m
 *	3600 - 86399	 1 - 23h
 *	86400 - 2591999	 1 - 29d
 *	2592000-31557599 1 - 12mo
 *	1 - ..y
 * @param time in seconds
 */
export function timePassedSince(time: number): string {
	const { n, s } = _timePassedSince(time);
	return `${n.toString()} ${n !== 1 ? s : s.replace(/s$/, "")}`;		// 1 seconds --> 1 second
}

/** @param time in seconds */
export function timePassedSinceStr(time: string): string {
	return timePassedSince(parseInt(time));
}

/** @param time in seconds */
export function timePeriodReadable(time: number) {
	return timePassedSince(Date.now() / 1000 - time);
}

export function formatPercent(num: number): string {
	const isInt = num % 1 === 0;
	if (isInt)
		return `${num}%`;
	const percent = num * 100;
	return `${percent.toFixed(1)}%`;
}

/**
 * Returns a function, that, when invoked, will only be triggered at most once
 * during a given window of time. Normally, the throttled function will run
 * as much as it can, without ever going more than once per `wait` duration;
 * but if you'd like to disable the execution on the leading edge, pass
 * `{leading: false}`. To disable execution on the trailing edge, ditto.
 * from https://stackoverflow.com/questions/27078285/simple-throttle-in-js
 */
export function throttle(func: (...any) => any, wait: number, options: { leading?: boolean, trailing?: boolean } = { leading: true, trailing: true}) {
	let context, args, result;
	let timeout: NodeJS.Timeout|null = null;
	let previous = 0;
	if (!options) options = {};
	const later = function() {
		previous = options.leading === false ? 0 : Date.now();
		timeout = null;
		result = func.apply(context, args);
		context = args = null;
	};
	return function(this: any, ..._: any) {
		const now = Date.now();
		if (!previous && options.leading === false) previous = now;
		const remaining = wait - (now - previous);
		context = this;
		args = arguments;
		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			result = func.apply(context, args);
			if (!timeout) context = args = null;
		} else if (!timeout && options.trailing !== false) {
			timeout = setTimeout(later, remaining);
		}
		return result;
	};
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * From: https://gist.github.com/nmsdvid/8807205
 */
export function debounce<T>(this: T, func: (...any) => any, wait: number, immediate = false) {
	let timeout;
	return function(this: T) {
		const context = this;
		const args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		}, wait);
		if (immediate && !timeout) func.apply(context, args);
	};
}

/**
 * Creates an element kinda in jsx fashion
 *
 * @param tagName Tag name of the element (div, span, etc.)
 * @param attributes Set of attributes of the element (ex: { class: "testClass", id: "testId" }
 * @param inner if of type array --> children of this element; else innerText (unless @param useInnerHTML is true)
 * @param useInnerHTML (default false) if true --> string for @param inner will be used for innerHTML
 */
export function makeElement<K extends keyof HTMLElementTagNameMap>(
	tagName: K | string,
	attributes?: Record<string, string | EventListener>,
	inner?: (HTMLElement | Node | string)[] | string,
	useInnerHTML = false
): HTMLElement {
	attributes = attributes || {};
	inner = inner || [];
	const elem = document.createElement(tagName);
	for (const [k, v] of Object.entries(attributes)) {
		if (/^on/.test(k))
			elem.addEventListener(k.match(/on(.*)/)?.[1], v as EventListener);
		else
			elem.setAttribute(k, v as string);
	}
	if (inner instanceof Array)
		elem.append(...inner.filter(value => Boolean(value)));
	else if (!useInnerHTML)
		elem.innerText = inner;
	else
		elem.innerHTML = inner;
	return elem;
}

export function isJsonEqual(obj1: object, obj2: object) {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function preferDarkMode(): boolean {
	return document.documentElement.classList.contains("dark-mode");
}
export function setPrefersDarkMode(preference: boolean) {
	window.localStorage.setItem("darkMode", preference ? "true" : "false");
	location.reload();
}
export function togglePrefersDarkMode() {
	setPrefersDarkMode(!preferDarkMode());
}
const lightModeSubColors = {
	"public": "#1f77b4",
	"private": "#252525",
	"restricted": "#c77d15",
	// "gold_only": "#d62728",
};
const darkModeSubColors = {
	"public": "#0e6094",
	"private": "#b7b7b7",
	"restricted": "#c77d15",
	// "gold_only": "#d62728",
}
export const colorOfSubTypeMap = preferDarkMode()
	? darkModeSubColors
	: lightModeSubColors;

export function colorOfSubType(type: string) {
	return colorOfSubTypeMap[type] || "#d62728";
}
class WindowWidthResizeEvents extends ChangeNotifier {
	private previouseWidth: number;

	constructor() {
		super();
		this.previouseWidth = window.innerWidth;
		window.addEventListener("resize", this.onResize.bind(this));
	}

	private onResize() {
		if (this.previouseWidth !== window.innerWidth) {
			this.previouseWidth = window.innerWidth;
			this.notifyListeners();
		}
	}
}

export const windowWidthResizeEvents = new WindowWidthResizeEvents();

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function deepCopy<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}
