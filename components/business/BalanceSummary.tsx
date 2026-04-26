import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../../utils/currencyUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
}

export const BalanceSummary = ({ totalBilled, totalPaid, totalDue }: Props) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <BalanceCell label={t('balance.total_billed')} amount={totalBilled} color={Colors.amountTotal} />
      <BalanceCell label={t('balance.paid')} amount={totalPaid} color={Colors.amountPaid} />
      <BalanceCell label={t('balance.remaining')} amount={totalDue} color={Colors.amountDue} />
    </View>
  );
};

const BalanceCell = ({ label, amount, color }: { label: string; amount: number; color: string }) => (
  <View style={styles.cell}>
    <Text style={[styles.amount, { color }]}>{formatCurrency(amount)}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  amount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
