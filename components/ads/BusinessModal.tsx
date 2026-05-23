import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '../../hooks/useTranslation';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import type { Ad } from '../../types';

interface BusinessModalProps {
  ad: Ad | null;
  onClose: () => void;
}

export function BusinessModal({ ad, onClose }: BusinessModalProps) {
  const { t } = useTranslation();
  if (!ad) return null;

  const rows: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; onPress?: () => void }[] = [];

  if (ad.phone) {
    rows.push({
      icon: 'chat',
      label: t('ads.whatsapp'),
      value: ad.phone,
      onPress: () => Linking.openURL(`https://wa.me/91${ad.phone}`),
    });
  }
  if (ad.website_url) {
    rows.push({
      icon: 'language',
      label: t('ads.website'),
      value: ad.website_url,
      onPress: () => Linking.openURL(ad.website_url!),
    });
  }
  if (ad.maps_url) {
    rows.push({
      icon: 'location-on',
      label: t('ads.location'),
      value: t('ads.view_on_maps'),
      onPress: () => Linking.openURL(ad.maps_url!),
    });
  }
  if (ad.gstin) {
    rows.push({
      icon: 'receipt',
      label: t('ads.gstin'),
      value: ad.gstin,
    });
  }

  return (
    <Modal
      visible={!!ad}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View entering={FadeInUp} style={styles.modalSheet}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Close button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose} hitSlop={12}>
            <MaterialIcons name="close" size={20} color={ThemeColors.textSecondary} />
          </TouchableOpacity>

          {/* Store image */}
          {ad.image_url ? (
            <Image
              source={ad.image_url}
              cachePolicy="disk"
              transition={200}
              style={styles.modalImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.modalImage, styles.modalImagePlaceholder]}>
              <MaterialIcons name="storefront" size={48} color={ThemeColors.brandMid} />
            </View>
          )}

          {/* Business info */}
          <View style={styles.modalBody}>
            <Text style={{ fontFamily: Fonts.extrabold, fontSize: 24, color: ThemeColors.textPrimary }} numberOfLines={2}>
              {ad.business_name}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: ThemeColors.textSecondary, marginTop: 4, marginBottom: 24 }}>
              {ad.owner_name}
            </Text>

            {rows.length > 0 && (
              <View style={styles.rowList}>
                {rows.map((row, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.rowDivider} />}
                    <TouchableOpacity
                      style={styles.infoRow}
                      onPress={row.onPress}
                      disabled={!row.onPress}
                      activeOpacity={row.onPress ? 0.65 : 1}
                    >
                      <View style={[styles.rowIconBox, row.onPress && styles.rowIconBoxActive]}>
                        <MaterialIcons
                          name={row.icon}
                          size={18}
                          color={row.onPress ? ThemeColors.brandLight : ThemeColors.textSecondary}
                        />
                      </View>
                      <View style={styles.rowTextBox}>
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text
                          style={[styles.rowValue, row.onPress && styles.rowValueLink]}
                          numberOfLines={1}
                        >
                          {row.value}
                        </Text>
                      </View>
                      {row.onPress && (
                        <MaterialIcons name="chevron-right" size={16} color={ThemeColors.creamBorder} />
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 8, 3, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: ThemeColors.creamBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalImage: {
    width: '100%',
    height: 240,
  },
  modalImagePlaceholder: {
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
  },
  modalBody: {
    padding: 32,
  },
  rowList: {
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: ThemeColors.creamCard,
  },
  rowDivider: {
    height: 1,
    backgroundColor: ThemeColors.creamBorder,
    marginLeft: 56,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ThemeColors.creamBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconBoxActive: {
    backgroundColor: 'rgba(201,136,58,0.1)',
  },
  rowTextBox: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: ThemeColors.textPrimary,
    marginTop: 1,
  },
  rowValueLink: {
    color: ThemeColors.brandLight,
    fontFamily: Fonts.bold,
  },
});
