import {Mission} from "./Mission";

export abstract class IntervalMission implements Mission {
	private readonly intervalMs: number;
	private intervalId: NodeJS.Timeout | null = null;

	protected constructor(intervalMs: number) {
		this.intervalMs = intervalMs;
	}

	abstract run();

	private runWrapper() {
		try {
			this.run();
		} catch (e) {
			console.error(e);
		}
	}

	start(): void {
		if (this.intervalId !== null)
			clearInterval(this.intervalId);
		this.intervalId = setInterval(this.runWrapper.bind(this), this.intervalMs);
		this.run();
	}

	stop(): void {
		if (this.intervalId === null)
			return;
		clearInterval(this.intervalId);
		this.intervalId = null;
	}
}
