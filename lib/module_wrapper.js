
;(function(scope) {

<%= contents %>


	// Export global Appkit if window is available.
	if (typeof scope.window !== "undefined" && scope.window) {
		scope.window.Appkit = Appkit;
	}

	if (typeof scope.module !== "undefined" && scope.module && !scope.module.nodeType) {
		scope.module.exports = Appkit;
	}

}(this));
