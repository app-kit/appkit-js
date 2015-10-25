namespace Appkit {
	/**
	 * EventHandler Mixin.
	 */

	export interface EventMap {
		[index: string]: Callback[];
	}

	export interface EventHandler {
		registerEvent(name: string): void;
		on(eventName: string, callback: Callback): void;
		trigger(eventName: string, ...args:any[]): void;
	}

	export class EventHandlerMixin implements EventHandler {
		private _events: EventMap;

		constructor() {
			this._events = {};
		}

		registerEvent(name: string) {
			this._events[name] = [];
		}

		on(eventName: string, callback: Callback) {
			if (!(eventName in this._events)) {
				throw new Error("Unknown event: " + eventName);
			}

			this._events[name].push(callback);
		}

		trigger(eventName: string, ...args:any[]) {
			if (!(eventName in this._events)) {
				throw new Error("Unknown event: " + eventName);
			}

			this._events[eventName].forEach((callback:Callback) => {
				callback(...args);
			});
		}
	}
}
