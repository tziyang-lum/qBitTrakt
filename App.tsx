// App.tsx — Expo React Native qBitTrakt Remote (with logout + dark mode + layout fixes)

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  useColorScheme,
} from "react-native";

import { paletteLight, paletteDark } from "./src/theme/palettes";
import { makeStyles } from "./src/theme/styles";
import { QBClient, Torrent } from "./src/api/qbittorrent";
import { isActive, isCompleted, isStalled } from "./src/utils/format";
import * as SecureStore from "expo-secure-store";
import { LabeledInput } from "@/components/LabeledInput";
import { TorrentRow } from "@/components/TorrentRow";
import { SettingsSheet } from "@/components/SettingsSheet";

type FilterKey = "All" | "Active" | "Completed" | "Stalled";
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
  const [showSettings, setShowSettings] = useState(false);

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
        <Text style={styles.title}>qBitTrakt</Text>
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
          <Text style={styles.headerTitle}>qBitTrakt</Text>
          <Text style={styles.headerSub}>
            Remote · <Text style={{ color: t.green }}>Connected</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={[styles.headerBtn, { borderColor: t.border }]}
          >
            <Text style={[styles.headerBtnText, { color: t.text }]}>
              Settings
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
          style={[styles.input, { flexShrink: 1 }]}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholderTextColor={t.subtle}
          selectionColor={t.blue}
          scrollEnabled
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
      <SettingsSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        t={t}
      />
    </SafeAreaView>
  );
}
