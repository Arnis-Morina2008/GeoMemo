import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '@/context/AppContext';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, signInWithGoogle } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Fehler', 'Das Passwort muss mindestens 4 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const success = await register(name.trim(), email.trim(), password);
      if (success) {
        router.replace('/dashboard');
      } else {
        Alert.alert('Fehler', 'Registrierung fehlgeschlagen.');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const success = await signInWithGoogle();
      if (success) {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Google login error:', error);
      Alert.alert('Fehler', 'Google-Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Header with back button and safe area padding */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Registrierung</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.subtitle}>Erstelle ein neues Konto</Text>

            <TextInput
              style={styles.input}
              placeholder="Vollständiger Name"
              placeholderTextColor="#888"
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="E-Mail Adresse"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor="#888"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Passwort bestätigen"
              placeholderTextColor="#888"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Registrieren</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ODER</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.btnGoogle} 
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={18} color="#444" style={styles.googleIcon} />
              <Text style={styles.btnGoogleText}>Mit Google anmelden</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.loginLinkContainer} 
              onPress={() => router.push('/')}
              disabled={loading}
            >
              <View style={styles.loginLinkRow}>
                <Text style={styles.loginLinkText}>Bereits ein Konto? </Text>
                <Text style={[styles.loginLinkText, styles.loginLinkHighlight]}>Hier einloggen</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0069d9',
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 34, // matches back button size + padding to center the title
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
    marginBottom: 10,
  },
  card: {
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 16,
    width: '100%',
    boxSizing: 'border-box',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ced4da',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    height: 52,
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  btnPrimary: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: 'transparent',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dddddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#888888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnGoogle: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 2,
  },
  btnGoogleText: {
    color: '#444444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLinkContainer: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: '100%',
  },
  loginLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
  },
  loginLinkText: {
    color: '#666666',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});
