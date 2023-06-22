import {State} from "../state";
import {CustomHtmlElement} from "../CustomHtmlElement";
import {SankeyChart, SankeyData, SankeyNodeData} from "../charts/SankeyChart";
import {colorOfSubTypeMap, preferDarkMode} from "../utils";

export class Panel_Sankey extends CustomHtmlElement {
	state: State;
	chart: SankeyChart;

	constructor(state: State) {
		super();

		this.state = state;

		this.classList.add("panel");

		this.state.addListener(() => {
			this.chart.updateData(this.getSankeyData());
		});

		this.onFirstConnected.addListener(() => {
			const prefersDarkMode = preferDarkMode();
			this.chart = new SankeyChart({
				element: this,
				data: this.getSankeyData(),
				getColor: (inName, outName) => {
					inName = inName.replace("_current", "");
					outName = outName.replace("_current", "");
					if (inName in colorOfSubTypeMap)
						return colorOfSubTypeMap[inName];
					if (outName in colorOfSubTypeMap)
						return colorOfSubTypeMap[outName];
					if (inName == "blackout")
						return prefersDarkMode ? "#ffffff" : "#000000";
					if (inName == "nsfw")
						return "#ff68ac";
				}
			});
		});
	}

	getSankeyData(): SankeyData {
		// first level: private or restricted
		// second level: all in blackout (previous level joined)
		// third level: current type
		// fourth level: which have turned NSFW

		const data: SankeyData = {
			nodes: [],
			links: [],
		};

		const subTypeDurations: { [sub: string]: { [subType: string]: number } } = {};
		for (const sub of this.state.subredditTypesFull) {
			const subEntry: { [subType: string]: number } = {};
			subTypeDurations[sub.name] = subEntry;
			for (const subType of sub.typeSections) {
				if (!(subType.type in subEntry))
					subEntry[subType.type] = 0;
				subEntry[subType.type] += subType.duration;
			}
		}
		const privateSubs = Object.entries(subTypeDurations)
			.filter(([subName, typeDurations]) => {
				if (!("private" in typeDurations))
					return false;
				if (!("restricted" in typeDurations))
					return true;
				return typeDurations["private"] > typeDurations["restricted"];
			})
			.map(([subName, typeDurations]) => subName);
		const restrictedSubs = Object.entries(subTypeDurations)
			.filter(([subName, typeDurations]) => {
				if (!("restricted" in typeDurations))
					return false;
				if (!("private" in typeDurations))
					return true;
				return typeDurations["restricted"] > typeDurations["private"];
			})
			.map(([subName, typeDurations]) => subName);
		const allBlackoutSubs = [...privateSubs, ...restrictedSubs];
		const allBlackoutSubsData = this.state.subredditTypesFull
			.filter(sub => allBlackoutSubs.includes(sub.name));


		const privateNode: SankeyNodeData = {
			name: "private",
		};
		const restrictedNode: SankeyNodeData = {
			name: "restricted",
		};
		const blackoutNode: SankeyNodeData = {
			name: "blackout",
			title: "in blackout",
		};
		data.nodes.push(privateNode);
		data.nodes.push(restrictedNode);
		data.nodes.push(blackoutNode);
		data.links.push({
			source: privateNode,
			target: blackoutNode,
			value: privateSubs.length,
		});
		data.links.push({
			source: restrictedNode,
			target: blackoutNode,
			value: restrictedSubs.length,
		});

		const defaultCurrentSubTypes = ["private", "restricted", "public"];
		const allCurrentSubTypesSet: Set<string> = new Set();
		for (const sub of this.state.subredditTypesFull)
			allCurrentSubTypesSet.add(sub.typeSections[sub.typeSections.length - 1].type);
		for (let i = 0; i < defaultCurrentSubTypes.length; i++){
			const subType = defaultCurrentSubTypes[i];
			if (!allCurrentSubTypesSet.has(subType)) {
				defaultCurrentSubTypes.splice(i, 1);
				i--;
			}
		}
		const allCurrentSubTypes = [...defaultCurrentSubTypes];
		for (const subType of allCurrentSubTypesSet) {
			if (!defaultCurrentSubTypes.includes(subType))
				allCurrentSubTypes.push(subType);
		}

		for (const subType of allCurrentSubTypes) {
			const subTypeNode: SankeyNodeData = {
				name: subType + "_current",
				title: subType,
			};
			data.nodes.push(subTypeNode);
			data.links.push({
				source: blackoutNode,
				target: subTypeNode,
				value: allBlackoutSubsData.filter(sub => sub.typeSections[sub.typeSections.length - 1].type == subType).length,
			});
		}

		if (this.state.settings.includeNsfw.value === false) {
			const nsfwNode: SankeyNodeData = {
				name: "nsfw",
				title: "NSFW",
			};
			let hasAnyNsfw = false;
			for (const subType of allCurrentSubTypes) {
				const nsfwSubs = allBlackoutSubsData.filter(sub => {
					const lastSection = sub.typeSections[sub.typeSections.length - 1];
					return lastSection.type == subType && lastSection.isNsfw;
				});
				if (nsfwSubs.length == 0)
					continue;
				hasAnyNsfw = true;
				const subTypeNode = data.nodes.find(node => node.name == subType + "_current");
				data.links.push({
					source: subTypeNode,
					target: nsfwNode,
					value: nsfwSubs.length,
				});
			}
			if (hasAnyNsfw)
				data.nodes.push(nsfwNode);
		}

		return data;
	}
}

customElements.define("panel-sankey", Panel_Sankey);
