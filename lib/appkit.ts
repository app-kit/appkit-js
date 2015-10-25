/**
 * 
 */

/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/autobahn/autobahn.d.ts" />

/// <reference path="common.ts" />
/// <reference path="events.ts" />

namespace Appkit {

	interface AppkitOptions {
		clients: Dictionary;

		apiHost: string;
		apiUseSsl: boolean;
		apiPrefix: string;
	}

	interface SerializerMap {
		[index: string]: Serializer;
	}

	export class Appkit implements EventHandler {
		private _options: AppkitOptions;
		private _serializers: SerializerMap;
		private _client: Client;
		private _session: Session;

		constructor(options: AppkitOptions) {
			this._serializers = {
				jsonapi: new JsonApiSerializer(),
			};

			this.initOptions(options);
			this.buildSession();
			this.buildClient();
			this._client.connect();
		}

		/**
		 * EventHandler.
		 */

		private _events: EventMap = {
			session_changed: [],
		};
		registerEvent: (name: string) => void;
		on: (eventName: string, callback: Callback) => void;
		trigger: (eventName: string, ...args:any[]) => void;

		initOptions(options:AppkitOptions) {
			options = <AppkitOptions> _.defaults(options || {}, {
				apiHost: "localhost:8000",
				apiUseSsl: false,
				apiPrefix: "/api",
			});

			options.clients = _.defaultsDeep(options.clients || {}, {
				rest: {
					enabled: true,
					url: (options.apiUseSsl ? "https://" : "http://") + options.apiHost + options.apiPrefix,
				},
				wamp: {
					enabled: true,
					url: "ws://" + options.apiHost + options.apiPrefix + "/wamp",
				}
			});

			this._options = options;
		}

		buildSession() {
			this._session = new Session();
		}

		buildClient() {
			let fallback = new FallbackClient(this._session);

			let opts = this._options.clients;

			// Init autobahn client.
			let wampOpts = <AutobahnOptions> opts["wamp"];
			if (wampOpts.enabled) {
				let autobahn = new AutobahnClient(wampOpts, this._session);
				fallback.addClient(autobahn);
			}

			// Init rest client.
			let restOpts = <RestOptions> opts["rest"];
			if (restOpts.enabled) {
				let rest = new RestClient(restOpts, this._session);
				fallback.addClient(rest);
			}

			this._client = fallback;
		}

		/**
		 * Serialzier accessors.
		 */

		serializer(name: string): Serializer {
			return name in this._serializers ? this._serializers[name] : null;
		}

		/**
		 * User accessors.
		 */

		isAuthenticated(): boolean {
			return this._session.isAuthenticated();
		}

		user(): any {
			return this._session.userData;
		}

		userId(): string {
			return this._session.userId;
		}

		/**
		 * Methods.
		 */

		method(name: string, data:any): Promise<any> {
			return this._client.method(name, data);
		}

		/**
		 * User / session methods.
		 */

		authenticate(options: AuthOptions): Promise<any> {
			return this.method("users.authenticate", options).then(response => {
				this._session.updateWithResponse(this, response);
				this.trigger("session_changed", this._session);
				return Promise.resolve(response);
			});
		}

		authenticateWithPassword(user: string, pw: string): Promise<any> {
			return this.authenticate({
				user: user,
				adaptor: "password",
				authData: {password: pw},
			});
		}

		unauthenticate() {
			if (!this.isAuthenticated()) {
				throw new Error("Can't unauthenticate when not authenticated.");
			}
			return this.method("users.unauthenticate", {}).then(data => {
				this._session.clearUser();
				this.trigger("session_changed", this._session);
				return Promise.resolve(data);
			});
		}

		resumeSession(token:string): Promise<any> {
			return this.method("users.resume_session", {token: token}).then(response => {
				this._session.updateWithResponse(this, response);
				this.trigger("session_changed", this._session);
				return Promise.resolve(response);
			});
		}

		/**
		 * CRUD methods.
		 */

		query(collection?:string, query?:Query): Promise<any> {
			query = query || <Query> {};
			if (collection) {
				query.collection = collection;
			}

			return this.method("query", {query});
		}

		create(data: any, meta:Dictionary = {}): Promise<any> {
			return this.method("create", {data, meta})
		}

		update(data: any, meta:Dictionary = {}): Promise<any> {
			return this.method("update", {data, meta});
		}

		delete(data: any, meta:Dictionary = {}): Promise<any> {
			return this.method("delete", {data, meta});
		}
	}
	applyMixins(Appkit, [EventHandlerMixin]);

	interface Query {
		collection?: string;
		fields: string[];
		filters: any;
		joins: string[];
		orders: string[];
	}
}
