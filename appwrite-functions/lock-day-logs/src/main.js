import { Client, Databases, Query } from 'node-appwrite';

/**
 * lock-day-logs — Appwrite Cloud Function
 *
 * CRON: 29 18 * * *  →  23:59 IST (UTC+5:30) every day
 *
 * Finds every day_log document where:
 *   - date  == today (YYYY-MM-DD, evaluated in IST)
 *   - is_locked == false
 *
 * Then sets is_locked = true on each one.
 * Uses paginated offset loop (limit 100) so large datasets are handled safely.
 *
 * Required environment variables (set in Appwrite Console → Function → Settings):
 *   APPWRITE_ENDPOINT      — e.g. https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID    — your Appwrite project ID
 *   APPWRITE_API_KEY       — server API key with databases.read + databases.write scope
 *   DB_ID                  — Appwrite database ID
 *   COL_DAY_LOGS           — day_logs collection ID
 */

const LOCK_LIMIT = 100; // max documents per paginated fetch (Appwrite max is 100)

export default async ({ req, res, log, error }) => {
    // ─── 1. Init Appwrite Server SDK ──────────────────────────────────────────
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // ─── 2. Get today's date string in IST (UTC+5:30) ─────────────────────────
    // Using 'en-CA' locale which returns dates in YYYY-MM-DD format natively.
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
    });

    log(`lock-day-logs triggered. Target date (IST): ${today}`);

    // ─── 3. Paginated fetch + lock loop ───────────────────────────────────────
    let offset = 0;
    let totalLocked = 0;

    try {
        while (true) {
            // Fetch a page of unlocked day_logs for today
            const result = await databases.listDocuments(
                process.env.DB_ID,
                process.env.COL_DAY_LOGS,
                [
                    Query.equal('date', today),
                    Query.equal('is_locked', false),
                    Query.limit(LOCK_LIMIT),
                    Query.offset(0), // Always fetch from start as items drop out of set
                ]
            );

            // No more documents to process — exit loop
            if (result.documents.length === 0) break;

            log(
                `Found ${result.documents.length} unlocked log(s). Locking...`
            );

            // ─── 4. Lock each document in this page ─────────────────────────────
            for (const doc of result.documents) {
                await databases.updateDocument(
                    process.env.DB_ID,
                    process.env.COL_DAY_LOGS,
                    doc.$id,
                    { is_locked: true }
                );
                totalLocked++;
            }

            // If we got fewer documents than the limit, this was the last page
            if (result.documents.length < LOCK_LIMIT) break;
        }

        // ─── 5. Summary log ───────────────────────────────────────────────────
        log(`Done. Locked ${totalLocked} day log(s) for ${today}.`);

        return res.json({ success: true, date: today, locked: totalLocked });
    } catch (err) {
        error(`lock-day-logs failed for ${today}: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
