import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { addGotEntryToDayLog, recalcAndUpdateCustomerBalance } from '../../../../../lib/database';
import { useAuthStore } from '../../../../../store/authStore';
import { useBusinessStore } from '../../../../../store/businessStore';
import { isValidAmount } from '../../../../../utils/currencyUtils';
import { Colors as ThemeColors, Fonts, Radius } from '../../../../../constants/theme';
import { useTranslation } from "../../../../../hooks/useTranslation";
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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
      await recalcAndUpdateCustomerBalance(customerId);
      Alert.alert(t(`Success`), t(`Payment recorded successfully`));
      router.back();
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to record payment`));
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
          <Text style={styles.title}>{t(`Record Payment`)}</Text>
          <Text style={styles.subtitle}>
            {t(`Enter the amount received from the customer.`)}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Amount (₹)`)}</Text>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder={t(`e.g., 500`)}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.amountInput}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Note (Optional)`)}</Text>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder={t(`e.g., Partial payment, Full settlement`)}
              autoCapitalize="sentences"
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
              <Text style={styles.primaryBtnText}>{t(`Record Payment`)}</Text>
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
    color: ThemeColors.paymentGreen,
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
