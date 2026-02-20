import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from "react-native";
import { Market } from "../types";
import { HunchCard } from "./HunchCard";

const { width, height } = Dimensions.get("window");
const SWIPE_X_THRESHOLD = width * 0.24;
const SWIPE_Y_THRESHOLD = height * 0.18;
const STACK_VISIBLE = 3;

export function SwipeDeck({
  markets,
  onSwipe,
}: {
  markets: Market[];
  onSwipe: (direction: "left" | "right" | "down", market: Market) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // refs to keep latest markets/onSwipe available to gesture handlers
  const marketsRef = useRef(markets);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    marketsRef.current = markets;
  }, [markets]);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
  });

  const overlayYesOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_X_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const overlayNoOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_X_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const overlayPassOpacity = pan.y.interpolate({
    inputRange: [0, SWIPE_Y_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const topCardStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
          const swipedRight = g.dx > SWIPE_X_THRESHOLD;
          const swipedLeft = g.dx < -SWIPE_X_THRESHOLD;
          const swipedDown = g.dy > SWIPE_Y_THRESHOLD;

          if (swipedRight) return forceSwipe("right");
          if (swipedLeft) return forceSwipe("left");
          if (swipedDown) return forceSwipe("down");

          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6, tension: 90 }).start();
        },
      }),
    // keep panResponder stable across market list changes so touch handlers aren't detached
    [pan]
  );

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [markets?.[0]?.id]);

  const forceSwipe = (direction: "left" | "right" | "down") => {
    const current = marketsRef.current?.[0];
    if (!current) return;

    let toValue = { x: 0, y: 0 };
    if (direction === "right") toValue = { x: width + 160, y: (pan.y as any).__getValue() };
    if (direction === "left") toValue = { x: -width - 160, y: (pan.y as any).__getValue() };
    if (direction === "down") toValue = { x: (pan.x as any).__getValue(), y: height + 160 };

    Animated.timing(pan, { toValue, duration: 220, useNativeDriver: false }).start(() => {
      // debug: log which card is being finalized as swiped
      try {
        // eslint-disable-next-line no-console
        console.log("[SwipeDeck] forceSwipe complete ->", { direction, id: current.id });
      } catch {}

      pan.setValue({ x: 0, y: 0 });
      try {
        onSwipeRef.current?.(direction, current);
      } catch (e) {
        // swallow
      }
    });
  };

  const renderMarket = (m: Market, index: number) => {
    const isTop = index === 0;
    const stackIndex = Math.min(index, STACK_VISIBLE - 1);

    // Nice stacked look like screenshot (slight offset + scale + translucent)
    const scale = 1 - stackIndex * 0.035;
    const translateY = stackIndex * 10;
    const opacity = 1 - stackIndex * 0.10;

    const shellStyle = [
      styles.cardShell,
      {
        opacity,
        transform: [{ scale }, { translateY }],
      },
    ];

    const cardInner = (
      <View style={shellStyle}>
        <HunchCard market={m} />
        {isTop && (
          <>
            <Animated.View style={[styles.overlay, styles.overlayYes, { opacity: overlayYesOpacity }]}>
              <View style={styles.overlayPill}>
                <Text style={styles.overlayPillText}>Yes</Text>
              </View>
              <View style={styles.overlayArrow}>
                <Text style={styles.overlayArrowText}>→</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.overlayNo, { opacity: overlayNoOpacity }]}>
              <View style={[styles.overlayPill, styles.overlayPillNo]}>
                <Text style={[styles.overlayPillText, styles.overlayPillTextNo]}>No</Text>
              </View>
              <View style={[styles.overlayArrow, styles.overlayArrowNo]}>
                <Text style={[styles.overlayArrowText, styles.overlayArrowTextNo]}>←</Text>
              </View>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.overlayPass, { opacity: overlayPassOpacity }]}>
              <View style={styles.overlayPill}>
                <Text style={styles.overlayPillText}>Pass</Text>
              </View>
              <View style={styles.overlayArrow}>
                <Text style={styles.overlayArrowText}>↓</Text>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    );

    if (isTop) {
      return (
        <Animated.View key={m.id} style={[styles.absolute, topCardStyle]} {...panResponder.panHandlers}>
          {cardInner}
        </Animated.View>
      );
    }

    return (
      <View key={m.id} style={styles.absolute} pointerEvents="none">
        {cardInner}
      </View>
    );
  };

  const visible = markets.slice(0, STACK_VISIBLE);
  return <View style={styles.container}>{visible.map(renderMarket).reverse()}</View>;
}

  const styles = StyleSheet.create({
container: {
  flex: 1,
  width: "100%",
},

absolute: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 124,            // ✅ fill the stage vertically
  alignItems: "center",
},

cardShell: {
  width: width * 0.90,
  flex: 1,              // ✅ auto height
  borderRadius: 30,
  backgroundColor: "#fff",
  shadowColor: "#000",
  shadowOpacity: 0.14,
  shadowRadius: 36,
  shadowOffset: { width: 0, height: 16 },
  elevation: 10,
  overflow: "hidden",
},


  //yes/no/pass overlays
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },


  overlayYes: { backgroundColor: "rgba(111,91,255,0.92)" },
  overlayNo: { backgroundColor: "rgba(11,15,23,0.88)" },
  overlayPass: { backgroundColor: "rgba(111,91,255,0.55)" },

  overlayPill: { backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  overlayPillNo: { backgroundColor: "#fff" },
  overlayPillText: { fontWeight: "900", color: "#0B0F17", fontSize: 16 },
  overlayPillTextNo: { color: "#0B0F17" },

  overlayArrow: {
    marginTop: 12,
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayArrowNo: { backgroundColor: "#fff" },
  overlayArrowText: { fontSize: 28, fontWeight: "900", color: "#0B0F17" },
  overlayArrowTextNo: { color: "#0B0F17" },
});
