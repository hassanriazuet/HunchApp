import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LoginWithOAuthInput, useLoginWithFarcaster, useLoginWithOAuth } from "@privy-io/expo";
import { useRouter } from 'expo-router';
import React, { useState } from "react";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
export default function LoginScreen() {
    const [error, setError] = useState("");
    const router = useRouter();
    const oauth = useLoginWithOAuth({
        onError: (err) => {
            console.log(err);
            setError(JSON.stringify(err.message));
        },
    });
    const { width } = useWindowDimensions();
    // Set max width and aspect ratio for the image
    const mainImageWidth = Math.max(width * 0.99, 380);
    const mainImageHeight = mainImageWidth * (250 / 340); // keep previous aspect ratio

    const onGoogle = () => oauth.login({ provider: 'google' } as LoginWithOAuthInput);
    const onTwitter = () => oauth.login({ provider: 'twitter' } as LoginWithOAuthInput);
    const { loginWithFarcaster, state: farcasterState } = useLoginWithFarcaster({
        onError: (err) => {
            console.log(err);
            setError(JSON.stringify(err.message));
        },
        onSuccess: (user) => {
            // handle successful login if needed
        }
    });
    const onFarcaster = () => loginWithFarcaster({});

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.centerHeader}>
                <Image
                    source={require('../assets/images/loginAppIcon.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                    accessibilityLabel="App Logo"
                />
                <Text style={styles.tagline}>Got a Hunch, Swipe It!</Text>
            </View>
            <Image
                source={require('../assets/images/loginMainImage.png')}
                style={[styles.heroImage, { width: mainImageWidth, height: mainImageHeight }]}
                resizeMode="contain"
                accessibilityLabel="Main Login Illustration"
            />
            <View style={styles.termsRow}>
                <Text style={styles.termsText}>By continuing, you agree to our <Text style={styles.termsBold}>Terms of Services</Text></Text>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#222" style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.ctaArea}>
                <Pressable
                    style={[styles.authButton, styles.outlineButton]}
                    onPress={onTwitter}
                    accessibilityLabel="Continue with Twitter"
                >
                    <Image source={require('../assets/images/xIcon.png')} style={styles.buttonIconImg} resizeMode="contain" />
                    <Text style={styles.buttonText}>Continue with Twitter</Text>
                </Pressable>
                <Pressable
                    style={[styles.authButton, styles.outlineButton]}
                    onPress={onGoogle}
                    accessibilityLabel="Continue with Google"
                >
                    <Image source={require('../assets/images/googleIcon.png')} style={styles.buttonIconImg} resizeMode="contain" />
                    <Text style={styles.buttonText}>Continue with Google</Text>
                </Pressable>
                <Pressable
                    style={[styles.authButton, styles.outlineButton]}
                    onPress={onFarcaster}
                    accessibilityLabel="Continue with Farcaster"
                    disabled={['generating-uri', 'awaiting-uri', 'polling-status', 'submitting-token'].includes(farcasterState?.status)}
                >
                    <Image source={require('../assets/images/farcasterIcon.png')} style={styles.buttonIconImg} resizeMode="contain" />
                    <Text style={styles.buttonText}>
                        {['generating-uri', 'awaiting-uri', 'polling-status', 'submitting-token'].includes(farcasterState?.status)
                            ? 'Loading...'
                            : 'Continue with Farcaster'}
                    </Text>
                </Pressable>
                <Pressable style={styles.emailButton} onPress={() => router.push('/EmailLogin')}>
                    <Text style={styles.emailButtonText}>Continue with Email</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#222" style={{ marginLeft: 8 }} />
                </Pressable>
                {error ? <Text style={styles.error}>Error: {error}</Text> : null}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    buttonIconImg: {
        width: 20,
        height: 20,
        marginRight: 12,
    },
    buttonIcon: {
        marginRight: 12,
    },
    buttonText: {
        color: '#222',
        fontWeight: '500',
        fontSize: 16,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        marginBottom: 2,
    },
    emailButtonText: {
        color: '#222',
        fontWeight: '500',
        fontSize: 16,
    },
    centerHeader: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 0,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    logoImage: {
        width: 120,
        height: 60,
        marginBottom: 0,
        marginTop: 12,
    },
    tagline: {
        marginTop: 0,
        color: '#222',
        fontSize: 18,
        fontWeight: '400',
        marginBottom: 8,
    },
    heroImage: {
        borderRadius: 28,
        backgroundColor: '#fff',
        shadowColor: '#6F2CFF',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        alignSelf: 'center',
        marginBottom: 18,
        marginTop: 0,
    },
    authButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        marginBottom: 2,
        shadowColor: '#8B919E',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    outlineButton: {
        borderWidth: 1.5,
        borderColor: '#8B919E',
        backgroundColor: '#fff',
    },
    lightButton: {
        backgroundColor: '#EFEAFD', // Medium Purple/100
        shadowColor: '#406AFF',
        shadowOpacity: 0.08,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 16 },
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    termsText: {
        fontSize: 14,
        textAlign: 'center',
    },
    termsBold: {
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    ctaArea: {
        width: '100%',
        paddingHorizontal: 18,
        gap: 14,
        marginTop: 8,
        marginBottom: 24,
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginTop: 8,
    },
});