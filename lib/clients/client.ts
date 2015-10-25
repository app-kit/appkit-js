
namespace Appkit {
	export interface Client {
		connect(): Promise<any>;
		disconnect(): Promise<any>;

		isConnecting(): boolean;
		isConnected(): boolean;

		afterConnect(): Promise<Client>
		afterDisconnect(): Promise<any>

		method(name: string, data:any): Promise<any>;
	}
}
