namespace Appkit{
	export class FallbackClient {
		private _session: Session;
		private _afterConnectCallbacks: DeferredPromise[];

		private _clients: Client[];

		constructor(session:Session) {
			this._session = session;
			this._clients = [];
			this._afterConnectCallbacks = [];
		}

		addClient(client: Client) {
			this._clients.push(client);
		}

		client(clientIndex = 0): Promise<Client> {
			let client = this._clients[clientIndex];
			if (!client) {
				return Promise.reject("no_valid_client");
			}

			if (client.isConnected()) {
				return Promise.resolve(client);
			} else if (client.isConnecting()) {
				return client.afterConnect().then(() => {
					return client;
				}).catch(e => {
					return this.client(clientIndex + 1);
				});
			}
		}

		connect(clientIndex = 0): Promise<any> {
			let client = this._clients[clientIndex];
			if (!client) {
				return Promise.reject("no_valid_client");
			}

			return client.connect().then((...args:any[]) => {
				this._afterConnectCallbacks.forEach(function(deferred) {
					deferred.resolve(...args);
				});
				this._afterConnectCallbacks = [];

				return Promise.resolve(args);
			}).catch(e => {
				return this.connect(clientIndex + 1);
			});
		}

		isConnecting(): boolean {
			let flag = false;
			this._clients.forEach(function(client) {
				if (client.isConnected()) {
					// Uppermost non-inactive client is connected, so stop 
					// iteration and return false.
					return false;
				} else if (client.isConnecting()) {
					// Uppermost client is connecting, so stop iteration and 
					// return true.
					flag = true;
					return false;
				}
			});
			return flag;
		}

		isConnected() {
			let flag = false;
			this._clients.forEach(function(client) {
				if (client.isConnected()) {
					flag = true;
					return false;
				}
			});
			return flag;
		}

		afterConnect(): Promise<Client> {
			if (!this.isConnecting()) {
				if (this.isConnected()) {
					return Promise.resolve(this);
				} else {
					throw new Error("Can't call .afterConnect() when the client is not connecting or connected.")
				}
			}

			let deferred = deferredPromise();
			this._afterConnectCallbacks.push(deferred);

			return deferred.promise;
		}

		afterDisconnect(): Promise<any> {
			throw new Error(".afterDisconnect() is not supported by fallbackClient");
		}

		disconnect(): Promise<any> {
			let promises: Promise<any>[] = [];
			this._clients.forEach(client => {
				if (client.isConnected()) {
					promises.push(client.disconnect());
				}
			});
			return Promise.all(promises);
		}

		method(name: string, data: any): Promise<any> {
			return this.client().call("method", name, data);
		}
	}
}
