
export interface Mission {
	init(): Promise<void>;
	start(): void;
	stop(): void;
}
