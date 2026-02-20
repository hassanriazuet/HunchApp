import LoginScreen from "@/Components/LoginScreen";
import SplashScreen from "@/Components/SplashScreen";
import { usePrivy } from "@privy-io/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

export const options = {
  headerShown: false,
};

export default function Index() {
  const { user } = usePrivy();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timeout);
  }, []);
  // Always run this effect (hook order stable). It will navigate into the
  // grouped tabs route once the splash is hidden and user is authenticated.
  useEffect(() => {
    if (!showSplash && user) {
      // replace so back doesn't go to splash
      router.replace("/(tabs)");
    }
  }, [showSplash, user, router]);

  // If still showing splash, render it
  if (showSplash) return <SplashScreen />;

  // If user is not authenticated, show login screen inline
  if (!user) return <LoginScreen />;

  // render nothing while router navigates — the Slot in the tabs layout will mount
  return null;
}
