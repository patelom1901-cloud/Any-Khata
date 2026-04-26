import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../store/authStore';
import { getMyLinkedKhatas, linkKhataByCode, unlinkKhata } from '../../lib/database';
import { DraggableDeletionWrapper } from '../../components/DraggableDeletionWrapper';
import { ParticleEffect } from '../../components/ParticleEffect';
import { Dimensions } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";

const linkSchema = z.object({
  code: z.string().length(6, 'Must be exactly 6 digits').regex(/^\d+$/, 'Must contain only digits'),
});
type LinkFormValues = z.infer<typeof linkSchema>;

const COLORS = {
  primary:       Colors.primary,
  primaryFixed:  Colors.primaryPale,
  error:         Colors.danger,
  secondary:     Colors.success,
  background:    Colors.background,
  surface:       Colors.surface,
  textPrimary:   Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  outline:       Colors.textMuted,
  outlineLight:  Colors.border,
  containerLow:  Colors.background,
};

export default function KhataScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [linkedKhatas, setLinkedKhatas] = useState<any[]>([]);
  const [isFetchingLinked, setIsFetchingLinked] = useState(false);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  
  // Deletion/Unlinking State
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [dustbinLayout, setDustbinLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [shatteringCard, setShatteringCard] = useState<{ layout: { x: number, y: number, width: number, height: number }, color: string } | null>(null);
  const lastActiveLayout = React.useRef<{ x: number, y: number, width: number, height: number } | null>(null);
  const { width } = Dimensions.get('window');

  const { control: linkControl, handleSubmit: handleLinkSubmit, reset: resetLink, formState: { errors: linkErrors } } = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { code: '' }
  });

  const fetchLinkedKhatas = useCallback(async () => {
    if (!user) return;
    setIsFetchingLinked(true);
    try {
      const userId = user.userId || (user as any).$id;
      const khatas = await getMyLinkedKhatas(userId);
      setLinkedKhatas(khatas);
    } catch (err) {
      console.error("Error fetching linked khatas:", err);
    } finally {
      setIsFetchingLinked(false);
    }
  }, [user]);

  const handleConfirmUnlink = async (customerId: string) => {
    if (!lastActiveLayout.current) return;
    
    setShatteringCard({ 
      layout: lastActiveLayout.current, 
      color: COLORS.error 
    });
    setIsDeletingMode(false);
    
    try {
      await unlinkKhata(customerId);
      await fetchLinkedKhatas();
    } catch (err) {
      Alert.alert(t('Error'), t('Failed to unlink shop'));
    }
  };

  useEffect(() => {
    fetchLinkedKhatas();
  }, [fetchLinkedKhatas]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* CUSTOM HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialIcons name="person" size={20} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.headerTitle}>{t(`My Khatas`)}</Text>
        </View>

        {isDeletingMode ? (
          <View 
            style={styles.dustbinContainer}
            onLayout={(e) => {
              setDustbinLayout({
                x: width - 70,
                y: 10,
                width: 60,
                height: 60
              });
            }}
          >
            <MaterialIcons name="delete-sweep" size={32} color={COLORS.error} />
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => setIsLinkModalVisible(true)}
          >
            <MaterialIcons name="add-link" size={24} color={COLORS.primary} />
            <Text style={styles.linkButtonText}>{t(`Link`)}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>{t(`Your Linked Shops`)}</Text>
            <Text style={styles.heroSubtitle}>{t(`Manage your credit and payments across all local shops`)}</Text>
          </View>

          <View style={styles.listContainer}>
            {isFetchingLinked ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>{t(`Fetching your records...`)}</Text>
              </View>
            ) : linkedKhatas.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <MaterialIcons name="storefront" size={64} color={COLORS.outlineLight} />
                </View>
                <Text style={styles.emptyStateTitle}>{t(`No Linked Khatas`)}</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {t(`Link a shop using their 6-digit code to see your balance and history.`)}
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setIsLinkModalVisible(true)}
                >
                  <Text style={styles.primaryButtonText}>{t(`Link a Khata Now`)}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              linkedKhatas.map(khata => (
                <DraggableDeletionWrapper
                  key={khata.id}
                  dustbinLayout={dustbinLayout}
                  onActivate={(layout) => {
                    setIsDeletingMode(true);
                    lastActiveLayout.current = layout;
                  }}
                  onDeactivate={() => setIsDeletingMode(false)}
                  onDelete={() => handleConfirmUnlink(khata.id)}
                >
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push(`/customer/${khata.id}` as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cardLeft}>
                      {khata.storePhotoUrl ? (
                        <Image source={{ uri: khata.storePhotoUrl }} style={{ width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' }} />
                      ) : (
                        <View style={[styles.cardAvatar, { backgroundColor: COLORS.primaryFixed }]}>
                          <MaterialIcons name="storefront" size={28} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{khata.businessName}</Text>
                        <Text style={styles.cardLastUpdate}>{t(`Shop Ledger`)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <Text
                        style={[
                          styles.balanceText,
                          { color: khata.balance > 0 ? COLORS.error : COLORS.secondary },
                        ]}
                      >
                        ₹ {khata.balance.toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.viewBadge}>
                        <Text style={styles.viewBadgeText}>{t(`View Details`)}</Text>
                        <MaterialIcons name="chevron-right" size={16} color={COLORS.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </DraggableDeletionWrapper>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* LINK KHATA MODAL */}
      <Modal
        visible={isLinkModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLinkModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(`Link a Khata`)}</Text>
              <TouchableOpacity onPress={() => setIsLinkModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.modalDescription}>
                {t(`Enter the 6-digit shop code provided by the business owner to sync your ledger.`)}
              </Text>

              <Text style={styles.label}>{t(`Shop Code`)}</Text>
              <Controller
                control={linkControl}
                name="code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, linkErrors.code && styles.inputError]}
                    placeholder={t(`e.g. 123456`)}
                    placeholderTextColor={COLORS.outline}
                    keyboardType="numeric"
                    maxLength={6}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    returnKeyType="done"
                    onSubmitEditing={handleLinkSubmit(async (data) => {
                      if (!user) return;
                      const userId = user.userId || (user as any).$id;
                      setIsLinking(true);
                      try {
                        const result = await linkKhataByCode(userId, data.code);
                        if (result.success) {
                          Alert.alert(t(`Success`), result.message);
                          setIsLinkModalVisible(false);
                          resetLink();
                          await fetchLinkedKhatas();
                        } else {
                          Alert.alert(t(`Error`), result.message);
                        }
                      } catch (err: any) {
                        Alert.alert(t(`Error`), err.message || t(`Something went wrong.`));
                      } finally {
                        setIsLinking(false);
                      }
                    })}
                  />
                )}
              />
              {linkErrors.code && <Text style={styles.errorText}>{linkErrors.code.message}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonPrimary]} 
                  onPress={handleLinkSubmit(async (data) => {
                    if (!user) return;
                    const userId = user.userId || (user as any).$id;
                    setIsLinking(true);
                    try {
                      const result = await linkKhataByCode(userId, data.code);
                      if (result.success) {
                        Alert.alert(t(`Success`), result.message);
                        setIsLinkModalVisible(false);
                        resetLink();
                        await fetchLinkedKhatas();
                      } else {
                        Alert.alert(t(`Error`), result.message);
                      }
                    } catch (err: any) {
                      Alert.alert(t(`Error`), err.message || t(`Something went wrong.`));
                    } finally {
                      setIsLinking(false);
                    }
                  })}
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t(`Link Shop`)}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* SHATTERING ANIMATION OVERLAY */}
      {shatteringCard && (
        <ParticleEffect 
          layout={shatteringCard.layout}
          color={shatteringCard.color}
          onComplete={() => setShatteringCard(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    height: 64,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  dustbinContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  linkButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 22,
  },
  listContainer: {
    gap: 16,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardLastUpdate: {
    fontSize: 13,
    color: COLORS.outline,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '800',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  viewBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.containerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.containerLow,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineLight,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 24,
  },
  button: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
});
