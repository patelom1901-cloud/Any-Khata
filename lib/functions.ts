/**
 * Appwrite Functions caller
 * All server-side function invocations go here.
 */
import { functions } from './appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../constants/appwrite';

/**
 * Create Cashfree payment link via Cloud Function
 */
export const createCashfreeOrder = async (params: {
  amount: number;
  orderId: string;
  customerPhone: string;
  customerName: string;
  type: 'business' | 'ad';
  referenceId?: string;
  redirectUri: string;
  userId: string;
  adPayload?: any;
}): Promise<{ link_url: string }> => {
  const result = await functions.createExecution(
    'create-cashfree-order',
    JSON.stringify(params),
    false,
  );

  if (result.status !== 'completed') {
    throw new Error('Failed to create payment order');
  }

  const parsed = JSON.parse(result.responseBody);
  if (!parsed.success) {
    throw new Error(parsed.error || 'Failed to create payment link');
  }

  return { link_url: parsed.link_url };
};

/**
 * Verify Cashfree payment status via Cloud Function
 */
export const verifyCashfreePayment = async (params: {
  orderId: string;
}): Promise<{ success: boolean; already_processed?: boolean; error?: string }> => {
  const result = await functions.createExecution(
    'create-cashfree-order',
    JSON.stringify(params),
    false,
    '/verify'
  );

  if (result.status !== 'completed') {
    throw new Error('Payment verification function failed');
  }

  return JSON.parse(result.responseBody);
};

/**
 * Delete a user's account and all associated data.
 * Calls the `create-cashfree-order` function with path `/delete-account`.
 * (Merged into the same function due to Appwrite Free tier 2-function limit.)
 * The function uses the server SDK + API key to soft-delete all data
 * and then hard-delete the auth user via users.delete(userId).
 *
 * @param userId - The Appwrite user ID ($id) of the account to delete
 */
export const deleteUserAccount = async (
  userId: string,
): Promise<void> => {
  const result = await functions.createExecution(
    'create-cashfree-order',
    JSON.stringify({ userId }),
    false, // synchronous — wait for response
    '/delete-account',
  );

  if (result.status !== 'completed') {
    throw new Error(`Account deletion function failed with status: ${result.status}`);
  }

  let parsed: { success: boolean; error?: string };
  try {
    parsed = JSON.parse(result.responseBody);
  } catch {
    throw new Error('Invalid response from delete-account function');
  }

  if (!parsed.success) {
    throw new Error(parsed.error ?? 'Account deletion failed in Cloud Function');
  }
};

