import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useBusinessStore } from '../../../store/businessStore';
import { formatDisplayDate, isExpiringSoon, isExpired } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Colors, FontSize, FontWeight, Spacing } from '../../../constants/colors';
import { useTranslation } from "../../../hooks/useTranslation";

export default function SubscriptionScreen() {
    const { t } = useTranslation();
  const business = useBusinessStore((state) => state.business);

  if (!business) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{t(`No business found`)}</Text>
      </View>
    );
  }

  const expired = isExpired(business.subscriptionExpiry);
  const expiringSoon = !expired && isExpiringSoon(business.subscriptionExpiry);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{t(`💳`)}</Text>
        <Text style={styles.title}>{t(`Business Subscription`)}</Text>

        <Badge
          text={expired ? 'Expired' : expiringSoon ? 'Expiring Soon' : business.subscriptionStatus}
          variant={expired ? 'danger' : expiringSoon ? 'warning' : 'success'}
        />

        {business.subscriptionExpiry && (
          <Text style={styles.expiry}>
            {t(`Valid until:`)}{formatDisplayDate(business.subscriptionExpiry)}
          </Text>
        )}

        <Text style={styles.price}>{t(`₹11/month`)}</Text>
      </View>

      <Button
        title={t(`Manage Subscription`)}
        onPress={() => { }}
        fullWidth
        style={styles.button}
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
    marginBottom: Spacing.md,
  },
  expiry: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  price: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.accent,
    marginTop: Spacing.lg,
  },
  button: {},
  error: {
    fontSize: FontSize.lg,
    color: Colors.danger,
    textAlign: 'center',
  },
});
