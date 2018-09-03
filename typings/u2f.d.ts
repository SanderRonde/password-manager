declare module "u2f" {
	export interface U2FRequest {
		appId: string;
		challenge: string;
		version: string;
	}

	export interface U2FRegisterResponse {
		clientData: string;
		registrationData: string;
	}

	export interface U2FSignResponse {
		clientData: string;
		signatureData: string;
	}

	export function request(appId: string, keyHandle?: string): U2FRequest;
	export function checkRegistration(request: U2FRequest, response: U2FRegisterResponse): {
		successful: true;
		publicKey: string;
		keyHandle: string;
		certificate: string;
	}|{
		errorMessage: string;
		successful: undefined;
	};
	export function checkSignature(request: U2FRequest, response: U2FSignResponse, publicKey: string): {
		successful: true;
		userPresent: boolean;
		counter: number;
	}|{
		errorMessage: string;
		errorCode?: number;
		successful: undefined;
	}
}