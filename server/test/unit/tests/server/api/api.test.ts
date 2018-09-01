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
import { u2fDisableTest } from "./instance/u2f/disable.test";
import { passwordRemoveTest } from "./password/remove.test";
import { passwordUpdateTest } from "./password/update.test";
import { u2fEnableTest } from "./instance/u2f/enable.test";
import { extendKeyTest } from "./instance/extend-key.test";
import { registerTest } from "./instance/register.test";
import { passwordSetTest } from "./password/set.test";
import { passwordGetTest } from "./password/get.test";
import { logoutTest } from "./instance/logout.test";
import { loginTest } from "./instance/login.test";
import { userResetTest } from "./user/reset.test";

export function APITest() {
	describe('API', () => {
		describe('Instance', () => {
			extendKeyTest();
			loginTest();
			logoutTest();
			registerTest();
			describe('2FA', () => {
				twofactorConfirmTest();
				twofactorDisableTest();
				twofactorEnableTest();
				twofactorVerifyTest();
			});
			describe('U2F', () => {
				u2fEnableTest();
				u2fDisableTest();
			})
		});
		describe('Password', () => {
			passwordAllmetaTest();
			passwordGetTest();
			passwordGetMetaTest();
			passwordQueryMetaTest();
			passwordRemoveTest();
			passwordSetTest();
			passwordUpdateTest();
		});	
		describe('User', () => {
			userGenResetKeyTest();
			userResetTest();
		});
		describe('Workflows', () => {
			authenticationWorkflowTest();
			instanceTwofactorTest();
			workflowPasswordTest();
			workflowResettingTest();
		});
	});
}