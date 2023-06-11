import {ChangeNotifier} from "./ChangeNotifier";

export class CustomHtmlElement extends HTMLElement {
	private hasBeenConnected = false;
	protected onFirstConnected: ChangeNotifier = new ChangeNotifier();

	constructor() {
		super();
	}

	connectedCallback() {
		if (!this.hasBeenConnected) {
			this.hasBeenConnected = true;
			this.onFirstConnected.notifyListeners();
		}
	}
}

customElements.define("custom-html-element", CustomHtmlElement);
