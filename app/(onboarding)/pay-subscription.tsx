import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

/**
 * Payment screen — placeholder for Cashfree WebView integration
 * TODO: Integrate actual Cashfree payment flow via Appwrite Function
 */
export default function PaySubscriptionScreen() {
    const { t } = useTranslation();
  const params = useLocalSearchParams();
  const businessName = (params.businessName as string) || 'Your Business';

  const handlePayment = () => {
    // TODO: Call Appwrite Function to create Cashfree order
    // Then open WebView for payment
    // On success, navigate to business dashboard
    alert('Payment integration coming soon. This is a placeholder.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{t(`💳`)}</Text>
        <Text style={styles.title}>{t(`Activate`)}{businessName}</Text>
        <Text style={styles.price}>{t(`₹11/month`)}</Text>
        <Text style={styles.desc}>
          {t(`You'll be redirected to a secure payment page.`)}</Text>
      </View>

      <Button
        title={t(`Pay ₹11 Now`)}
        onPress={handlePayment}
        fullWidth
        style={styles.button}
      />

      <Button
        title={t(`Go Back`)}
        onPress={() => router.back()}
        variant="ghost"
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing['2xl'],
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  price: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.accent,
    marginBottom: Spacing.md,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginBottom: Spacing.md,
  },
});
