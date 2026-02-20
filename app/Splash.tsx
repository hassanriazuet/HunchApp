import SplashScreen from "@/Components/SplashScreen";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

export default function Splash() {
  const router = useRouter();
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/");
    }, 3000);
    return () => clearTimeout(timeout);
  }, [router]);
  return <SplashScreen />;
}
