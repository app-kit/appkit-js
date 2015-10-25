namespace Appkit {
	interface Store {
		collectionForModel(model: any): string
		idForModel(model: any): string
	}
}
