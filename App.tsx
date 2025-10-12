// App.tsx — Expo React Native Traktus Remote (with logout + dark mode + layout fixes)

import { useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  useColorScheme,
  ScrollView,
} from "react-native";
import * as SecureStore from "expo-secure-store";

// ----- Theme (light/dark palettes) -----
const paletteLight = {
  blue: "#2575FC",
  light: "#F5F8FF",
  dark: "#0F172A",
  border: "#E5E7EB",
  text: "#0F172A",
  subtle: "#6B7280",
  green: "#10B981",
  red: "#EF4444",
  card: "#FFFFFF",
  track: "#EEF2FF",
  inputBg: "#F9FAFB",
};
const paletteDark = {
  blue: "#5B8AFF",
  light: "#0B1220", // app background
  dark: "#E5E7EB", // header title text
  border: "#253049",
  text: "#E5E7EB",
  subtle: "#9AA4B2",
  green: "#34D399",
  red: "#F87171",
  card: "#0F172A",
  track: "#1E293B",
  inputBg: "#0B1324",
};

type Theme = typeof paletteLight;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.light },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      textAlign: "left",
      marginTop: 8,
      paddingHorizontal: 16,
    },
    subtitle: {
      fontSize: 12,
      color: t.subtle,
      textAlign: "left",
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      backgroundColor: t.card,
      borderBottomColor: t.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: t.dark },
    headerSub: { fontSize: 12, color: t.subtle },
    headerRight: { flexDirection: "row", gap: 8 },
    addBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    filters: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      justifyContent: "flex-start",
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.border,
    },
    chipText: { fontSize: 12, fontWeight: "600", color: t.text },
    input: {
      // flex: 1,
      height: 48,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      backgroundColor: t.inputBg,
      color: t.text,
      textAlignVertical: "center",
      fontSize: 16,
      opacity: 0.99,
      backfaceVisibility: "hidden",
    },
    primaryBtn: {
      height: 48,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnText: { color: "white", fontWeight: "700" },
    card: {
      backgroundColor: t.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
    },
    helper: { color: t.subtle, textAlign: "center", marginTop: 12 },
    meta: { fontSize: 12, color: t.subtle },
    progressOuter: {
      height: 8,
      borderRadius: 999,
      backgroundColor: paletteLight.track,
      overflow: "hidden",
    },
    progressOuterDark: {
      height: 8,
      borderRadius: 999,
      backgroundColor: paletteDark.track,
      overflow: "hidden",
    },
    progressInner: { height: 8, borderRadius: 999 },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    headerBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
    },
    headerBtnText: { fontSize: 12, fontWeight: "700", color: t.text },
  });

// ----- Types -----
type FilterKey = "All" | "Active" | "Completed" | "Stalled";
type Torrent = {
  hash: string;
  name: string;
  progress: number; // 0..1 per qB API
  size: number; // bytes
  dlspeed: number; // bytes/s
  upspeed: number; // bytes/s
  num_leechs: number;
  num_seeds: number;
  state: string; // e.g. "downloading", "pausedUP", "stalledDL", etc.
};

// ----- qBittorrent API Client (cookie-based) -----
class QBClient {
  baseUrl: string;
  sid: string | null = null; // SID cookie value

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request(path: string, init: RequestInit = {}) {
    const url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers: any = { ...(init.headers || {}) };
    if (this.sid) headers["Cookie"] = `SID=${this.sid}`;
    const res = await fetch(url, { ...init, headers });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie && setCookie.includes("SID=")) {
      const m = setCookie.match(/SID=([^;]+)/);
      if (m) this.sid = m[1];
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json();
    return res.text();
  }

  async login(username: string, password: string) {
    const body = new URLSearchParams({ username, password }).toString();
    return this.request("/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async logout() {
    try {
      await this.request("/api/v2/auth/logout", { method: "POST" });
    } finally {
      this.sid = null;
    }
  }

  async torrentsInfo(
    filter: "all" | "downloading" | "completed" | "paused" | "stalled" = "all"
  ): Promise<Torrent[]> {
    const q = new URLSearchParams({ filter }).toString();
    return this.request(`/api/v2/torrents/info?${q}`);
  }

  async addTorrentUrl(url: string) {
    const body = new URLSearchParams({ urls: url }).toString();
    return this.request("/api/v2/torrents/add", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  async pause(hash: string) {
    const body = new URLSearchParams({ hashes: hash }).toString();
    return this.request("/api/v2/torrents/stop", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async resume(hash: string) {
    const body = new URLSearchParams({ hashes: hash }).toString();
    return this.request("/api/v2/torrents/start", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async recheck(hash: string) {
    const body = new URLSearchParams({ hashes: hash }).toString();
    return this.request("/api/v2/torrents/recheck", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async reannounce(hash: string) {
    const body = new URLSearchParams({ hashes: hash }).toString();
    return this.request("/api/v2/torrents/reannounce", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
  async delete(hash: string, deleteFiles = false) {
    const body = new URLSearchParams({
      hashes: hash,
      deleteFiles: String(deleteFiles),
    }).toString();
    return this.request("/api/v2/torrents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }
}

// ----- Helpers -----
const bytes = (n: number) => {
  if (n <= 0 || Number.isNaN(n)) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

const pct = (p: number) => `${Math.round((p || 0) * 100)}%`;

const isActive = (t: Torrent) =>
  ["downloading", "stalledDL", "queuedDL", "checkingDL", "uploading"].some(
    (s) => t.state.includes(s)
  ) ||
  (t.progress < 1 && t.dlspeed > 0);
const isCompleted = (t: Torrent) =>
  t.progress >= 1 ||
  t.state.includes("seeding") ||
  t.state.includes("pausedUP");
const isStalled = (t: Torrent) =>
  t.state.includes("stalled") || (t.progress < 1 && t.dlspeed === 0);

// ----- App -----
export default function App() {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">(
    "system"
  );
  const dark =
    themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";
  const t = dark ? paletteDark : paletteLight;
  const styles = makeStyles(t);

  const [host, setHost] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const clientRef = useRef<QBClient | null>(null);

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [filter, setFilter] = useState<FilterKey>("All");
  const [addUrl, setAddUrl] = useState("");

  const [remember, setRemember] = useState(true);

  const SS_KEYS = {
    host: "qb_host",
    user: "qb_user",
    pass: "qb_pass",
    sid: "qb_sid",
  } as const;

  const filtered = useMemo(() => {
    return torrents.filter((tor) => {
      if (filter === "All") return true;
      if (filter === "Active") return isActive(tor);
      if (filter === "Completed") return isCompleted(tor);
      if (filter === "Stalled") return isStalled(tor);
      return true;
    });
  }, [torrents, filter]);

  // Poll torrents every 2s when connected
  useEffect(() => {
    if (!connected) return;
    let alive = true;
    const tick = async () => {
      try {
        if (clientRef.current?.sid) {
          SecureStore.setItemAsync(SS_KEYS.sid, clientRef.current.sid);
        }
        const list = await clientRef.current!.torrentsInfo("all");
        if (alive) setTorrents(list as Torrent[]);
      } catch (e) {
        console.warn(e);
        // Probably disconnected
        await onLogin();
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [connected]);

  useEffect(() => {
    (async () => {
      try {
        const [savedHost, savedUser, savedPass, savedSid] = await Promise.all([
          SecureStore.getItemAsync(SS_KEYS.host),
          SecureStore.getItemAsync(SS_KEYS.user),
          SecureStore.getItemAsync(SS_KEYS.pass),
          SecureStore.getItemAsync(SS_KEYS.sid),
        ]);

        if (savedHost) setHost(savedHost);
        if (savedUser) setUsername(savedUser);
        if (savedPass) setPassword(savedPass);

        if (savedHost) clientRef.current = new QBClient(savedHost);
        if (savedSid && clientRef.current) {
          // Try existing session first
          clientRef.current.sid = savedSid;
          try {
            const list = await clientRef.current.torrentsInfo("all");
            setTorrents(list as any);
            setConnected(true);
          } catch {
            // SID expired → stay on connect screen and let user hit Connect
          }
        }
      } catch {}
    })();
  }, []);

  const onLogin = async () => {
    try {
      setLoading(true);
      clientRef.current = new QBClient(host);
      await clientRef.current.login(username, password);
      await new Promise((res) => setTimeout(res, 300));
      setConnected(true);

      if (remember) {
        await Promise.all([
          SecureStore.setItemAsync(SS_KEYS.host, host),
          SecureStore.setItemAsync(SS_KEYS.user, username),
          SecureStore.setItemAsync(SS_KEYS.pass, password),
          SecureStore.setItemAsync(SS_KEYS.sid, clientRef.current!.sid || ""),
        ]);
      } else {
        await Promise.all([
          SecureStore.deleteItemAsync(SS_KEYS.host),
          SecureStore.deleteItemAsync(SS_KEYS.user),
          SecureStore.deleteItemAsync(SS_KEYS.pass),
          SecureStore.deleteItemAsync(SS_KEYS.sid),
        ]);
      }
    } catch (e: any) {
      Alert.alert("Login failed", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      await clientRef.current?.logout();
    } catch {}
    setConnected(false);
    clientRef.current = null;
    setTorrents([]);
    setAddUrl("");
    await SecureStore.deleteItemAsync(SS_KEYS.sid);
  };

  const onAdd = async () => {
    if (!addUrl.trim()) return;
    try {
      await clientRef.current!.addTorrentUrl(addUrl.trim());
      setAddUrl("");
    } catch (e: any) {
      Alert.alert("Add failed", e?.message || String(e));
    }
  };

  const withConfirm = (title: string, fn: () => Promise<any>) => {
    Alert.alert(title, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "OK",
        onPress: () => fn().catch((err) => Alert.alert("Error", String(err))),
      },
    ]);
  };

  const rowActions = (tor: Torrent) => ({
    pause: () =>
      clientRef
        .current!.pause(tor.hash)
        .catch((e) => Alert.alert("Pause failed", String(e))),
    resume: () =>
      clientRef
        .current!.resume(tor.hash)
        .catch((e) => Alert.alert("Resume failed", String(e))),
    recheck: () =>
      clientRef
        .current!.recheck(tor.hash)
        .catch((e) => Alert.alert("Recheck failed", String(e))),
    reannounce: () =>
      clientRef
        .current!.reannounce(tor.hash)
        .catch((e) => Alert.alert("Reannounce failed", String(e))),
    delete: () =>
      withConfirm("Delete torrent?", () =>
        clientRef.current!.delete(tor.hash, false)
      ),
  });

  const statusBarStyle = dark
    ? "light-content"
    : Platform.OS === "ios"
    ? "dark-content"
    : "default";

  if (!connected)
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle={statusBarStyle as any} />
        <Text style={styles.title}>Traktus</Text>
        <Text style={styles.subtitle}>Remote · Connect</Text>

        <View style={styles.card}>
          <LabeledInput
            t={t}
            label="Host"
            value={host}
            onChangeText={setHost}
            placeholder="http://192.168.1.10:8080"
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <LabeledInput
            t={t}
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <LabeledInput
            t={t}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: t.text, fontWeight: "600" }}>
              Keep me logged in
            </Text>
            <TouchableOpacity
              onPress={() => setRemember(!remember)}
              style={{
                width: 56,
                height: 32,
                borderRadius: 16,
                backgroundColor: remember ? t.blue : t.border,
                padding: 4,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "white",
                  marginLeft: remember ? 24 : 0,
                }}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onLogin}
            disabled={loading}
            style={[
              styles.primaryBtn,
              { backgroundColor: loading ? "#A7C4FF" : t.blue },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.helper}>
          Make sure qBittorrent Web UI is enabled and reachable from your phone.
        </Text>

        <View style={{ alignItems: "center", marginTop: 12 }}>
          <TouchableOpacity
            onPress={() =>
              setThemeMode(
                themeMode === "system"
                  ? "dark"
                  : themeMode === "dark"
                  ? "light"
                  : "system"
              )
            }
            style={[
              styles.headerBtn,
              { backgroundColor: t.card, borderColor: t.border },
            ]}
          >
            <Text style={[styles.headerBtnText, { color: t.text }]}>
              Theme: {themeMode}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle={statusBarStyle as any} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Traktus</Text>
          <Text style={styles.headerSub}>
            Remote · <Text style={{ color: t.green }}>Connected</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() =>
              setThemeMode(
                themeMode === "system"
                  ? "dark"
                  : themeMode === "dark"
                  ? "light"
                  : "system"
              )
            }
            style={[styles.headerBtn, { borderColor: t.border }]}
          >
            <Text style={[styles.headerBtnText, { color: t.text }]}>
              Theme: {themeMode}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={[styles.headerBtn, { borderColor: t.border }]}
          >
            <Text style={[styles.headerBtnText, { color: t.text }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add bar */}
      <View style={styles.addBar}>
        <TextInput
          value={addUrl}
          onChangeText={setAddUrl}
          placeholder="Paste magnet / .torrent URL"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholderTextColor={t.subtle}
          selectionColor={t.blue}
        />
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: t.blue }]}
          onPress={onAdd}
        >
          <Text style={styles.primaryBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(["All", "Active", "Completed", "Stalled"] as FilterKey[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f ? t.blue : t.light,
                borderColor: filter === f ? t.blue : t.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === f ? "white" : t.text },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {torrents.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: t.subtle }}>No torrents yet</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={filtered}
          keyExtractor={(tor) => tor.hash}
          renderItem={({ item }) => (
            <TorrentRow t={item} on={rowActions(item)} tPalette={t} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ----- UI Pieces -----
function LabeledInput({ t, label, style, ...props }: any) {
  const styles = makeStyles(t);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: t.subtle, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        {...props}
        style={[styles.input, style]}
        placeholderTextColor={t.subtle}
        selectionColor={t.blue}
        keyboardAppearance={t === paletteDark ? "dark" : "light"}
        clearButtonMode="while-editing"
        returnKeyType="done"
      />
    </View>
  );
}

function ProgressBar({ value, t }: { value: number; t: Theme }) {
  const styles = makeStyles(t);
  return (
    <View
      style={
        t === paletteDark ? styles.progressOuterDark : styles.progressOuter
      }
    >
      <View
        style={[
          styles.progressInner,
          {
            width: `${Math.max(0, Math.min(100, Math.round(value * 100)))}%`,
            backgroundColor: t.blue,
          },
        ]}
      />
    </View>
  );
}

function TorrentRow({
  t,
  on,
  tPalette,
}: {
  t: Torrent;
  on: any;
  tPalette: Theme;
}) {
  const styles = makeStyles(tPalette);
  const statusColor = t.state.includes("seeding")
    ? tPalette.green
    : t.progress >= 1
    ? tPalette.subtle
    : tPalette.blue;
  return (
    <View style={[styles.card, { padding: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: t.state.includes("seeding")
              ? tPalette.green
              : tPalette.blue,
            marginRight: 8,
          }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: tPalette.text,
          }}
          numberOfLines={2}
        >
          {t.name}
        </Text>
      </View>

      <View style={{ marginTop: 8 }}>
        <ProgressBar value={t.progress} t={tPalette} />
        <View
          style={{
            marginTop: 6,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Text style={styles.meta}>
            {pct(t.progress)} · {bytes(t.size)}
          </Text>
          <Text style={styles.meta}>↓ {bytes(t.dlspeed)}/s</Text>
          <Text style={styles.meta}>↑ {bytes(t.upspeed)}/s</Text>
          <Text style={styles.meta}>
            Seeds {t.num_seeds} · Peers {t.num_leechs}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: statusColor,
            marginBottom: 8,
          }}
        >
          {t.state}
        </Text>
        {/* Horizontal scroll actions to prevent overflow */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Pill title="Resume" onPress={on.resume} t={tPalette} />
          <Pill title="Pause" onPress={on.pause} t={tPalette} />
          <Pill title="Recheck" onPress={on.recheck} t={tPalette} />
          <Pill title="Reannounce" onPress={on.reannounce} t={tPalette} />
          <Pill title="Delete" onPress={on.delete} destructive t={tPalette} />
        </ScrollView>
      </View>
    </View>
  );
}

function Pill({
  title,
  onPress,
  destructive,
  t,
}: {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  t: Theme;
}) {
  const styles = makeStyles(t);
  let iconName: keyof typeof Feather.glyphMap = "circle";
  let iconColor = destructive ? t.red : t.text;
  switch (title) {
    case "Resume":
      iconName = "play";
      break;
    case "Pause":
      iconName = "pause";
      break;
    case "Recheck":
      iconName = "refresh-cw";
      break;
    case "Reannounce":
      iconName = "repeat";
      break;
    case "Delete":
      iconName = "trash-2";
      break;
    default:
      iconName = "circle";
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: destructive ? "#fecaca" : t.border,
          backgroundColor: destructive
            ? t === paletteDark
              ? "#3b1020"
              : "#fff1f2"
            : t.card,
        },
      ]}
    >
      <Feather name={iconName} size={20} color={iconColor} />
    </TouchableOpacity>
  );
}
