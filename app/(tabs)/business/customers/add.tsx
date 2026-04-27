import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { createCustomer } from '../../../../lib/database';
import { useBusinessStore } from '../../../../store/businessStore';
import { isValidIndianPhone } from '../../../../utils/whatsappUtils';
import { Colors as ThemeColors, Fonts, Radius } from '../../../../constants/theme';
import { useTranslation } from "../../../../hooks/useTranslation";
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function AddCustomerScreen() {
    const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const business = useBusinessStore((state) => state.business);
  const addCustomer = useBusinessStore((state) => state.addCustomer);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t(`Error`), t(`Customer name is required`));
      return;
    }
    if (!isValidIndianPhone(phone)) {
      Alert.alert(t(`Error`), t(`Enter a valid 10-digit Indian mobile number`));
      return;
    }
    if (!business) {
      Alert.alert(t(`Error`), t(`No business found`));
      return;
    }

    setLoading(true);
    try {
      const linkCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newCustomer = await createCustomer({
        business_id: business.businessId,
        owner_id: business.ownerId,
        name: name.trim(),
        phone: phone.trim(),
        link_code: linkCode,
      });
      addCustomer(newCustomer);
      router.back();
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to add customer`));
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
          <Text style={styles.title}>{t(`Add New Customer`)}</Text>
          <Text style={styles.subtitle}>
            {t(`Enter their name and phone number. They'll be able to view their khata once they sign up.`)}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Customer Name`)}</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t(`e.g., Suresh Patel`)}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>{t(`Phone Number`)}</Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder={t(`10-digit mobile number`)}
              keyboardType="phone-pad"
              maxLength={10}
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
              <Text style={styles.primaryBtnText}>{t(`Save Customer`)}</Text>
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
