import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatCurrency } from '../../../utils/currencyUtils';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from "../../../hooks/useTranslation";
import { Colors as ThemeColors, Fonts, Radius } from '@/constants/theme';
import { WavyHeader } from '@/components/ui/WavyHeader';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

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

  const renderHeader = () => (
    <WavyHeader>
      <View style={styles.headerInner}>
        <Text style={styles.headerTitle}>{t('My Khata')}</Text>
        <Text style={styles.headerSubtitle}>{t('View all your linked shops')}</Text>
      </View>
    </WavyHeader>
  );

  if (businesses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            message={t('my_khata.empty_msg')}
            description={t('my_khata.empty_desc')}
            icon="📒"
          />
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
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
          <View style={styles.storeIconContainer}>
            <MaterialCommunityIcons name="store" size={24} color={ThemeColors.brandMid} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.ownerName}>{t('my_khata.added_by')}{item.ownerName}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={ThemeColors.creamBorder} />
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>{t('my_khata.you_owe')}</Text>
          <Text style={[styles.balanceAmount, item.totalDue > 0 && { color: ThemeColors.creditRed }]}>
            {formatCurrency(item.totalDue || 0)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={businesses}
        ListHeaderComponent={renderHeader()}
        renderItem={renderItem}
        keyExtractor={(item) => item.businessId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  headerInner: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 24,
    color: '#FFF',
  },
  headerSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,136,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessName: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: ThemeColors.brandDark,
  },
  ownerName: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: ThemeColors.textSecondary,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: ThemeColors.creamBorder,
  },
  balanceLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: ThemeColors.textSecondary,
  },
  balanceAmount: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: ThemeColors.paymentGreen,
  },
});
