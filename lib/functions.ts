/**
 * Appwrite Functions caller
 * All server-side function invocations go here.
 */
import { functions } from './appwrite';
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from '../constants/appwrite';

/**
 * Create Cashfree payment order
 */
export const createCashfreeOrder = async (
  amount: number,
  type: 'business' | 'ad',
  referenceId: string
): Promise<{ cashfreeOrderId: string; paymentSessionId: string }> => {
  const result = await functions.createExecution(
    'create-cashfree-order',
    JSON.stringify({ amount, type, referenceId }),
    false,
  );

  if (result.status !== 'completed') {
    throw new Error('Failed to create payment order');
  }

  return JSON.parse(result.responseBody);
};

/**
 * Verify Cashfree subscription payment
 */
export const verifySubscription = async (
  cashfreeOrderId: string,
  type: 'business' | 'ad',
  referenceId: string
): Promise<boolean> => {
  const result = await functions.createExecution(
    'verify-subscription',
    JSON.stringify({ cashfreeOrderId, type, referenceId }),
    false,
  );

  return result.status === 'completed';
};

/**
 * Delete a user's account and all associated data.
 * Calls the `delete-user-account` Appwrite Cloud Function (server-side only).
 * The function uses the server SDK + API key to call users.delete(userId).
 *
 * @param userId - The Appwrite user ID ($id) of the account to delete
 * @param functionId - The deployed Appwrite Function ID (set in Appwrite Console)
 */
export const deleteUserAccount = async (
  userId: string,
  functionId: string = 'delete-user-account'
): Promise<void> => {
  const result = await functions.createExecution(
    functionId,
    JSON.stringify({ userId }),
    false, // synchronous — wait for response
  );

  if (result.status !== 'completed') {
    throw new Error(`Account deletion function failed with status: ${result.status}`);
  }

  let parsed: { success: boolean; error?: string };
  try {
    parsed = JSON.parse(result.responseBody);
  } catch {
    throw new Error('Invalid response from delete-user-account function');
  }

  if (!parsed.success) {
    throw new Error(parsed.error ?? 'Account deletion failed in Cloud Function');
  }
};
