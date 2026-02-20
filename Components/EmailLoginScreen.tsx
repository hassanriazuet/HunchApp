import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';


import { useLoginWithEmail } from "@privy-io/expo";
import { useMemo } from "react";

import { useRouter } from 'expo-router';

export default function EmailLoginScreen() {
  const [email, setEmail] = useState("");
  const { sendCode } = useLoginWithEmail();
  const isValid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!isValid) return;
    await sendCode({ email });
  router.push({ pathname: "/ConfirmationCodeScreen", params: { email } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <View style={styles.content}>
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Image
              source={require('../assets/images/loginAppIcon.png')}
              style={{ width: 120, height: 60, resizeMode: 'contain' }}
              accessibilityLabel="App Logo"
            />
          </View>
          <Text style={styles.title}>Email Login</Text>
          <Text style={styles.desc}>We will send you a code to verify it.</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#8B919E"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={styles.input}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            style={[styles.loginBtn, !isValid && styles.loginBtnDisabled]}
            disabled={!isValid}
          >
            <Text style={styles.loginBtnText}>Login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backText: {
    fontSize: 26,
    color: '#000',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconCircle: {
    width: 73,
    height: 73,
    borderRadius: 73 / 2,
    backgroundColor: '#9559F1',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9559F1',
    marginBottom: 8,
  },
  desc: {
    fontSize: 18,
    color: '#0A0019',
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: '#DEDFE3',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 18,
  },
  input: {
    fontSize: 16,
    color: '#000',
  },
  loginBtn: {
    height: 50,
    borderRadius: 8,
    backgroundColor: '#9559F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.5,
  },
  loginBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

