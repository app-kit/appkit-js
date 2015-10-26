namespace Appkit {

	export interface Query {
		collection?: string;
		fields: string[];
		filters: any;
		joins: string[];
		orders: string[];
	}

	interface Attribute {
		type: string;
		name: string;
	}

	interface AttributeMap {
		[index: string]: Attribute;
	}

	interface Relationship {
		name: string;
		type: string;
		targetCollection: string;
	}

	interface RelationshipMap {
		[index: string]: Relationship;
	}

	interface ModelInterface {
		getCollection(): string;

		describeAttributes(): AttributeMap;
		getAttributes(): Dictionary;
		setAttributes(attrs:Dictionary): void;
		getAttribute(name: string): any;
		setAttribute(name: string, value: any): void;	

		describeRelationships(): RelationshipMap;
		getRelationsships(): Dictionary;
		setRelationships(rels: Dictionary): void;
		getRelationship(name: string): any;
		addRelationship(name: string, rel: any): void;
		setRelationship(name: string, rel: any): void;
	}

	/*
	class Model implements ModelInterface {
		private _collection: string;
		private _attributes: AttributeMap;
		private _relationships: RelationshipMap;

		constructor(collection: string) {
			this._collection = collection;
			this._attributes = {};
			this._relationships = {};
		}


	}
	*/

	interface Store {

	}
}
