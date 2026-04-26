import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getAd, updateAd } from '../../lib/database';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from '../../hooks/useTranslation';

// ─── Screen ───────────────────────────────────────────────────

export default function AdEditScreen() {
  const { t } = useTranslation();
  const { adId } = useLocalSearchParams();

  // ─── Validation schema ────────────────────────────────────────
  const adSchema = useMemo(() => z.object({
    businessName: z.string().min(2, t('ad_submit.error_business_name')),
    ownerName: z.string().min(2, t('ad_submit.error_owner_name')),
    phone: z.string().regex(/^[0-9]{10}$/, t('ad_submit.error_phone_valid')),
    gstin: z
      .string()
      .max(15, t('ad_submit.error_gstin_max'))
      .optional()
      .or(z.literal('')),
    websiteUrl: z
      .string()
      .refine(
        (v) => !v || v.startsWith('https://'),
        t('ad_submit.error_website_https')
      )
      .optional()
      .or(z.literal('')),
    mapsUrl: z
      .string()
      .refine(
        (v) =>
          !v ||
          v.startsWith('https://maps.app.goo.gl/') ||
          v.startsWith('https://maps.google.com/'),
        t('ad_submit.error_maps_start')
      )
      .optional()
      .or(z.literal('')),
  }), [t]);

  type AdFormData = z.infer<typeof adSchema>;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdFormData>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      businessName: '',
      ownerName: '',
      phone: '',
      gstin: '',
      websiteUrl: '',
      mapsUrl: '',
    },
  });

  useEffect(() => {
    const fetchAd = async () => {
      if (!adId || typeof adId !== 'string') return;
      try {
        const existingAd = await getAd(adId);
        if (existingAd) {
          setValue('businessName', existingAd.business_name);
          setValue('ownerName', existingAd.owner_name);
          setValue('phone', existingAd.phone);
          setValue('gstin', existingAd.gstin || '');
          setValue('websiteUrl', existingAd.website_url || '');
          setValue('mapsUrl', existingAd.maps_url || '');
          setImageUrl(existingAd.image_url);
        }
      } catch (err: any) {
        Alert.alert(t('common.error'), t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchAd();
  }, [adId]);

  // ─── Photo upload ────────────────────────────────────────────

  const handlePickAndUploadPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('common.permission_required'), t('common.permission_denied_msg'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
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
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message || t('common.error'));
      }

      setImageUrl(data.secure_url);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ─── Submit ──────────────────────────────────────────────────

  const onSubmit = async (data: AdFormData) => {
    if (!imageUrl) {
      Alert.alert(t('common.error'), t('ad_submit.upload_store_photo_msg'));
      return;
    }
    if (!adId || typeof adId !== 'string') return;

    try {
      setIsSubmitting(true);

      await updateAd(adId, {
        business_name: data.businessName,
        owner_name: data.ownerName,
        phone: data.phone,
        image_url: imageUrl,
        gstin: data.gstin || undefined,
        website_url: data.websiteUrl || undefined,
        maps_url: data.mapsUrl || undefined,
      });

      Alert.alert(t('common.success'), t('ad_edit.success_msg'), [
        { text: t('common.ok'), onPress: () => router.push('/(tabs)/profile' as any) },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
        <MaterialIcons name="arrow-back" size={22} color={Colors.textSecondary} />
        <Text style={styles.backText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{t('ad_edit.title')}</Text>
      <Text style={styles.subtitle}>
        {t('ad_edit.subtitle')}
      </Text>

      {/* ─── Photo picker ─────────────────────────── */}
      <Text style={styles.sectionLabel}>{t('ad_submit.store_photo')} *</Text>
      <TouchableOpacity
        style={styles.photoPicker}
        onPress={handlePickAndUploadPhoto}
        disabled={isUploadingPhoto || isSubmitting}
        activeOpacity={0.75}
      >
        {isUploadingPhoto ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <MaterialIcons name="add-a-photo" size={36} color={Colors.primary} />
            <Text style={styles.photoHint}>{t('ad_submit.tap_to_upload')}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Required fields ─────────────────────── */}
      <Text style={styles.sectionLabel}>{t('ad_submit.business_details')}</Text>

      <Controller
        control={control}
        name="businessName"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.business_name') + ' *'}
              value={value}
              onChangeText={onChange}
              placeholder={t('common.placeholder_business')}
            />
            {errors.businessName && (
              <Text style={styles.errorText}>{errors.businessName.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="ownerName"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.owner_name') + ' *'}
              value={value}
              onChangeText={onChange}
              placeholder={t('common.placeholder_owner')}
            />
            {errors.ownerName && (
              <Text style={styles.errorText}>{errors.ownerName.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.whatsapp_number') + ' *'}
              value={value}
              onChangeText={onChange}
              placeholder={t('common.placeholder_phone')}
              keyboardType="phone-pad"
              maxLength={10}
              helperText={t('ad_submit.whatsapp_hint')}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone.message}</Text>
            )}
          </View>
        )}
      />

      {/* ─── Optional fields ─────────────────────── */}
      <Text style={styles.sectionLabel}>{t('ad_submit.optional_details')}</Text>
      <Text style={styles.sectionHint}>{t('ad_submit.optional_hint')}</Text>

      <Controller
        control={control}
        name="gstin"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.gstin_number')}
              value={value ?? ''}
              onChangeText={onChange}
              placeholder={t('ad_submit.gstin_placeholder')}
              maxLength={15}
              autoCapitalize="characters"
            />
            {errors.gstin && (
              <Text style={styles.errorText}>{errors.gstin.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="websiteUrl"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.website_url')}
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="https://yourwebsite.com"
              keyboardType="url"
              autoCapitalize="none"
            />
            {errors.websiteUrl && (
              <Text style={styles.errorText}>{errors.websiteUrl.message}</Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="mapsUrl"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputWrapper}>
            <Input
              label={t('ad_submit.maps_url')}
              value={value ?? ''}
              onChangeText={onChange}
              placeholder="https://maps.app.goo.gl/..."
              keyboardType="url"
              autoCapitalize="none"
            />
            {errors.mapsUrl && (
              <Text style={styles.errorText}>{errors.mapsUrl.message}</Text>
            )}
          </View>
        )}
      />

      {/* ─── Submit ──────────────────────────────── */}
      <Button
        title={t('common.save_changes')}
        onPress={handleSubmit(onSubmit)}
        fullWidth
        disabled={isUploadingPhoto || isSubmitting}
        style={styles.submitButton}
      />

      <Button
        title={t('common.go_back')}
        onPress={() => router.back()}
        variant="ghost"
        fullWidth
        disabled={isUploadingPhoto || isSubmitting}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing['2xl'],
    paddingBottom: 48,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  backText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  photoPicker: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryPale,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoHint: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  inputWrapper: {
    marginBottom: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    marginTop: 4,
    marginLeft: 4,
  },
});
