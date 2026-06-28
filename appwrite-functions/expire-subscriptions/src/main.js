import { Client, Databases, Query, Users, ID } from 'node-appwrite';

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

  // -------------------------------------------------------------------------
  // GOOGLE AUTH (path: /google-auth)
  // -------------------------------------------------------------------------
  if (req.path === '/google-auth') {
    try {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (e) {
        return res.json({ error: 'Invalid JSON body' }, 400);
      }

      const idToken = body.idToken;
      if (!idToken) {
        return res.json({ error: 'Missing idToken' }, 400);
      }
      log('google-auth: verifying idToken with Google tokeninfo...');

      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
      );
      const tokenInfo = await tokenInfoRes.json();

      if (tokenInfo.error) {
        log('google-auth: tokeninfo error: ' + tokenInfo.error);
        return res.json({ error: 'Invalid Google token' }, 401);
      }

      const EXPECTED_AUD = '86622171566-1rcasnc44i99icq4lug9v7q210k4cs08.apps.googleusercontent.com';
      if (tokenInfo.aud !== EXPECTED_AUD) {
        log('google-auth: audience mismatch — got: ' + tokenInfo.aud);
        return res.json({ error: 'Token audience mismatch' }, 401);
      }

      if (tokenInfo.email_verified !== 'true') {
        return res.json({ error: 'Google email not verified' }, 401);
      }

      const email = tokenInfo.email;
      const name = tokenInfo.name || email.split('@')[0];
      log('google-auth: processing user: ' + email);

      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      const users = new Users(client);

      let userId;
      const existingList = await users.list([Query.equal('email', [email])]);

      if (existingList.total > 0) {
        userId = existingList.users[0].$id;
        log('google-auth: existing user found: ' + userId);
      } else {
        const newUser = await users.create(
          ID.unique(),
          email,
          undefined,
          undefined,
          name
        );
        userId = newUser.$id;
        log('google-auth: new user created: ' + userId);
      }

      const token = await users.createToken(userId);
      log('google-auth: token issued for: ' + token.userId);

      return res.json({ userId: token.userId, secret: token.secret }, 200);

    } catch (err) {
      log('google-auth: handler error: ' + err.message);
      return res.json({ error: 'Internal server error' }, 500);
    }
  }

  // -------------------------------------------------------------------------
  // CRON: expire subscriptions (existing logic below — untouched)
  // -------------------------------------------------------------------------
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
