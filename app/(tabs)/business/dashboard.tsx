import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import { useBusinessStore } from '../../../store/businessStore';
import { useAuthStore } from '../../../store/authStore';
import { formatCurrency } from '../../../utils/currencyUtils';
import { Card } from '../../../components/ui/Card';
import { CustomerCard } from '../../../components/business/CustomerCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Colors as ThemeColors, Fonts, Radius } from '../../../constants/theme';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from "../../../hooks/useTranslation";
import { getBusinessById } from '../../../lib/database';
import { WavyHeader } from '../../../components/ui/WavyHeader';
import Animated, { FadeInDown, FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      <WavyHeader>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.good_morning')}{business.ownerName} 👋</Text>
            <Text style={styles.businessName}>{business.businessName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <MaterialIcons name="settings" size={22} color={ThemeColors.textOnDark} />
          </TouchableOpacity>
        </View>
      </WavyHeader>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {business.subscriptionStatus === 'expired' && (
          <Animated.View entering={FadeInDown} style={styles.expiredBanner}>
            <View style={styles.expiredLeft}>
              <MaterialIcons name="warning" size={20} color="#FFF" />
              <Text style={styles.expiredBannerText}>
                {t('dashboard.renew_desc')}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.renewButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.renewButtonText}>{t('dashboard.renew_now')}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            label={t('dashboard.customers')} 
            value={totalCustomers.toString()} 
            icon="account-group" 
            delay={100}
          />
          <StatCard 
            label={t('dashboard.pending')} 
            value={formatCurrency(totalPending)} 
            icon="clock-outline" 
            color={ThemeColors.creditRed} 
            delay={200}
          />
          <StatCard 
            label={t('Collected')} 
            value={formatCurrency(totalCollected)} 
            icon="cash-check" 
            color={ThemeColors.paymentGreen} 
            delay={300}
          />
          <StatCard 
            label={t('Net Worth')} 
            value={formatCurrency(totalPending - totalCollected)} 
            icon="trending-up" 
            color={ThemeColors.brandMid} 
            delay={400}
          />
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
            customers.slice(0, 5).map((customer, index) => (
              <Animated.View key={customer.customerId} entering={FadeInRight.delay(500 + index * 100)}>
                <CustomerCard
                  customer={customer}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/business/customers/[customerId]',
                      params: { customerId: customer.customerId },
                    } as any)
                  }
                />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      {business.subscriptionStatus === 'active' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/business/customers/add' as any)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const StatCard = ({
  label,
  value,
  icon,
  color,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  delay?: number;
}) => (
  <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={styles.statCardWrapper}>
    <Card padding="md" style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: color ? `${color}15` : `${ThemeColors.brandMid}15` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color || ThemeColors.brandMid} />
      </View>
      <Text style={[styles.statValue, color && { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  greeting: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textMuted,
  },
  businessName: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: ThemeColors.textOnDark,
    marginTop: 2,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  expiredBanner: {
    backgroundColor: ThemeColors.creditRed,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: -10,
    elevation: 4,
    shadowColor: ThemeColors.creditRed,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  expiredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  expiredBannerText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: Fonts.bold,
    flex: 1,
  },
  renewButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  renewButtonText: {
    color: ThemeColors.creditRed,
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCardWrapper: {
    width: (width - 52) / 2,
  },
  statCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontFamily: Fonts.display,
    color: ThemeColors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: ThemeColors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.extrabold,
    color: ThemeColors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: ThemeColors.brandLight,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ThemeColors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
