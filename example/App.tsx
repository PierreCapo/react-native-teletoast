import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { PortalProvider } from "react-native-teleport";
import {
  toast,
  Toaster,
  ToastHost,
  type ToastOptions,
} from "react-native-teletoast";
import { DemoToast, type Tone } from "./DemoToast";

const show = (
  tone: Tone,
  title: string,
  description?: string,
  options?: ToastOptions,
) =>
  toast.custom(
    ({ dismiss }) => (
      <DemoToast
        tone={tone}
        title={title}
        description={description}
        onClose={dismiss}
      />
    ),
    options,
  );

const showOne = () => show("success", "Saved", "Your changes are safe.");

const showThree = () => {
  show("info", "Syncing your library");
  setTimeout(
    () => show("warning", "Storage almost full", "Free some space soon."),
    450,
  );
  setTimeout(
    () => show("error", "Couldn't upload photo", "Check your connection."),
    900,
  );
};

// Same id: the toast is updated in place, and its timer restarts.
const showUpdate = () => {
  const id = show("info", "Uploading…", undefined, { duration: Infinity });
  setTimeout(
    () => show("success", "Uploaded", "3 photos added.", { id, duration: 3000 }),
    1600,
  );
};

export default function App() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.fill}>
        <PortalProvider>
          <StatusBar style="dark" />
          <Home onOpenSheet={() => setSheetOpen(true)} />
          <Modal
            visible={sheetOpen}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSheetOpen(false)}
          >
            <GestureHandlerRootView style={styles.fill}>
              <Sheet onClose={() => setSheetOpen(false)} />
              {/* A native modal is drawn above the root portal host: this
                  host brings the toasts inside it while it is open. */}
              <ToastHost />
            </GestureHandlerRootView>
          </Modal>
          <Toaster />
        </PortalProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const Home = ({ onOpenSheet }: { onOpenSheet: () => void }) => (
  <SafeAreaView style={styles.screen}>
    <View style={styles.intro}>
      <Text style={styles.kicker}>react-native-teletoast</Text>
      <Text style={styles.heading}>Headless toasts, teleported.</Text>
      <Text style={styles.lede}>
        Your own component, rendered in a native portal above the app.
      </Text>
    </View>
    <View style={styles.actions}>
      <DemoButton label="Show a toast" onPress={showOne} />
      <DemoButton label="Three in a row" onPress={showThree} />
      <DemoButton label="Loading, then done" onPress={showUpdate} />
      <DemoButton label="Open a native sheet" onPress={onOpenSheet} />
      <DemoButton
        label="Dismiss all"
        kind="ghost"
        onPress={() => toast.dismiss()}
      />
    </View>
  </SafeAreaView>
);

const Sheet = ({ onClose }: { onClose: () => void }) => (
  <View style={styles.sheet}>
    <View style={styles.intro}>
      <Text style={styles.heading}>A native sheet</Text>
      <Text style={styles.lede}>
        It sits above the whole app. Its ToastHost brings the toasts in here,
        and back out when it closes, without remounting them.
      </Text>
    </View>
    <View style={styles.actions}>
      <DemoButton
        label="Show a toast"
        onPress={() => show("info", "Shown inside the sheet")}
      />
      <DemoButton label="Close the sheet" kind="ghost" onPress={onClose} />
    </View>
  </View>
);

const DemoButton = ({
  label,
  kind = "solid",
  onPress,
}: {
  label: string;
  kind?: "solid" | "ghost";
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      kind === "ghost" && styles.buttonGhost,
      pressed && styles.pressed,
    ]}
  >
    <Text style={[styles.buttonLabel, kind === "ghost" && styles.labelGhost]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: "#F5F3EF",
  },
  sheet: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 32,
    paddingHorizontal: 24,
    paddingBottom: 48,
    backgroundColor: "#FFFFFF",
  },
  intro: {
    gap: 8,
  },
  kicker: {
    color: "#8A8580",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heading: {
    color: "#1C1B1F",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  lede: {
    color: "#5E5A55",
    fontSize: 17,
    lineHeight: 23,
  },
  actions: {
    gap: 10,
  },
  button: {
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#1C1B1F",
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonLabel: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  labelGhost: {
    color: "#1C1B1F",
  },
  pressed: {
    opacity: 0.6,
  },
});
