import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { getBusinessByOwner, getCustomersByBusiness, getMyLinkedKhatas, createCustomer, deleteCustomer } from '../../lib/database';
import { DraggableDeletionWrapper } from '../../components/DraggableDeletionWrapper';
import { ParticleEffect } from '../../components/ParticleEffect';
import { formatCurrency } from '../../utils/currencyUtils';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/colors';
import { useTranslation } from "../../hooks/useTranslation";
import { z } from 'zod';
import { useAds } from '../../hooks/useAds';
import AdCarousel from '../../components/ads/AdCarousel';
import { BusinessModal } from '../../components/ads/BusinessModal';
import type { Ad } from '../../types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown, FadeInRight, FadeInUp, withTiming, withSpring, useSharedValue, useAnimatedStyle, Layout } from 'react-native-reanimated';
import { WavyHeader } from '../../components/ui/WavyHeader';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { CardWrapper } from '../../components/ui/CardWrapper';
import { Colors as ThemeColors, Fonts, Radius } from '../../constants/theme';

const { width } = Dimensions.get('window');


const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().length(10, 'Phone must be 10 digits').regex(/^\d+$/, 'Invalid phone number'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

// Filter options
const getFilters = (t: any) => [
  { key: 'all',     label: t('home.filter.all') },
  { key: 'pending', label: t('home.filter.pending') },
  { key: 'name',    label: t('home.filter.name') },
  { key: 'recent',  label: t('home.filter.recent') },
];

const HomeScreen = () => {
  const { t } = useTranslation();
  const { user, hasBusiness } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  
  // Business Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const searchInputRef = useRef<TextInput>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [lastAddedLinkCode, setLastAddedLinkCode] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const { ads, isLoading: adsLoading } = useAds();
  
  // Deletion State
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [dustbinLayout, setDustbinLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [shatteringCard, setShatteringCard] = useState<{ layout: { x: number, y: number, width: number, height: number }, color: string } | null>(null);
  const lastActiveLayout = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

  // Localized schema for form validation
  const localizedCustomerSchema = useMemo(() => z.object({
    name: z.string().min(1, t('home.error_name_required')),
    phone: z.string().length(10, t('home.error_phone_length')).regex(/^\d+$/, t('home.error_phone_digits')),
  }), [t]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(localizedCustomerSchema),
    defaultValues: { name: '', phone: '' }
  });

  const fetchHomeData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const userId = user.userId || (user as any).$id;
      if (hasBusiness) {
        // Owner Data
        const business = await getBusinessByOwner(userId);
        if (business) {
          const businessId = (business as any).$id || business.businessId;
          const customersList = await getCustomersByBusiness(businessId);
          
          const totalBalance = customersList.reduce((sum, c) => sum + (c.balance || 0), 0);
          setSummary({ count: customersList.length, total: totalBalance });

          const mappedCustomers = customersList.map((c: any, index: number) => {
            const colors = [
              { bg: Colors.primaryPale, text: Colors.primary },
              { bg: Colors.successLight, text: Colors.success },
              { bg: Colors.warningLight, text: Colors.warning },
            ];
            const style = colors[index % colors.length];
            
            return {
              id: c.$id || c.customerId || index.toString(),
              initials: c.name ? c.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().substring(0, 2) : '??',
              name: c.name || 'Unknown',
              phone: c.phone || '',
              balance: c.balance || c.totalDue || 0,
              lastActivity: 'Active', 
              avatarBg: style.bg,
              avatarText: style.text,
              isLinked: c.isLinked,
              linkCode: c.linkCode,
            };
          });
          setCustomers(mappedCustomers);
        } else {
          setSummary({ count: 0, total: 0 });
          setCustomers([]);
        }
      } else {
        // Customer Data (Linked Khatas)
        const linkedKhatas = await getMyLinkedKhatas(userId);
        const totalBalance = linkedKhatas.reduce((sum, k) => sum + (k.balance || 0), 0);
        setSummary({ count: linkedKhatas.length, total: totalBalance });
        setCustomers([]);
      }
    } catch (err: any) {
      Alert.alert(t('common.something_went_wrong'), t('common.please_try_again'));
      setError(t('home.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [user, hasBusiness, t]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const filteredCustomers = useMemo(() => {
    let result = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    switch (activeFilter) {
      case 'pending':
        result = result.filter((c) => c.balance > 0);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'recent':
        break;
      default:
        break;
    }

    return result;
  }, [customers, searchQuery, activeFilter]);

  const handleAddCustomer = () => {
    setIsAddModalVisible(true);
  };

  const onSubmit = async (data: CustomerFormValues) => {
    if (!user || (!user.userId && !(user as any).$id)) {
      Alert.alert(t('common.error'), t('home.auth_error'));
      return;
    }
    const userId = user.userId || (user as any).$id;

    setIsSubmitting(true);
    try {
      const business = await getBusinessByOwner(userId);
      if (!business) {
        throw new Error(t('home.business_not_found'));
      }

      const linkCode = Math.floor(100000 + Math.random() * 900000).toString();
      const businessId = (business as any).$id || business.businessId;

      await createCustomer({
        business_id: businessId,
        owner_id: userId,
        name: data.name,
        phone: data.phone,
        link_code: linkCode
      });

      setIsAddModalVisible(false);
      reset();
      setLastAddedLinkCode(linkCode);
      setIsSuccessModalVisible(true);
      
      await fetchHomeData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('home.add_customer_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async (customerId: string) => {
    if (!lastActiveLayout.current) return;
    
    setShatteringCard({ 
      layout: lastActiveLayout.current, 
      color: Colors.danger 
    });
    setIsDeletingMode(false);
    
    try {
      await deleteCustomer(customerId);
      await fetchHomeData();
    } catch (err) {
      Alert.alert(t('common.error'), t('home.delete_customer_failed'));
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const userName = user?.name || 'User';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 16, color: Colors.textSecondary }}>{t('home.refreshing')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <MaterialIcons name="error-outline" size={48} color={Colors.danger} />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{t('home.load_failed')}</Text>
        <Text style={{ marginTop: 8, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>{t('common.something_went_wrong')}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={fetchHomeData}>
          <Text style={styles.secondaryButtonText}>{t('common.try_again')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalGiven = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalGot = customers.reduce((sum, c) => sum + (c.balance < 0 ? Math.abs(c.balance) : 0), 0);

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

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. WAVY HEADER */}
        <WavyHeader>
          <View style={styles.headerInner}>
            <Text style={styles.greetingText}>
              {t('home.greeting')}, {userName}
            </Text>
            <TouchableOpacity 
              style={styles.searchBtnAbsolute}
              onPress={() => setSearchVisible(!searchVisible)}
            >
              <MaterialIcons name={searchVisible ? "close" : "search"} size={22} color={ThemeColors.textOnDark} />
            </TouchableOpacity>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>{t('common.app_name')}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.dateLabel}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              {searchVisible && (
                <Animated.View entering={FadeInRight} style={{ flex: 1, marginLeft: 12 }}>
                  <TextInput
                    autoFocus
                    placeholder={t('home.search_placeholder') || "Search customers..."}
                    placeholderTextColor={ThemeColors.textMuted}
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: 8, 
                      paddingHorizontal: 12, 
                      paddingVertical: 4,
                      color: '#FFF',
                      fontSize: 12,
                      fontFamily: Fonts.regular
                    }}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </Animated.View>
              )}
            </View>
          </View>
        </WavyHeader>

        {/* 2.5 BUSINESS SLIDER (Moved above card) */}
        {!adsLoading && ads.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <AdCarousel ads={ads} onAdPress={setSelectedAd} />
          </Animated.View>
        )}

        {/* 2. BALANCE CARD */}
        <Animated.View entering={FadeInDown.delay(300).duration(380).springify()}>
          <CardWrapper style={{ marginTop: 0, padding: 18, borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
            {/* Row 1: Total Outstanding (Big) */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: ThemeColors.textSecondary }}>{t('home.total_outstanding')}</Text>
              <CountUpAmount 
                value={totalGiven} 
                style={{ fontFamily: Fonts.display, fontSize: 32, color: ThemeColors.creditRed, marginTop: 4 }} 
              />
            </View>
            
            <View style={{ height: 1, backgroundColor: '#F2E6DA', marginVertical: 14 }} />

            {/* Row 2: Three Boxes (Active Customers, Given, Collected) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {/* Chip: Active Customers */}
              <View 
                style={{ flex: 1, backgroundColor: '#FAF4EE', borderRadius: 11, padding: 10, marginRight: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E4D0BC' }}
              >
                <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: ThemeColors.textPrimary }}>{summary.count}</Text>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 8.5, color: ThemeColors.textSecondary, textTransform: 'uppercase', marginTop: 2 }}>{t('home.active_customers')}</Text>
              </View>

              {/* Chip: Given */}
              <View 
                style={{ flex: 1, backgroundColor: '#FFF5F4', borderRadius: 11, padding: 10, marginRight: 8, alignItems: 'center', borderWidth: 1, borderColor: '#F8DADA' }}
              >
                <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: ThemeColors.creditRed }}>₹{totalGiven.toLocaleString('en-IN')}</Text>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 8.5, color: ThemeColors.textSecondary, textTransform: 'uppercase', marginTop: 2 }}>{t('home.given')}</Text>
              </View>

              {/* Chip: Collected */}
              <View 
                style={{ flex: 1, backgroundColor: '#F2FBF2', borderRadius: 11, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BCD8BC' }}
              >
                <Text style={{ fontFamily: Fonts.display, fontSize: 18, color: ThemeColors.paymentGreen }}>₹{totalGot.toLocaleString('en-IN')}</Text>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 8.5, color: ThemeColors.textSecondary, textTransform: 'uppercase', marginTop: 2 }}>{t('home.got')}</Text>
              </View>
            </View>
          </CardWrapper>
        </Animated.View>


        {/* 3. RECENT CUSTOMERS SECTION */}
        {hasBusiness && (
          <>
            <SectionLabel>{t('home.recent_customers') || 'Recent Customers'}</SectionLabel>
            
            {/* Filter Chips */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 }}
            >
              {getFilters(t).map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 100,
                      marginRight: 8,
                      backgroundColor: isActive ? '#2A1206' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isActive ? '#2A1206' : '#E4D0BC',
                      elevation: isActive ? 2 : 0,
                    }}
                  >
                    <Text style={{
                      fontFamily: Fonts.semibold,
                      fontSize: 11,
                      color: isActive ? '#FAF4EE' : '#9B7050',
                    }}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={{ paddingHorizontal: 14 }}>
              {filteredCustomers.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <MaterialIcons name="people-outline" size={48} color={ThemeColors.textSecondary} opacity={0.3} />
                  <Text style={{ fontFamily: Fonts.semibold, fontSize: 14, color: ThemeColors.textSecondary, marginTop: 12 }}>{t('No customers found')}</Text>
                </View>
              ) : (
                filteredCustomers.map((customer, index) => {
                  const avatarStyles = [
                    { bg: '#FDE8D0', fc: '#7D3E10' },
                    { bg: '#E8F2FD', fc: '#1A4E7A' },
                    { bg: '#E8FBF0', fc: '#1A6E3A' },
                    { bg: '#F5E8FC', fc: '#6E2888' },
                    { bg: '#FDF7E3', fc: '#8A7210' },
                  ];
                  const avatarColor = avatarStyles[index % 5];

                  return (
                    <Animated.View 
                      key={customer.id} 
                      entering={FadeInRight.delay(300 + index * 40).springify()}
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
                        onDelete={() => handleConfirmDelete(customer.id)}
                      >
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            padding: 12,
                            borderRadius: 16,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: '#EEE1D4',
                          }}
                          onPress={() => router.push(`/(tabs)/business/customers/${customer.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <View style={{ 
                            width: 42, 
                            height: 42, 
                            borderRadius: 21, 
                            backgroundColor: avatarColor.bg, 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: avatarColor.fc }}>
                              {customer.initials}
                            </Text>
                          </View>
                          
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontFamily: Fonts.bold, fontSize: 13, color: ThemeColors.textPrimary }}>
                              {customer.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontFamily: Fonts.regular, fontSize: 9, color: ThemeColors.textSecondary, marginRight: 8 }}>
                                Code: {customer.linkCode || '------'}
                              </Text>
                              <Text style={{ fontFamily: Fonts.regular, fontSize: 9, color: ThemeColors.textSecondary }}>
                                {customer.lastActivity}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: ThemeColors.creditRed }}>
                            ₹ {customer.balance.toLocaleString('en-IN')}
                          </Text>
                        </TouchableOpacity>
                      </DraggableDeletionWrapper>
                    </Animated.View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* NON-OWNER VIEW */}
        {!hasBusiness && (
          <View style={{ padding: 20 }}>
            <SectionLabel>{t('Your Khatas')}</SectionLabel>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EEE1D4' }}>
              <MaterialIcons name="store" size={48} color={ThemeColors.textSecondary} opacity={0.3} />
              <Text style={{ fontFamily: Fonts.bold, fontSize: 16, color: ThemeColors.textPrimary, marginTop: 12 }}>{t('Check your khatas')}</Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: ThemeColors.textSecondary, textAlign: 'center', marginTop: 4 }}>{t('Go to Khata tab to see linked shops')}</Text>
              <TouchableOpacity 
                style={{ marginTop: 20, backgroundColor: ThemeColors.brandDark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 }}
                onPress={() => router.push('/(tabs)/khata' as any)}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 14 }}>{t('Go to Khata Tab')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {hasBusiness && (
        <Animated.View 
          entering={FadeInUp.delay(500).duration(360).springify()}
          style={{ position: 'absolute', right: 24, bottom: 104 }}
        >
          <TouchableOpacity
            style={{ 
              width: 56, 
              height: 56, 
              borderRadius: 28, 
              backgroundColor: ThemeColors.brandLight, 
              alignItems: 'center', 
              justifyContent: 'center',
              elevation: 8,
              shadowColor: ThemeColors.brandLight,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
            onPress={handleAddCustomer}
            activeOpacity={0.9}
          >
            <MaterialIcons name="person-add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* MODALS */}
      {/* ADD CUSTOMER MODAL */}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsAddModalVisible(false)}
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
                <Text style={styles.modalTitle}>{t('Add Customer')}</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={ThemeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('Customer Name')}</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder={t('Enter customer name')}
                    placeholderTextColor={ThemeColors.textMuted}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

              <View style={{ height: 16 }} />

              <Text style={styles.label}>{t('Customer Phone')}</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    placeholder={t('Enter 10 digit phone number')}
                    placeholderTextColor={ThemeColors.textMuted}
                    keyboardType="numeric"
                    maxLength={10}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.buttonOutline]} 
                  onPress={() => {
                    setIsAddModalVisible(false);
                    reset();
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.modalButtonText, { color: ThemeColors.brandMid }]}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.buttonPrimary]} 
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                     <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#FFF' }]}>{t('Save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isSuccessModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModalContent]}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={ThemeColors.paymentGreen} />
            </View>
            
            <Text style={styles.successTitle}>{t('Customer added!')}</Text>
            <Text style={styles.successMessage}>{t('Share this code with them:')}</Text>
            
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{lastAddedLinkCode}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.modalButton, styles.buttonPrimary, styles.shareButton]} 
              onPress={() => {
                Share.share({ 
                  message: `Your Any Khata link code is: ${lastAddedLinkCode}\nUse this to link your account with my shop.` 
                });
              }}
            >
              <MaterialIcons name="share" size={20} color={Colors.white} />
              <Text style={[styles.modalButtonText, { color: Colors.white, marginLeft: 8 }]}>
                {t('Share Code')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.buttonOutline, { width: '100%', marginTop: 12 }]} 
              onPress={() => setIsSuccessModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: Colors.primary }]}>{t('OK')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* BUSINESS DETAIL MODAL */}
      <BusinessModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </SafeAreaView>
  );

};

// Success Modal Component (Internal to home.tsx for simplicity or as state in HomeScreen)
// I will implement it inside the return of HomeScreen for direct access to state.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ThemeColors.creamBase,
  },
  scrollContent: {
    paddingBottom: 94,
  },
  headerInner: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 45,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: '#FFF',
  },
  greetingText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: ThemeColors.textOnDark,
    marginBottom: 4,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnAbsolute: {
    position: 'absolute',
    right: 24,
    top: 38,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ThemeColors.brandLight,
    borderWidth: 1.5,
    borderColor: ThemeColors.brandDark,
  },
  dateLabel: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    color: ThemeColors.textMuted,
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dustbinContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  greetingSection: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
  },
  oldGreetingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  taglineText: {
    fontSize: 28,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
    marginTop: 4,
  },
  summaryGrid: {
    paddingHorizontal: Spacing['2xl'],
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    gap: Spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  cardOutstanding: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  cardCollected: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  cardHeader: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  iconContainer: {
    padding: Spacing.sm,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  amountText: {
    fontSize: 32,
    fontWeight: FontWeight.heavy,
    marginTop: Spacing.lg,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  businessSection: {
    marginTop: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.textPrimary,
  },
  searchBar: {
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  filterChips: {
    marginTop: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipText: {
    fontSize: 13,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  filterChipTextInactive: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  customerList: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  customerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowOpacity: 0.02,
    shadowRadius: 6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  cardInfo: {
    marginLeft: 0,
  },
  customerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cardPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  customerPhone: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontWeight: FontWeight.heavy,
    fontSize: FontSize.lg,
  },
  activityText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  activitySection: {
    paddingHorizontal: Spacing['2xl'],
    marginTop: Spacing['3xl'],
  },
  viewAllText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  emptyActivityState: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyActivityTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyActivitySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: Colors.primaryPale,
    borderRadius: 20,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,76,117,0.08)',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: Fonts.extrabold,
    fontSize: 22,
    color: ThemeColors.brandDark,
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
    height: 56,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: ThemeColors.textPrimary,
    marginBottom: 4,
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
    marginBottom: 12,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 32,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: ThemeColors.brandDark,
  },
  buttonPrimary: {
    backgroundColor: ThemeColors.brandDark,
  },
  modalButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  successModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    alignItems: 'center',
    paddingTop: 40,
    minHeight: 450,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: Colors.primaryPale,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 4,
  },
  shareButton: {
    width: '100%',
    flexDirection: 'row',
  },
  linkCodeText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

const CountUpAmount = ({ value, style }: { value: number, style?: any }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out expo: 1 - Math.pow(2, -10 * progress)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = Math.floor(easeProgress * end);
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <Text style={style}>
      ₹ {displayValue.toLocaleString('en-IN')}
    </Text>
  );
};

export default HomeScreen;
