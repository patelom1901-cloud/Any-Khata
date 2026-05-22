import React, { useEffect } from 'react';
import { View, ActivityIndicator, Alert, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { verifyAndActivateSubscription, checkBusinessSubscriptionStatus } from '../lib/database';
import { Colors } from '../constants/colors';
import { useTranslation } from "../hooks/useTranslation";
import { useAuthStore } from '../store/authStore';

/**
 * Payment Callback Screen
 * Handles the redirect return from Cashfree payment gateway.
 * Extracts order_id, activates subscription, and redirects back to profile.
 */
export default function PaymentCallbackScreen() {
  const { t } = useTranslation();
  const { order_id, type, reference_id } = useLocalSearchParams<{ 
    order_id: string; 
    type?: 'business' | 'ad'; 
    reference_id?: string 
  }>();
  const router = useRouter();

  useEffect(() => {
    const processPayment = async () => {
      // Fallback logic for backward compatibility
      const finalType = type || 'business';
      const finalReferenceId = reference_id || '';

      try {
        // Only call verifyAndActivateSubscription if referenceId exists
        // If missing, still consider payment done — user will see updated status on next app open
        if (finalReferenceId) {
          await verifyAndActivateSubscription(finalType, finalReferenceId);
        }

        // Always fetch fresh subscription status from Appwrite after a payment attempt
        const userId = useAuthStore.getState().user?.userId;
        if (userId) {
          const isSub = await checkBusinessSubscriptionStatus(userId);
          useAuthStore.getState().setIsSubscribed(isSub);
        } else {
          console.error('Payment callback: userId missing, cannot verify payment');
          Alert.alert('Error', 'Session expired. Please log in again and check your subscription status.');
          router.replace('/(auth)/login');
          return;
        }

        Alert.alert(
          t(`Payment Successful`), 
          t(`Your subscription is now active!`)
        );
        router.replace('/(tabs)/profile');
      } catch (err: any) {
        Alert.alert(
          t(`Payment Error`), 
          err.message || t(`We could not verify your payment. Please contact support if the amount was debited.`)
        );
        router.replace('/(tabs)/profile');
      }
    };

    processPayment();
  }, [type, reference_id]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.text}>{t(`Finalizing your payment...`)}</Text>
      <Text style={styles.subtext}>{t(`Please do not close the app`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
