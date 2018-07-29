import { decryptWithPrivateKey, ERRS, Hashed, Padded, MasterPasswordVerificationPadding } from "../../../../../../../lib/crypto";
import { ServerPublicKey, RSAEncrypted, MasterPassword } from "../../../../../../../database/db-types";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { Webserver } from "../../../webserver";
import { API_ERRS } from "../../../../../../../api";

export class RoutesAPIDashboard {
	constructor(public server: Webserver) { }

	public login(res: ResponseCaptured) {
		this.server.Router.requireParams<{
			comm_token: string;
			public_key: string;
			encrypted: RSAEncrypted<EncodedString<{
				email: string;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			}>, ServerPublicKey>;
		}, {}, {}, {}>({
			unencrypted: ['comm_token', 'public_key', 'encrypted']
		}, {}, async (toCheck, { comm_token, public_key, encrypted }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'comm_token',
				type: 'string'
			}, {
				val: 'public_key',
				type: 'string'
			}, {
				val: 'encrypted',
				type: 'string'
			}])) return;

			const commData = this.server.Auth.verifyDashboardCommToken(comm_token);
			if (commData === null) {
				res.status(200);
				res.json({
					success: false,
					ERR: API_ERRS.INVALID_CREDENTIALS,
					error: 'invalid comm token'
				});
				return;
			}

			//Decrypt data
			const decrypted = decryptWithPrivateKey(encrypted, commData.server_private_key);
			if (decrypted === ERRS.INVALID_DECRYPT) {
				res.status(200);
				res.json({
					success: false,
					ERR: API_ERRS.INVALID_CREDENTIALS,
					error: 'invalid comm token'
				});
				return;
			}

			await this.server.Routes.API.Instance.doRegister({ 
				email: decrypted.email,
				password: decrypted.password,
				public_key: public_key
			}, res);
		});
	}
}