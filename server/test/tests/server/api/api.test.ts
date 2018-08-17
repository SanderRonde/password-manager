const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { authenticationWorkflowTest } from "./workflows/authentication.test";
import { instanceTwofactorTest } from "./workflows/instance-twofactor.test";
import { twofactorConfirmTest } from "./instance/2fa/confirm.test";
import { twofactorDisableTest } from "./instance/2fa/disable.test";
import { workflowResettingTest } from "./workflows/resetting.test";
import { passwordQueryMetaTest } from "./password/querymeta.test";
import { workflowPasswordTest } from "./workflows/password.test";
import { twofactorEnableTest } from "./instance/2fa/enable.test";
import { twofactorVerifyTest } from "./instance/2fa/verify.test";
import { userGenResetKeyTest } from "./user/genresetkey.test";
import { passwordAllmetaTest } from "./password/allmeta.test";
import { passwordGetMetaTest } from "./password/getmeta.test";
import { passwordRemoveTest } from "./password/remove.test";
import { passwordUpdateTest } from "./password/update.test";
import { extendKeyTest } from "./instance/extend-key.test";
import { registerTest } from "./instance/register.test";
import { passwordSetTest } from "./password/set.test";
import { passwordGetTest } from "./password/get.test";
import { logoutTest } from "./instance/logout.test";
import { loginTest } from "./instance/login.test";
import { userResetTest } from "./user/reset.test";

export function APITest() {
	parallel('API', () => {
		parallel('Instance', () => {
			extendKeyTest();
			loginTest();
			logoutTest();
			registerTest();
			parallel('2FA', () => {
				twofactorConfirmTest();
				twofactorDisableTest();
				twofactorEnableTest();
				twofactorVerifyTest();
			});
		});
		parallel('Password', () => {
			passwordAllmetaTest();
			passwordGetTest();
			passwordGetMetaTest();
			passwordQueryMetaTest();
			passwordRemoveTest();
			passwordSetTest();
			passwordUpdateTest();
		});	
		parallel('User', () => {
			userGenResetKeyTest();
			userResetTest();
		});
		parallel('Workflows', () => {
			authenticationWorkflowTest();
			instanceTwofactorTest();
			workflowPasswordTest();
			workflowResettingTest();
		});
	});
}