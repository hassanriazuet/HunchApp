import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function PodcastScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Podcast</Text>
      <Text style={styles.subtitle}>Live audio / podcasts placeholder screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
});
