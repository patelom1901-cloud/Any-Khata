import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { createCustomer } from '../../../../lib/database';
import { useBusinessStore } from '../../../../store/businessStore';
import { isValidIndianPhone } from '../../../../utils/whatsappUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../../../constants/colors';
import { useTranslation } from "../../../../hooks/useTranslation";

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t(`Add New Customer`)}</Text>
      <Text style={styles.subtitle}>
        {t(`Enter their name and phone number. They'll be able to view their khata once they sign up.`)}</Text>

      <View style={styles.form}>
        <Input
          label={t(`Customer Name`)}
          value={name}
          onChangeText={setName}
          placeholder={t(`e.g., Suresh Patel`)}
          autoCapitalize="words"
        />
        <Input
          label={t(`Phone Number`)}
          value={phone}
          onChangeText={setPhone}
          placeholder={t(`10-digit mobile number`)}
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>

      <Button
        title={t(`Save Customer`)}
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
