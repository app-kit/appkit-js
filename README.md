# Appkit JS

Javascript client library for the Golang [Appkit](https://github.com/app-kit/go-appkit) application framework.

## Installation

To install with [Bower](https://github.com/bower/bower) run

```bash
bower install appkit
```

## Get started

```javascript
var kit = new appkit.Appkit({
	apiHost: "localhost:8000",
});

kit.authenticateWithPassword("user", "password");

// Will wait unitl authenticated has either succeeded or failed.
kit.create({
	type: "todos",
	attributes: {title: "Todo 1"},	
}).then(data => {
	console.log("Created");
}).catch(e => {
	console.log("Create error:", e);
});
```

## Additional Information

### Changelog

[Changelog](https://github.com/app-kit/appkit.js/blob/master/CHANGELOG.md)

### Dependencies

* [Bluebird](https://github.com/petkaantonov/bluebird): Efficient promises library
* [Lodash](https://github.com/lodash/lodash)
* [Basil.js](https://github.com/Wisembly/basil.js): Session persistance

* [Autobahn.js](https://github.com/crossbario/autobahn-js): Optional, for WAMP client.
* [Reqwest](https://github.com/ded/reqwest): Optional, for REST client.

See bower.json for more information.


### License

This project is under the [MIT license](https://opensource.org/licenses/MIT).
