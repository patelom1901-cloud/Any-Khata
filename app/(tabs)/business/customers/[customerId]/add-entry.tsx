import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { getOrCreateDayLog, addEntryToDayLog, getBusinessByOwner, getDayLogsForCustomer } from '../../../../../lib/database';
import { useBusinessStore } from '../../../../../store/businessStore';
import { useAuthStore } from '../../../../../store/authStore';
import { isValidAmount } from '../../../../../utils/currencyUtils';
import { getTodayString } from '../../../../../utils/dateUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../../constants/colors';
import { useTranslation } from "../../../../../hooks/useTranslation";

export default function AddEntryScreen() {
    const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const business = useBusinessStore((state: { business: any }) => state.business);
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLockStatus = async () => {
      if (!customerId) return;
      let businessId = business?.businessId;
      if (!businessId && user) {
        const userId = user.userId || (user as any).$id;
        const fetchedBusiness = await getBusinessByOwner(userId);
        businessId = fetchedBusiness?.businessId;
      }
      if (!businessId) return;

      try {
        const logs = await getDayLogsForCustomer(businessId, customerId);
        const today = getTodayString();
        const todayLog = logs.find(l => l.date === today);
        
        if (todayLog && todayLog.isLocked) {
          Alert.alert(t(`Locked`), t(`Today's log is locked. Contact support if there's an error.`));
          router.back();
        }
      } catch (err) {
        console.error('Error checking lock status:', err);
      }
    };
    checkLockStatus();
  }, [customerId, business?.businessId, user, t]);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert(t(`Error`), t(`Description is required`));
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!isValidAmount(parsedAmount)) {
      Alert.alert(t(`Error`), t(`Enter a valid amount greater than 0`));
      return;
    }
    if (!customerId) {
      Alert.alert(t(`Error`), t(`Missing customer data`));
      return;
    }

    setLoading(true);
    try {
      let businessId = business?.businessId;
      
      if (!businessId) {
        if (!user || (!user.userId && !(user as any).$id)) {
          Alert.alert(t(`Error`), t(`User not authenticated`));
          setLoading(false);
          return;
        }
        const userId = user.userId || (user as any).$id;
        const fetchedBusiness = await getBusinessByOwner(userId);
        if (!fetchedBusiness) {
          Alert.alert(t(`Error`), t(`Missing business data`));
          setLoading(false);
          return;
        }
        businessId = fetchedBusiness.businessId;
      }

      if (!businessId) {
        Alert.alert(t(`Error`), t(`Missing business data`));
        setLoading(false);
        return;
      }

      const parsedQuantity = quantity.trim() ? parseFloat(quantity) : undefined;
      const dayLog = await getOrCreateDayLog(businessId, customerId);
      await addEntryToDayLog(dayLog, description.trim(), parsedAmount, 'gave', parsedQuantity);
      Alert.alert(t(`Success`), t(`Entry added successfully`));
      router.back();
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to add entry`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t(`Add Entry`)}</Text>
      <Text style={styles.subtitle}>
        {t(`Record what the customer purchased today.`)}</Text>

      <View style={styles.form}>
        <Input
          label={t(`Description`)}
          value={description}
          onChangeText={setDescription}
          placeholder={t(`e.g., 6 cups tea, Parle G packet`)}
          autoCapitalize="sentences"
        />
        <Input
          label={t(`Quantity`)}
          value={quantity}
          onChangeText={setQuantity}
          placeholder={t(`e.g., 6`)}
          keyboardType="numeric"
        />
        <Input
          label={t(`Amount (₹)`)}
          value={amount}
          onChangeText={setAmount}
          placeholder={t(`e.g., 30`)}
          keyboardType="decimal-pad"
        />
      </View>

      <Button
        title={t(`Save Entry`)}
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
