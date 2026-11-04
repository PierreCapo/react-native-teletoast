import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PortalHost } from "react-native-teleport";
import { store } from "./store";

// Teleport keeps its hosts in a native registry, by name, across JS reloads,
// while `useId()` starts over: without this suffix, a reloaded app can
// teleport into a host that no longer exists.
const RUNTIME_KEY = Math.random().toString(36).slice(2, 8);

/**
 * A place toasts can be teleported to, for surfaces drawn above the root
 * host: a native modal, a full window overlay. While it is mounted, toasts
 * render inside it; once it unmounts, they go back to the root host. Toasts
 * already on screen move without remounting, so they keep their timer and
 * their animation.
 *
 * Its own `SafeAreaProvider` measures the safe area where the host actually
 * sits: none at the top of an iOS sheet, for example.
 */
export const ToastHost = () => {
  const name = `teletoast-host-${RUNTIME_KEY}${useId()}`;

  return (
    <>
      {/* Measures only. On Android, SafeAreaProvider's view manager drops
          `pointerEvents`, so a full-screen provider would swallow every
          touch of the screen below: a `none` parent takes it out of touch
          handling on every platform. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <SafeAreaProvider style={StyleSheet.absoluteFill}>
          <HostRegistration name={name} />
        </SafeAreaProvider>
      </View>
      <PortalHost name={name} style={StyleSheet.absoluteFill} />
    </>
  );
};

const HostRegistration = ({ name }: { name: string }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useSafeAreaFrame();

  useEffect(() => {
    store.upsertHost({ name, insets, size: { width, height } });
  }, [name, insets, width, height]);

  // Apart from the update above, so a host that resizes keeps its rank.
  useEffect(() => () => store.unregisterHost(name), [name]);

  return null;
};
