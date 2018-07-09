/**
 * The encryption algorithm used by default
 */
export type ENCRYPTION_ALGORITHM = typeof ENCRYPTION_ALGORITHM;
/**
 * The encryption algorithm used by default
 */
export const ENCRYPTION_ALGORITHM: 'aes-256-ctr' = 'aes-256-ctr';
/**
 * The length of the key used to reset an account
 */
export const RESET_KEY_LENGTH = 512;
/**
 * The current version of this server
 */
export const VERSION = '0.1.0';
/**
 * The URL to the database that should be used for testing
 */
export const TEST_DATABASE = 'mongodb://127.0.0.1:27017/__pwmanager_test_db';
/**
 * The time in which an auth token expires (15 mins + 3 mins grace period)
 */
export const EXPIRE_TIME = 1000 * 60 * 18;