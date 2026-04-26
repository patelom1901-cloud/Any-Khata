import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

export default function RoleSelectScreen() {
    const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(`What describes you best?`)}</Text>
      <Text style={styles.subtitle}>
        {t(`Choose your role to get started. You can always switch later.`)}</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(onboarding)/register-business')}
        activeOpacity={0.8}
      >
        <Text style={styles.cardIcon}>{t(`🏪`)}</Text>
        <Text style={styles.cardTitle}>{t(`I own a business`)}</Text>
        <Text style={styles.cardDesc}>
          {t(`Track customer balances, record daily transactions, manage your khata digitally.`)}</Text>
        <Text style={styles.cardPrice}>{t(`₹11/month`)}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.customerCard]}
        onPress={() => router.replace('/(tabs)/my-khata')}
        activeOpacity={0.8}
      >
        <Text style={styles.cardIcon}>{t(`👤`)}</Text>
        <Text style={styles.cardTitle}>{t(`I'm a customer`)}</Text>
        <Text style={styles.cardDesc}>
          {t(`View your khata from businesses that have added you. Check your balances for free.`)}</Text>
        <Text style={styles.cardFree}>{t(`Free`)}</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  customerCard: {
    borderColor: Colors.border,
    borderWidth: 1,
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  cardDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  cardPrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  cardFree: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
});
