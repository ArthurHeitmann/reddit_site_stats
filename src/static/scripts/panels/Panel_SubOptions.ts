import * as d3 from "d3";
import {ToggleButton, ToggleButtonRoundCorners} from "../ToggleButton";
import {clamp, colorOfSubTypeMap, disableTouchScroll, enableTouchScroll, makeElement} from "../utils";
import {State} from "../state";
import {Prop} from "../Prop";


const limitsConfig = [
	{
		limit: 10,
		border: ToggleButtonRoundCorners.left,
	},
	{
		limit: 50,
		border: ToggleButtonRoundCorners.none,
	},
	{
		limit: 100,
		border: ToggleButtonRoundCorners.none,
	},
	{
		limit: 500,
		border: ToggleButtonRoundCorners.none,
	},
	{
		limit: 1500,
		border: ToggleButtonRoundCorners.right,
	},
]

export class Panel_SubOptions extends HTMLElement {
	state: State;

	private readonly dateRange: DateInputRange;

	constructor(state: State) {
		super();

		this.state = state;
		this.classList.add("panel");
		this.classList.add("sub-options");

		this.append(makeElement("h2", {}, "Subreddit data options"))
		let limitButtons = limitsConfig.map((config) => {
			return new ToggleButton(
				this.state.settings.subredditsLimit.value === config.limit,
				config.limit.toString(),
				() => this.setLimit(config.limit),
				config.border,
			);
		});
		this.append(makeElement("div", {class: "options"}, [
			makeElement("div", {class: "group"}, [
				new ToggleButton(state.settings.includeSfw.value, "SFW", this.toggleSfw.bind(this), ToggleButtonRoundCorners.left),
				new ToggleButton(state.settings.includeNsfw.value, "NSFW", this.toggleNsfw.bind(this), ToggleButtonRoundCorners.right),
			]),
			// new PropNumberField(state.settings.subredditsLimit, "Total subs", {min: 1, max: 1500}),
			makeElement("div", {class: "group"}, [
				makeElement("div", { class: "label" }, "Total subreddits"),
				...limitButtons,
			]),
		]));
		this.append(this.dateRange = new DateInputRange(
			this.getMinMaxDate.bind(this),
			this.state.settings.startDate,
			this.state.settings.endDate
		));
		this.append(makeElement("h2", {}, "Legend"))
		this.append(makeElement("div", {class: "legend"}, Object.entries(colorOfSubTypeMap).map(([type, color]) => {
			return makeElement("div", {class: "item"}, [
				makeElement("div", {class: "color-box", style: `--color: ${color}`}),
				makeElement("div", {class: "label"}, type),
			]);
		})));
		for (const button of limitButtons) {
			button.setButtonsGroup(limitButtons);
		}

		this.state.addListener(() => this.dateRange.update());
	}

	private toggleSfw(isOn: boolean) {
		this.state.settings.includeSfw.value = isOn;
	}

	private toggleNsfw(isOn: boolean) {
		this.state.settings.includeNsfw.value = isOn;
	}

	private setLimit(limit: number) {
		this.state.settings.subredditsLimit.value = limit;
	}

	private getMinMaxDate(): [number, number] {
		let minDate = Date.now();
		let maxDate = 0;
		for (const point of this.state.ppmFull.points) {
			minDate = Math.min(minDate, point.x);
			maxDate = Math.max(maxDate, point.x);
		}
		if (maxDate < minDate)
			maxDate = minDate + 1;
		return [minDate, maxDate];
	}
}

customElements.define("panel-sub-options", Panel_SubOptions);

class DateInputRange extends HTMLElement {
	private readonly getMinMaxDate: () => [number, number];
	private minDate: number;
	private maxDate: number;
	private readonly startDate: Prop<number|null>;
	private readonly endDate: Prop<number|null>;
	private readonly sliderRange: HTMLElement;
	private readonly startDateText: HTMLElement;
	private readonly endDateText: HTMLElement;
	private readonly onMouseMove_: (e: MouseEvent) => void;
	private readonly onMouseUp_: (e: MouseEvent) => void;
	private isDraggingLeft: boolean;
	private dragStartX: number;
	private dragStartY: number;
	private sliderPercent: number;

	constructor(getMinMaxDate: () => [number, number], startDate: Prop<number|null>, endDate: Prop<number|null>) {
		super();
		this.getMinMaxDate = getMinMaxDate;
		this.startDate = startDate;
		this.endDate = endDate;

		this.classList.add("date-input-range");
		let leftHandle: HTMLElement;
		let rightHandle: HTMLElement;
		this.append(...[
			makeElement("div", {class: "top-row"}, [
				makeElement("div", {class: "date-label"}, "Time range:"),
				this.startDateText = makeElement("div",{class: "date-text"}, ""),
				this.endDateText = makeElement("div",{class: "date-text"}, ""),
			]),
			this.sliderRange = makeElement("div", {class: "input-range"}, [
				makeElement("div", {class: "bar-background"}),
				makeElement("div", {class: "bar-filled"}),
				leftHandle = makeElement("div", {class: "handle handle-left"}),
				rightHandle = makeElement("div", {class: "handle handle-right"}),
			]),
		]);
		leftHandle.addEventListener("mousedown", this.startDrag.bind(this));
		leftHandle.addEventListener("touchstart", this.startDrag.bind(this));
		rightHandle.addEventListener("mousedown", this.startDrag.bind(this));
		rightHandle.addEventListener("touchstart", this.startDrag.bind(this));
		this.onMouseMove_ = this.onMouseMove.bind(this);
		this.onMouseUp_ = this.onMouseUp.bind(this);
		this.update();
	}

	update(startDate: number|null = this.startDate.value, endDate: number|null = this.endDate.value) {
		[this.minDate, this.maxDate] = this.getMinMaxDate();
		if (this.maxDate - this.minDate < 1000) {
			this.classList.add("hide");
			return;
		}
		this.classList.remove("hide");
		// Update the slider positions, through css variables
		// const sliderWidth = this.sliderRange.clientWidth;
		const left = startDate === null ? 0 : (startDate - this.minDate) / (this.maxDate - this.minDate);
		const right = endDate === null ? 1 : (endDate - this.minDate) / (this.maxDate - this.minDate);
		this.sliderRange.style.setProperty("--left", (left * 100) + "%");
		this.sliderRange.style.setProperty("--right", (right * 100) + "%");
		// Update the date text (if the date is null, show nothing)
		const dateFormat = d3.timeFormat("%b %d %H:%M");
		const startDateStr = startDate === null ? "" : dateFormat(new Date(startDate));
		const endDateStr = endDate === null ? "" : dateFormat(new Date(endDate));
		this.startDateText.textContent = startDateStr ? `from ${startDateStr}` : "";
		this.endDateText.textContent = endDateStr ? `until ${endDateStr}` : "";
		if (!startDateStr && !endDateStr) {
			this.startDateText.textContent = "Full";
		}
	}

	private startDrag(e: MouseEvent | TouchEvent) {
		const target = e.target as HTMLElement;
		if (!target.classList.contains("handle-left") && !target.classList.contains("handle-right"))
			return;
		target.classList.add("dragging");
		if (e instanceof MouseEvent) {
			this.dragStartX = e.clientX;
			this.dragStartY = e.clientY;
		} else {
			this.dragStartX = e.touches[0].clientX;
			this.dragStartY = e.touches[0].clientY;
		}
		[this.minDate, this.maxDate] = this.getMinMaxDate();
		this.isDraggingLeft = target.classList.contains("handle-left");
		document.addEventListener("mousemove", this.onMouseMove_);
		document.addEventListener("touchmove", this.onMouseMove_);
		document.addEventListener("mouseup", this.onMouseUp_);
		document.addEventListener("touchend", this.onMouseUp_);
		disableTouchScroll();
	}

	private readonly minSeparation = 1000 * 60 * 60 * 4;

	private onMouseMove(e: MouseEvent | TouchEvent) {
		let clientX: number;
		if (e instanceof MouseEvent)
			clientX = e.clientX;
		else
			clientX = e.touches[0].clientX;
		const bbox = this.sliderRange.getBoundingClientRect();
		const x = clientX - bbox.left;
		let relativeX = x / this.sliderRange.clientWidth;
		relativeX = clamp(relativeX, 0, 1);
		// round to the nearest 10 minutes
		let date = this.minDate + relativeX * (this.maxDate - this.minDate);
		if (this.isDraggingLeft && date > this.minDate || !this.isDraggingLeft && date < this.maxDate) {
			const dateObj = new Date(date);
			dateObj.setMinutes(Math.round(dateObj.getMinutes() / 10) * 10);
			dateObj.setSeconds(0);
			dateObj.setMilliseconds(0);
			date = dateObj.getTime();
		}
		if (this.isDraggingLeft)
			date = Math.min(date, (this.endDate.value ?? this.maxDate) - this.minSeparation);
		else
			date = Math.max(date, (this.startDate.value ?? this.minDate) + this.minSeparation);
		relativeX = (date - this.minDate) / (this.maxDate - this.minDate);
		this.sliderPercent = relativeX;
		if (this.isDraggingLeft)
			this.update(date, this.endDate.value);
		else
			this.update(this.startDate.value, date);
	}


	private onMouseUp(e: MouseEvent | TouchEvent) {
		enableTouchScroll();
		const target = e.target as HTMLElement;
		target.classList.remove("dragging");
		document.removeEventListener("mousemove", this.onMouseMove_);
		document.removeEventListener("touchmove", this.onMouseMove_);
		document.removeEventListener("mouseup", this.onMouseUp_);
		document.removeEventListener("touchend", this.onMouseUp_);
		let date = this.minDate + this.sliderPercent * (this.maxDate - this.minDate);
		if (this.isDraggingLeft) {
			date = Math.min(date, (this.endDate.value ?? this.maxDate) - this.minSeparation);
			if (date <= this.minDate)
				date = null;
			this.startDate.value = date;
		}
		else {
			date = Math.max(date, (this.startDate.value ?? this.minDate) + this.minSeparation);
			if (date >= this.maxDate)
				date = null;
			this.endDate.value = date;
		}
	}
}

customElements.define("date-input-range", DateInputRange);
