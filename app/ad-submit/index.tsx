import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { createAd } from '../../lib/database';
import { useTranslation } from '../../hooks/useTranslation';
import { WavyHeader } from '../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function AdSubmitScreen() {
  const { t } = useTranslation();

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

  const {
    control,
    handleSubmit,
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

  const onSubmit = async (data: AdFormData) => {
    if (!imageUrl) {
      Alert.alert(t('common.error'), t('ad_submit.upload_store_photo_msg'));
      return;
    }

    try {
      setIsSubmitting(true);

      const orderId = 'ad_order_' + Date.now();
      const redirectUri = makeRedirectUri({ path: 'payment-callback' });

      const payload = {
        link_id: orderId,
        link_amount: 100,
        link_currency: 'INR',
        link_purpose: 'Ad Placement on Any Khata',
        customer_details: {
          customer_phone: data.phone,
        },
        link_meta: {
          return_url: redirectUri + '?order_id={link_id}&type=ad',
        },
      };

      const res = await fetch('https://sandbox.cashfree.com/pg/links', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-client-id': process.env.EXPO_PUBLIC_CASHFREE_APP_ID!,
          'x-client-secret': process.env.EXPO_PUBLIC_CASHFREE_SECRET!,
          'x-api-version': '2023-08-01',
        },
        body: JSON.stringify(payload),
      });

      const linkData = await res.json();
      if (!res.ok || !linkData.link_url) {
        throw new Error(linkData.message || t('common.error'));
      }

      const result = await WebBrowser.openAuthSessionAsync(linkData.link_url, redirectUri);

      if (result.type !== 'success') {
        Alert.alert(t('common.error'), t('profile.payment_failed'));
        return;
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      const subscription_expiry = expiryDate.toISOString().split('T')[0];

      await createAd({
        business_name: data.businessName,
        owner_name: data.ownerName,
        phone: data.phone,
        image_url: imageUrl,
        subscription_status: 'active',
        subscription_expiry,
        gstin: data.gstin || undefined,
        website_url: data.websiteUrl || undefined,
        maps_url: data.mapsUrl || undefined,
      });

      Alert.alert(t('ad_submit.success_title'), t('ad_submit.success_msg'), [
        { text: t('common.ok'), onPress: () => router.push('/(tabs)/ads' as any) },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
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
          <Text style={styles.headerTitle}>{t('ad_submit.title')}</Text>
        </View>
      </WavyHeader>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <Text style={styles.subtitle}>{t('ad_submit.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.formCard}>
          <Text style={styles.sectionLabel}>{t('ad_submit.store_photo')} *</Text>
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={handlePickAndUploadPhoto}
            disabled={isUploadingPhoto || isSubmitting}
            activeOpacity={0.75}
          >
            {isUploadingPhoto ? (
              <ActivityIndicator size="large" color={ThemeColors.brandLight} />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="add-a-photo" size={36} color={ThemeColors.brandMid} />
                <Text style={styles.photoHint}>{t('ad_submit.tap_to_upload')}</Text>
              </View>
            )}
          </TouchableOpacity>

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
              </View>
            )}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.footer}>
          <TouchableOpacity 
            style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || isUploadingPhoto}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{t('ad_submit.pay_go_live')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>{t('common.go_back')}</Text>
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
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: '#FFF',
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: ThemeColors.textSecondary,
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
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: ThemeColors.brandDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: ThemeColors.textMuted,
    marginTop: -8,
    marginBottom: 16,
  },
  photoPicker: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ThemeColors.brandLight,
    marginBottom: 32,
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
  inputWrapper: {
    marginBottom: 20,
  },
  errorText: {
    fontFamily: Fonts.bold,
    color: ThemeColors.creditRed,
    fontSize: 11,
    marginTop: 6,
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
