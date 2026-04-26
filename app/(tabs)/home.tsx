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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { width } = Dimensions.get('window');

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().length(10, 'Phone must be exactly 10 digits').regex(/^\d+$/, 'Must contain only digits'),
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
  
  // Deletion State
  const [isDeletingMode, setIsDeletingMode] = useState(false);
  const [dustbinLayout, setDustbinLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [shatteringCard, setShatteringCard] = useState<{ layout: { x: number, y: number, width: number, height: number }, color: string } | null>(null);
  const lastActiveLayout = useRef<{ x: number, y: number, width: number, height: number } | null>(null);

  const customerSchema = useMemo(() => z.object({
    name: z.string().min(1, t('home.error_name_required')),
    phone: z.string().length(10, t('home.error_phone_length')).regex(/^\d+$/, t('home.error_phone_digits')),
  }), [t]);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* FLOATING DUSTBIN (RIGHT SIDE OF ACTIVE CARD) */}
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
            backgroundColor: 'rgba(255, 0, 0, 0.1)',
            zIndex: 9999,
          }}
        >
          <MaterialIcons name="delete-sweep" size={32} color={Colors.danger} />
        </View>
      )}
      
      {/* SECTION 1 — HEADER BAR */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>
          )}
          <Text style={styles.headerTitle}>{t('common.app_name')}</Text>
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => searchInputRef.current?.focus()}>
          <MaterialIcons name="search" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SECTION 2 — GREETING */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{t('home.greeting')} {userName} 🙏</Text>
          <Text style={styles.taglineText}>{t('home.tagline')}</Text>
        </View>

        {/* SECTION 3 — SUMMARY GRID */}
        <View style={styles.summaryGrid}>
          <View style={[styles.card, styles.cardOutstanding]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>{t('home.total_outstanding')}</Text>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(198,40,40,0.1)' }]}>
                <MaterialIcons name="account-balance-wallet" size={20} color={Colors.danger} />
              </View>
            </View>
            <Text style={[styles.amountText, { color: summary.total > 0 ? Colors.danger : Colors.success }]}>
              {formatCurrency(summary.total)}
            </Text>
            <Text style={styles.cardSubtitle}>
              {hasBusiness 
                ? `${t('home.across')} ${summary.count} ${t('home.active_customers')}` 
                : `${t('home.across')} ${summary.count} ${t('home.linked_khatas')}`}
            </Text>
          </View>

          <View style={[styles.card, styles.cardCollected]}>
            <View style={styles.headerRow}>
              <Text style={styles.cardLabel}>{hasBusiness ? t('home.active_customers') : t('home.linked_shops')}</Text>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(45,106,79,0.1)' }]}>
                <MaterialIcons name={hasBusiness ? "people" : "store"} size={20} color={Colors.success} />
              </View>
            </View>
            <Text style={[styles.amountText, { color: Colors.success }]}>{summary.count}</Text>
            <Text style={styles.cardSubtitle}>{t('home.active_records_msg')}</Text>
          </View>
        </View>

        {/* OWNER BUSINESS CUSTOMERS SECTION */}
        {hasBusiness && (
          <View style={styles.businessSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.business_customers')}</Text>
            </View>

            {/* SEARCH BAR */}
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder={t('home.search_placeholder')}
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* FILTER CHIPS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              {getFilters(t).map((filter) => {
                const isActive = activeFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setActiveFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      isActive ? styles.filterChipActive : styles.filterChipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* CUSTOMER CARDS LIST */}
            <View style={styles.customerList}>
              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyActivityState}>
                  <MaterialIcons name="people-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyActivityTitle}>{t(`No customers found`)}</Text>
                  <Text style={styles.emptyActivitySubtitle}>{t(`Add your first customer to get started`)}</Text>
                </View>
              ) : (
                filteredCustomers.map((customer) => (
                  <DraggableDeletionWrapper
                    key={customer.id}
                    dustbinLayout={dustbinLayout}
                    onActivate={(layout) => {
                      setIsDeletingMode(true);
                      lastActiveLayout.current = layout;
                      setDustbinLayout({
                        x: width - 80,
                        y: layout.y, // Match the exact absolute Y of the card
                        width: 60,
                        height: 60
                      });
                    }}
                    onDeactivate={() => setIsDeletingMode(false)}
                    onDelete={() => handleConfirmDelete(customer.id)}
                  >
                    <TouchableOpacity
                      style={styles.customerCard}
                      onPress={() => router.push(`/(tabs)/business/customers/${customer.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardLeft}>
                        <View style={[styles.customerAvatar, { backgroundColor: customer.avatarBg }]}>
                          <Text style={[styles.customerAvatarText, { color: customer.avatarText }]}>
                            {customer.initials}
                          </Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={styles.customerName}>{customer.name}</Text>
                          {customer.linkCode && (
                            <Text style={styles.linkCodeText}>Link code: {customer.linkCode}</Text>
                          )}
                          <View style={styles.cardPhoneRow}>
                            <MaterialIcons name="call" size={14} color={Colors.textSecondary} />
                            <Text style={styles.customerPhone}>{customer.phone}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardRight}>
                        <Text
                          style={[
                            styles.balanceText,
                            { color: customer.balance > 0 ? Colors.danger : Colors.success },
                          ]}
                        >
                          ₹ {customer.balance.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.activityText}>{customer.lastActivity}</Text>
                      </View>
                    </TouchableOpacity>
                  </DraggableDeletionWrapper>
                ))
              )}
            </View>
          </View>
        )}

        {/* CUSTOMER VIEW (NON-OWNER) */}
        {!hasBusiness && (
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t(`Your Khatas`)}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/khata' as any)}>
                <Text style={styles.viewAllText}>{t(`View All`)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emptyActivityState}>
              <MaterialIcons name="store" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyActivityTitle}>{t(`Check your khatas`)}</Text>
              <Text style={styles.emptyActivitySubtitle}>{t(`Go to Khata tab to see linked shops`)}</Text>
              <TouchableOpacity 
                style={[styles.secondaryButton, { marginTop: 16 }]} 
                onPress={() => router.push('/(tabs)/khata' as any)}
              >
                <Text style={styles.secondaryButtonText}>{t(`Go to Khata Tab`)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB - ADD CUSTOMER */}
      {hasBusiness && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddCustomer}
          activeOpacity={0.9}
        >
          <MaterialIcons name="person-add" size={26} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* ADD CUSTOMER MODAL */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t(`Add Customer`)}</Text>

            <Text style={styles.label}>{t(`Customer Name`)}</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder={t(`Enter customer name`)}
                  placeholderTextColor={Colors.textMuted}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

            <Text style={styles.label}>{t(`Customer Phone`)}</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  placeholder={t(`Enter 10 digit phone number`)}
                  placeholderTextColor={Colors.textMuted}
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
                <Text style={[styles.modalButtonText, { color: Colors.primary }]}>{t(`Cancel`)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.buttonPrimary]} 
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                   <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: Colors.white }]}>{t(`Save`)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CUSTOMER ADDED SUCCESS MODAL */}
      <Modal
        visible={isSuccessModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModalContent]}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={64} color={Colors.success} />
            </View>
            
            <Text style={styles.successTitle}>{t(`Customer added!`)}</Text>
            <Text style={styles.successMessage}>
              {t(`Share this code with them:`)}
            </Text>
            
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
                {t(`Share Code`)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.buttonOutline, { width: '100%', marginTop: 12 }]} 
              onPress={() => setIsSuccessModalVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: Colors.primary }]}>{t(`OK`)}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
};

// Success Modal Component (Internal to home.tsx for simplicity or as state in HomeScreen)
// I will implement it inside the return of HomeScreen for direct access to state.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    height: 64,
    paddingHorizontal: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primaryPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.heavy,
    color: Colors.primary,
    marginLeft: Spacing.md,
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
  greetingText: {
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
  headerRow: {
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
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

export default HomeScreen;
