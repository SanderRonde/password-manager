import * as path from 'path'

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
export const TEST_DB_URI = 'mongodb://127.0.0.1:27017/__pwmanager_test_db';
/**
 * The time in which an auth token expires (15 mins + 3 mins grace period)
 */
export const AUTH_TOKEN_EXPIRE_TIME = 1000 * 60 * 18;
/**
 * The time in which a dashboard comm token expires (3 hours)
 */
export const COMM_TOKEN_DEFAULT_EXPIRE_TIME = 1000 * 60 * 60 * 3;
/**
 * The root of the server
 */
export const SERVER_ROOT = path.join(__dirname, '../../');
/**
 * The root of the entire project (one above server)
 */
export const PROJECT_ROOT = path.join(SERVER_ROOT, '../');
/**
 * The email that is used by default
 */
export const DEFAULT_EMAIL = 'some@email.com';
/**
 * The time in which a dashboard instance expires (24 hours)
 */
export const DASHBOARD_INSTANCE_EXPIRE_TIME = 1000 * 60 * 60 * 24;