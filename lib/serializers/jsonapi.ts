/**
 * JsonApi.
 */

/// <reference path="serializers.ts" />

namespace Appkit {

	interface JsonApiError {
		code?: string;
		message?: string;
	}

	interface RawJsonApiData {
		data?:any;
		included?: any[];
		meta?:Dictionary;
		errors?: JsonApiError[]
	}

	interface JsonApiRelationships {
		[index: string]: JsonApiModel[];
	}

	interface JsonApiModel {
		type: string;
		id?: string;
		attributes?: Dictionary;
		relationships?: JsonApiRelationships;
	}

	function unserializeJsonApiModel(data:any): JsonApiModel {
		if (!data.type) {
			console.log("JSONAPI unserialize error: model has no type", data);
			throw new Error("JSONAPI unserialize error");
		}

		let model:JsonApiModel = {
			type: data.type,
		};
		if (data.id) { model.id = data.id };
		if (data.attributes) { model.attributes = data.attributes; }

		if (data.relationships) {
			let rels:Dictionary = {};
			_.forEach(data.relationships, (function(relData:any, key:string) {
				rels[key] = unserializeJsonApiModels(relData["data"]);			
			}));

			model.relationships = rels;
		}

		return model;
	}

	function unserializeJsonApiModels(data:any): JsonApiModel[] {
		if (Array.isArray(data)) {
			return _.map(data, (rawModel:any) => {
				return unserializeJsonApiModel(rawModel);	
			});
		} else {
			return [unserializeJsonApiModel(data)];
		}
	}


	export class JsonApiSerializer implements Serializer {
		UnserializeResponse(data:any): Response	{
			let response: Response = {
				models: [],
				extraModels: [],
				meta: {},
				errors: null,

				modelMap: {},
			};

			if (data.meta) {
				response.meta = data.meta;
			}
			if (data.data) {
				let d = data.data;
				if ((Array.isArray(d) && d[0].type) || typeof d === "object" && d.type) {
					response.models = unserializeJsonApiModels(d);
				} else {
					response.data = d;
				}
			}
			if (data.included) {
				response.extraModels = unserializeJsonApiModels(data.included);
			}
			if (data.errors) {
				response.errors = data.errors;
			}

			// Build model map.
			let map: ModelMap = {};
			_.forEach(response.models, function(model:JsonApiModel) {
				if (!(model.type in map)) {
					map[model.type] = [];
				}
				map[model.type].push(model);
			});
			_.forEach(response.extraModels, function(model:JsonApiModel) {
				if (!(model.type in map)) {
					map[model.type] = [];
				}
				map[model.type].push(model);
			});
			response.modelMap = map;

			return response;
		}
	}
}
