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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>{t('Privacy Policy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: April 2025</Text>

        <Text style={styles.intro}>
          Any Khata ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains what information we collect, how we use it, and your rights regarding
          your data.</Text>

        {/* 1. What Data We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. What Data We Collect</Text>
          <Text style={styles.body}>We collect the following categories of information:</Text>

          <Text style={styles.subTitle}>Account Information</Text>
          <Text style={styles.bullet}>• Full name</Text>
          <Text style={styles.bullet}>• Email address</Text>
          <Text style={styles.bullet}>• Phone number</Text>
          <Text style={styles.bullet}>• Account role (business owner or customer)</Text>

          <Text style={styles.subTitle}>Business Information</Text>
          <Text style={styles.bullet}>• Business name and location</Text>
          <Text style={styles.bullet}>• Business category</Text>

          <Text style={styles.subTitle}>Transaction Records</Text>
          <Text style={styles.bullet}>• Credit and debit entries you create</Text>
          <Text style={styles.bullet}>• Payment records and outstanding balances</Text>
          <Text style={styles.bullet}>• Entry notes and timestamps</Text>

          <Text style={styles.subTitle}>Customer Records</Text>
          <Text style={styles.bullet}>• Names and phone numbers of customers you add</Text>
          <Text style={styles.bullet}>• Link codes used to connect customer accounts</Text>

          <Text style={styles.subTitle}>Usage Data</Text>
          <Text style={styles.bullet}>• App usage patterns (for improving the service)</Text>
          <Text style={styles.bullet}>• Device type and operating system</Text>
        </View>

        {/* 2. How It's Stored */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How Your Data Is Stored</Text>
          <Text style={styles.body}>
            All data is stored securely on Appwrite, a cloud infrastructure provider. Appwrite
            uses industry-standard encryption (TLS in transit, AES-256 at rest) to protect your
            information.</Text>
          <Text style={styles.body}>
            Our servers are hosted in secure data centres. We implement access controls, regular
            security audits, and monitoring to prevent unauthorised access.</Text>
          <Text style={styles.body}>
            Transaction records and account data are retained for as long as your account is
            active. If you delete your account, data is permanently removed within 30 days, except
            where retention is required by applicable law.</Text>
        </View>

        {/* 3. Who Can Access Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Who Can Access Your Data</Text>
          <Text style={styles.body}>
            Your data is private by default. Here is who can access what:</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>You</Text> — full access to your own account, transactions, and records.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Business owners</Text> — can view transaction records for customers linked to their business.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Customers</Text> — can view their own balance and transaction history with a specific business.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Any Khata team</Text> — limited access for technical support and maintenance only.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Third parties</Text> — we do not sell or share your data with advertisers or data brokers.</Text>
          <Text style={styles.body}>
            We may disclose data to law enforcement or government authorities if required by Indian
            law or a valid court order.</Text>
        </View>

        {/* 4. How We Use Your Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. How We Use Your Data</Text>
          <Text style={styles.body}>We use your data to:</Text>
          <Text style={styles.bullet}>• Provide and maintain the Any Khata service</Text>
          <Text style={styles.bullet}>• Process subscription payments via Cashfree</Text>
          <Text style={styles.bullet}>• Send important service notifications and updates</Text>
          <Text style={styles.bullet}>• Respond to support requests</Text>
          <Text style={styles.bullet}>• Improve app features and user experience</Text>
          <Text style={styles.bullet}>• Comply with legal obligations under Indian law</Text>
        </View>

        {/* 5. Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.body}>
            Under the Digital Personal Data Protection Act, 2023 (India) and applicable privacy
            laws, you have the following rights:</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Right to Access</Text> — request a copy of the personal data we hold about you.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Right to Correction</Text> — request correction of inaccurate or incomplete data.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Right to Erasure</Text> — request deletion of your account and associated data.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Right to Withdraw Consent</Text> — withdraw consent for data processing at any time.</Text>
          <Text style={styles.bullet}>
            •<Text style={styles.bold}>Right to Grievance Redressal</Text> — raise a complaint with our support team.</Text>
          <Text style={styles.body}>
            To exercise any of these rights, contact us at support@anykhata.in. We will respond
            within 30 days.</Text>
        </View>

        {/* 6. Cookies & Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Cookies & Tracking</Text>
          <Text style={styles.body}>
            Any Khata is a mobile application and does not use browser cookies. We may use
            anonymous analytics to understand how users interact with the app. This data is
            aggregated and cannot be used to identify you personally.</Text>
        </View>

        {/* 7. Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          <Text style={styles.body}>
            Any Khata is not intended for use by individuals under the age of 18. We do not
            knowingly collect personal data from minors. If you believe a minor has registered,
            please contact us immediately.</Text>
        </View>

        {/* 8. Changes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
          <Text style={styles.body}>
            We may update this Privacy Policy periodically. We will notify you of significant
            changes via the app or email. Continued use of Any Khata after changes are posted
            constitutes acceptance of the updated policy.</Text>
        </View>

        {/* Contact */}
        <View style={[styles.section, styles.contactBox]}>
          <Text style={styles.contactTitle}>{t('Contact Us')}</Text>
          <Text style={styles.body}>
            For privacy-related questions, data requests, or complaints, contact our Data
            Protection Officer at:</Text>
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
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 6,
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
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
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
