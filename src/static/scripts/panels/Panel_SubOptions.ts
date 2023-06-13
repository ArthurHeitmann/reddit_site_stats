import {ToggleButton, ToggleButtonRoundCorners} from "../ToggleButton";
import {colorOfSubTypeMap, makeElement} from "../utils";
import {State} from "../state";


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
}

customElements.define("panel-sub-options", Panel_SubOptions);
