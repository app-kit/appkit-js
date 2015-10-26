namespace Appkit {
	export interface AuthOptions {
		user?: string
		adaptor?: string
		authData?: Dictionary
	}

	export class Session {
		// Session data.
		_data: any;

		_token: string;
		get token(): string {
			return this._token;
		}
		set token(token: string) {
			this._token = token;	
		}

		_userId: string;
		get userId(): string {
			return this._userId;
		}
		set userId(id: string) {
			this._userId = id;
		}

		_userData: any;
		get userData(): any {
			return this._userData;
		}
		set userData(data: any) {
			this._userData = data;
		}

		isAuthenticated(): boolean {
			return this._userId !== "";
		}

		clearUser() {
			this._userId = "";
			this._userData = null;
		}

		updateWithResponse(appkit:Appkit, data:TransferData) {
			let map = data.modelMap;	
			if (!map || !("sessions" in map) || !map["sessions"].length) {
				throw new Error("No session in response");
			}

			this._data = map["sessions"][0];
			this._token = this._data.id;

			// Check for user.
			if ("users" in map && map["users"].length) {
				this._userData = map["users"][0];
				this._userId = this._userData.id;
			} else {
				this.clearUser();
			}
		}
	}
}
