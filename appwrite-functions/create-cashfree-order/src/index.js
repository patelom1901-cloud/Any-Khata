import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

/**
 * create-cashfree-order / verify-cashfree-payment — Appwrite Cloud Function
 * Merged into one function due to free tier limits.
 */
export default async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (req.path === '/verify') {
    // ------------------------------------------------------------------------
    // VERIFY LOGIC (Copied from verify-cashfree-payment)
    // ------------------------------------------------------------------------
    const { orderId } = body;
    if (!orderId) {
      return res.json({ success: false, error: 'orderId is required' }, 400);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const db = new Databases(client);
    const DB_ID = process.env.DB_ID || 'any_khata_db';
    const COL_PAYMENT_ORDERS = process.env.COL_PAYMENT_ORDERS || 'payment_orders';
    const COL_SUBSCRIPTIONS = process.env.COL_SUBSCRIPTIONS || 'subscriptions';
    const COL_ADS = process.env.COL_ADS || 'ads';

    log(`[verify-cashfree-payment] Verifying orderId: ${orderId}`);

    try {
      // 1. Get order from DB
      const orderRes = await db.listDocuments(DB_ID, COL_PAYMENT_ORDERS, [
        Query.equal('orderId', orderId),
        Query.limit(1)
      ]);

      if (orderRes.documents.length === 0) {
        error(`Order ${orderId} not found in payment_orders`);
        return res.json({ success: false, error: 'Order not found' }, 404);
      }

      const orderDoc = orderRes.documents[0];
      if (orderDoc.status === 'success') {
        log(`Order ${orderId} already marked as success`);
        return res.json({ success: true, already_processed: true });
      }

      // 2. Verify with Cashfree (MANDATORY CHANGE C)
      const isSandbox = process.env.CASHFREE_ENV !== 'PROD';
      const cashfreeBaseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
      
      log(`[verify-cashfree-payment] Calling Cashfree API: ${cashfreeBaseUrl}/links/${orderId}`);

      const cfResponse = await fetch(`${cashfreeBaseUrl}/links/${orderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
          'accept': 'application/json'
        }
      });

      const cfData = await cfResponse.json();
      if (!cfResponse.ok) {
        error(`Cashfree verification error: ${JSON.stringify(cfData)}`);
        return res.json({ success: false, error: 'Failed to verify with Cashfree' }, 500);
      }

      if (cfData.link_status !== 'PAID') {
        log(`Order ${orderId} status is ${cfData.link_status}, not PAID`);
        return res.json({ success: false, status: cfData.link_status });
      }

      // 3. Payment is PAID! Perform actions
      if (orderDoc.type === 'business') {
        const existingSubs = await db.listDocuments(
          DB_ID,
          COL_SUBSCRIPTIONS,
          [
            Query.equal('user_id', orderDoc.userId),
            Query.equal('status', 'active')
          ]
        );

        if (existingSubs.total > 0) {
          const existing = existingSubs.documents[0];
          const newExpiry = new Date(existing.expires_at);
          newExpiry.setDate(newExpiry.getDate() + 30);
          await db.updateDocument(DB_ID, COL_SUBSCRIPTIONS, existing.$id, {
            expires_at: newExpiry.toISOString().split('T')[0],
            cashfree_order_id: orderId
          });
          log(`[verify-cashfree-payment] Updated business subscription for ${orderDoc.userId}`);
        } else {
          const now = new Date();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          await db.createDocument(
            DB_ID,
            COL_SUBSCRIPTIONS,
            ID.unique(),
            {
              user_id: orderDoc.userId,
              plan: 'business_monthly',
              status: 'active',
              amount: 11,
              started_at: now.toISOString().split('T')[0],
              expires_at: expiresAt.toISOString().split('T')[0],
              cashfree_order_id: orderId,
            },
            [
              Permission.read(Role.user(orderDoc.userId)),
              Permission.update(Role.user(orderDoc.userId))
            ]
          );
          log(`[verify-cashfree-payment] Created business subscription for ${orderDoc.userId}`);
        }
      } else if (orderDoc.type === 'ad') {
        const adData = JSON.parse(orderDoc.adPayload || '{}');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const subscription_expiry = expiryDate.toISOString().split('T')[0];

        await db.createDocument(
          DB_ID,
          COL_ADS,
          ID.unique(),
          {
            user_id: orderDoc.userId,
            business_name: adData.business_name || adData.businessName,
            owner_name: adData.owner_name || adData.ownerName,
            phone: adData.phone,
            image_file_id: adData.image_file_id || adData.imageFileId || '',
            image_url: adData.image_url || adData.imageUrl,
            subscriptionStatus: 'active',
            subscription_expiry,
            created_at: new Date().toISOString().split('T')[0],
            gstin: adData.gstin || '',
            website_url: adData.website_url || adData.websiteUrl || '',
            maps_url: adData.maps_url || adData.mapsUrl || '',
          },
          [
            Permission.read(Role.user(orderDoc.userId)),
            Permission.update(Role.user(orderDoc.userId)),
            Permission.delete(Role.user(orderDoc.userId)),
            Permission.read(Role.any())
          ]
        );
        log(`[verify-cashfree-payment] Created ad for ${orderDoc.userId}`);
      }

      // 4. Finalize order (MANDATORY CHANGE B)
      await db.updateDocument(DB_ID, COL_PAYMENT_ORDERS, orderDoc.$id, {
        status: 'success',
        adPayload: '' // Clear sensitive payload after use
      });
      log(`[verify-cashfree-payment] Order ${orderId} finalized and adPayload cleared`);

      return res.json({ success: true });
    } catch (err) {
      error(`[verify-cashfree-payment] Execution error: ${err.message}`);
      return res.json({ success: false, error: err.message }, 500);
    }
  } else {
    // ------------------------------------------------------------------------
    // CREATE ORDER LOGIC (Default path '/')
    // ------------------------------------------------------------------------
    const { amount, orderId, customerPhone, customerName, type, referenceId, redirectUri, userId, adPayload } = body;

    if (!amount || !orderId || !customerPhone || !userId) {
      return res.json({ success: false, error: 'Missing required fields (amount, orderId, customerPhone, userId)' }, 400);
    }

    const cashfreeAppId = process.env.CASHFREE_APP_ID;
    const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
    const isSandbox = process.env.CASHFREE_ENV !== 'PROD';
    const baseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';

    if (!cashfreeAppId || !cashfreeSecret) {
      error('Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY environment variables');
      return res.json({ success: false, error: 'Server configuration error' }, 500);
    }

    let linkPurpose = "Payment for Any Khata";
    let returnUrl = redirectUri || "anykhata://payment-callback"; // Fallback

    if (type === 'business') {
      linkPurpose = "Become a Business Owner";
      returnUrl = `${redirectUri}?order_id={link_id}&type=business${referenceId ? `&reference_id=${referenceId}` : ''}`;
    } else if (type === 'ad') {
      linkPurpose = "Ad Placement on Any Khata";
      returnUrl = `${redirectUri}?order_id={link_id}&type=ad`;
    }

    const payload = {
      link_id: orderId,
      link_amount: amount,
      link_currency: "INR",
      link_purpose: linkPurpose,
      customer_details: { 
        customer_phone: customerPhone,
        customer_name: customerName || "User"
      },
      link_meta: { 
        return_url: returnUrl
      }
    };

    log(`[create-cashfree-order] Creating link for ${orderId}, amount: ${amount}, type: ${type}`);

    try {
      const response = await fetch(`${baseUrl}/links`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-client-id': cashfreeAppId,
          'x-client-secret': cashfreeSecret,
          'x-api-version': '2023-08-01'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        error(`Cashfree error: ${JSON.stringify(data)}`);
        return res.json({ success: false, error: data.message || 'Failed to create Cashfree link' }, response.status);
      }

      // ─── NEW: Store order in Appwrite ───
      try {
        const client = new Client()
          .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
          .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
          .setKey(process.env.APPWRITE_API_KEY);

        const db = new Databases(client);
        const DB_ID = process.env.DB_ID || 'any_khata_db';
        const COL_PAYMENT_ORDERS = process.env.COL_PAYMENT_ORDERS || 'payment_orders';

        await db.createDocument(
          DB_ID,
          COL_PAYMENT_ORDERS,
          ID.unique(),
          {
            orderId,
            userId,
            amount: parseFloat(amount),
            status: 'pending',
            type,
            adPayload: adPayload ? JSON.stringify(adPayload) : ''
          },
          [
            Permission.read(Role.user(userId))
          ]
        );
        log(`[create-cashfree-order] Order ${orderId} stored in payment_orders`);
      } catch (dbErr) {
        error(`[create-cashfree-order] DB Error: ${dbErr.message}`);
        // We continue even if DB fails, though link is created
      }

      log(`[create-cashfree-order] Success: ${data.link_url}`);
      return res.json({ success: true, link_url: data.link_url });
    } catch (err) {
      error(`Execution error: ${err.message}`);
      return res.json({ success: false, error: err.message }, 500);
    }
  }
};
