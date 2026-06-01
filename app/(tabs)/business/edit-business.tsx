import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator, StatusBar, SafeAreaView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useBusinessStore } from '../../../store/businessStore';
import { databases } from '../../../lib/appwrite';
import { DB_ID, COL_BUSINESSES } from '../../../constants/appwrite';
import { useTranslation } from "../../../hooks/useTranslation";
import { isValidIndianPhone } from '../../../utils/whatsappUtils';
import { Colors as ThemeColors, Fonts, Radius } from '@/constants/theme';
import { WavyHeader } from '@/components/ui/WavyHeader';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function EditBusinessScreen() {
  const { t } = useTranslation();
  const { business, setBusiness } = useBusinessStore();
  
  const initialName = business?.business_name || business?.businessName || '';
  const initialOwnerName = business?.owner_name || business?.ownerName || '';
  const initialPhone = business?.phone || '';

  const [businessName, setBusinessName] = useState(initialName);
  const [ownerName, setOwnerName] = useState(initialOwnerName);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [storePhotoUrl, setStorePhotoUrl] = useState<string | null>(business?.storePhotoUrl || null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
        aspect: [16, 9],
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setIsUploadingPhoto(true);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
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

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert(t('Error'), t('Business name is required'));
      return;
    }
    if (!ownerName.trim()) {
      Alert.alert(t('Error'), t('Owner name is required'));
      return;
    }
    if (!isValidIndianPhone(phone)) {
      Alert.alert(t('Error'), t('Enter a valid 10-digit Indian mobile number'));
      return;
    }
    if (!business?.businessId) {
      Alert.alert(t('Error'), t('Business not found'));
      return;
    }

    try {
      setLoading(true);

      await databases.updateDocument(
        DB_ID,
        COL_BUSINESSES,
        business.businessId,
        {
          business_name: businessName,
          owner_name: ownerName,
          phone: phone,
          store_photo_url: storePhotoUrl,
        }
      );

      const updatedBusiness = {
        ...business,
        businessName: businessName,
        ownerName: ownerName,
        phone: phone,
        storePhotoUrl: storePhotoUrl,
        business_name: businessName,
        owner_name: ownerName,
        store_photo_url: storePhotoUrl,
      };

      setBusiness(updatedBusiness);
      
      router.back();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || t('Failed to update business'));
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
          <Text style={styles.headerTitle}>{t('Edit Business Details')}</Text>
        </View>
      </WavyHeader>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Business Name')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="store" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputPlaceholderLabel}>{t('ad_submit.business_name')}</Text>
                  <TextInput 
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder={t('e.g., Ramesh Tea Stall')}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Owner Name')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputPlaceholderLabel}>{t('ad_submit.owner_name')}</Text>
                  <TextInput 
                    style={styles.input}
                    value={ownerName}
                    onChangeText={setOwnerName}
                    placeholder={t('e.g., Ramesh Kumar')}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('Phone Number')}</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="phone" size={20} color={ThemeColors.brandMid} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputPlaceholderLabel}>{t('ad_submit.whatsapp_number')}</Text>
                  <TextInput 
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('10-digit mobile number')}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            {/* ── Store Photo Picker ── */}
            <Text style={[styles.label, { marginTop: 8 }]}>{t('Store Photo (Optional)')}</Text>
            <TouchableOpacity
              style={styles.photoPicker}
              onPress={handlePickAndUploadPhoto}
              disabled={isUploadingPhoto}
              activeOpacity={0.8}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="large" color={ThemeColors.brandLight} />
              ) : storePhotoUrl ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: storePhotoUrl }} style={styles.photoPreview} />
                  <View style={styles.imageOverlay}>
                    <MaterialIcons name="photo-camera" size={24} color="#FFF" />
                    <Text style={styles.imageOverlayText}>{t('Change Photo')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="images-outline" size={48} color={ThemeColors.brandMid} opacity={0.5} />
                  <Text style={styles.photoHint}>{t('ad_submit.tap_to_upload')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.button, styles.btnOutline]} 
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={[styles.btnText, { color: ThemeColors.brandMid }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.btnPrimary]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.btnText, { color: '#FFF' }]}>{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerInner: {
    paddingHorizontal: 20,
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
    fontSize: 20,
    color: '#FFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
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
    backgroundColor: 'rgba(201,136,58,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: '#FFF',
    fontFamily: Fonts.bold,
    fontSize: 12,
    marginTop: 4,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: ThemeColors.brandMid,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputPlaceholderLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: ThemeColors.textMuted,
    marginBottom: 2,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: ThemeColors.textPrimary,
    padding: 0,
    height: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: ThemeColors.brandMid,
  },
  btnPrimary: {
    backgroundColor: ThemeColors.brandDark,
  },
  btnText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
});