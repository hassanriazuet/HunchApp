import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const isWallet = pathname.endsWith('/wallet');
  const isProfile = pathname.endsWith('/profile');
  const isStats = pathname.endsWith('/stats');
  const isPodcast = pathname.endsWith('/podcast');
  const isExplore = pathname === '' || pathname === '/(tabs)' || pathname.endsWith('/index');

  return (
    <View pointerEvents="box-none" style={styles.navWrap}>
      <View style={styles.navPill}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/stats' as any)}>
          <Image source={require('../assets/images/graph-stats.png')} style={isStats ? styles.navIconActive : styles.navIconInactive} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/podcast' as any)}>
          <Image source={require('../assets/images/podcast-live.png')} style={isPodcast ? styles.navIconActive : styles.navIconInactive} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerSlot} onPress={() => router.replace('/' as any)}>
          <View style={styles.centerBtn}>
            <Image source={require('../assets/images/exploreSel.png')} style={styles.centerIcon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/wallet' as any)}>
          <Image source={require('../assets/images/Wallet.png')} style={isWallet ? styles.navIconActive : styles.navIconInactive} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile' as any)}>
          <Image source={require('../assets/images/User_Profile.png')} style={isProfile ? styles.navIconActive : styles.navIconInactive} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
    zIndex: 50,
  },
  navPill: {
    width: '92%',
    maxWidth: 440,
    height: 76,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  navItem: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  navIconInactive: { width: 26, height: 26, resizeMode: 'contain', opacity: 0.55 },
  navIconActive: { width: 26, height: 26, resizeMode: 'contain', opacity: 1 },
  centerSlot: { width: 92, height: 76, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 74,
    height: 74,
    borderRadius: 999,
    backgroundColor: '#6F5BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -(74 * 0.5),
    shadowColor: '#6F5BFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  centerIcon: { width: 44, height: 44, resizeMode: 'contain' },
});
