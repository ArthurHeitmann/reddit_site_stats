import {Prop} from "./Prop";

export interface LimitsConfig {
	min?: number|undefined;
	max?: number|undefined;
	suggestedValues?: number[]|undefined;
}

export class PropNumberField extends HTMLElement {
	prop: Prop<number>;
	limits: LimitsConfig;

	private input: HTMLInputElement;
	private label?: HTMLLabelElement|undefined;
	private error: HTMLDivElement;

	constructor(prop: Prop<number>, labelText?: string, limits: LimitsConfig = {}) {
		super();
		this.prop = prop;
		this.limits = limits;

		this.classList.add("prop-number-field");

		if (labelText) {
			this.label = document.createElement("label");
			this.label.textContent = labelText;
			this.append(this.label);
		}

		this.input = document.createElement("input");
		this.input.type = "number";
		this.input.value = prop.value.toString();
		this.input.addEventListener("change", this.onChange.bind(this));
		this.append(this.input);

		this.error = document.createElement("div");
		this.error.classList.add("error");
		this.append(this.error);

		this.prop.addListener(this.onPropChange.bind(this));
	}

	private onChange() {
		const newValue = Number(this.input.value);
		const errorMsg = this.validate(newValue);
		if (errorMsg) {
			this.error.textContent = errorMsg;
			this.error.classList.add("visible");
			return;
		}
		this.error.classList.remove("visible");
		this.prop.value = newValue;
	}

	private onPropChange() {
		this.input.value = this.prop.value.toString();
		this.error.classList.remove("visible");
	}

	private validate(value: number): string|undefined {
		if (this.limits.min !== undefined && value < this.limits.min) {
			return `Value must >= ${this.limits.min}`;
		}
		if (this.limits.max !== undefined && value > this.limits.max) {
			return `Value must be <= ${this.limits.max}`;
		}
		return undefined;
	}
}

customElements.define("prop-number-field", PropNumberField);
