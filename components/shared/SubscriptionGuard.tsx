import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useBusinessStore } from '../../store/businessStore';
import { Colors, FontSize, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  children: React.ReactNode;
}

export const SubscriptionGuard = ({ children }: Props) => {
  const { t } = useTranslation();
  const isActive = useBusinessStore((state) => state.isSubscriptionActive);

  if (!isActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>{t('guard.subscription_required')}</Text>
        <Text style={styles.desc}>
          {t('guard.desc')}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)/business/subscription' as any)}
        >
          <Text style={styles.buttonText}>{t('guard.activate_btn')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
    backgroundColor: Colors.background,
  },
  emoji: { fontSize: 48, marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['3xl'],
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
});
