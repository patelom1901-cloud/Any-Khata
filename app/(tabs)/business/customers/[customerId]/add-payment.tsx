import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { addGotEntryToDayLog } from '../../../../../lib/database';
import { useAuthStore } from '../../../../../store/authStore';
import { useBusinessStore } from '../../../../../store/businessStore';
import { isValidAmount } from '../../../../../utils/currencyUtils';
import { getTodayString } from '../../../../../utils/dateUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../../constants/colors';
import { useTranslation } from "../../../../../hooks/useTranslation";

export default function AddPaymentScreen() {
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const business = useBusinessStore((state: { business: any }) => state.business);
  const user = useAuthStore((state: { user: any }) => state.user);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!isValidAmount(parsedAmount)) {
      Alert.alert(t(`Error`), t(`Enter a valid amount greater than 0`));
      return;
    }
    if (!business || !customerId || !user) {
      Alert.alert(t(`Error`), t(`Missing required data`));
      return;
    }

    setLoading(true);
    try {
      await addGotEntryToDayLog(
        customerId,
        business.businessId,
        parsedAmount,
        note.trim() || undefined
      );
      Alert.alert(t(`Success`), t(`Payment recorded successfully`));
      router.back();
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to record payment`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t(`Record Payment`)}</Text>
      <Text style={styles.subtitle}>
        {t(`Enter the amount received from the customer.`)}</Text>

      <View style={styles.form}>
        <Input
          label={t(`Amount (₹)`)}
          value={amount}
          onChangeText={setAmount}
          placeholder={t(`e.g., 500`)}
          keyboardType="decimal-pad"
        />
        <Input
          label={t(`Note (optional)`)}
          value={note}
          onChangeText={setNote}
          placeholder={t(`e.g., Partial payment, Full settlement`)}
          autoCapitalize="sentences"
        />
      </View>

      <Button
        title={t(`Record Payment`)}
        onPress={handleSave}
        loading={loading}
        fullWidth
        style={styles.button}
      />

      <Button
        title={t(`Cancel`)}
        onPress={() => router.back()}
        variant="ghost"
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing['2xl'],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
    lineHeight: 22,
  },
  form: {
    gap: Spacing.sm,
  },
  button: {
    marginTop: Spacing.lg,
  },
});
