export type CONSTANTS = {
	encryptionAlgorithm: 'aes-256-ctr'
	resetKeyLength: number;
	version: string;
	testDatabase: string
}

export const CONSTANTS: {
	encryptionAlgorithm: 'aes-256-ctr';
	resetKeyLength: number;
	version: string;
	testDatabase: string;
} = {
	encryptionAlgorithm: 'aes-256-ctr',
	resetKeyLength: 512,
	version: '0.1.0',
	testDatabase: 'mongodb://127.0.0.1:27017/__pwmanager_test_db'
};