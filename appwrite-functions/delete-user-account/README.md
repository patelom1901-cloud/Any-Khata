# Setup: `delete-user-account` Appwrite Cloud Function

## What This Function Does
Deletes all data for a user in a single atomic server-side operation:
1. Finds and deletes all `day_logs` for the user's business
2. Finds and deletes all `customers` for the user's business  
3. Deletes the `business` document
4. Deletes all `subscriptions` for the user
5. Deletes the `users` document
6. Calls `users.delete(userId)` — **only possible server-side**

## Deployment Steps

### 1. Create the Function in Appwrite Console
1. Go to **Appwrite Console → Functions → Create Function**
2. Name: `delete-user-account`
3. Runtime: **Node.js 22**
4. Copy the Function ID shown in the URL (you'll need it)

### 2. Set Environment Variables in Appwrite Console
Under the function **Settings → Variables**, add:

| Variable | Value |
|---|---|
| `DB_ID` | `any_khata_db` |
| `COL_BUSINESSES` | `businesses` |
| `COL_CUSTOMERS` | `customers` |
| `COL_DAY_LOGS` | `day_logs` |
| `COL_SUBSCRIPTIONS` | `subscriptions` |
| `COL_USERS` | `users` |
| `APPWRITE_API_KEY` | Your Appwrite API key (from `.env`: `EXPO_PUBLIC_APPWRITE_API_KEY`) |

> ⚠️ **Note**: `APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by Appwrite. Do NOT add them manually.

### 3. Deploy the Function
Upload via Appwrite CLI or zip:

```bash
# Option A: Via Appwrite CLI (recommended)
cd any-khata-app/appwrite-functions/delete-user-account
appwrite push function

# Option B: Zip and upload manually
# Zip the contents of appwrite-functions/delete-user-account/
# Upload in Appwrite Console → Functions → (your function) → Deploy
```

### 4. Set Function Permissions
In Appwrite Console → Functions → `delete-user-account` → **Settings → Permissions**:
- Execute: `users` (authenticated users only)

### 5. Update the Function ID in the App (if different)
In `lib/functions.ts`, the `deleteUserAccount` function defaults to `functionId = 'delete-user-account'`.

If Appwrite assigned a different Function ID (auto-generated), update the call in `profile.tsx` or pass it explicitly:

```typescript
// If your Appwrite Function ID is different from 'delete-user-account':
await deleteUserAccount(user.userId, 'YOUR_FUNCTION_ID_HERE');
```

Or update the default in `lib/functions.ts`:
```typescript
export const deleteUserAccount = async (
  userId: string,
  functionId: string = 'YOUR_ACTUAL_FUNCTION_ID' // ← change this
```

## File Summary

| File | What Changed |
|---|---|
| `appwrite-functions/delete-user-account/src/index.js` | **NEW** — The Cloud Function source |
| `appwrite-functions/delete-user-account/package.json` | **NEW** — node-appwrite dependency |
| `appwrite-functions/delete-user-account/appwrite.json` | **NEW** — Function manifest |
| `lib/functions.ts` | **ADDED** `deleteUserAccount()` caller |
| `lib/auth.ts` | **UPDATED** `deleteAppwriteAccount` — now throws, directing to Cloud Function |
| `app/(tabs)/profile.tsx` | **UPDATED** `performDeleteAccount` — calls `deleteUserAccount` only |
