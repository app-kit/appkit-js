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

		SerializeTransferData(data: TransferData): any {
			let serialized: any = {};


			if (data.models) {
				if (data.data) {
					throw new Error("Serialize error: invalid TransferData: Can't supply data when models are supplied");
				}

				serialized.data = data.models.length == 1 ? data.models[0] : data.models;
			} else if (data.data) {
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
		}

		UnserializeTransferData(serialized: any): TransferData {
			let data: TransferData = {
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
				let d = serialized.data;
				if ((Array.isArray(d) && d[0].type) || typeof d === "object" && d.type) {
					data.models = unserializeJsonApiModels(d);
				} else {
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
			let map: ModelMap = {};
			_.forEach(data.models, function(model:JsonApiModel) {
				if (!(model.type in map)) {
					map[model.type] = [];
				}
				map[model.type].push(model);
			});
			_.forEach(data.extraModels, function(model:JsonApiModel) {
				if (!(model.type in map)) {
					map[model.type] = [];
				}
				map[model.type].push(model);
			});
			data.modelMap = map;

			return data;
		}

	}
}
