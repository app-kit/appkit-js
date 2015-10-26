
declare module reqwest {

	interface Callback {
		(...args:any[]): void;
	}

	interface Dictionary {
		[index: string]: any;
	}

	export interface Options {
		url?: string;
		method?: string;
		headers?: Dictionary;
		data?: any;
		type?: string;
		contentType?: string;
		success?: Callback;
		error?: Callback;
		complete?: Callback;
		jsonpCallback?: string;
	}

	export class Reqwest {
		abort(): void;
		retry(): void;
		then(success: Callback, fail: Callback): void;
		always(fn: Callback): void;
		fail(fn: Callback): void;
		catch(fn: Callback): void;	
	}

	export interface ReqwestStatic {
		(options: Options): Reqwest;
	}

	//export function reqwest(options: Options): Reqwest;

	export var reqwest: (options: Options) => Reqwest;
}

declare module "reqwest" {
	export = reqwest;
}
