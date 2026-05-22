import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
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
import { useTranslation } from "../../hooks/useTranslation";
import Animated, { FadeInDown, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { WavyHeader } from '../../components/ui/WavyHeader';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

const linkSchema = z.object({
  code: z.string().length(6, 'Must be exactly 6 digits').regex(/^\d+$/, 'Must contain only digits'),
});
type LinkFormValues = z.infer<typeof linkSchema>;

export default function KhataScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [linkedKhatas, setLinkedKhatas] = useState<any[]>([]);
  const [isFetchingLinked, setIsFetchingLinked] = useState(false);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLinkedKhatas();
    setRefreshing(false);
  };
  
  // Deletion/Unlinking State
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [dustbinLayout, setDustbinLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [shatteringCard, setShatteringCard] = useState<{ layout: { x: number, y: number, width: number, height: number }, color: string } | null>(null);
  const lastActiveLayout = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

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
      color: ThemeColors.creditRed 
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
      <StatusBar barStyle="light-content" backgroundColor={ThemeColors.brandDark} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* SHATTERING ANIMATION OVERLAY */}
      {shatteringCard && (
        <ParticleEffect 
          layout={shatteringCard.layout}
          color={shatteringCard.color}
          onComplete={() => setShatteringCard(null)}
        />
      )}

      {/* FLOATING DUSTBIN */}
      {isDeletingMode && dustbinLayout && (
        <View 
          style={{
            position: 'absolute',
            left: dustbinLayout.x,
            top: dustbinLayout.y,
            width: dustbinLayout.width,
            height: dustbinLayout.height,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 30,
            backgroundColor: 'rgba(173, 40, 40, 0.15)',
            zIndex: 9999,
          }}
        >
          <MaterialIcons name="delete-sweep" size={32} color={ThemeColors.creditRed} />
        </View>
      )}

      <FlatList
        data={linkedKhatas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ThemeColors.brandDark]} />
        }
        ListHeaderComponent={
          <>
        {/* 1. WAVY HEADER */}
        <WavyHeader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: Fonts.extrabold, fontSize: 18, color: ThemeColors.textOnDark }}>
                {t(`My Khatas`)}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 10.5, color: ThemeColors.textMuted, marginTop: 2 }}>
                {linkedKhatas.length} {t(`linked shops`)}
              </Text>
            </View>
            <TouchableOpacity 
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ThemeColors.brandLight, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setIsLinkModalVisible(true)}
            >
              <MaterialIcons name="add-link" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </WavyHeader>

        <View style={styles.content}>
          {/* 2. HERO SECTION */}
          <Animated.View entering={FadeInDown.delay(120).duration(380).springify()} style={styles.heroSection}>
            <Text style={{ fontFamily: Fonts.extrabold, fontSize: 24, color: ThemeColors.textPrimary }}>
              {t(`Your Linked Shops`)}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: ThemeColors.textSecondary, marginTop: 8, lineHeight: 20 }}>
              {t(`Manage your credit and payments across all local shops.`)}
            </Text>
          </Animated.View>

          </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.content}>
            <View style={styles.listContainer}>
              {isFetchingLinked ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color={ThemeColors.brandLight} />
                  <Text style={{ fontFamily: Fonts.semibold, fontSize: 14, color: ThemeColors.textSecondary, marginTop: 16 }}>
                    {t(`Fetching your records...`)}
                  </Text>
                </View>
              ) : (
                <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <MaterialIcons name="storefront" size={64} color={ThemeColors.creamBorder} />
                  </View>
                  <Text style={{ fontFamily: Fonts.extrabold, fontSize: 18, color: ThemeColors.textPrimary }}>
                    {t(`No Linked Khatas`)}
                  </Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: ThemeColors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>
                    {t(`Link a shop using their 6-digit code to see your balance and history.`)}
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setIsLinkModalVisible(true)}
                  >
                    <Text style={{ fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' }}>{t(`Link a Khata Now`)}</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>
        }
        renderItem={({ item: khata, index }) => {
          const balanceColor = khata.balance > 0 ? ThemeColors.creditRed : ThemeColors.paymentGreen;
          
          return (
            <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
              <Animated.View 
                key={khata.id}
                    entering={FadeInRight.delay(200 + index * 50).springify()}
                    layout={Layout.springify()}
                  >
                    <DraggableDeletionWrapper
                      dustbinLayout={dustbinLayout}
                      onActivate={(layout) => {
                        setIsDeletingMode(true);
                        lastActiveLayout.current = layout;
                        setDustbinLayout({
                          x: width - 80,
                          y: layout.y,
                          width: 60,
                          height: 60
                        });
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
                            <Image source={{ uri: khata.storePhotoUrl }} style={{ width: 50, height: 50, borderRadius: 12, resizeMode: 'cover' }} />
                          ) : (
                            <View style={[styles.cardAvatar, { backgroundColor: ThemeColors.creamBase }]}>
                              <MaterialIcons name="storefront" size={24} color={ThemeColors.brandMid} />
                            </View>
                          )}
                          <View style={styles.cardInfo}>
                            <Text style={{ fontFamily: Fonts.bold, fontSize: 15, color: ThemeColors.textPrimary }}>
                              {khata.businessName}
                            </Text>
                            <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: ThemeColors.textSecondary, marginTop: 2 }}>
                              {t(`Shop Ledger`)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cardRight}>
                          <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: balanceColor }}>
                            ₹{khata.balance.toLocaleString('en-IN')}
                          </Text>
                          <View style={styles.viewBadge}>
                            <Text style={{ fontFamily: Fonts.bold, fontSize: 10, color: ThemeColors.brandLight }}>{t(`View Details`)}</Text>
                            <MaterialIcons name="chevron-right" size={14} color={ThemeColors.brandLight} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </DraggableDeletionWrapper>
              </View>
          );
        }}
      />

      {/* 4. LINK KHATA MODAL */}
      <Modal
        visible={isLinkModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsLinkModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsLinkModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{ width: '100%' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={e => e.stopPropagation()} 
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={{ fontFamily: Fonts.extrabold, fontSize: 22, color: ThemeColors.brandDark }}>
                  {t(`Link a Khata`)}
                </Text>
                <TouchableOpacity onPress={() => setIsLinkModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={ThemeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: ThemeColors.textSecondary, lineHeight: 20, marginBottom: 24 }}>
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
                    placeholderTextColor={ThemeColors.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    autoFocus
                  />
                )}
              />
              {linkErrors.code && <Text style={styles.errorText}>{linkErrors.code.message}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalSubmitButton} 
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
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' }}>{t(`Link Shop`)}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  content: {
    padding: 24,
  },
  heroSection: {
    marginBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  card: {
    backgroundColor: ThemeColors.creamCard,
    borderRadius: Radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
    elevation: 2,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    justifyContent: 'center',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,136,58,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: ThemeColors.brandDark,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: Radius.pill,
    marginTop: 32,
    elevation: 4,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 8, 3, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    color: ThemeColors.brandMid,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: ThemeColors.creamBase,
    borderRadius: Radius.md,
    paddingHorizontal: 20,
    height: 60,
    fontFamily: Fonts.display,
    fontSize: 24,
    color: ThemeColors.textPrimary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: ThemeColors.creamBorder,
  },
  inputError: {
    borderColor: ThemeColors.creditRed,
  },
  errorText: {
    fontFamily: Fonts.bold,
    color: ThemeColors.creditRed,
    fontSize: 11,
    marginBottom: 16,
    marginLeft: 4,
  },
  modalActions: {
    marginTop: 24,
  },
  modalSubmitButton: {
    backgroundColor: ThemeColors.brandDark,
    height: 60,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: ThemeColors.brandDark,
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
});
