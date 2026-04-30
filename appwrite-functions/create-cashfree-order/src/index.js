import { Client, Databases, ID } from 'node-appwrite';

/**
 * create-cashfree-order — Appwrite Cloud Function
 * 
 * Receives: { amount, orderId, customerPhone, customerName, type, referenceId, redirectUri, userId, adPayload }
 * Returns: { success: true, link_url: string }
 */
export default async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

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

      await db.createDocument(DB_ID, COL_PAYMENT_ORDERS, ID.unique(), {
        orderId,
        userId,
        amount: parseFloat(amount),
        status: 'pending',
        type,
        adPayload: adPayload ? JSON.stringify(adPayload) : ''
      });
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
};
