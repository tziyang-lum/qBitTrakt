import { View, Text, ScrollView } from "react-native";
import { Torrent } from "../api/qbittorrent";
import { Theme } from "../theme/palettes";
import { makeStyles } from "../theme/styles";
import { bytes, pct } from "../utils/format";
import { ProgressBar } from "./ProgressBar";
import { Pill } from "./Pill";

interface TorrentRowProps {
  t: Torrent;
  on: any;
  tPalette: Theme;
}

export function TorrentRow({ t, on, tPalette }: TorrentRowProps) {
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
