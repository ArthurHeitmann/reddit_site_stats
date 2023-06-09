
export class ChangeNotifier {
	private listeners: (() => void)[] = [];

	addListener(listener: () => void): void {
		this.listeners.push(listener);
	}

	removeListener(listener: () => void): void {
		this.listeners = this.listeners.filter(l => l !== listener);
	}

	notifyListeners(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (e) {
				console.error(e);
			}
		}
	}
}
