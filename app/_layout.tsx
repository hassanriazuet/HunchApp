import { PrivyProvider } from "@privy-io/expo";
import Constants from "expo-constants";
import { Slot } from "expo-router";
import { Alert } from "react-native";

export default function RootLayout() {
  // Silence in-app Alert to prevent blocking toasts during UI testing / screenshots.
  // We intentionally replace Alert.alert with a no-op here. If you want alerts
  // again, remove or gate this behind a debug flag.
  try {
    // cast to any to avoid TS type issues when reassigning
    (Alert as any).alert = () => {};
  } catch (e) {
    // ignore
  }
  return (
    <PrivyProvider
      appId={Constants.expoConfig?.extra?.privyAppId}
      clientId={Constants.expoConfig?.extra?.privyClientId}
    >
      {/* Use Slot to render nested routes and group layouts (like /(tabs)) */}
      <Slot />
    </PrivyProvider>
  );
}
