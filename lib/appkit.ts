/**
 * 
 */

/// <reference path="../typings/bluebird/bluebird.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/autobahn/autobahn.d.ts" />
/// <reference path="../typings/basil.js.d.ts" />

/// <reference path="common.ts" />
/// <reference path="events.ts" />
/// <reference path="stores/store.ts" />

namespace Appkit {

	export interface AppkitOptions {
		apiHost: string;
		apiUseSsl: boolean;
		apiPrefix: string;

		debug?: boolean;

		clients: Dictionary;
		storage: basil.BasilOptions;
	}

	interface SerializerMap {
		[index: string]: Serializer;
	}

	export class Appkit implements EventHandler {
		private _debug: boolean;
		private _serializers: SerializerMap;
		private _defaultSerializer: string;
		private _options: AppkitOptions;
		private _storage: basil.Basil;
		private _client: Client;
		private _session: Session;

		constructor(options: AppkitOptions) {
			this._serializers = {
				jsonapi: new JsonApiSerializer(),
			};

			this._buildSerializers();

			this._initOptions(options);
			this._initStorage();
			this._buildSession();
			this._buildClient();
			this._client.connect().then(() => {
				this._restoreSession();
			});
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

		private _buildSerializers() {
			this._serializers["jsonapi"] = new JsonApiSerializer();
			this._defaultSerializer = "jsonapi"
		}

		private _initOptions(options: AppkitOptions) {
			let opts: any = _.defaults(options || {}, {
				debug: false,
				apiHost: "localhost:8000",
				apiUseSsl: false,
				apiPrefix: "/api",
			});

			this._debug = opts.debug;

			opts = _.defaultsDeep(opts, {
				storage: {
					"namespace": "appkit",
					storages: ['local', 'cookie', 'session', 'memory'],
					expireDays: 14,
				},

				clients: {
					rest: {
						enabled: true,
						url: (opts.apiUseSsl ? "https://" : "http://") + opts.apiHost + opts.apiPrefix,
					},
					wamp: {
						enabled: true,
						url: "ws://" + opts.apiHost + opts.apiPrefix + "/wamp",
					},
				},
			});

			this._options = <AppkitOptions> opts;
		}

		private _initStorage() {
			this._storage = new Basil(this._options.storage);
		}

		private _buildSession() {
			this._session = new Session();
		}

		private _buildClient() {
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

		private _restoreSession(): Promise<any> {
			let session = this._storage.get("session");
			if (session && session.token) {
				console.log("Restoring session with token ", session.token);
				return this.resumeSession(session.token);
			}

			return null;
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

		method(name: string, data: TransferData, serializerName?: string): Promise<any> {
			let serializer: Serializer = null;

			let serializedData: any = data;

			if (typeof serializerName !== "undefined" && !serializerName) {
				// If a falsy value was passed for serializer, skip serialization.
			} else {
				let name = serializerName || this._defaultSerializer;
				serializer = this.serializer(name);	
				if (!serializer) {
					throw new Error("Unknown serializer: " + serializer);
				}
				serializedData = serializer.SerializeTransferData(data);
			}

			if (this._debug) {
				console.log(`APPKIT: Calling method ${name} with data: `, serializedData);
			}

			return this._client.method(name, serializedData).then((data: any) => {
				if (serializer) {
					data = serializer.UnserializeTransferData(data);
				}

				if (this._debug) {
					console.log(`APPKIT: Received response for method ${name}: `, data);
				}
				return Promise.resolve(data);
			}).catch((err: any) => {
				if (this._debug) {
					console.log(`APPKIT: Method ${name} failed: `, err);
				}
				return Promise.reject(err);
			});
		}

		/**
		 * User / session methods.
		 */

		signUp(user: any, authOptions: AuthOptions): Promise<any> {
			return this.create(user, authOptions);
		}

		signUpWithPassword(email: string, password: string, username?: string): Promise<any> {
			let attrs: Dictionary = {email: email};
			if (username) {
				attrs["username"] = username;
			}
			return this.signUp({
				type: "users",
				attributes: attrs
			}, {
				adaptor: "password",
				authData: {
					password: password,
				},
			});
		}

		signUpWithOauth(oauthService: string, token: string, userAttributes: Dictionary): Promise<any> {
			return this.signUp({
				type: "users",
				attributes: userAttributes,
			}, {
				adaptor: "oauth",
				authData: {
					service: oauthService,
					access_token: token,
				},
			});	
		}

		requestPasswordReset(userIdentifier: string) {
			return this.method("users.request-password-reset", {data: {user: userIdentifier}});	
		}

		resetPassword(token: string, newPassword: string) {
			return this.method("users.password-reset", {data: {
				token: token, 
				password: newPassword,
			}});
		}

		authenticate(options: AuthOptions): Promise<any> {
			return this.method("users.authenticate", {data: options}).then(response => {
				this._onSessionData(response);
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

		authenticateWithOauth(oauthService: string, token: string): Promise<any> {
			return this.authenticate({
				adaptor: "oauth",
				authData: {
					service: oauthService,
					access_token: token,
				},
			});
		}

		unauthenticate() {
			if (!this.isAuthenticated()) {
				throw new Error("Can't unauthenticate when not authenticated.");
			}
			return this.method("users.unauthenticate", {}).then((data:any) => {
				this._onSessionData(null);
				return Promise.resolve(data);
			});
		}

		resumeSession(token:string): Promise<any> {
			return this.method("users.resume_session", {data: {token}}).then((response:TransferData) => {
				this._onSessionData(response);
				return Promise.resolve(response);
			});
		}

		_onSessionData(data: any) {
			if (data) {
				this._session.updateWithResponse(this, data);
			} else {
				this._session.clearUser();
			}

			if (this._session.token) {
				this._storage.set("session", {token: this._session.token});
			} else {
				this._storage.remove("session");
			}

			this.trigger("session_changed", this._session);
		}

		/**
		 * CRUD methods.
		 */

		findOne(collection: string, id: string): Promise<any> {
			return this.method("find_one", {
				data: {collection, id},
			}, null);
		}

		query(collection?:string, query?:Query): Promise<any> {
			query = query || <Query> {};
			if (collection) {
				query.collection = collection;
			}

			return this.method("query", {data: {query}}, null);
		}

		create(data: any, meta:Dictionary = {}): Promise<any> {
			return this.method("create", {models: [data], meta}, null);
		}

		update(data: any, meta:Dictionary = {}): Promise<any> {
			return this.method("update", {models: [data], meta}, null);
		}

		delete(data: any, meta:Dictionary = {}): Promise<any> {
			let collection: string, id: string;

			if (data.collection && data.id) {
				collection = data.collection;
				id = data.id;
			} else if (data.type && data.id) {
				collection = data.type;
				id = data.id;
			} else if (data.getId && data.getCollection) {
				// Model instance!.
				collection = data.getCollection();
				id = data.getId();
			}

			if (!collection || typeof collection !== "string" || !id || typeof id !== "string") {
				throw new Error("Could not determine collection or id");
			}

			return this.method("delete", {data: {collection, id}, meta}, null);
		}
	}
	applyMixins(Appkit, [EventHandlerMixin]);
}
