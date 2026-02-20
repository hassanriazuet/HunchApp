import { LinearGradient } from 'expo-linear-gradient';
import React from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();
  // Set max width for splash image, keep aspect ratio 1:1 for example
    const logoWidth = Math.min(width * 0.6, 220);
  return (
    <View style={styles.container}>
        <LinearGradient
          colors={["#5B19BE", "#8F72E6"]}
          start={{ x: 0.3, y: 0.1 }}
          end={{ x: 0.7, y: 1 }}
          style={[StyleSheet.absoluteFill, { width, height }]}
        />
        <Image
          source={require("../assets/images/splashAppIcon.png")}
          style={{ width: logoWidth, height: logoWidth / 3, resizeMode: 'contain' }}
          accessibilityLabel="Splash Logo"
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
      backgroundColor: "#5B19BE", // fallback
    alignItems: "center",
    justifyContent: "center",
  },
});