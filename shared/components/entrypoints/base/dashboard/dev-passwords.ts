import { MetaPasswords } from './dashboard';

let incrementedIds: number = 0;
	function getIncrementedId() {
		return `idabcde${incrementedIds++}`;
	}

const googleWebsite = {
	host: 'www.google.com',
	exact: 'https://www.google.com/login',
	favicon: '/icons/google.png',
};

const redditWebsite = {
	host: 'www.reddit.com',
	exact: 'https://www.reddit.com/login',
	favicon: '/icons/reddit.png'
}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

function genRandomString(length: number = 50): string {
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars[Math.floor(Math.random() * chars.length)];
	}
	return str;
}

function genPassword(websites: {
    host: string;
    exact: string;
    favicon: string|null;
}[], twofactorEnabled: boolean) {
	return {
		id: getIncrementedId() as any,
		websites: websites,
		username: genRandomString(25),
		twofactor_enabled: twofactorEnabled
	}
}

function genGooglePassword({
	twofactorEnabled = false,
	noFavicon = false
}: {
	twofactorEnabled?: boolean;
	u2fEnabled?: boolean;
	noFavicon?: boolean;
} = {}): MetaPasswords[0] {
	return genPassword([{...googleWebsite, ...noFavicon ? {
		favicon: null
	} : {}}], twofactorEnabled)
}

function range<T>(from: number, to: number, fn: () => T): T[] {
	const arr: T[] = [];
	for (let i = from; i < to; i++) {
		arr.push(fn());
	}
	return arr;
}

let generated: MetaPasswords|null = null;
export function getDevPasswords() {
	if (generated) {
		return generated;
	}
	return (generated = [
		genGooglePassword(),
		genGooglePassword(),
		genGooglePassword({
			u2fEnabled: true,
			twofactorEnabled: true
		}),
		genGooglePassword({
			u2fEnabled: true
		}),
		genGooglePassword({
			twofactorEnabled: true
		}),
		genPassword([{...googleWebsite}, {...redditWebsite}], false),
		genGooglePassword({
			noFavicon: true
		}),
		...range(0, 200, () => {
			return genGooglePassword()
		})
	]);
}