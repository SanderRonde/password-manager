import { HashingAlgorithms, Hashed } from "../../server/app/lib/crypto";
import { sha512, sha512_256 } from 'js-sha512';

function getHashingFunction(algorithm: HashingAlgorithms) {
	switch (algorithm) {
		case 'sha512':
			return sha512;
		case 'sha256':
			return sha512_256;
	}
	return null;
}

export function hash<T extends string, A extends HashingAlgorithms = 'sha512'>(data: T, 
	algorithm: A = 'sha512' as A): Hashed<T, A> {
		const fn = getHashingFunction(algorithm);
		if (fn === null) {
			throw new Error('Hashing algorithm not supported');
		}
		const hash = fn.create();
		hash.update(data);
		return hash.hex() as Hashed<T, A>;
	}