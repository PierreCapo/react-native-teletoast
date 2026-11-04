import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { store, type ToastRecord } from "./store";
import { createTimer } from "./timer";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Presence keeps animating under reduced motion: only the travel is dropped,
// so toasts still fade in and out instead of popping.
const ENTER = { duration: 300, easing: EASE_OUT, reduceMotion: ReduceMotion.Never };
const EXIT = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.Never };
// Same curve and duration as the entrance, started on the same frame: the
// older toasts make room exactly as fast as the new one slides in, so it
// never lands on top of them. A spring would start slower and lose the race.
const REFLOW = { duration: 300, easing: EASE_OUT };
const SNAP_BACK = { duration: 400, dampingRatio: 0.8 };

/** Share of its height a toast must travel toward the edge to be dismissed. */
const DISMISS_DISTANCE = 0.3;
/** Or the speed of the flick toward the edge, in points per second. */
const DISMISS_VELOCITY = 500;

const rubberBand = (distance: number, dimension: number) => {
  "worklet";
  const size = Math.max(dimension, 1);
  return (1 - 1 / ((distance * 0.55) / size + 1)) * size;
};

type ToastItemProps = {
  record: ToastRecord;
  /** Space taken by the newer toasts between this one and the edge. */
  stackOffset: number;
  /** Distance from the screen edge to the first toast. */
  edge: number;
  isTop: boolean;
  left: number;
  right: number;
  zIndex: number;
  duration: number;
  swipeable: boolean;
  /** The Toaster knows this toast's height, so the others already moved. */
  measured: boolean;
  onMeasure: (key: number, height: number) => void;
};

export const ToastItem = memo(function ToastItem({
  record,
  stackOffset,
  edge,
  isTop,
  left,
  right,
  zIndex,
  duration,
  swipeable,
  measured,
  onMeasure,
}: ToastItemProps) {
  const { key, id, content, version, dismissed } = record;
  const sign = isTop ? 1 : -1;
  const reducedMotion = useReducedMotion();

  const height = useSharedValue(0);
  const presence = useSharedValue(0);
  const stack = useSharedValue(stackOffset);
  const drag = useSharedValue(0);

  const hasEntered = useRef(false);
  const hasLeft = useRef(false);
  const [timer] = useState(createTimer);
  const { pause, resume } = timer;

  const remove = useCallback(() => store.remove(key), [key]);
  const dismissBySwipe = useCallback(() => {
    hasLeft.current = true;
    store.dismissByKey(key);
  }, [key]);

  // The older toasts close the gap as soon as one leaves.
  useEffect(() => {
    if (!dismissed) {
      stack.set(withTiming(stackOffset, REFLOW));
    }
  }, [dismissed, stack, stackOffset]);

  // The entrance waits for the commit that carries this toast's height: the
  // older toasts start moving in that same commit.
  useEffect(() => {
    if (measured && !hasEntered.current && !hasLeft.current) {
      hasEntered.current = true;
      presence.set(withTiming(1, ENTER));
    }
  }, [measured, presence]);

  useEffect(() => {
    if (dismissed || !Number.isFinite(duration)) {
      return;
    }
    return timer.start(duration, () => store.dismissByKey(key, "auto"));
  }, [dismissed, duration, key, timer, version]);

  // A swipe starts its own exit from the finger's position.
  useEffect(() => {
    if (!dismissed || hasLeft.current) {
      return;
    }
    hasLeft.current = true;
    presence.set(
      withTiming(0, EXIT, (finished) => {
        "worklet";
        if (finished) {
          scheduleOnRN(remove);
        }
      }),
    );
  }, [dismissed, presence, remove]);

  // Slides in from its own height, so it needs to be measured first.
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layoutHeight = event.nativeEvent.layout.height;
      height.set(layoutHeight);
      onMeasure(key, layoutHeight);
    },
    [height, key, onMeasure],
  );

  const pan = usePanGesture({
    enabled: swipeable && !dismissed,
    activeOffsetY: [-8, 8],
    failOffsetX: [-24, 24],
    onBegin: () => {
      "worklet";
      scheduleOnRN(pause);
    },
    onUpdate: (event) => {
      "worklet";
      const towardEdge = -sign * event.translationY;
      drag.set(
        towardEdge >= 0
          ? event.translationY
          : sign * rubberBand(-towardEdge, height.get()),
      );
    },
    onDeactivate: (event) => {
      "worklet";
      const distance = -sign * event.translationY;
      const velocity = -sign * event.velocityY;
      const shouldDismiss =
        !event.canceled &&
        distance > 0 &&
        (velocity > DISMISS_VELOCITY ||
          (distance > height.get() * DISMISS_DISTANCE && velocity > -100));

      if (shouldDismiss) {
        presence.set(
          withTiming(0, EXIT, (finished) => {
            "worklet";
            if (finished) {
              scheduleOnRN(remove);
            }
          }),
        );
        scheduleOnRN(dismissBySwipe);
      } else {
        drag.set(withSpring(0, { ...SNAP_BACK, velocity: event.velocityY }));
      }
    },
    onFinalize: () => {
      "worklet";
      scheduleOnRN(resume);
    },
  });

  // The stack offset goes through `top` / `bottom`, not a transform: the
  // shadow tree has to know where a toast rests, because `Pressable` checks
  // touches against the measured frame. Transforms only carry the transient
  // part (entrance, exit, drag) and are back to zero at rest.
  const animatedStyle = useAnimatedStyle(() => {
    const shown = presence.get();
    const travel = reducedMotion ? 0 : -sign * (height.get() + edge);
    const fromEdge = edge + stack.get();
    return {
      ...(isTop ? { top: fromEdge } : { bottom: fromEdge }),
      opacity: shown,
      transform: [{ translateY: drag.get() + (1 - shown) * travel }],
    };
  });

  const renderProps = useMemo(
    () => ({ id, dismiss: () => store.dismissByKey(key) }),
    [id, key],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={onLayout}
        pointerEvents="box-none"
        style={[styles.item, { left, right, zIndex }, animatedStyle]}
      >
        {typeof content === "function" ? content(renderProps) : content}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    alignItems: "center",
  },
});
