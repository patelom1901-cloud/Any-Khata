import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Fonts, Radius } from '../../constants/theme';
import { useTranslation } from "../../hooks/useTranslation";
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.creamBase, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../../assets/Any Khata logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{t('common.app_name')}</Text>
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.heroImageContainer}>
          <Image 
            source={require('../../assets/shop_owner.png')} 
            style={styles.heroImage} 
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(800)} style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={login}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconContainer}>
                <MaterialIcons name="account-circle" size={24} color="#ffffff" />
            </View>
            <Text style={styles.buttonText}>{t('login.google_btn')}</Text>
          </TouchableOpacity>
          

        </Animated.View>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 36,
    fontFamily: Fonts.extrabold,
    color: Colors.brandDark,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  heroImageContainer: {
    height: 280,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    marginTop: 20,
    paddingBottom: 20,
  },
  primaryButton: {
    backgroundColor: Colors.brandDark,
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brandDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 24,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.textOnDark,
    letterSpacing: 0.5,
  },

});
