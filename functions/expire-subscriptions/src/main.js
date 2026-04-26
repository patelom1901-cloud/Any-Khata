import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const db = new Databases(client);

  const DATABASE_ID       = 'any_khata_db';
  const SUBSCRIPTIONS_ID  = 'subscriptions';
  const BUSINESSES_ID     = 'businesses';
  const ADS_ID            = 'ads';

  const now       = new Date();
  const todayStr  = now.toISOString().split('T')[0];

  let expiredSubCount  = 0;
  let expiredAdsCount  = 0;
  let deactivatedBiz   = 0;

  try {

    log('Step 1: Fetching active subscriptions...');

    let subOffset = 0;
    const subLimit = 100;
    let hasMoreSubs = true;
    const expiredUserIds = new Set();

    while (hasMoreSubs) {
      const subsResult = await db.listDocuments(
        DATABASE_ID,
        SUBSCRIPTIONS_ID,
        [
          Query.equal('status', 'active'),
          Query.limit(subLimit),
          Query.offset(subOffset),
        ]
      );

      const toExpire = subsResult.documents.filter(sub => {
        const expiry = new Date(sub.expires_at);
        return expiry < now;
      });

      for (const sub of toExpire) {
        await db.updateDocument(
          DATABASE_ID,
          SUBSCRIPTIONS_ID,
          sub.$id,
          { status: 'expired' }
        );
        expiredUserIds.add(sub.user_id);
        expiredSubCount++;
        log(`Expired subscription ${sub.$id} for user ${sub.user_id}`);
      }

      subOffset += subLimit;
      if (subsResult.documents.length < subLimit) hasMoreSubs = false;
    }

    log(`Step 1 done. Expired ${expiredSubCount} subscriptions.`);

    log('Step 2: Deactivating businesses for expired users...');

    for (const userId of expiredUserIds) {
      const activeCheck = await db.listDocuments(
        DATABASE_ID,
        SUBSCRIPTIONS_ID,
        [
          Query.equal('user_id', userId),
          Query.equal('status', 'active'),
          Query.limit(1),
        ]
      );

      if (activeCheck.total > 0) {
        log(`User ${userId} still has active subscription — skipping`);
        continue;
      }

      const bizResult = await db.listDocuments(
        DATABASE_ID,
        BUSINESSES_ID,
        [
          Query.equal('owner_id', userId),
          Query.equal('is_active', true),
          Query.limit(100),
        ]
      );

      for (const biz of bizResult.documents) {
        await db.updateDocument(
          DATABASE_ID,
          BUSINESSES_ID,
          biz.$id,
          { is_active: false }
        );
        deactivatedBiz++;
        log(`Deactivated business ${biz.$id} (${biz.business_name})`);
      }
    }

    log(`Step 2 done. Deactivated ${deactivatedBiz} businesses.`);

    log('Step 3: Fetching active ads...');

    let adOffset = 0;
    const adLimit = 100;
    let hasMoreAds = true;

    while (hasMoreAds) {
      const adsResult = await db.listDocuments(
        DATABASE_ID,
        ADS_ID,
        [
          Query.equal('subscription_status', 'active'),
          Query.limit(adLimit),
          Query.offset(adOffset),
        ]
      );

      const expiredAds = adsResult.documents.filter(ad => {
        return ad.subscription_expiry && ad.subscription_expiry < todayStr;
      });

      for (const ad of expiredAds) {
        await db.updateDocument(
          DATABASE_ID,
          ADS_ID,
          ad.$id,
          { subscription_status: 'expired' }
        );
        expiredAdsCount++;
        log(`Expired ad ${ad.$id} (${ad.business_name})`);
      }

      adOffset += adLimit;
      if (adsResult.documents.length < adLimit) hasMoreAds = false;
    }

    log(`Step 3 done. Expired ${expiredAdsCount} ads.`);

    const summary = {
      success: true,
      expiredSubscriptions: expiredSubCount,
      deactivatedBusinesses: deactivatedBiz,
      expiredAds: expiredAdsCount,
      ranAt: now.toISOString(),
    };

    log('expire-subscriptions complete: ' + JSON.stringify(summary));
    return res.json(summary);

  } catch (err) {
    error('expire-subscriptions FAILED: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
