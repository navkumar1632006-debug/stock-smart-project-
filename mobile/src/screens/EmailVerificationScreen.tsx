import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function EmailVerificationScreen({ route, navigation }: any) {
  const { resendVerification, verifyEmailOtp } = useAuth();
  const rawEmail = route.params?.email || '';
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mask email for privacy (e.g. j***e@domain.com)
  const maskedEmail = React.useMemo(() => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const first = name[0];
    const last = name[name.length - 1];
    const stars = '*'.repeat(Math.min(name.length - 2, 5));
    return `${first}${stars}${last}@${domain}`;
  }, [rawEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerifyOtp() {
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanToken = otpCode.trim();

    if (!cleanToken) {
      setErrorMessage('Please enter the 6-digit confirmation code from your email.');
      return;
    }

    if (cleanToken.length < 6) {
      setErrorMessage('Confirmation code must be 6 digits.');
      return;
    }

    try {
      setVerifyingOtp(true);
      const { data, error } = await verifyEmailOtp(rawEmail, cleanToken);
      if (error) {
        if (error.message.toLowerCase().includes('expired')) {
          setErrorMessage('The verification code has expired. Please tap "Resend Email" below.');
        } else if (error.message.toLowerCase().includes('invalid')) {
          setErrorMessage('Invalid verification code. Please check your email and try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else if (data?.session) {
        setSuccessMessage('Email verified successfully! Opening your dashboard...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setSuccessMessage(null);
    setErrorMessage(null);
    setResending(true);

    try {
      const { error } = await resendVerification(rawEmail);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('A fresh verification link and code have been sent to your email.');
        setCooldown(60);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  }

  async function handleOpenEmailApp() {
    try {
      const supported = await Linking.canOpenURL('mailto:');
      if (supported) {
        await Linking.openURL('mailto:');
      } else {
        setSuccessMessage('Please switch to your email app to check your inbox.');
      }
    } catch {
      setSuccessMessage('Please switch to your email app to check your inbox.');
    }
  }

  async function handleCheckStatus() {
    setRefreshingStatus(true);
    setErrorMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        // No local session yet -> Try signing in or ask user to enter code/sign in
        setErrorMessage(
          'If you confirmed in your browser, please enter the 6-digit code or sign in with your password.'
        );
        return;
      }

      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (data?.user?.email_confirmed_at) {
        setSuccessMessage('Email verified! Loading your dashboard...');
      } else {
        setErrorMessage('Email is still unverified. Please enter the 6-digit code or tap the link in your email.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not verify status. Please enter the 6-digit code.');
    } finally {
      setRefreshingStatus(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Verification Icon Card */}
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread-outline" size={44} color="#2563eb" />
            </View>

            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.description}>
              We've sent a verification link & 6-digit code to:
            </Text>

            <View style={styles.emailBadge}>
              <Text style={styles.emailText}>{maskedEmail}</Text>
            </View>

            {/* OTP Code Entry Option */}
            <View style={styles.otpSection}>
              <Text style={styles.otpLabel}>Enter 6-Digit Code from Email</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="123456"
                placeholderTextColor="#94a3b8"
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                  if (errorMessage) setErrorMessage(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={false}
              />

              <TouchableOpacity
                style={[styles.verifyButton, verifyingOtp && styles.disabledButton]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
                activeOpacity={0.8}
              >
                {verifyingOtp ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.buttonInner}>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.verifyButtonText}>Verify Code</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CLICK LINK IN EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Open Email Client Button */}
            <TouchableOpacity
              style={styles.openMailButton}
              onPress={handleOpenEmailApp}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
              <Text style={styles.openMailButtonText}>Open Email App</Text>
            </TouchableOpacity>

            {/* Success Banner */}
            {successMessage && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#047857" style={{ marginRight: 8 }} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#b91c1c" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Check Status Button */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleCheckStatus}
              disabled={refreshingStatus}
            >
              {refreshingStatus ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.refreshButtonText}>I've Verified in Browser</Text>
              )}
            </TouchableOpacity>

            {/* Resend Button with Cooldown */}
            <TouchableOpacity
              style={[
                styles.resendButton,
                (cooldown > 0 || resending) && styles.disabledButton,
              ]}
              onPress={handleResend}
              disabled={cooldown > 0 || resending}
              activeOpacity={0.8}
            >
              {resending ? (
                <View style={styles.buttonInner}>
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} />
                  <Text style={styles.resendButtonText}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.resendButtonText}>
                  {cooldown > 0 ? `Resend Email in ${cooldown}s` : 'Resend Verification Email'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Return to Sign In */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backButtonText}>Return to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  emailBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  otpSection: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otpInput: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#0f172a',
    marginBottom: 12,
  },
  verifyButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  openMailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    marginBottom: 16,
  },
  openMailButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  successText: {
    fontSize: 13,
    color: '#065f46',
    flex: 1,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    color: '#991b1b',
    flex: 1,
    fontWeight: '600',
  },
  refreshButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resendButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resendButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  backButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
