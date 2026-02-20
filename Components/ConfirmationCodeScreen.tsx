
import { useLoginWithEmail } from "@privy-io/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

export default function ConfirmationCodeScreen() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isComplete, setIsComplete] = useState(false);
  const refs = useRef<Array<TextInput | null>>([]);
  const { loginWithCode } = useLoginWithEmail();
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  React.useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  React.useEffect(() => {
    setIsComplete(code.every((digit) => digit.length === 1));
  }, [code]);

  const setDigit = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleBackspace = (index: number) => {
    if (code[index] || index === 0) return;
    refs.current[index - 1]?.focus();
  };

  const handleLogin = async () => {
    try {
      const codeStr = code.join("");
      await loginWithCode({ email, code: codeStr });
      // TODO: create wallet if needed
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", "Invalid code. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
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
        <Text style={styles.title}>Enter confirmation code</Text>

        <Text style={styles.desc}>
          Please check <Text style={styles.descStrong}>{email}</Text> for an email from gotahunch.net and enter your code below.
        </Text>

        <View style={styles.codeRow}>
          {code.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => {
                refs.current[idx] = r;
              }}
              value={digit}
              onChangeText={(t) => setDigit(idx, t)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace') handleBackspace(idx);
              }}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={1}
              style={styles.codeInput}
            />
          ))}
        </View>

        <Text style={styles.timerText}>Resend in {timer}s</Text>

        <Pressable
          onPress={handleLogin}
          style={[styles.continueBtn, !isComplete && styles.continueBtnDisabled]}
          disabled={!isComplete}
        >
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  backBtn: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  backText: { fontSize: 26, color: '#000' },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  iconCircle: {
    width: 73,
    height: 73,
    borderRadius: 73 / 2,
    backgroundColor: '#9559F1',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#9559F1', marginBottom: 10 },
  desc: { fontSize: 16, color: '#0A0019', lineHeight: 22, marginBottom: 18 },
  descStrong: { fontWeight: '700' },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  codeInput: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: '#DEDFE3',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  timerText: { fontSize: 14, color: '#6B7280', marginBottom: 18 },
  continueBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: '#9559F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
