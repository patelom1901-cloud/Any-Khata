import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
import { router, Stack } from 'expo-router';
import { useBusinessStore } from '../../../../store/businessStore';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Colors } from '../../../../constants/colors';
import { useTranslation } from "../../../../hooks/useTranslation";
import { WavyHeader } from '../../../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function CustomersScreen() {
  const { t } = useTranslation();
  const customers = useBusinessStore((state) => state.customers);
  const isLoading = useBusinessStore((state) => state.business === null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredCustomers = useMemo(() => {
    let result = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    if (activeFilter === 'pending') {
      result = result.filter((c) => (c.totalDue - c.totalPaid) > 0);
    }

    return result;
  }, [customers, searchQuery, activeFilter]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. WAVY HEADER */}
        <WavyHeader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: Fonts.extrabold, fontSize: 18, color: ThemeColors.textOnDark }}>
                {t(`My Khata`)}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 10.5, color: ThemeColors.textMuted, marginTop: 2 }}>
                {customers.length} {t(`total customers`)}
              </Text>
            </View>
            <TouchableOpacity 
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => router.push('/(tabs)/business/customers/add' as any)}
            >
              <MaterialIcons name="person-add" size={22} color={ThemeColors.textOnDark} />
            </TouchableOpacity>
          </View>

          {/* 2. SEARCH BAR */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={ThemeColors.brandMid} />
            <TextInput
              style={styles.searchInput}
              placeholder={t(`Search by name or phone...`)}
              placeholderTextColor={ThemeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="cancel" size={18} color={ThemeColors.brandMid} />
              </TouchableOpacity>
            )}
          </View>
        </WavyHeader>

        <View style={styles.content}>
          {/* 3. FILTER CHIPS */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.filterRow}
            contentContainerStyle={{ gap: 8, paddingRight: 24 }}
          >
            <TouchableOpacity 
              onPress={() => setActiveFilter('all')}
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>{t(`All`)}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setActiveFilter('pending')}
              style={[styles.filterChip, activeFilter === 'pending' && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === 'pending' && styles.filterTextActive]}>{t(`Pending`)}</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* 4. CUSTOMER LIST */}
          <View style={styles.listContainer}>
            {filteredCustomers.length === 0 ? (
              <EmptyState
                message={searchQuery ? t(`No results found`) : t('dashboard.no_customers')}
                description={t('dashboard.add_customer_desc')}
                actionLabel={t('dashboard.add_customer_btn')}
                onAction={() => router.push('/(tabs)/business/customers/add' as any)}
                icon="👥"
              />
            ) : (
              filteredCustomers.map((item, index) => {
                const balance = (item.totalDue || 0) - (item.totalPaid || 0);
                const initials = item.name ? item.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().substring(0, 2) : '??';
                
                return (
                  <Animated.View 
                    key={item.customerId}
                    entering={FadeInRight.delay(index * 50).springify()}
                    layout={Layout.springify()}
                  >
                    <TouchableOpacity
                      style={styles.card}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/business/customers/[customerId]',
                          params: { customerId: item.customerId },
                        } as any)
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardLeft}>
                        <View style={[styles.avatar, { backgroundColor: ThemeColors.creamBase }]}>
                          <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: ThemeColors.brandMid }}>
                            {initials}
                          </Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={{ fontFamily: Fonts.bold, fontSize: 15, color: ThemeColors.textPrimary }}>
                            {item.name}
                          </Text>
                          <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: ThemeColors.textSecondary, marginTop: 2 }}>
                            {item.phone || t(`No phone`)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardRight}>
                        <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: balance > 0 ? ThemeColors.creditRed : ThemeColors.paymentGreen }}>
                          ₹{balance.toLocaleString('en-IN')}
                        </Text>
                        <MaterialIcons name="chevron-right" size={18} color={ThemeColors.creamBorder} style={{ marginTop: 4 }} />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Animated.View 
        entering={FadeInUp.delay(500).duration(360).springify()}
        style={{ position: 'absolute', right: 24, bottom: 94 }}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/business/customers/add' as any)}
          activeOpacity={0.9}
        >
          <MaterialIcons name="person-add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  content: {
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textPrimary,
  },
  filterRow: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  filterChipActive: {
    backgroundColor: ThemeColors.brandDark,
    borderColor: ThemeColors.brandDark,
  },
  filterText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: ThemeColors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 2,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    justifyContent: 'center',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ThemeColors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: ThemeColors.brandLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
