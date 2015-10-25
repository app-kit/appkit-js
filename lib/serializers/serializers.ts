namespace Appkit {
	export interface ModelMap {
		[index: string]: any[];
	}

	export interface Error {
		code: string;
		message: string;
	}

	export interface Response {
		// Main models of the response.
		models: any[];

		// Extra models included in the response.
		extraModels: any[];

		// Metadata.
		meta: Dictionary;

		// Generic data for non-model responses.
		data?: Dictionary;

		// Errors.
		errors?: Error[]

		// A map mapping model collection to an array of the included models.
		modelMap: ModelMap;
	}

	export interface Serializer {
		UnserializeResponse(data:any): Response;
	}
}
