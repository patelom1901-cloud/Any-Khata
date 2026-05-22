/**
 * Any Khata — Appwrite Setup Script
 * Creates all databases, collections, attributes, indexes, and storage buckets.
 *
 * Usage:
 *   node setup-appwrite.mjs <ENDPOINT> <PROJECT_ID> <API_KEY>
 *
 * Example:
 *   node setup-appwrite.mjs https://cloud.appwrite.io/v1 65abc123 my_api_key_xxx
 *
 * Get your API Key from: Appwrite Console → Settings → API Keys → Create API Key
 * Select scopes: databases.write, databases.read, storage.write, storage.read
 */

import { Client, Databases, Storage, Permission, Role } from "node-appwrite";

// ─── Parse CLI Args ───────────────────────────────────────
const [endpoint, projectId, apiKey] = process.argv.slice(2);

if (!endpoint || !projectId || !apiKey) {
  console.error("Usage: node setup-appwrite.mjs <ENDPOINT> <PROJECT_ID> <API_KEY>");
  console.error("Example: node setup-appwrite.mjs https://cloud.appwrite.io/v1 65abc123 abc123key");
  process.exit(1);
}

// ─── Initialize Client ────────────────────────────────────
const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

const results = {};

// ─── Helper: Create Collection ────────────────────────────
async function createCollection(databaseId, id, name, permissions) {
  try {
    const result = await databases.createCollection(databaseId, id, name, permissions);
    console.log(`  ✅ Collection created: ${name} (${id})`);
    return result;
  } catch (err) {
    if (err.code === 409) {
      console.log(`  ⚠️  Collection already exists: ${name} (${id})`);
    } else {
      console.error(`  ❌ Failed to create collection ${name}: ${err.message}`);
      throw err;
    }
  }
}

// ─── Helper: Create String Attribute ──────────────────────
async function createStringAttr(databaseId, collectionId, key, size, required, defaultVal) {
  try {
    await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultVal);
    console.log(`     ✓ Attribute: ${key} (string, size=${size}, required=${required})`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`     ~ Attribute already exists: ${key}`);
    } else {
      console.error(`     ✗ Failed to create attribute ${key}: ${err.message}`);
    }
  }
}

// ─── Helper: Create Float Attribute ───────────────────────
async function createFloatAttr(databaseId, collectionId, key, required, defaultVal) {
  try {
    await databases.createFloatAttribute(databaseId, collectionId, key, required, defaultVal);
    console.log(`     ✓ Attribute: ${key} (float, required=${required}${defaultVal !== undefined ? `, default=${defaultVal}` : ''})`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`     ~ Attribute already exists: ${key}`);
    } else {
      console.error(`     ✗ Failed to create attribute ${key}: ${err.message}`);
    }
  }
}

// ─── Helper: Create Boolean Attribute ─────────────────────
async function createBoolAttr(databaseId, collectionId, key, required, defaultVal) {
  try {
    await databases.createBooleanAttribute(databaseId, collectionId, key, required, defaultVal);
    console.log(`     ✓ Attribute: ${key} (boolean, required=${required}, default=${defaultVal})`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`     ~ Attribute already exists: ${key}`);
    } else {
      console.error(`     ✗ Failed to create attribute ${key}: ${err.message}`);
    }
  }
}

// ─── Helper: Create Index ─────────────────────────────────
async function createIndex(databaseId, collectionId, key, type, attributes, orders) {
  try {
    await databases.createIndex(databaseId, collectionId, key, type, attributes, orders || []);
    console.log(`     ✓ Index: ${key} (${type}) on [${attributes.join(', ')}]`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`     ~ Index already exists: ${key}`);
    } else {
      console.error(`     ✗ Failed to create index ${key}: ${err.message}`);
    }
  }
}

// ─── MAIN SETUP ───────────────────────────────────────────
async function main() {
  console.log("\n🚀 Any Khata — Appwrite Setup");
  console.log("=".repeat(50));
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}`);
  console.log("");

  // ─── Step 1: Create Database ──────────────────────────
  console.log("📦 Step 1: Creating Database...");
  try {
    const db = await databases.create("any_khata_db", "any_khata_db");
    results.databaseId = db.$id;
    console.log(`  ✅ Database created: any_khata_db (${db.$id})\n`);
  } catch (err) {
    if (err.code === 409) {
      console.log("  ⚠️  Database already exists. Using existing.\n");
      results.databaseId = "any_khata_db";
    } else {
      console.error(`  ❌ Failed to create database: ${err.message}`);
      process.exit(1);
    }
  }

  const DB = results.databaseId;

  // ─── Step 2: Create Collections ───────────────────────
  console.log("📋 Step 2: Creating Collections...\n");

  // ── users ──
  console.log("  📁 users");
  await createCollection(DB, "users", "users", [
    Permission.read(Role.users()),
    Permission.write(Role.users()),
  ]);
  await createStringAttr(DB, "users", "userId", 255, true);
  await createStringAttr(DB, "users", "name", 255, true);
  await createStringAttr(DB, "users", "email", 255, true);
  await createStringAttr(DB, "users", "phone", 20, false);
  await createStringAttr(DB, "users", "roles", 65000, false);
  await createBoolAttr(DB, "users", "has_business", false, false);
  await createStringAttr(DB, "users", "createdAt", 255, true);
  await createIndex(DB, "users", "idx_userId", "key", ["userId"], ["ASC"]);
  console.log("");

  // ── businesses ──
  console.log("  📁 businesses");
  await createCollection(DB, "businesses", "businesses", [
    Permission.create(Role.users()),
    Permission.read(Role.user("owner_id")),
    Permission.update(Role.user("owner_id")),
    Permission.delete(Role.user("owner_id")),
  ]);
  await createStringAttr(DB, "businesses", "owner_id", 255, true);
  await createStringAttr(DB, "businesses", "business_name", 255, true);
  await createStringAttr(DB, "businesses", "owner_name", 255, true);
  await createStringAttr(DB, "businesses", "phone", 20, true);
  await createStringAttr(DB, "businesses", "business_type", 100, false);
  await createStringAttr(DB, "businesses", "city", 100, false);
  await createStringAttr(DB, "businesses", "state", 100, false);
  await createBoolAttr(DB, "businesses", "is_active", false, true);
  await createStringAttr(DB, "businesses", "subscriptionStatus", 20, false);
  await createStringAttr(DB, "businesses", "subscription_expiry", 20, false);
  await createStringAttr(DB, "businesses", "created_at", 255, true);
  await createIndex(DB, "businesses", "idx_owner_id", "key", ["owner_id"], ["ASC"]);
  console.log("");

  // ── customers ──
  console.log("  📁 customers");
  await createCollection(DB, "customers", "customers", [
    Permission.create(Role.users()),
    Permission.read(Role.user("owner_id")),
    Permission.read(Role.user("linked_user_id")),
    Permission.update(Role.user("owner_id")),
    Permission.delete(Role.user("owner_id")),
  ]);
  await createStringAttr(DB, "customers", "business_id", 255, true);
  await createStringAttr(DB, "customers", "owner_id", 255, true);
  await createStringAttr(DB, "customers", "name", 255, true);
  await createStringAttr(DB, "customers", "phone", 20, true);
  await createStringAttr(DB, "customers", "link_code", 255, false);
  await createStringAttr(DB, "customers", "linked_user_id", 255, false);
  await createBoolAttr(DB, "customers", "is_linked", false, false);
  await createFloatAttr(DB, "customers", "balance", true, 0);
  await createStringAttr(DB, "customers", "created_at", 255, true);
  await createIndex(DB, "customers", "idx_business_id", "key", ["business_id"], ["ASC"]);
  await createIndex(DB, "customers", "idx_phone", "key", ["phone"], ["ASC"]);
  await createIndex(DB, "customers", "idx_linked_user_id", "key", ["linked_user_id"], ["ASC"]);
  await createIndex(DB, "customers", "idx_link_code", "key", ["link_code"], ["ASC"]);
  console.log("");

  // ── day_logs ──
  console.log("  📁 day_logs");
  await createCollection(DB, "day_logs", "day_logs", [
    Permission.create(Role.users()),
    Permission.read(Role.user("owner_id")),
    Permission.read(Role.user("linked_user_id")),
    Permission.update(Role.user("owner_id")),
    Permission.delete(Role.user("owner_id")),
  ]);
  await createStringAttr(DB, "day_logs", "business_id", 255, true);
  await createStringAttr(DB, "day_logs", "customer_id", 255, true);
  await createStringAttr(DB, "day_logs", "owner_id", 255, true);
  await createStringAttr(DB, "day_logs", "linked_user_id", 255, false);
  await createStringAttr(DB, "day_logs", "date", 20, true);
  await createStringAttr(DB, "day_logs", "entries", 1000000, true);
  await createFloatAttr(DB, "day_logs", "total", true, 0);
  await createBoolAttr(DB, "day_logs", "is_locked", true, false);
  await createStringAttr(DB, "day_logs", "created_at", 255, false);
  await createIndex(DB, "day_logs", "idx_lookup", "composite", ["business_id", "customer_id", "date"], ["ASC", "ASC", "ASC"]);
  await createIndex(DB, "day_logs", "idx_customer_id", "key", ["customer_id"], ["ASC"]);
  console.log("");

  // ── payments ──
  console.log("  📁 payments");
  await createCollection(DB, "payments", "payments", [
    Permission.create(Role.users()),
    Permission.read(Role.user("owner_id")),
    Permission.read(Role.user("linked_user_id")),
    Permission.update(Role.user("owner_id")),
    Permission.delete(Role.user("owner_id")),
  ]);
  await createStringAttr(DB, "payments", "business_id", 255, true);
  await createStringAttr(DB, "payments", "customer_id", 255, true);
  await createStringAttr(DB, "payments", "owner_id", 255, true);
  await createStringAttr(DB, "payments", "linked_user_id", 255, false);
  await createFloatAttr(DB, "payments", "amount", true);
  await createStringAttr(DB, "payments", "note", 500, false);
  await createStringAttr(DB, "payments", "date", 20, true);
  await createStringAttr(DB, "payments", "recorded_by", 255, true);
  await createStringAttr(DB, "payments", "created_at", 255, false);
  await createIndex(DB, "payments", "idx_lookup", "composite", ["business_id", "customer_id"], ["ASC", "ASC"]);
  console.log("");

  // ── ads ──
  console.log("  📁 ads");
  await createCollection(DB, "ads", "ads", [
    Permission.read(Role.any()),
    Permission.write(Role.users()),
  ]);
  await createStringAttr(DB, "ads", "businessName", 255, true);
  await createStringAttr(DB, "ads", "ownerName", 255, true);
  await createStringAttr(DB, "ads", "phone", 20, true);
  await createStringAttr(DB, "ads", "imageFileId", 255, true);
  await createStringAttr(DB, "ads", "imageUrl", 1000, true);
  await createStringAttr(DB, "ads", "subscriptionStatus", 20, true);
  await createStringAttr(DB, "ads", "subscriptionExpiry", 20, false);
  await createStringAttr(DB, "ads", "createdAt", 255, true);
  await createIndex(DB, "ads", "idx_status", "key", ["subscriptionStatus"], ["ASC"]);
  console.log("");

  // ── payment_orders ──
  console.log("  📁 payment_orders");
  await createCollection(DB, "payment_orders", "payment_orders", [
    Permission.read(Role.user("userId")),
  ]);
  await createStringAttr(DB, "payment_orders", "orderId", 255, true);
  await createStringAttr(DB, "payment_orders", "userId", 255, true);
  await createFloatAttr(DB, "payment_orders", "amount", true);
  await createStringAttr(DB, "payment_orders", "status", 50, true);
  await createStringAttr(DB, "payment_orders", "type", 50, true);
  await createStringAttr(DB, "payment_orders", "adPayload", 65000, false);
  await createIndex(DB, "payment_orders", "idx_orderId", "key", ["orderId"], ["ASC"]);
  console.log("");

  // ── subscriptions ──
  console.log("  📁 subscriptions");
  await createCollection(DB, "subscriptions", "subscriptions", [
    Permission.read(Role.users()),
    Permission.write(Role.users()),
  ]);
  await createStringAttr(DB, "subscriptions", "userId", 255, true);
  await createStringAttr(DB, "subscriptions", "type", 20, true);
  await createStringAttr(DB, "subscriptions", "referenceId", 255, true);
  await createFloatAttr(DB, "subscriptions", "amount", true);
  await createStringAttr(DB, "subscriptions", "cashfreeOrderId", 255, true);
  await createStringAttr(DB, "subscriptions", "status", 20, true);
  await createStringAttr(DB, "subscriptions", "paidAt", 255, false);
  await createStringAttr(DB, "subscriptions", "validUntil", 255, false);
  await createIndex(DB, "subscriptions", "idx_lookup", "composite", ["userId", "type"], ["ASC", "ASC"]);
  console.log("");

  // ─── Step 3: Create Storage Bucket ────────────────────
  console.log("📦 Step 3: Creating Storage Bucket...");
  try {
    const bucket = await storage.createBucket(
      "ad_images",
      "Ad Images",
      [Permission.read(Role.any()), Permission.write(Role.users())],
      false,
      undefined,
      undefined,
      ["jpg", "jpeg", "png", "gif", "webp"],
    );
    results.bucketId = bucket.$id;
    console.log(`  ✅ Bucket created: ad_images (${bucket.$id})\n`);
  } catch (err) {
    if (err.code === 409) {
      console.log("  ⚠️  Bucket already exists. Using existing.\n");
      results.bucketId = "ad_images";
    } else {
      console.error(`  ❌ Failed to create bucket: ${err.message}`);
    }
  }

  // ─── Step 4: Output .env values ───────────────────────
  console.log("=".repeat(50));
  console.log("🎉 Setup Complete! Copy these into your .env:\n");
  console.log(`EXPO_PUBLIC_APPWRITE_DB_ID=${results.databaseId}`);
  console.log(`EXPO_PUBLIC_COL_USERS=users`);
  console.log(`EXPO_PUBLIC_COL_BUSINESSES=businesses`);
  console.log(`EXPO_PUBLIC_COL_CUSTOMERS=customers`);
  console.log(`EXPO_PUBLIC_COL_DAY_LOGS=day_logs`);
  console.log(`EXPO_PUBLIC_COL_ADS=ads`);
  console.log(`EXPO_PUBLIC_COL_SUBSCRIPTIONS=subscriptions`);
  console.log(`EXPO_PUBLIC_COL_PAYMENT_ORDERS=payment_orders`);
  console.log(`EXPO_PUBLIC_APPWRITE_AD_BUCKET_ID=${results.bucketId}`);
  console.log("\n✅ Done! Your Appwrite backend is ready.\n");
}

main().catch((err) => {
  console.error("\n💥 Setup failed:", err.message);
  process.exit(1);
});
