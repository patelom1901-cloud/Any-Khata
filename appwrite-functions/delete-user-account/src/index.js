/**
 * delete-user-account — Appwrite Cloud Function
 *
 * Accepts: { userId: string } as JSON body
 * Uses server-side SDK + APPWRITE_API_KEY to:
 *   1. Delete user's day_logs (via customers → business)
 *   2. Delete user's customers
 *   3. Delete user's business document
 *   4. Delete user's subscription documents
 *   5. Delete the user document from COL_USERS
 *   6. Delete the Appwrite account itself (users.delete)
 */
import { Client, Databases, Users, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // ── Parse body ────────────────────────────────────────────
  let userId;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    userId = body?.userId;
  } catch (e) {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!userId) {
    return res.json({ success: false, error: 'userId is required' }, 400);
  }

  // ── Initialize server-side client ─────────────────────────
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const users = new Users(client);

  const DB_ID         = process.env.DB_ID;
  const COL_BUSINESSES   = process.env.COL_BUSINESSES;
  const COL_CUSTOMERS    = process.env.COL_CUSTOMERS;
  const COL_DAY_LOGS     = process.env.COL_DAY_LOGS;
  const COL_SUBSCRIPTIONS = process.env.COL_SUBSCRIPTIONS;
  const COL_USERS        = process.env.COL_USERS;

  log(`[delete-user-account] Starting deletion for userId: ${userId}`);

  try {
    // ── 1. Find the user's business ──────────────────────────
    const businessRes = await db.listDocuments(DB_ID, COL_BUSINESSES, [
      Query.equal('owner_id', userId),
      Query.limit(1),
    ]);

    if (businessRes.documents.length > 0) {
      const businessDoc = businessRes.documents[0];
      const businessId = businessDoc.$id;
      log(`[delete-user-account] Found business: ${businessId}`);

      // ── 2. Delete all day_logs for this business ───────────
      let offset = 0;
      while (true) {
        const logsRes = await db.listDocuments(DB_ID, COL_DAY_LOGS, [
          Query.equal('business_id', businessId),
          Query.limit(100),
          Query.offset(offset),
        ]);

        if (logsRes.documents.length === 0) break;

        for (const doc of logsRes.documents) {
          await db.deleteDocument(DB_ID, COL_DAY_LOGS, doc.$id);
        }

        log(`[delete-user-account] Deleted ${logsRes.documents.length} day_logs (offset ${offset})`);
        if (logsRes.documents.length < 100) break;
        offset += 100;
      }

      // ── 3. Delete all customers for this business ──────────
      offset = 0;
      while (true) {
        const custRes = await db.listDocuments(DB_ID, COL_CUSTOMERS, [
          Query.equal('business_id', businessId),
          Query.limit(100),
          Query.offset(offset),
        ]);

        if (custRes.documents.length === 0) break;

        for (const doc of custRes.documents) {
          await db.deleteDocument(DB_ID, COL_CUSTOMERS, doc.$id);
        }

        log(`[delete-user-account] Deleted ${custRes.documents.length} customers (offset ${offset})`);
        if (custRes.documents.length < 100) break;
        offset += 100;
      }

      // ── 4. Delete the business document ───────────────────
      await db.deleteDocument(DB_ID, COL_BUSINESSES, businessId);
      log(`[delete-user-account] Business document deleted`);
    } else {
      log(`[delete-user-account] No business found for user`);
    }

    // ── 5. Delete subscription documents ──────────────────────
    const subRes = await db.listDocuments(DB_ID, COL_SUBSCRIPTIONS, [
      Query.equal('user_id', userId),
      Query.limit(100),
    ]);
    for (const doc of subRes.documents) {
      await db.deleteDocument(DB_ID, COL_SUBSCRIPTIONS, doc.$id);
    }
    log(`[delete-user-account] Deleted ${subRes.documents.length} subscription(s)`);

    // ── 6. Delete user document from COL_USERS ─────────────
    const userDocRes = await db.listDocuments(DB_ID, COL_USERS, [
      Query.equal('userId', userId),
      Query.limit(1),
    ]);
    if (userDocRes.documents.length > 0) {
      await db.deleteDocument(DB_ID, COL_USERS, userDocRes.documents[0].$id);
      log(`[delete-user-account] User document deleted`);
    }

    // ── 7. Delete the Appwrite account (server SDK only) ────
    await users.delete(userId);
    log(`[delete-user-account] Appwrite account deleted successfully`);

    return res.json({ success: true });
  } catch (err) {
    error(`[delete-user-account] Error: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
