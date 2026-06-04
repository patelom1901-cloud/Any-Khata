import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar, SafeAreaView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { isValidIndianPhone } from '../../utils/whatsappUtils';
import { useAuthStore } from '../../store/authStore';
import { createBusiness } from '../../lib/database';
import { databases } from '../../lib/appwrite';
import { DB_ID, COL_USERS } from '../../constants/appwrite';
import { useTranslation } from "../../hooks/useTranslation";
import { Colors as ThemeColors, Fonts, Radius } from '@/constants/theme';
import { WavyHeader } from '@/components/ui/WavyHeader';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function RegisterBusinessScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [storePhotoUrl, setStorePhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickAndUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('Permission Required'), t('Please allow access to your photo library.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setIsUploadingPhoto(true);

      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipResult.uri,
        type: 'image/jpeg',
        name: asset.fileName || 'store_photo.jpg',
      } as any);
      formData.append('upload_preset', process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || t('Upload failed'));
      }

      setStorePhotoUrl(data.secure_url);
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || t('Failed to upload photo'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
      // 1. Create the business document (store_photo_url always included)
      const newBusiness = await createBusiness({
        ownerId: user.userId,
        businessName,
        ownerName,
        phone,
        businessType: 'Retail',
        city: '',
        state: '',
        store_photo_url: storePhotoUrl ?? null,
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
      useAuthStore.getState().setHasBusiness(true);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <WavyHeader>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t(`Register Your Business`)}</Text>
        </View>
      </WavyHeader>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <Text style={styles.subtitle}>
            {t(`Fill in your details to get started.`)}
          </Text>

          <View style={styles.card}>
            {/* Store Photo Upload */}
            <Text style={styles.label}>{t('Store Photo')} ({t('Optional')})</Text>
            <TouchableOpacity
              style={styles.photoPicker}
              onPress={handlePickAndUploadPhoto}
              disabled={isUploadingPhoto || loading}
              activeOpacity={0.75}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="large" color={ThemeColors.brandLight} />
              ) : storePhotoUrl ? (
                <Image
                  source={storePhotoUrl}
                  cachePolicy="disk"
                  transition={200}
                  style={styles.photoPreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <MaterialIcons name="camera-alt" size={36} color={ThemeColors.brandMid} />
                  <Text style={styles.photoHint}>{t('Add Store Photo (Optional)')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Business Name')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="store" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder={t('e.g., Ramesh Tea Stall')}
                  placeholderTextColor={ThemeColors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Owner Name')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder={t('e.g., Ramesh Kumar')}
                  placeholderTextColor={ThemeColors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Phone Number')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t('10-digit mobile number')}
                  placeholderTextColor={ThemeColors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              <Text style={styles.helperText}>{t('Used for customer WhatsApp contact')}</Text>
            </View>

            {error ? (
              <Animated.View entering={FadeInUp} style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={16} color={ThemeColors.creditRed} />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <TouchableOpacity 
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{t(`Register Business`)}</Text>
              )}
            </TouchableOpacity>
          </View>
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
  photoPicker: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ThemeColors.brandLight,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,136,58,0.05)',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  photoHint: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: ThemeColors.brandLight,
  },
  headerInner: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: '#FFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 24,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: ThemeColors.textSecondary,
    marginBottom: 32,
    marginTop: -8,
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ThemeColors.creamBase,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  inputIcon: {
    marginRight: 12,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: ThemeColors.textPrimary,
  },
  helperText: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F4',
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F8DADA',
  },
  errorText: {
    fontFamily: Fonts.bold,
    color: ThemeColors.creditRed,
    fontSize: 12,
    marginLeft: 8,
  },
  primaryBtn: {
    backgroundColor: ThemeColors.brandDark,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
});
