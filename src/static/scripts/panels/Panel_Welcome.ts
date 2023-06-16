import {makeElement, preferDarkMode, togglePrefersDarkMode} from "../utils";

const msgHtml = `
<b>Some quick notes:</b>
<ul>
	<li>There are several customization options, try them out!</li>
	<li>Subreddit related data is updated every 10 minutes.</li>
	<li>Posts and comments per minute are updated every minute.</li>
	<li>This website reloads the data every minute, so you don't have to.</li>
	<li>The list of subreddits is based on this <a href="https://subredditstats.com/" target="_blank">website</a>. This list includes the top 1000 SFW and 500 NSFW most popular subreddits.</li>
	<li>Not all private or restricted subreddits are related to the blackout (but most are).</li>
	<li>This dashboard is open source, and you can find the code <a href="https://github.com/ArthurHeitmann/reddit_site_stats" target="_blank">here</a>.</li>
	<li>You can contact me through GitHub or on Reddit <a href="https://www.reddit.com/user/RaiderBDev" target="_blank">u/RaiderBDev</a>.</li>
</ul>
`;

export class Panel_Welcome extends HTMLElement {
	constructor() {

		super();

		this.classList.add("panel");
		this.classList.add("welcome");

		this.append(makeElement("div", {class: "welcome-header"}, [
			makeElement("div"),
			makeElement("h2", {}, "Tracking the reddit blackout"),
			makeElement("button", {onclick: togglePrefersDarkMode}, preferDarkMode() ? "🌞" : "🌙"),
		]));
		this.append(makeElement("p", {}, msgHtml, true));
	}
}

customElements.define("panel-welcome", Panel_Welcome);
