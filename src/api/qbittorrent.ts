// qBittorrent API Client (cookie-based)
export type Torrent = {
  hash: string;
  name: string;
  progress: number;
  size: number;
  dlspeed: number;
  upspeed: number;
  num_leechs: number;
  num_seeds: number;
  state: string;
};

export class QBClient {
  baseUrl: string;
  sid: string | null = null;

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
