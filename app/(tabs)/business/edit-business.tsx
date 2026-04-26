import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useBusinessStore } from '../../../store/businessStore';
import { Colors, FontSize, FontWeight, Spacing } from '../../../constants/colors';
import { databases } from '../../../lib/appwrite';
import { DB_ID, COL_BUSINESSES } from '../../../constants/appwrite';
import { useTranslation } from "../../../hooks/useTranslation";
import { isValidIndianPhone } from '../../../utils/whatsappUtils';

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
        aspect: [4, 3],
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

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('Edit Business Details')}</Text>

      <View style={styles.form}>
        {/* ── Store Photo Picker ── */}
        <TouchableOpacity
          style={styles.photoPicker}
          onPress={handlePickAndUploadPhoto}
          disabled={isUploadingPhoto}
          activeOpacity={0.75}
        >
          {isUploadingPhoto ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : storePhotoUrl ? (
            <Image
              source={{ uri: storePhotoUrl }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.photoHint}>{t('Tap to add store photo')}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Input
          label={t('Business Name')}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t('e.g., Ramesh Tea Stall')}
        />
        <Input
          label={t('Owner Name')}
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder={t('e.g., Ramesh Kumar')}
        />
        <Input
          label={t('Phone Number')}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('10-digit mobile number')}
          keyboardType="phone-pad"
          maxLength={10}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={t('Cancel')}
            onPress={handleCancel}
            variant="outline"
            disabled={loading}
            style={styles.button}
          />
          <Button
            title={t('Save')}
            onPress={handleSave}
            disabled={loading}
            style={styles.button}
          />
        </View>
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
    marginBottom: Spacing['2xl'],
  },
  form: {
    gap: Spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
  },
  photoPicker: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface || Colors.background,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs || 4,
  },
  cameraIcon: {
    fontSize: 36,
  },
  photoHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});