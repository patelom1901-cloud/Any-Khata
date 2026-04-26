/**
 * WhatsApp utilities for Any Khata (used in Ads page)
 */
import { Linking, Alert } from 'react-native';

/** Open WhatsApp with a phone number */
export const openWhatsApp = async (phone: string): Promise<void> => {
  const cleaned = phone.replace(/\D/g, '').replace(/^91/, '');

  if (cleaned.length !== 10) {
    Alert.alert('Invalid Number', 'This business has an invalid WhatsApp number.');
    return;
  }

  const url = `https://wa.me/91${cleaned}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp Not Found', 'Please install WhatsApp to contact this business.');
    }
  } catch {
    Alert.alert('Error', 'Could not open WhatsApp.');
  }
};

/** Format phone for display: "9876543210" → "+91 98765 43210" */
export const formatPhoneDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '').replace(/^91/, '');
  if (cleaned.length !== 10) return phone;
  return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
};

/** Validate Indian mobile number */
export const isValidIndianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '').replace(/^91/, '');
  return /^[6-9]\d{9}$/.test(cleaned);
};
