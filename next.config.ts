import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be opened from your laptop's LAN IP (phone, tablet,
  // another computer on the same Wi-Fi), not just localhost. Next blocks
  // cross-origin dev requests unless the origin is listed here.
  // `*` matches one address segment, so these cover whole subnets.
  allowedDevOrigins: [
    "172.20.10.3", // current IP
    "192.168.0.*",
    "192.168.1.*",
    "192.168.100.*",
    "172.20.10.*", // iPhone/USB hotspot
    "10.0.0.*",
    "10.0.1.*",
  ],
};

export default nextConfig;
