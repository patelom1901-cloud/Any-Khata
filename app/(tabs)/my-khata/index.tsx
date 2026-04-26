import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../utils/currencyUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../../constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from "../../../hooks/useTranslation";

/**
 * My Khata — Customer view
 * Lists all businesses where this customer has a khata
 */
export default function MyKhataScreen() {
    const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  // TODO: Fetch businesses where this user is a customer
  // For now, show a placeholder
  const businesses = [] as any[];

  if (businesses.length === 0) {
    return (
      <EmptyState
        message={t('my_khata.empty_msg')}
        description={t('my_khata.empty_desc')}
        icon="📒"
      />
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/my-khata/[businessId]',
          params: { businessId: item.businessId },
        } as any)
      }
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="store" size={24} color={Colors.primary} />
        <Text style={styles.businessName}>{item.businessName}</Text>
      </View>
      <Text style={styles.ownerName}>{t('my_khata.added_by')}{item.ownerName}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>{t('my_khata.you_owe')}</Text>
        <Text style={[styles.balanceAmount, item.totalDue > 0 && { color: Colors.amountDue }]}>
          {formatCurrency(item.totalDue || 0)}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={businesses}
      renderItem={renderItem}
      keyExtractor={(item) => item.businessId}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  businessName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  ownerName: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.amountPaid,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.lg,
    top: '50%',
  },
});
