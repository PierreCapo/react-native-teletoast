import {
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaInsetsContext,
} from "react-native-safe-area-context";
import { Portal } from "react-native-teleport";
import { store } from "./store";
import { ToastItem } from "./ToastItem";
import type { ToasterProps } from "./types";

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Renders the toasts. Mount it once, anywhere inside react-native-teleport's
 * `PortalProvider`: its content is teleported to the provider's root host, or
 * to the latest mounted `<ToastHost />`.
 */
export const Toaster = ({
  position = "top-center",
  duration = 4000,
  visibleToasts = 3,
  gap = 14,
  offset = 8,
  swipeToDismiss = true,
  hostName = "root",
}: ToasterProps) => {
  const { toasts, hosts } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  // Without a SafeAreaProvider above, fall back to the launch metrics.
  const ownInsets =
    useContext(SafeAreaInsetsContext) ??
    initialWindowMetrics?.insets ??
    NO_INSETS;
  const windowSize = useWindowDimensions();
  const [heights, setHeights] = useState<Readonly<Record<number, number>>>({});

  const onMeasure = useCallback((key: number, height: number) => {
    setHeights((previous) => {
      if (previous[key] === height) {
        return previous;
      }
      // Rebuilt from the live list, so the heights of removed toasts go away.
      const next: Record<number, number> = {};
      for (const toast of store.getSnapshot().toasts) {
        const known = previous[toast.key];
        if (known !== undefined) {
          next[toast.key] = known;
        }
      }
      next[key] = height;
      return next;
    });
  }, []);

  useEffect(() => {
    const onScreen = toasts.filter((toast) => !toast.dismissed);
    const overflow = onScreen.length - visibleToasts;
    for (const toast of onScreen.slice(0, Math.max(overflow, 0))) {
      store.dismissByKey(toast.key);
    }
  }, [toasts, visibleToasts]);

  // Nothing mounted while idle: no portal, and nothing for a server render.
  if (toasts.length === 0) {
    return null;
  }

  const host = hosts[hosts.length - 1];
  const insets = host?.insets ?? ownInsets;
  const size = host?.size ?? windowSize;
  const isTop = position === "top-center";
  const edge = Math.max(isTop ? insets.top : insets.bottom, 8) + offset;

  const newestFirst = [...toasts].reverse();
  let stackOffset = 0;

  // Teleport moves the native views, but Yoga still lays them out where the
  // Portal is declared, and `measure` reads that layout. Filling the parent
  // puts the Portal's origin where the host's is: the top-left of the screen
  // for the root host, of the screen it's mounted in for a ToastHost (where
  // react-native-screens also counts touches from).
  return (
    <Portal hostName={host?.name ?? hostName} style={StyleSheet.absoluteFill}>
      <View
        pointerEvents="box-none"
        style={[styles.layer, { width: size.width, height: size.height }]}
      >
        {newestFirst.map((record, index) => {
          const item = (
            <ToastItem
              key={record.key}
              record={record}
              stackOffset={stackOffset}
              edge={edge}
              isTop={isTop}
              left={insets.left}
              right={insets.right}
              zIndex={newestFirst.length - index}
              duration={record.options.duration ?? duration}
              swipeable={swipeToDismiss && record.options.dismissible !== false}
              measured={heights[record.key] !== undefined}
              onMeasure={onMeasure}
            />
          );
          // A leaving toast no longer takes room: the others move up now.
          if (!record.dismissed) {
            stackOffset += (heights[record.key] ?? 0) + gap;
          }
          return item;
        })}
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
