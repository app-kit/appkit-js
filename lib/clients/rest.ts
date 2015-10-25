/// <reference path="../../typings/reqwest.d.ts" />

namespace Appkit {
	export interface RestOptions {
		enabled?: boolean;
		url: string;
		debug?: boolean;
	}

	export class RestClient implements Client {
		private _url: string;
		private _debug: boolean;
		private _session: Session;

		constructor(options: RestOptions, session: Session) {
			if (typeof options !== "object") {
				throw new Error("No options supplied to RestClient");
			}
			if (!options.url) {
				throw new Error("Need to set 'url' option for RestClient");
			}

			this._url = options.url;
			this._debug = !!options.debug;
			this._session = session;
		}

		connect(): Promise<any> {
			return Promise.resolve();
		}

		isConnecting() {
			return false;
		}

		isConnected() {
			return true;
		}

		afterConnect(): Promise<Client> {
			return Promise.resolve(this);
		}

		disconnect(): Promise<any> {
			return Promise.resolve();
		}

		afterDisconnect(): Promise<any> {
			return Promise.resolve();
		}

		_ajax(options:any): Promise<any> {
			options = <reqwest.Options> _.defaults(options || {}, {
				method: "POST",
				contentType: "application/json",
				type: "json",
				headers: {},
			});

			if (!options.url) {
				throw new Error("No url specified");
			}

			if (options.url[0] === '/') {
				options.url = this._url + options.url;
			}

			if (options.method !== "GET" && options.data && typeof options.data !== "string") {
				options.data = JSON.stringify(options.data);
			}

			// If the session is authenticated, add an Authentication header.

			let token = this._session.token;
		    if (token) {
		      options.headers = options.headers || {};
		      options.headers.Authentication = token;
		    }

			return Promise.resolve(reqwest(options));
		}

		method(name: string, data:any): Promise<any> {
			data = data || {};
			if (!("data" in data)) {
				data = {data: data};
			}

			return this._ajax({
				url: "/method/" + name,
				data: data,
			});
		}
	}
}
