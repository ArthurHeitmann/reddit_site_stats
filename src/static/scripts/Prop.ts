import {ChangeNotifier} from "./ChangeNotifier";

export class Prop<T> extends ChangeNotifier {
	private _value: T;
	get value(): T {
		return this._value;
	}
	set value(value: T) {
		this._value = value;
		this.notifyListeners();
	}

	constructor(value: T) {
		super();
		this._value = value;
	}
}
