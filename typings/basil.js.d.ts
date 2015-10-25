declare module basil {
	export interface BasilOptions {
		namespace?: string;
		storages?: string[];
		expireDays?: number;
	}

	interface keysMap {
		[index: string]: any[];
	}

	export class Storage {
		constructor(options:BasilOptions);

		init(options:BasilOptions): Storage;
		setOptions(options:BasilOptions): void;
		support(storage:string): boolean;
		check(storage:string):boolean;
		set(key:string, value:any, options?:any): void;
		get(key:string, options?:any): any;
		remove(key:string, options?:any): void;
		reset(options?:any): void;
		keys(options?:any): string[];
		keysMap(options?:any): keysMap;
	}

	export class Basil extends Storage {
		memory: Storage;
		cookie: Storage;
		localStorage: Storage;
		sessionStorage: Storage;
	}
}

declare module "basil" {
	export = basil.Basil;
}
