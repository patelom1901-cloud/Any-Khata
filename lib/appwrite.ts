/**
 * Appwrite SDK singleton
 * Initialize ONCE. Import from here everywhere.
 * NEVER create new Client instances elsewhere.
 */
import { Client, Account, Databases, Storage, Functions } from 'react-native-appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../constants/appwrite';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform('com.anykhata.app');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { client };
