namespace Appkit {
	export interface AutobahnOptions {
		enabled?: boolean;
		url: string;
		debug?: boolean;
		realm?: string;
	}

	export class AutobahnClient implements Client {
		private _url: string;
		private _debug: boolean;
		private _connecting: boolean;
		private _connected: boolean;
		private _session: Session;

		private _realm: string;

		private _connection: autobahn.Connection;
		private _autobahnSession: autobahn.Session;

		private _afterOpenCallbacks: DeferredPromise[];
		private _afterCloseCallbacks: DeferredPromise[];

		constructor(options: AutobahnOptions, session: Session) {
			if (typeof options !== "object") {
				throw new Error("No options supplied to AutobahnClient");
			}
			if (!options.url) {
				throw new Error("Need to set 'url' option for AutobahnClient");
			}

			this._url = options.url;
			this._debug = !!options.debug;
			this._session = session;

			this._realm = options.realm || "appkit";

			this._afterOpenCallbacks = [];
			this._afterCloseCallbacks = [];
		}

		connect(): Promise<any> {
			// Try to initialize autobahn.js.
			let con = new autobahn.Connection({
				url: this._url, 
				realm: this._realm,
			});
			this._connection = con;

			con.onopen = (session:autobahn.Session, details:any) => {
				console.log("APPKIT: Autobahn connection established");
				this._autobahnSession = session;
				this._connected = true;
				this._connecting = false;

				this._afterOpenCallbacks.forEach(function(deferred:DeferredPromise) {
					deferred.resolve(session, details);
				});
				this._afterOpenCallbacks = [];
			};
			con.onclose = (reason:string, details:any) => {
				console.log("APPKIT: Autobahn connection closed: ", reason, details);
				this._autobahnSession = null;
				this._connected = false;
				this._connecting = details.will_retry && details.retry_count < 2;

				this._afterOpenCallbacks.forEach(function(deferred:DeferredPromise) {
					deferred.reject({reason: reason, details: details});
				});
				this._afterOpenCallbacks = [];

				this._afterCloseCallbacks.forEach(function(deferred:DeferredPromise) {
					deferred.resolve(reason, details);
				});
				this._afterCloseCallbacks = [];

				return false;
			};

			this._connected = false;
			this._connecting = true;

			con.open();

			return this.afterConnect();
		}

		isConnecting() {
			return this._connecting;
		}

		isConnected() {
			return this._connected;
		}

		afterConnect(): Promise<Client> {
			if (!this._connecting) {
				if (this._connected) {
					return Promise.resolve(this);
				} else {
					throw new Error("Can't call .afterConnect() when the client is not connecting or connected.")
				}
			}

			let deferred = deferredPromise();
			this._afterOpenCallbacks.push(deferred);

			return deferred.promise;
		}

		afterDisconnect(): Promise<any> {
			if (!this._connected) {
				return Promise.resolve();
			}

			let deferred = deferredPromise();
			this._afterCloseCallbacks.push(deferred);

			return deferred.promise;
		}

		disconnect(): Promise<any> {
			if (!this._connected) {
				return Promise.resolve();
			} else {
				this._connection.close("appkit.user_disconnect", "");
				return this.afterDisconnect();
			}
		}

		method(name: string, data:any): Promise<any> {
			data = data || {};
			if (!("data" in data)) {
				data = {data: data};
			}

			console.log("APPKIT: Calling autobahn method: ", name);
			return Promise.resolve(this._autobahnSession.call(name, [], data)).get("kwargs");
		}
	}
}
