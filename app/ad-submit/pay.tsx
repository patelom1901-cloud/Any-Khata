import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

/**
 * Ad payment screen — placeholder for Cashfree integration
 */
export default function AdPayScreen() {
    const { t } = useTranslation();
  const handlePayment = () => {
    alert('Ad payment integration coming soon.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{t(`📢`)}</Text>
        <Text style={styles.title}>{t(`Advertise on Any Khata`)}</Text>
        <Text style={styles.price}>{t(`₹100/month`)}</Text>
        <Text style={styles.desc}>
          {t(`Your ad will appear on the Ads page after payment confirmation.`)}</Text>
      </View>

      <Button
        title={t(`Pay ₹100 Now`)}
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
