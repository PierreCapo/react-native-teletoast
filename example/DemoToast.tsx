import { Pressable, StyleSheet, Text, View } from "react-native";

export type Tone = "success" | "info" | "warning" | "error";

// Plain text glyphs: the whole point is a toast without react-native-svg.
const TONES: Record<Tone, { color: string; glyph: string }> = {
  success: { color: "#30B85C", glyph: "✓" },
  info: { color: "#2F7CF6", glyph: "i" },
  warning: { color: "#F29A0E", glyph: "!" },
  error: { color: "#E5483E", glyph: "×" },
};

type DemoToastProps = {
  tone: Tone;
  title: string;
  description?: string;
  onClose: () => void;
};

/** What an app brings to teletoast: its own toast, styled its own way. */
export const DemoToast = ({
  tone,
  title,
  description,
  onClose,
}: DemoToastProps) => (
  <View style={styles.toast} accessibilityRole="alert">
    <View style={[styles.badge, { backgroundColor: TONES[tone].color }]}>
      <Text style={styles.glyph}>{TONES[tone].glyph}</Text>
    </View>
    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
    </View>
    <Pressable
      onPress={onClose}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Dismiss"
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
    >
      <Text style={styles.closeGlyph}>×</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  toast: {
    width: "92%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    backgroundColor: "#1C1B1F",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  glyph: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    color: "rgba(235, 235, 245, 0.62)",
    fontSize: 13,
  },
  close: {
    paddingHorizontal: 6,
  },
  closeGlyph: {
    color: "rgba(235, 235, 245, 0.62)",
    fontSize: 24,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.5,
  },
});
