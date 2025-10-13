import { Text, TouchableOpacity, View, Linking, Modal } from "react-native";
import Constants from "expo-constants";
import { makeStyles } from "@/theme/styles";
import { Theme } from "@/theme/palettes";

export function SettingsSheet({
  visible,
  onClose,
  themeMode,
  setThemeMode,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  themeMode: "system" | "light" | "dark";
  setThemeMode: (m: "system" | "light" | "dark") => void;
  t: Theme;
}) {
  const styles = makeStyles(t);
  const version = Constants?.expoConfig?.version || "1.0.0";

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Information</Text>

          <View style={styles.group}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL("mailto:feedback@example.com")}
            >
              <Text style={styles.rowTitle}>Feedback</Text>
              <Text style={styles.rowRight}>feedback@example.com</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Linking.openURL(
                  "itms-apps://itunes.apple.com/app/id000000000?action=write-review"
                )
              }
            >
              <Text style={styles.rowTitle}>Rate this app</Text>
              <Text style={styles.rowRight}>⭐️</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Linking.openURL("https://buymeacoffee.com/yourname")
              }
            >
              <Text style={styles.rowTitle}>Donate</Text>
              <Text style={styles.rowRight}>❤️</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.rowTitle}>Theme</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["system", "light", "dark"] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setThemeMode(opt)}
                    style={{
                      borderWidth: 1,
                      borderColor: themeMode === opt ? t.blue : t.border,
                      backgroundColor: themeMode === opt ? t.blue : t.card,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        color: themeMode === opt ? "white" : t.text,
                        fontWeight: "600",
                        fontSize: 12,
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 16 }} />
          <View style={styles.group}>
            <View style={styles.row}>
              <Text style={styles.rowTitle}>App version</Text>
              <Text style={styles.rowRight}>v{version}</Text>
            </View>
          </View>

          <View style={{ height: 12 }} />
          <TouchableOpacity onPress={onClose} style={{ alignSelf: "center" }}>
            <Text style={{ color: t.subtle }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
