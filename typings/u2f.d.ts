declare module "u2f" {
	interface U2FRequest {
		appId: string;
		challenge: string;
		version: string;
	}

	interface U2FRegisterResponse {
		clientData: string;
		registrationData: string;
	}

	interface U2FSignResponse {
		clientData: string;
		signatureData: string;
	}

	export function request(appId: string): U2FRequest;
	export function checkRegistration(request: U2FRequest, response: U2FRegisterResponse): {
		successful: true;
		publicKey: string;
		keyHandle: string;
		certificate: string;
	}|{
		errorMessage: string;
	};
	export function checkSignature(request: U2FRequest, response: U2FSignResponse, publicKey: string): {
		successful: true;
		userPresent: boolean;
		counter: number;
	}|{
		errorMessage: string;
		errorCode?: number;
	}
}