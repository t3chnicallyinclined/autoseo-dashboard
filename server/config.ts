/** Platform metadata and connection-status derivation from env vars. */

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: "connected" | "pending" | "expired" | "not_configured";
  handle: string | null;
  note: string | null;
  quotaTotal: number | null;
}

const PLATFORM_DEFS: Omit<PlatformConfig, "status" | "handle" | "note">[] = [
  { id: "youtube", name: "YouTube Shorts", icon: "YT", color: "#ef4444", quotaTotal: 10000 },
  { id: "bluesky", name: "Bluesky", icon: "BS", color: "#0085ff", quotaTotal: null },
  { id: "tiktok", name: "TikTok", icon: "TT", color: "#ff0050", quotaTotal: null },
  { id: "instagram", name: "Instagram Reels", icon: "IG", color: "#e1306c", quotaTotal: null },
  { id: "linkedin", name: "LinkedIn", icon: "LI", color: "#0077b5", quotaTotal: null },
  { id: "threads", name: "Threads", icon: "TH", color: "#101010", quotaTotal: null },
];

/**
 * Determine connection status for each platform based on env vars.
 * Mirrors the Rust config.rs credential checks.
 */
export function getPlatformConfigs(): PlatformConfig[] {
  return PLATFORM_DEFS.map((def) => {
    const { status, handle, note } = deriveStatus(def.id);
    return { ...def, status, handle, note };
  });
}

function deriveStatus(platformId: string): Pick<PlatformConfig, "status" | "handle" | "note"> {
  switch (platformId) {
    case "youtube": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      if (!clientId || !clientSecret || !refreshToken) {
        return { status: "not_configured", handle: null, note: null };
      }
      return {
        status: "connected",
        handle: process.env.YOUTUBE_CHANNEL_HANDLE || null,
        note: null,
      };
    }
    case "bluesky": {
      const bsHandle = process.env.BLUESKY_HANDLE;
      const bsPassword = process.env.BLUESKY_APP_PASSWORD;
      if (!bsHandle || !bsPassword) {
        return { status: "not_configured", handle: null, note: null };
      }
      return { status: "connected", handle: `@${bsHandle}`, note: null };
    }
    case "tiktok": {
      const ttKey = process.env.TIKTOK_CLIENT_KEY;
      const ttSecret = process.env.TIKTOK_CLIENT_SECRET;
      if (!ttKey || !ttSecret) {
        return { status: "not_configured", handle: null, note: null };
      }
      return {
        status: process.env.TIKTOK_ACCESS_TOKEN ? "connected" : "pending",
        handle: process.env.TIKTOK_HANDLE || null,
        note: !process.env.TIKTOK_ACCESS_TOKEN ? "App review pending" : null,
      };
    }
    case "instagram": {
      const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!igToken) {
        return { status: "not_configured", handle: null, note: null };
      }
      return { status: "connected", handle: process.env.INSTAGRAM_HANDLE || null, note: null };
    }
    case "linkedin": {
      const liToken = process.env.LINKEDIN_ACCESS_TOKEN;
      if (!liToken) {
        return { status: "not_configured", handle: null, note: null };
      }
      const expired = process.env.LINKEDIN_TOKEN_EXPIRED === "true";
      return {
        status: expired ? "expired" : "connected",
        handle: process.env.LINKEDIN_HANDLE || null,
        note: expired ? "Token expired — reconnect" : null,
      };
    }
    case "threads": {
      const thToken = process.env.THREADS_ACCESS_TOKEN;
      if (!thToken) {
        return { status: "not_configured", handle: null, note: null };
      }
      return { status: "connected", handle: process.env.THREADS_HANDLE || null, note: null };
    }
    default:
      return { status: "not_configured", handle: null, note: null };
  }
}
