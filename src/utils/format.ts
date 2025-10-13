import { Torrent } from "../api/qbittorrent";

export const bytes = (n: number) => {
  if (n <= 0 || Number.isNaN(n)) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

export const pct = (p: number) => `${Math.round((p || 0) * 100)}%`;

export const isActive = (t: Torrent) =>
  ["downloading", "stalledDL", "queuedDL", "checkingDL", "uploading"].some(
    (s) => t.state.includes(s)
  ) ||
  (t.progress < 1 && t.dlspeed > 0);
export const isCompleted = (t: Torrent) =>
  t.progress >= 1 ||
  t.state.includes("seeding") ||
  t.state.includes("pausedUP");
export const isStalled = (t: Torrent) =>
  t.state.includes("stalled") || (t.progress < 1 && t.dlspeed === 0);
