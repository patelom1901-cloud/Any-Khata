import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useBusinessStore } from '../../../../store/businessStore';
import { CustomerCard } from '../../../../components/business/CustomerCard';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { useTranslation } from "../../../../hooks/useTranslation";

export default function CustomersScreen() {
    const { t } = useTranslation();
  const customers = useBusinessStore((state) => state.customers);
  const isLoading = useBusinessStore((state) => state.business === null);

  if (isLoading) return <LoadingSpinner />;

  if (customers.length === 0) {
    return (
      <EmptyState
        message={t('dashboard.no_customers')}
        description={t('dashboard.add_customer_desc')}
        actionLabel={t('dashboard.add_customer_btn')}
        onAction={() => router.push('/(tabs)/business/customers/add' as any)}
        icon="👥"
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/business/customers/[customerId]',
                params: { customerId: item.customerId },
              } as any)
            }
          />
        )}
        keyExtractor={(item) => item.customerId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.footer}>
        <Button
          title={t('dashboard.add_customer_btn')}
          onPress={() => router.push('/(tabs)/business/customers/add' as any)}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
