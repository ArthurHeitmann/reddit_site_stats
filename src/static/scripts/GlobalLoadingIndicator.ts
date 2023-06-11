
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
	 width="200px" height="100px" viewBox="0 0 100 50"
	 preserveAspectRatio="xMidYMid">
	<g transform="translate(20 25)">
		<circle cx="0" cy="0" r="6" fill="#93dbe9">
			<animateTransform attributeName="transform" type="scale" begin="-0.8152173913043478s" calcMode="spline"
							  keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1"
							  dur="2.1739130434782608s" repeatCount="indefinite"></animateTransform>
		</circle>
	</g>
	<g transform="translate(40 25)">
		<circle cx="0" cy="0" r="6" fill="#689cc5">
			<animateTransform attributeName="transform" type="scale" begin="-0.5434782608695652s" calcMode="spline"
							  keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1"
							  dur="2.1739130434782608s" repeatCount="indefinite"></animateTransform>
		</circle>
	</g>
	<g transform="translate(60 25)">
		<circle cx="0" cy="0" r="6" fill="#5e6fa3">
			<animateTransform attributeName="transform" type="scale" begin="-0.2717391304347826s" calcMode="spline"
							  keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1"
							  dur="2.1739130434782608s" repeatCount="indefinite"></animateTransform>
		</circle>
	</g>
	<g transform="translate(80 25)">
		<circle cx="0" cy="0" r="6" fill="#3b4368">
			<animateTransform attributeName="transform" type="scale" begin="0s" calcMode="spline"
							  keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1"
							  dur="2.1739130434782608s" repeatCount="indefinite"></animateTransform>
		</circle>
	</g>
</svg>
`

export class GlobalLoadingIndicator extends HTMLElement {
	private loadingStack: number = 0;
	private static _instance: GlobalLoadingIndicator;

	constructor() {
		super();
		this.classList.add("global-loading-indicator");
		this.innerHTML = svg;
	}

	public static pushIsLoading() {
		GlobalLoadingIndicator.instance.loadingStack++;
		GlobalLoadingIndicator.instance.show();
	}

	public static popIsLoading() {
		GlobalLoadingIndicator.instance.loadingStack--;
		if (GlobalLoadingIndicator.instance.loadingStack <= 0) {
			GlobalLoadingIndicator.instance.loadingStack = 0;
			GlobalLoadingIndicator.instance.hide();
		}
	}

	public static get instance(): GlobalLoadingIndicator {
		if (!GlobalLoadingIndicator._instance)
			GlobalLoadingIndicator._instance = new GlobalLoadingIndicator();
		return GlobalLoadingIndicator._instance;
	}

	private show() {
		this.classList.add("visible");
	}

	private hide() {
		this.classList.remove("visible");
	}
}

customElements.define("global-loading-indicator", GlobalLoadingIndicator);
