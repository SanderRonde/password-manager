export function getDebug(debugEnabled: boolean) {
	return {
		FAIL_ON_INSTANCE: debugEnabled && process.env.FAIL_ON_INSTANCE,
		FAIL_ON_PASSWORDS: debugEnabled && process.env.FAIL_ON_PASSWORDS,
		FAIL_ON_ACCOUNT: debugEnabled && process.env.FAIL_ON_ACCOUNT
	}
}