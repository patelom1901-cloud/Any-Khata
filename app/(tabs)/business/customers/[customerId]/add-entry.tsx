import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { getOrCreateDayLog, addEntryToDayLog, getBusinessByOwner, getDayLogsForCustomer, updateDayLogEntry, recalcAndUpdateCustomerBalance } from '../../../../../lib/database';
import { useBusinessStore } from '../../../../../store/businessStore';
import { useAuthStore } from '../../../../../store/authStore';
import { useEntryStore } from '../../../../../store/entryStore';
import { isValidAmount } from '../../../../../utils/currencyUtils';
import { getTodayString } from '../../../../../utils/dateUtils';
import { Colors as ThemeColors, Fonts, Radius } from '../../../../../constants/theme';
import { useTranslation } from "../../../../../hooks/useTranslation";
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function AddEntryScreen() {
  const { t } = useTranslation();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const business = useBusinessStore((state: { business: any }) => state.business);
  const { user } = useAuthStore();
  
  const { editingEntry, dayLogId, clearEditingEntry } = useEntryStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description || '');
      setAmount(editingEntry.amount ? editingEntry.amount.toString() : '');
      setQuantity(editingEntry.quantity ? editingEntry.quantity.toString() : '');
    }
  }, [editingEntry]);

  useEffect(() => {
    return () => {
      clearEditingEntry();
    };
  }, [clearEditingEntry]);

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
      if (editingEntry && dayLogId) {
        const parsedQuantity = quantity.trim() ? parseFloat(quantity) : undefined;
        await updateDayLogEntry(dayLogId, editingEntry.id, {
          description: description.trim(),
          amount: parsedAmount,
          quantity: parsedQuantity,
          type: editingEntry.type
        });
        await recalcAndUpdateCustomerBalance(customerId);
        Alert.alert(t(`Success`), t(`Entry updated successfully`));
        router.back();
        return;
      }

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

      const parsedQuantity = quantity.trim() ? parseFloat(quantity) : undefined;
      const userId = user.userId || (user as any).$id;
      const dayLog = await getOrCreateDayLog(businessId, customerId, userId);
      await addEntryToDayLog(dayLog, description.trim(), parsedAmount, 'gave', parsedQuantity);
      await recalcAndUpdateCustomerBalance(customerId);
      Alert.alert(t(`Success`), t(`Entry added successfully`));
      router.back();
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to save entry`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ThemeColors.creamBase} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={ThemeColors.brandDark} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={styles.title}>{editingEntry ? t(`Edit Entry`) : t(`Add Entry`)}</Text>
          <Text style={styles.subtitle}>
            {editingEntry ? t(`Update the transaction details.`) : t(`Record what the customer purchased today.`)}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Description`)}</Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t(`e.g., 6 cups tea, Parle G packet`)}
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Quantity (Optional)`)}</Text>
            <Input
              value={quantity}
              onChangeText={setQuantity}
              placeholder={t(`e.g., 6`)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Amount (₹)`)}</Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder={t(`e.g., 30`)}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t(`Save Entry`)}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>{t(`Cancel`)}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  title: {
    fontFamily: Fonts.extrabold,
    fontSize: 28,
    color: ThemeColors.brandDark,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: ThemeColors.textSecondary,
    marginTop: 12,
    lineHeight: 22,
    marginBottom: 32,
  },
  formCard: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: ThemeColors.creditRed,
  },
  footer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: ThemeColors.brandDark,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: '#FFF',
  },
  cancelBtn: {
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: ThemeColors.textSecondary,
  },
});
