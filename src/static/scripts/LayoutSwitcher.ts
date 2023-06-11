import {windowWidthResizeEvents} from "./utils";


export interface LayoutElementConfig {
	element: HTMLElement;
	column: number;
	row: number;
}

const twoColumnLayoutMinWidth = 950;
/**
 * Switches between two-column masonry and one-column layout depending on the width of the window.
 */
export class LayoutSwitcher extends HTMLElement {
	private readonly layoutElements: LayoutElementConfig[];
	private twoColumnLayout: boolean|null = null;

	constructor(elements: LayoutElementConfig[]) {
		super();

		this.layoutElements = elements;
		this.classList.add("layout-switcher");

		windowWidthResizeEvents.addListener(this.onResize.bind(this));
		this.onResize();
	}

	private isTwoColumnLayout() {
		return window.innerWidth >= twoColumnLayoutMinWidth;
	}

	private onResize() {
		const twoColumnLayout = this.isTwoColumnLayout();
		if (twoColumnLayout !== this.twoColumnLayout) {
			this.twoColumnLayout = twoColumnLayout;
			this.makeLayout();
		}
	}

	private makeLayout() {
		if (this.twoColumnLayout) {
			this.makeTwoColumnLayout();
		} else {
			this.makeOneColumnLayout();
		}
	}

	private resetLayout() {
		while (this.firstChild) {
			this.removeChild(this.firstChild);
		}
	}

	private makeOneColumnLayout() {
		this.classList.remove("two-column");
		this.classList.add("one-column");
		for (const element of this.layoutElements) {
			this.appendChild(element.element);
		}
	}

	private makeTwoColumnLayout() {
		this.classList.remove("one-column");
		this.classList.add("two-column");
		this.resetLayout();
		for (let i = 0; i < 2; i++) {
			const columnElements = this.layoutElements.filter(element => element.column === i);
			columnElements.sort((a, b) => a.row - b.row);
			const column = this.makeIndividualColumn(columnElements.map(element => element.element));
			this.appendChild(column);
		}
	}

	private makeIndividualColumn(elements: HTMLElement[]): HTMLElement {
		const column = document.createElement("div");
		column.classList.add("column");
		for (const element of elements) {
			column.appendChild(element);
		}
		return column;
	}

}

customElements.define("layout-switcher", LayoutSwitcher);
