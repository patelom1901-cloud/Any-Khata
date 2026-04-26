import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isValidIndianPhone } from '../../utils/whatsappUtils';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { createBusiness } from '../../lib/database';
import { databases } from '../../lib/appwrite';
import { DB_ID, COL_USERS } from '../../constants/appwrite';
import { useTranslation } from "../../hooks/useTranslation";

export default function RegisterBusinessScreen() {
    const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setError(t(`Business name is required`));
      return;
    }
    if (!ownerName.trim()) {
      setError(t(`Owner name is required`));
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setError(t(`Enter a valid 10-digit Indian mobile number`));
      return;
    }

    if (!user?.$id) {
      setError(t(`User not identified. Please re-login.`));
      return;
    }

    try {
      setLoading(true);
      setError('');
      // 1. Create the business document
      await createBusiness({
        ownerId: user.userId,
        businessName,
        ownerName,
        phone,
        businessType: 'Retail',
        city: '',
        state: '',
      });
      // 2. Update user document in 'users' collection with snake_case field
      try {
        await databases.updateDocument(DB_ID, COL_USERS, user.$id, {
          has_business: true,
        });
      } catch (updateError: any) {
        throw updateError;
      }

      // 3. Update Zustand authStore immediately
      // First update the hasBusiness flag directly
      useAuthStore.getState().setHasBusiness(true);
      // Then update the user object which will also set hasBusiness via setUser
      setUser({ ...user, hasBusiness: true });
      Alert.alert(t(`Success`), t(`Business registered successfully!`));
      router.replace('/(tabs)/home');
      
    } catch (err: any) {
      Alert.alert(t(`Error`), err.message || t(`Failed to register business`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t(`Register Your Business`)}</Text>
      <Text style={styles.subtitle}>
        {t(`Fill in your details to get started.`)}</Text>

      <View style={styles.form}>
        <Input
          label={t(`Business Name`)}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t(`e.g., Ramesh Tea Stall`)}
        />
        <Input
          label={t(`Owner Name`)}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder={t(`e.g., Ramesh Kumar`)}
        />
        <Input
          label={t(`Phone Number`)}
          value={phone}
          onChangeText={setPhone}
          placeholder={t(`10-digit mobile number`)}
          keyboardType="phone-pad"
          maxLength={10}
          helperText="Used for customer WhatsApp contact"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title={t(`Register Business`)}
          onPress={handleSubmit}
          fullWidth
          disabled={loading}
          style={styles.button}
        />
      </View>
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
  },
  form: {
    gap: Spacing.sm,
  },
  button: {
    marginTop: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
