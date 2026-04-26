import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useBusinessStore } from '../../../store/businessStore';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency } from '../../../utils/currencyUtils';
import { Card } from '../../../components/ui/Card';
import { CustomerCard } from '../../../components/business/CustomerCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Spacing } from '../../../constants/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from "../../../hooks/useTranslation";
import { getBusinessById } from '../../../lib/database';

export default function DashboardScreen() {
    const { t } = useTranslation();
  const business = useBusinessStore((state) => state.business);
  const customers = useBusinessStore((state) => state.customers);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const refreshBusiness = async () => {
      try {
        const business = useBusinessStore.getState().business;
        if (!business?.businessId) return;
        const fresh = await getBusinessById(business.businessId);
        if (fresh) useBusinessStore.getState().setBusiness(fresh);
      } catch (e) {
        console.log('Dashboard subscription refresh failed:', e);
      }
    };
    refreshBusiness();
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (!business) return <EmptyState message={t('dashboard.no_business_found')} icon="🏪" />;

  // Calculate stats
  const totalCustomers = customers.length;
  const totalPending = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const totalCollected = customers.reduce((sum, c) => sum + c.totalPaid, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('dashboard.good_morning')}{business.ownerName}{t('dashboard.morning_coffee')}</Text>
        <Text style={styles.businessName}>{business.businessName}</Text>
      </View>

      {business.subscriptionStatus === 'expired' && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredBannerText}>
            {t('dashboard.renew_desc')}
          </Text>
          <TouchableOpacity 
            style={styles.renewButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.renewButtonText}>{t('dashboard.renew_now')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label={t('dashboard.today')} value="₹ 0" icon="calendar-today" />
        <StatCard label={t('dashboard.month')} value="₹ 0" icon="calendar-month" />
        <StatCard label={t('dashboard.customers')} value={totalCustomers.toString()} icon="account-group" />
        <StatCard label={t('dashboard.pending')} value={formatCurrency(totalPending)} icon="clock-outline" color={Colors.amountDue} />
      </View>

      {/* Customers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent_customers')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/business/customers' as any)}>
            <Text style={styles.seeAll}>{t('dashboard.see_all')}</Text>
          </TouchableOpacity>
        </View>

        {customers.length === 0 ? (
          <EmptyState
            message={t('dashboard.no_customers')}
            description={t('dashboard.add_customer_desc')}
            actionLabel={t('dashboard.add_customer_btn')}
            onAction={() => router.push('/(tabs)/business/customers/add' as any)}
            icon="👥"
          />
        ) : (
          customers.slice(0, 5).map((customer) => (
            <CustomerCard
              key={customer.customerId}
              customer={customer}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/business/customers/[customerId]',
                  params: { customerId: customer.customerId },
                } as any)
              }
            />
          ))
        )}
      </View>

      {/* FAB */}
      {business.subscriptionStatus === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/business/customers/add' as any)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
}) => (
  <Card padding="md" style={styles.statCard}>
    <MaterialCommunityIcons name={icon} size={24} color={color || Colors.primary} />
    <Text style={[styles.statValue, color && { color }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  greeting: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  businessName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing['2xl'],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  expiredBanner: {
    backgroundColor: Colors.danger,
    padding: Spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  expiredBannerText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
    marginRight: Spacing.sm,
  },
  renewButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  renewButtonText: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
