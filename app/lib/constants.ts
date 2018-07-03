import { EncryptionAlgorithm } from "./crypto";

export type CONSTANTS = {
	algorithm: 'aes-256-ctr'
}

export const CONSTANTS: {
	algorithm: EncryptionAlgorithm;
} = {
	algorithm: 'aes-256-ctr'
};