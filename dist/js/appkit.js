var Appkit;
(function (Appkit) {
    function deferredPromise() {
        var deferred = {
            promise: null,
            resolve: null,
            reject: null,
        };
        var p = new Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
        deferred.promise = p;
        return deferred;
    }
    Appkit.deferredPromise = deferredPromise;
    /**
     * Mixins.
     */
    function applyMixins(derivedCtor, baseCtors) {
        baseCtors.forEach(function (baseCtor) {
            Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
                derivedCtor.prototype[name] = baseCtor.prototype[name];
            });
        });
    }
    Appkit.applyMixins = applyMixins;
})(Appkit || (Appkit = {}));
var Appkit;
(function (Appkit) {
    var EventHandlerMixin = (function () {
        function EventHandlerMixin() {
            this._events = {};
            this._events = {};
        }
        EventHandlerMixin.prototype.registerEvent = function (name) {
            this._events[name] = [];
        };
        EventHandlerMixin.prototype.on = function (eventName, callback) {
            if (!(eventName in this._events)) {
                throw new Error("Unknown event: " + eventName);
            }
            this._events[eventName].push(callback);
        };
        EventHandlerMixin.prototype.trigger = function (eventName) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (!(eventName in this._events)) {
                throw new Error("Unknown event: " + eventName);
            }
            this._events[eventName].forEach(function (callback) {
                callback.apply(void 0, args);
            });
        };
        return EventHandlerMixin;
    })();
    Appkit.EventHandlerMixin = EventHandlerMixin;
})(Appkit || (Appkit = {}));
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
var Appkit;
(function (Appkit_1) {
    var Appkit = (function () {
        function Appkit(options) {
            var _this = this;
            /**
             * EventHandler.
             */
            this._events = {
                session_changed: [],
            };
            this._serializers = {
                jsonapi: new Appkit_1.JsonApiSerializer(),
            };
            this._buildSerializers();
            this._initOptions(options);
            this._initStorage();
            this._buildSession();
            this._buildClient();
            this._client.connect().then(function () {
                _this._restoreSession();
            });
        }
        Appkit.prototype._buildSerializers = function () {
            this._serializers["jsonapi"] = new Appkit_1.JsonApiSerializer();
            this._defaultSerializer = "jsonapi";
        };
        Appkit.prototype._initOptions = function (options) {
            var opts = _.defaults(options || {}, {
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
            this._options = opts;
        };
        Appkit.prototype._initStorage = function () {
            this._storage = new Basil(this._options.storage);
        };
        Appkit.prototype._buildSession = function () {
            this._session = new Appkit_1.Session();
        };
        Appkit.prototype._buildClient = function () {
            var fallback = new Appkit_1.FallbackClient(this._session);
            var opts = this._options.clients;
            // Init autobahn client.
            var wampOpts = opts["wamp"];
            if (wampOpts.enabled) {
                var autobahn_1 = new Appkit_1.AutobahnClient(wampOpts, this._session);
                fallback.addClient(autobahn_1);
            }
            // Init rest client.
            var restOpts = opts["rest"];
            if (restOpts.enabled) {
                var rest = new Appkit_1.RestClient(restOpts, this._session);
                fallback.addClient(rest);
            }
            this._client = fallback;
        };
        Appkit.prototype._restoreSession = function () {
            var session = this._storage.get("session");
            if (session && session.token) {
                console.log("Restoring session with token ", session.token);
                return this.resumeSession(session.token);
            }
            return null;
        };
        /**
         * Serialzier accessors.
         */
        Appkit.prototype.serializer = function (name) {
            return name in this._serializers ? this._serializers[name] : null;
        };
        /**
         * User accessors.
         */
        Appkit.prototype.isAuthenticated = function () {
            return this._session.isAuthenticated();
        };
        Appkit.prototype.user = function () {
            return this._session.userData;
        };
        Appkit.prototype.userId = function () {
            return this._session.userId;
        };
        /**
         * Methods.
         */
        Appkit.prototype.method = function (name, data, serializerName) {
            var _this = this;
            var serializer = null;
            var serializedData = data;
            if (typeof serializerName !== "undefined" && !serializerName) {
            }
            else {
                var name_1 = serializerName || this._defaultSerializer;
                serializer = this.serializer(name_1);
                if (!serializer) {
                    throw new Error("Unknown serializer: " + serializer);
                }
                serializedData = serializer.SerializeTransferData(data);
            }
            if (this._debug) {
                console.log("APPKIT: Calling method " + name + " with data: ", serializedData);
            }
            return this._client.method(name, serializedData).then(function (data) {
                if (serializer) {
                    data = serializer.UnserializeTransferData(data);
                }
                if (_this._debug) {
                    console.log("APPKIT: Received response for method " + name + ": ", data);
                }
                return Promise.resolve(data);
            }).catch(function (err) {
                if (_this._debug) {
                    console.log("APPKIT: Method " + name + " failed: ", err);
                }
                return Promise.reject(err);
            });
        };
        /**
         * User / session methods.
         */
        Appkit.prototype.signUp = function (user, authOptions) {
            return this.create(user, authOptions);
        };
        Appkit.prototype.signUpWithPassword = function (email, password, username) {
            var attrs = { email: email };
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
        };
        Appkit.prototype.signUpWithOauth = function (oauthService, token, userAttributes) {
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
        };
        Appkit.prototype.requestPasswordReset = function (userIdentifier) {
            return this.method("users.request-password-reset", { data: { user: userIdentifier } });
        };
        Appkit.prototype.resetPassword = function (token, newPassword) {
            return this.method("users.password-reset", { data: {
                    token: token,
                    password: newPassword,
                } });
        };
        Appkit.prototype.authenticate = function (options) {
            var _this = this;
            return this.method("users.authenticate", { data: options }).then(function (response) {
                _this._onSessionData(response);
                return Promise.resolve(response);
            });
        };
        Appkit.prototype.authenticateWithPassword = function (user, pw) {
            return this.authenticate({
                user: user,
                adaptor: "password",
                authData: { password: pw },
            });
        };
        Appkit.prototype.authenticateWithOauth = function (oauthService, token) {
            return this.authenticate({
                adaptor: "oauth",
                authData: {
                    service: oauthService,
                    access_token: token,
                },
            });
        };
        Appkit.prototype.unauthenticate = function () {
            var _this = this;
            if (!this.isAuthenticated()) {
                throw new Error("Can't unauthenticate when not authenticated.");
            }
            return this.method("users.unauthenticate", {}).then(function (data) {
                _this._onSessionData(null);
                return Promise.resolve(data);
            });
        };
        Appkit.prototype.resumeSession = function (token) {
            var _this = this;
            return this.method("users.resume_session", { data: { token: token } }).then(function (response) {
                _this._onSessionData(response);
                return Promise.resolve(response);
            });
        };
        Appkit.prototype._onSessionData = function (data) {
            if (data) {
                this._session.updateWithResponse(this, data);
            }
            else {
                this._session.clearUser();
            }
            if (this._session.token) {
                this._storage.set("session", { token: this._session.token });
            }
            else {
                this._storage.remove("session");
            }
            this.trigger("session_changed", this._session);
        };
        /**
         * CRUD methods.
         */
        Appkit.prototype.findOne = function (collection, id) {
            return this.method("find_one", {
                data: { collection: collection, id: id },
            }, null);
        };
        Appkit.prototype.query = function (collection, query) {
            query = query || {};
            if (collection) {
                query.collection = collection;
            }
            return this.method("query", { data: { query: query } }, null);
        };
        Appkit.prototype.create = function (data, meta) {
            if (meta === void 0) { meta = {}; }
            return this.method("create", { models: [data], meta: meta }, null);
        };
        Appkit.prototype.update = function (data, meta) {
            if (meta === void 0) { meta = {}; }
            return this.method("update", { models: [data], meta: meta }, null);
        };
        Appkit.prototype.delete = function (data, meta) {
            if (meta === void 0) { meta = {}; }
            var collection, id;
            if (data.collection && data.id) {
                collection = data.collection;
                id = data.id;
            }
            else if (data.type && data.id) {
                collection = data.type;
                id = data.id;
            }
            else if (data.getId && data.getCollection) {
                // Model instance!.
                collection = data.getCollection();
                id = data.getId();
            }
            if (!collection || typeof collection !== "string" || !id || typeof id !== "string") {
                throw new Error("Could not determine collection or id");
            }
            return this.method("delete", { data: { collection: collection, id: id }, meta: meta }, null);
        };
        return Appkit;
    })();
    Appkit_1.Appkit = Appkit;
    Appkit_1.applyMixins(Appkit, [Appkit_1.EventHandlerMixin]);
})(Appkit || (Appkit = {}));
var Appkit;
(function (Appkit) {
    var Session = (function () {
        function Session() {
        }
        Object.defineProperty(Session.prototype, "token", {
            get: function () {
                return this._token;
            },
            set: function (token) {
                this._token = token;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Session.prototype, "userId", {
            get: function () {
                return this._userId;
            },
            set: function (id) {
                this._userId = id;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Session.prototype, "userData", {
            get: function () {
                return this._userData;
            },
            set: function (data) {
                this._userData = data;
            },
            enumerable: true,
            configurable: true
        });
        Session.prototype.isAuthenticated = function () {
            return this._userId !== "";
        };
        Session.prototype.clearUser = function () {
            this._userId = "";
            this._userData = null;
        };
        Session.prototype.updateWithResponse = function (appkit, data) {
            var map = data.modelMap;
            if (!map || !("sessions" in map) || !map["sessions"].length) {
                throw new Error("No session in response");
            }
            this._data = map["sessions"][0];
            this._token = this._data.id;
            // Check for user.
            if ("users" in map && map["users"].length) {
                this._userData = map["users"][0];
                this._userId = this._userData.id;
            }
            else {
                this.clearUser();
            }
        };
        return Session;
    })();
    Appkit.Session = Session;
})(Appkit || (Appkit = {}));
var Appkit;
(function (Appkit) {
    var AutobahnClient = (function () {
        function AutobahnClient(options, session) {
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
        AutobahnClient.prototype.connect = function () {
            var _this = this;
            // Try to initialize autobahn.js.
            var con = new autobahn.Connection({
                url: this._url,
                realm: this._realm,
            });
            this._connection = con;
            con.onopen = function (session, details) {
                console.log("APPKIT: Autobahn connection established");
                _this._autobahnSession = session;
                _this._connected = true;
                _this._connecting = false;
                _this._afterOpenCallbacks.forEach(function (deferred) {
                    deferred.resolve(session, details);
                });
                _this._afterOpenCallbacks = [];
            };
            con.onclose = function (reason, details) {
                console.log("APPKIT: Autobahn connection closed: ", reason, details);
                _this._autobahnSession = null;
                _this._connected = false;
                _this._connecting = details.will_retry && details.retry_count < 2;
                _this._afterOpenCallbacks.forEach(function (deferred) {
                    deferred.reject({ reason: reason, details: details });
                });
                _this._afterOpenCallbacks = [];
                _this._afterCloseCallbacks.forEach(function (deferred) {
                    deferred.resolve(reason, details);
                });
                _this._afterCloseCallbacks = [];
                return false;
            };
            this._connected = false;
            this._connecting = true;
            con.open();
            return this.afterConnect();
        };
        AutobahnClient.prototype.isConnecting = function () {
            return this._connecting;
        };
        AutobahnClient.prototype.isConnected = function () {
            return this._connected;
        };
        AutobahnClient.prototype.afterConnect = function () {
            if (!this._connecting) {
                if (this._connected) {
                    return Promise.resolve(this);
                }
                else {
                    throw new Error("Can't call .afterConnect() when the client is not connecting or connected.");
                }
            }
            var deferred = Appkit.deferredPromise();
            this._afterOpenCallbacks.push(deferred);
            return deferred.promise;
        };
        AutobahnClient.prototype.afterDisconnect = function () {
            if (!this._connected) {
                return Promise.resolve();
            }
            var deferred = Appkit.deferredPromise();
            this._afterCloseCallbacks.push(deferred);
            return deferred.promise;
        };
        AutobahnClient.prototype.disconnect = function () {
            if (!this._connected) {
                return Promise.resolve();
            }
            else {
                this._connection.close("appkit.user_disconnect", "");
                return this.afterDisconnect();
            }
        };
        AutobahnClient.prototype.method = function (name, data) {
            data = data || {};
            if (!("data" in data)) {
                data = { data: data };
            }
            return Promise.resolve(this._autobahnSession.call(name, [], data)).then(function (data) {
                data = data.kwargs;
                if (data.errors && data.errors.length) {
                    return Promise.reject(data);
                }
                else {
                    return Promise.resolve(data);
                }
            });
        };
        return AutobahnClient;
    })();
    Appkit.AutobahnClient = AutobahnClient;
})(Appkit || (Appkit = {}));
var Appkit;
(function (Appkit) {
    var FallbackClient = (function () {
        function FallbackClient(session) {
            this._session = session;
            this._clients = [];
            this._afterConnectCallbacks = [];
        }
        FallbackClient.prototype.addClient = function (client) {
            this._clients.push(client);
        };
        FallbackClient.prototype.client = function (clientIndex) {
            var _this = this;
            if (clientIndex === void 0) { clientIndex = 0; }
            var client = this._clients[clientIndex];
            if (!client) {
                return Promise.reject("no_valid_client");
            }
            if (client.isConnected()) {
                return Promise.resolve(client);
            }
            else if (client.isConnecting()) {
                return client.afterConnect().then(function () {
                    return client;
                }).catch(function (e) {
                    return _this.client(clientIndex + 1);
                });
            }
        };
        FallbackClient.prototype.connect = function (clientIndex) {
            var _this = this;
            if (clientIndex === void 0) { clientIndex = 0; }
            var client = this._clients[clientIndex];
            if (!client) {
                return Promise.reject("no_valid_client");
            }
            return client.connect().then(function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i - 0] = arguments[_i];
                }
                _this._afterConnectCallbacks.forEach(function (deferred) {
                    deferred.resolve.apply(deferred, args);
                });
                _this._afterConnectCallbacks = [];
                return Promise.resolve(args);
            }).catch(function (e) {
                return _this.connect(clientIndex + 1);
            });
        };
        FallbackClient.prototype.isConnecting = function () {
            var flag = false;
            this._clients.forEach(function (client) {
                if (client.isConnected()) {
                    // Uppermost non-inactive client is connected, so stop 
                    // iteration and return false.
                    return false;
                }
                else if (client.isConnecting()) {
                    // Uppermost client is connecting, so stop iteration and 
                    // return true.
                    flag = true;
                    return false;
                }
            });
            return flag;
        };
        FallbackClient.prototype.isConnected = function () {
            var flag = false;
            this._clients.forEach(function (client) {
                if (client.isConnected()) {
                    flag = true;
                    return false;
                }
            });
            return flag;
        };
        FallbackClient.prototype.afterConnect = function () {
            if (!this.isConnecting()) {
                if (this.isConnected()) {
                    return Promise.resolve(this);
                }
                else {
                    throw new Error("Can't call .afterConnect() when the client is not connecting or connected.");
                }
            }
            var deferred = Appkit.deferredPromise();
            this._afterConnectCallbacks.push(deferred);
            return deferred.promise;
        };
        FallbackClient.prototype.afterDisconnect = function () {
            throw new Error(".afterDisconnect() is not supported by fallbackClient");
        };
        FallbackClient.prototype.disconnect = function () {
            var promises = [];
            this._clients.forEach(function (client) {
                if (client.isConnected()) {
                    promises.push(client.disconnect());
                }
            });
            return Promise.all(promises);
        };
        FallbackClient.prototype.method = function (name, data) {
            return this.client().call("method", name, data);
        };
        return FallbackClient;
    })();
    Appkit.FallbackClient = FallbackClient;
})(Appkit || (Appkit = {}));
/// <reference path="../../typings/reqwest.d.ts" />
var Appkit;
(function (Appkit) {
    var RestClient = (function () {
        function RestClient(options, session) {
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
        RestClient.prototype.connect = function () {
            return Promise.resolve();
        };
        RestClient.prototype.isConnecting = function () {
            return false;
        };
        RestClient.prototype.isConnected = function () {
            return true;
        };
        RestClient.prototype.afterConnect = function () {
            return Promise.resolve(this);
        };
        RestClient.prototype.disconnect = function () {
            return Promise.resolve();
        };
        RestClient.prototype.afterDisconnect = function () {
            return Promise.resolve();
        };
        RestClient.prototype._ajax = function (options) {
            options = _.defaults(options || {}, {
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
            var token = this._session.token;
            if (token) {
                options.headers = options.headers || {};
                options.headers.Authentication = token;
            }
            return Promise.resolve(reqwest(options));
        };
        RestClient.prototype.method = function (name, data) {
            data = data || {};
            if (!("data" in data)) {
                data = { data: data };
            }
            return this._ajax({
                url: "/method/" + name,
                data: data,
            });
        };
        return RestClient;
    })();
    Appkit.RestClient = RestClient;
})(Appkit || (Appkit = {}));
/**
 * JsonApi.
 */
/// <reference path="serializers.ts" />
var Appkit;
(function (Appkit) {
    function unserializeJsonApiModel(data) {
        if (!data.type) {
            console.log("JSONAPI unserialize error: model has no type", data);
            throw new Error("JSONAPI unserialize error");
        }
        var model = {
            type: data.type,
        };
        if (data.id) {
            model.id = data.id;
        }
        ;
        if (data.attributes) {
            model.attributes = data.attributes;
        }
        if (data.relationships) {
            var rels = {};
            _.forEach(data.relationships, (function (relData, key) {
                rels[key] = unserializeJsonApiModels(relData["data"]);
            }));
            model.relationships = rels;
        }
        return model;
    }
    function unserializeJsonApiModels(data) {
        if (Array.isArray(data)) {
            return _.map(data, function (rawModel) {
                return unserializeJsonApiModel(rawModel);
            });
        }
        else {
            return [unserializeJsonApiModel(data)];
        }
    }
    var JsonApiSerializer = (function () {
        function JsonApiSerializer() {
        }
        JsonApiSerializer.prototype.SerializeTransferData = function (data) {
            var serialized = {};
            if (data.models) {
                if (data.data) {
                    throw new Error("Serialize error: invalid TransferData: Can't supply data when models are supplied");
                }
                serialized.data = data.models.length == 1 ? data.models[0] : data.models;
            }
            else if (data.data) {
                serialized.data = data.data;
            }
            if (data.extraModels) {
                serialized.included = data.extraModels;
            }
            if (data.meta) {
                serialized.meta = data.meta;
            }
            if (data.errors) {
                serialized.errors = data.errors;
            }
            return serialized;
        };
        JsonApiSerializer.prototype.UnserializeTransferData = function (serialized) {
            var data = {
                models: [],
                extraModels: [],
                meta: {},
                errors: null,
                modelMap: {},
            };
            if (serialized.meta) {
                data.meta = serialized.meta;
            }
            if (serialized.data) {
                var d = serialized.data;
                if ((Array.isArray(d) && d[0].type) || typeof d === "object" && d.type) {
                    data.models = unserializeJsonApiModels(d);
                }
                else {
                    data.data = d;
                }
            }
            if (serialized.included) {
                data.extraModels = unserializeJsonApiModels(serialized.included);
            }
            if (serialized.errors) {
                data.errors = serialized.errors;
            }
            // Build model map.
            var map = {};
            _.forEach(data.models, function (model) {
                if (!(model.type in map)) {
                    map[model.type] = [];
                }
                map[model.type].push(model);
            });
            _.forEach(data.extraModels, function (model) {
                if (!(model.type in map)) {
                    map[model.type] = [];
                }
                map[model.type].push(model);
            });
            data.modelMap = map;
            return data;
        };
        return JsonApiSerializer;
    })();
    Appkit.JsonApiSerializer = JsonApiSerializer;
})(Appkit || (Appkit = {}));
