import { Client, Databases, Query } from 'node-appwrite';

/**
 * expire-subscriptions — Appwrite Cloud Function
 *
 * CRON: 31 18 * * *  →  00:01 IST (UTC+5:30) every day
 *
 * Finds businesses and ads where:
 *   - subscriptionStatus == 'active'
 *   - subscription_expiry < now
 *
 * Sets subscriptionStatus = 'expired'.
 * Uses paginated offset loop (limit 100).
 */

const BATCH_LIMIT = 100;

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const now = new Date().toISOString();

    log(`expire-subscriptions triggered. Current time (ISO): ${now}`);

    let totalExpiredBusinesses = 0;
    let totalExpiredAds = 0;

    try {
        // 1. Expire Businesses
        while (true) {
            const result = await databases.listDocuments(
                process.env.DB_ID,
                process.env.COL_BUSINESSES,
                [
                    Query.equal('subscriptionStatus', 'active'),
                    Query.lessThan('subscription_expiry', now),
                    Query.limit(BATCH_LIMIT),
                    Query.offset(0),
                ]
            );

            if (result.documents.length === 0) break;

            log(`Found ${result.documents.length} expired businesses in batch. Updating...`);

            for (const doc of result.documents) {
                await databases.updateDocument(
                    process.env.DB_ID,
                    process.env.COL_BUSINESSES,
                    doc.$id,
                    { subscriptionStatus: 'expired' }
                );
                totalExpiredBusinesses++;
            }

            if (result.documents.length < BATCH_LIMIT) break;
        }

        // 2. Expire Ads
        while (true) {
            const result = await databases.listDocuments(
                process.env.DB_ID,
                process.env.COL_ADS,
                [
                    Query.equal('subscriptionStatus', 'active'),
                    Query.lessThan('subscription_expiry', now),
                    Query.limit(BATCH_LIMIT),
                    Query.offset(0),
                ]
            );

            if (result.documents.length === 0) break;

            log(`Found ${result.documents.length} expired ads in batch. Updating...`);

            for (const doc of result.documents) {
                await databases.updateDocument(
                    process.env.DB_ID,
                    process.env.COL_ADS,
                    doc.$id,
                    { subscriptionStatus: 'expired' }
                );
                totalExpiredAds++;
            }

            if (result.documents.length < BATCH_LIMIT) break;
        }

        log(`Done. Expired ${totalExpiredBusinesses} businesses and ${totalExpiredAds} ads.`);

        return res.json({ 
            success: true, 
            expiredBusinesses: totalExpiredBusinesses,
            expiredAds: totalExpiredAds
        });
    } catch (err) {
        error(`expire-subscriptions failed: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
