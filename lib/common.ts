namespace Appkit {
	export interface Dictionary {
		[index: string]: any;
	}

	export interface Callback {
		(...args:any[]): void;
	}

	/**
	 * DeferredPromise.
	 */

	export interface DeferredPromise {
		promise: any;
		resolve: any;
		reject: any;
	}

	export function deferredPromise(): DeferredPromise {
		let deferred: DeferredPromise = {
			promise: null,
			resolve: null,
			reject: null,
		};

		let p = new Promise(function(resolve, reject) {
			deferred.resolve = resolve;
			deferred.reject = reject;
		});
		deferred.promise = p;

		return deferred;
	}

	/**
	 * Mixins.
	 */

	export function applyMixins(derivedCtor: any, baseCtors: any[]) {
	    baseCtors.forEach(baseCtor => {
	        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
	            derivedCtor.prototype[name] = baseCtor.prototype[name];
	        })
	    }); 
	}
}
