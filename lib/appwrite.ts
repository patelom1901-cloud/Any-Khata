/**
 * Appwrite SDK singleton
 * Initialize ONCE. Import from here everywhere.
 * NEVER create new Client instances elsewhere.
 */
import { Client, Account, Databases, Storage, Functions } from 'react-native-appwrite';
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT 
  || 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID 
  || '69d35dc3003206488082';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform('com.anykhata.app');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export { client };
