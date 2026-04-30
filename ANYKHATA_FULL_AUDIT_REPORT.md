# 🛡️ ANYKHATA FULL AUDIT REPORT

**Date:** April 29, 2026
**Scope:** Security, Scalability, and Code Quality
**Application:** AnyKhata (React Native / Expo + Appwrite + Cashfree)

This document contains a comprehensive audit of the AnyKhata application, identifying critical vulnerabilities, severe performance bottlenecks, and accumulated technical debt. The findings are structured into three main phases.

---

## 🛑 PHASE 1: SECURITY AUDIT

### 1.1 Hardcoded Secrets & Keys (CRITICAL)
The application leaks sensitive keys directly to the client bundle, which can be reverse-engineered by malicious users.
*   **Cashfree Secret Key Leak:** `EXPO_PUBLIC_CASHFREE_SECRET` is used directly in client-side code (`app/(tabs)/profile.tsx` line 133 and `app/ad-submit/index.tsx` line 164) to generate payment links. **This is a critical severity vulnerability.**
*   **Cloudinary Upload Preset:** `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` is public. Because Cloudinary client-side uploads are unsigned, an attacker can extract this preset and upload unlimited, arbitrary files to your Cloudinary account, potentially causing massive billing spikes.

### 1.2 Authentication & Authorization (HIGH)
*   **No Server-Side Payment Verification:** The subscription logic in `profile.tsx` and `ad-submit/index.tsx` relies completely on the client-side redirect (`WebBrowser.openAuthSessionAsync`). An attacker can easily spoof the success redirect and manually trigger the `createBusinessSubscription` or `createAd` database calls, bypassing the ₹11 or ₹100 payment entirely.
*   **Over-permissioned Appwrite Collections:** According to `setup-appwrite.mjs`, several collections grant overly broad permissions:
    *   `ads`: `Permission.read(Role.any())`, `Permission.write(Role.users())`
    *   `businesses`: `Permission.write(Role.users())`
    *   `day_logs`: `Permission.write(Role.users())`
    *   Because permissions are set to `Role.users()` instead of Document-Level Security (e.g. `Role.user(userId)`), any authenticated user could potentially modify or delete another business's data if they know the document ID.

### 1.3 Insecure Data Storage (MEDIUM)
*   **Plaintext AsyncStorage:** In `lib/auth.ts`, the sensitive `userDoc` (which includes PI and fields like `isSubscribed` and `hasBusiness`) is stored in plaintext in `AsyncStorage`. If an attacker alters this local JSON to `{"isSubscribed": true, "hasBusiness": true}`, they can bypass the payment guards and access premium features without paying.

### 1.4 Input Validation (LOW)
*   **Missing Server-Side Sanitization:** While Zod is used for client-side validation, fields like `description` and `note` in `day_logs` entries are sent directly to Appwrite as raw strings. Although React Native is generally safe from XSS, this data is untrusted and should be sanitized.

---

## 📈 PHASE 2: SCALABILITY & PERFORMANCE AUDIT

### 2.1 Balance Calculation Method (CRITICAL)
*   **Client-Side Aggregation Nightmare:** In `lib/database.ts` (`recalcAndUpdateCustomerBalance`), the app fetches up to 1000 `day_logs` documents for a single customer, parses the JSON entries of each log, and recalculates the balance by iterating over them locally. This happens *every time an entry is added*.
    *   **Impact:** As transaction volume grows, the app will freeze, and Appwrite bandwidth/read costs will skyrocket. This aggregation must be moved to an Appwrite serverless function or managed via atomic counters.

### 2.2 Missing Pagination (HIGH)
*   **Hard Limits:** Queries throughout `lib/database.ts` use hard limits (`Query.limit(100)` for customers, `Query.limit(365)` for logs) but completely lack offset or cursor pagination logic. Users with more than 100 customers will never see their older customers.

### 2.3 Client-Side Soft Deletes (HIGH)
*   **Flawed Deletion Logic:** When fetching customers (`getCustomersByBusiness`), the app requests 100 documents from Appwrite, and *then* filters out `is_deleted === true` in the client. If a user deletes 100 customers, the API will return 100 deleted records, the client filter will drop them all, and the user will see an empty screen, even if they have active customers beyond the first 100 limit. `is_deleted` must be filtered via Appwrite `Query`.

### 2.4 Indexing Inefficiencies (MEDIUM)
*   **Missing Indexes:** `getAdsByUserId` queries the `ads` collection by `user_id`, but `setup-appwrite.mjs` confirms there is no index on `user_id`. This causes a full collection scan for every user loading their ads.
*   **Attribute Mismatch Risk:** `setup-appwrite.mjs` creates the attribute as `subscriptionStatus` (camelCase), but queries in `lib/database.ts` (e.g. line 475) use `subscription_status` (snake_case).

### 2.5 CRON Job Reliability (MEDIUM)
*   **Missing Client Fallbacks:** The app relies entirely on a midnight Appwrite CRON job (`lock-day-logs`) to lock past entries. If the CRON job fails or is delayed, the client lacks a robust fallback to lock past logs, potentially allowing retroactive tampering.

### 2.6 Real-time & Leak Checks (LOW)
*   **No WebSockets Used:** `grep` confirms that `client.subscribe` is not used anywhere in the app. There are no WebSocket memory leaks because the app relies purely on polling/fetching via `useFocusEffect`.

---

## 🧹 PHASE 3: CODE HYGIENE & DEAD CODE

### 3.1 Unused Files & Components
The following files are completely unused and should be safely deleted to reduce bundle size and confusion:
*   `components/shared/RoleGuard.tsx`
*   `components/shared/SubscriptionGuard.tsx`
*   `components/ui/Badge.tsx`
*   `components/ui/Card.tsx`
*   `hooks/useRealtime.ts`
*   `lib/realtime.ts`
*   `lib/storage.ts`

### 3.2 Throwaway Scripts & Clutter
The root directory contains several debug and throwaway files that should be deleted or moved to a `.scripts` folder and ignored by Git:
*   `fix-customer.js`, `fix-my-khata.js`, `fix-types.js`
*   `grep_all.txt`, `tsc_errors.txt`, `all_files.csv`
*   The `scratch/` directory.

### 3.3 Missing Error Boundaries & Logging
*   **No Global Error Boundary:** `app/_layout.tsx` lacks an Error Boundary. Any unhandled component error will crash the app to the home screen without graceful degradation.
*   **Production Console Logs:** Sensitive data is logged in production (e.g., `lib/auth.ts` logs user emails and `$id`). These should be wrapped in `__DEV__` checks.

---

## 📋 RECOMMENDED ACTION PLAN
1.  **Immediate Fix:** Move Cashfree link generation and subscription verification to an Appwrite Cloud Function. Remove `EXPO_PUBLIC_CASHFREE_SECRET` from `.env` and client code.
2.  **Immediate Fix:** Fix Document-Level Security (DLS) permissions in `setup-appwrite.mjs`.
3.  **High Priority:** Refactor balance calculations. Use Appwrite Cloud Functions to update a running balance counter on the customer document instead of summing historical logs on the client.
4.  **High Priority:** Implement proper cursor-based pagination for customers and logs.
5.  **Housekeeping:** Delete unused components/files and secure `AsyncStorage` logic.
