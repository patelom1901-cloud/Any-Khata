// ONE-TIME MIGRATION SCRIPT — Run once, then delete this file
// Command: node scripts/migrate-permissions.mjs
// Requires: APPWRITE_API_KEY env variable set in terminal

import { Client, Databases, Query, Permission, Role } from 'node-appwrite';

/**
 * CONFIGURATION
 * These values match the environment variables used in the Any Khata app.
 */
const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '69d35dc3003206488082';
const DB_ID = 'any_khata_db';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: APPWRITE_API_KEY environment variable is not set.');
  console.error('Usage: $env:APPWRITE_API_KEY="your_api_key"; node scripts/migrate-permissions.mjs');
  process.exit(1);
}

// Collection IDs from constants/appwrite.ts
const COLLECTIONS = {
  BUSINESSES: 'businesses',
  CUSTOMERS: 'customers',
  DAY_LOGS: 'day_logs',
  ADS: 'ads',
  USERS: 'users',
  SUBSCRIPTIONS: 'subscriptions',
};

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

// Helper for 100ms delay to avoid rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let totalUpdated = 0;
let totalErrors = 0;

// Cache for business owner IDs to avoid redundant fetches for DAY_LOGS
const businessOwnerCache = new Map();

/**
 * Fetches owner_id from a business document
 */
async function getBusinessOwnerId(businessId) {
  if (businessOwnerCache.has(businessId)) {
    return businessOwnerCache.get(businessId);
  }
  try {
    const business = await databases.getDocument(DB_ID, COLLECTIONS.BUSINESSES, businessId);
    const ownerId = business.owner_id;
    businessOwnerCache.set(businessId, ownerId);
    return ownerId;
  } catch (error) {
    console.error(`  ❌ Error fetching business ${businessId}:`, error.message);
    return null;
  }
}

/**
 * General migration function for a collection
 */
async function migrateCollection(collectionId, name, getPermissions) {
  console.log(`\n🚀 Starting migration for: ${name} (${collectionId})`);
  let lastId = null;
  let collectionProcessed = 0;

  while (true) {
    const queries = [Query.limit(25)];
    if (lastId) {
      queries.push(Query.cursorAfter(lastId));
    }

    try {
      const response = await databases.listDocuments(DB_ID, collectionId, queries);
      const docs = response.documents;

      if (docs.length === 0) break;

      for (const doc of docs) {
        try {
          const permissions = await getPermissions(doc);
          
          if (permissions && permissions.length > 0) {
            // Pass empty data {} as we only want to update permissions
            await databases.updateDocument(DB_ID, collectionId, doc.$id, {}, permissions);
            console.log(`✓ ${name}: ${doc.$id}`);
            totalUpdated++;
            collectionProcessed++;
          }
          
          // Required delay to avoid rate limiting
          await delay(100);
        } catch (error) {
          console.error(`❌ Error updating ${name} document ${doc.$id}:`, error.message);
          totalErrors++;
        }
        lastId = doc.$id;
      }
      
      if (docs.length < 25) break;
    } catch (error) {
      console.error(`❌ Error listing ${name} documents:`, error.message);
      totalErrors++;
      break; 
    }
  }
  console.log(`✅ Finished ${name}: ${collectionProcessed} documents processed`);
}

/**
 * MAIN EXECUTION
 */
async function runMigration() {
  console.log('='.repeat(50));
  console.log('ANY KHATA — PERMISSIONS MIGRATION');
  console.log('='.repeat(50));

  // 1. BUSINESSES collection
  await migrateCollection(COLLECTIONS.BUSINESSES, 'businesses', (doc) => {
    const ownerId = doc.owner_id;
    if (!ownerId) throw new Error('Document missing owner_id');
    return [
      Permission.read(Role.user(ownerId)),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId)),
    ];
  });

  // 2. CUSTOMERS collection
  await migrateCollection(COLLECTIONS.CUSTOMERS, 'customers', (doc) => {
    const ownerId = doc.owner_id;
    if (!ownerId) throw new Error('Document missing owner_id');
    return [
      Permission.read(Role.any()),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId)),
    ];
  });

  // 3. DAY_LOGS collection
  await migrateCollection(COLLECTIONS.DAY_LOGS, 'day_logs', async (doc) => {
    let ownerId = doc.owner_id;
    // Fallback: fetch business owner if owner_id is missing on day_log
    if (!ownerId && doc.business_id) {
      ownerId = await getBusinessOwnerId(doc.business_id);
    }
    if (!ownerId) throw new Error('Could not determine ownerId (missing field and business fetch failed)');
    return [
      Permission.read(Role.user(ownerId)),
      Permission.update(Role.user(ownerId)),
      Permission.delete(Role.user(ownerId)),
    ];
  });

  // 4. ADS collection
  await migrateCollection(COLLECTIONS.ADS, 'ads', (doc) => {
    const userId = doc.user_id;
    if (!userId) throw new Error('Document missing user_id');
    return [
      Permission.read(Role.any()),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
  });

  // 5. USERS collection
  await migrateCollection(COLLECTIONS.USERS, 'users', (doc) => {
    const userId = doc.userId;
    if (!userId) throw new Error('Document missing userId');
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
    ];
  });

  // 6. SUBSCRIPTIONS collection
  await migrateCollection(COLLECTIONS.SUBSCRIPTIONS, 'subscriptions', (doc) => {
    const userId = doc.user_id;
    if (!userId) throw new Error('Document missing user_id');
    return [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
    ];
  });

  console.log('\n' + '='.repeat(50));
  console.log(`MIGRATION SUMMARY`);
  console.log(`- Documents Updated: ${totalUpdated}`);
  console.log(`- Total Errors:     ${totalErrors}`);
  console.log('='.repeat(50));
  console.log('Migration complete. You can now delete this script.');
}

runMigration().catch(err => {
  console.error('\n💥 FATAL MIGRATION ERROR:', err);
});
