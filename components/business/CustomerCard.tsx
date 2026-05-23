import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatPhoneDisplay } from '../../utils/whatsappUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { Fonts, Colors as ThemeColors } from '../../constants/theme';
import type { Customer } from '../../types';
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  customer: Customer;
  onPress: () => void;
}

export const CustomerCard = React.memo(({ customer, onPress }: Props) => {
  const { t } = useTranslation();
  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: Colors.primaryPale }]}>
        <Text style={[styles.avatarText, { color: Colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
        <Text style={styles.linkCode}>Code: {customer.linkCode || '------'}</Text>
        <Text style={styles.phone}>{formatPhoneDisplay(customer.phone)}</Text>
      </View>
      <View style={styles.balance}>
        {customer.totalDue > 0 ? (
          <>
            <Text style={styles.dueAmount}>{formatCurrency(customer.totalDue)}</Text>
            <Text style={styles.dueLabel}>{t('customer_card.due')}</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle" size={20} color={Colors.success} />
            <Text style={[styles.paidText, { color: Colors.success }]}>{t('customer_card.paid')}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  phone: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  linkCode: {
    fontSize: 10,
    color: '#A88060',
    marginTop: 1,
  },
  balance: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: FontSize.md,
    fontFamily: Fonts.display,
    color: Colors.amountDue,
  },
  dueLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  paidText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
