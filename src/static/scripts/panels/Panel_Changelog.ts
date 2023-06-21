import {makeElement} from "../utils";

const msg = `
<h3>2023.06.21</h3>
<ul>
	<li>Added changelog</li>
	<li>Now running in the cloud. So hopefully no more downtime</li>
	<li>Added list of archived subreddits</li>
</ul>
<h3>2023.06.17</h3>
<ul>
	<li>Filled data gap in post & comment per minute data</li>
</ul>
<h3>2023.06.14</h3>
<ul>
	<li>Added dark mode (can be toggled by clicking the 🌞 or 🌙 at the top)</li>
	<li>Added option to reduce noise in the activity per minute chart</li>
</ul>
<h3>2023.06.13</h3>
<ul>
	<li>Added time range filter option</li>
	<li>Added list of subreddits out of blackout</li>
</ul>
<h3>2023.06.11</h3>
<ul>
	<li>Available to the public :)</li>
</ul>
`;

export class Panel_Changelog extends HTMLElement {
	toggleButton: HTMLElement;
	content: HTMLElement;

	constructor() {

		super();

		this.classList.add("panel");
		this.classList.add("changelog");

		this.append(makeElement("h2", {}, "Changelog"));
		this.content = makeElement("div", {class: "content"}, msg, true);
		this.toggleButton = makeElement(
			"button", {
				class: "single-button round-corners-both",
				onclick: () => {
					this.toggleButton.remove();
					this.append(this.content);
				}
			},
			"Show"
		)
		this.append(this.toggleButton);
	}
}

customElements.define("panel-changelog", Panel_Changelog);
