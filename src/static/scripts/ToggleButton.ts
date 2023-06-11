import {makeElement} from "./utils";

export enum ToggleButtonRoundCorners {
	left = "left",
	right = "right",
	both = "both",
	none = "none",
}

export class ToggleButton extends HTMLElement {
	isOn: boolean;
	onToggle: (isOn: boolean) => void;

	private button: HTMLButtonElement;
	private buttonsGroup: ToggleButton[];

	constructor(
		isOn: boolean,
		text: string,
		onToggle: (isOn: boolean) => void,
		corners: ToggleButtonRoundCorners = ToggleButtonRoundCorners.both, icon?: string
	) {
		super();
		this.isOn = isOn;

		this.onToggle = onToggle;
		this.classList.add("toggle-button");

		this.append(this.button = makeElement(
			"button",
			{
				class: `round-corners-${corners}` + (isOn ? " on" : ""),
				onclick: this.toggle.bind(this),
			},
			[
				icon && makeElement("img",  {src: icon}),
				makeElement("span", {class: "text"}, text),
			]
		) as HTMLButtonElement);
	}

	toggle() {
		this.isOn = !this.isOn;
		this.onToggle(this.isOn);
		this.button.classList.toggle("on", this.isOn);
		if (this.buttonsGroup !== undefined) {
			for (const button of this.buttonsGroup) {
				if (button === this)
					continue;
				button.isOn = false;
				button.button.classList.remove("on");
			}
		}
	}

	setButtonsGroup(buttonsGroup: ToggleButton[]) {
		this.buttonsGroup = buttonsGroup;
	}
}

customElements.define("toggle-button", ToggleButton);
