import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from "../hooks/useTranslation";

const COLORS = {
  primary: '#1f108e',
  surface: '#ffffff',
  background: '#f8f9fa',
  textPrimary: '#191c1d',
  textSecondary: '#464553',
  outline: '#777584',
  divider: '#e7e8e9',
};

export default function TermsOfServiceScreen() {
    const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('Terms of Service')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: April 2025</Text>

        <Text style={styles.intro}>
          Welcome to Any Khata. By using our application, you agree to the following Terms of
          Service. Please read them carefully before using the app.</Text>

        {/* 1. App Purpose */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. App Purpose</Text>
          <Text style={styles.body}>
            Any Khata is a digital ledger application designed to help small business owners in
            India manage credit and payment records with their customers. The app allows businesses
            to record transactions, track outstanding balances, and share account summaries via
            WhatsApp.</Text>
          <Text style={styles.body}>
            Any Khata is not a banking or financial institution. It does not hold, transfer, or
            process funds on your behalf. All financial transactions occur outside the app.</Text>
        </View>

        {/* 2. User Responsibilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. User Responsibilities</Text>
          <Text style={styles.body}>By using Any Khata, you agree to:</Text>
          <Text style={styles.bullet}>• Provide accurate and truthful information when registering your account and business.</Text>
          <Text style={styles.bullet}>• Keep your login credentials confidential and not share them with others.</Text>
          <Text style={styles.bullet}>• Use the app only for lawful purposes and in compliance with applicable Indian laws.</Text>
          <Text style={styles.bullet}>• Not use the app to record fraudulent, misleading, or illegal transactions.</Text>
          <Text style={styles.bullet}>• Obtain consent from your customers before recording their personal information.</Text>
          <Text style={styles.bullet}>• Not attempt to reverse-engineer, hack, or disrupt the app or its servers.</Text>
          <Text style={styles.body}>
            You are solely responsible for the accuracy of the data you enter. Any Khata is not
            liable for disputes arising from incorrect records.</Text>
        </View>

        {/* 3. Data Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Usage</Text>
          <Text style={styles.body}>
            We collect and store data necessary to provide the service, including your name, email
            address, phone number, business details, and transaction records. This data is stored
            securely on Appwrite cloud infrastructure.</Text>
          <Text style={styles.body}>
            We do not sell your personal data to third parties. Data may be used to improve the
            app, send service-related notifications, and comply with legal obligations. Please refer
            to our Privacy Policy for full details.</Text>
        </View>

        {/* 4. Payment Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Payment Terms</Text>
          <Text style={styles.body}>
            Any Khata offers a Business Owner subscription at ₹11 per month (inclusive of
            applicable taxes). This subscription grants access to business management features
            including customer tracking, ledger management, and WhatsApp sharing.</Text>
          <Text style={styles.body}>
            Payments are processed through Cashfree Payments, a licensed payment aggregator in
            India. By subscribing, you authorise the charge of ₹11 to your selected payment method.</Text>
          <Text style={styles.body}>
            Subscriptions are non-refundable once activated. Any Khata reserves the right to
            change subscription pricing with 30 days' prior notice to registered users.</Text>
          <Text style={styles.body}>
            Failure to maintain an active subscription may result in restricted access to business
            features. Your data will be retained for 90 days after subscription expiry.</Text>
        </View>

        {/* 5. Account Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Account Termination</Text>
          <Text style={styles.body}>
            You may delete your account at any time by contacting us at support@anykhata.in. Upon
            deletion, your personal data will be permanently removed within 30 days, except where
            retention is required by law.</Text>
          <Text style={styles.body}>
            Any Khata reserves the right to suspend or terminate your account without notice if
            you violate these Terms of Service, engage in fraudulent activity, or misuse the
            platform in any way that harms other users or the service.</Text>
        </View>

        {/* 6. Intellectual Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.body}>
            All content, design, code, and branding within Any Khata are the intellectual property
            of Any Khata and its developers. You may not copy, reproduce, or distribute any part
            of the app without prior written permission.</Text>
        </View>

        {/* 7. Limitation of Liability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.body}>
            Any Khata is provided "as is" without warranties of any kind. We are not liable for
            any loss of data, financial loss, or damages arising from your use of the app,
            including but not limited to errors in transaction records, service downtime, or
            unauthorised access to your account.</Text>
        </View>

        {/* 8. Governing Law */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Governing Law</Text>
          <Text style={styles.body}>
            These Terms of Service are governed by and construed in accordance with the laws of
            India. Any disputes arising from the use of Any Khata shall be subject to the
            exclusive jurisdiction of the courts located in India.</Text>
          <Text style={styles.body}>
            This agreement is subject to the Information Technology Act, 2000, the Consumer
            Protection Act, 2019, and other applicable Indian legislation.</Text>
        </View>

        {/* 9. Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Changes to These Terms</Text>
          <Text style={styles.body}>
            We may update these Terms of Service from time to time. Continued use of the app after
            changes are posted constitutes your acceptance of the revised terms. We will notify
            registered users of significant changes via the app or email.</Text>
        </View>

        {/* Contact */}
        <View style={[styles.section, styles.contactBox]}>
          <Text style={styles.contactTitle}>{t(`Contact Us`)}</Text>
          <Text style={styles.body}>
            For questions about these Terms of Service, please contact us at:</Text>
          <Text style={styles.contactEmail}>support@anykhata.in</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.outline,
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  contactBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
});
