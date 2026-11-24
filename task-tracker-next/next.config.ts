import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A real HTTP redirect. The page.tsx redirect alone is sent after streaming starts (loading.tsx), so it would answer 200.
  async redirects() {
    return [{ source: "/", destination: "/tasks", permanent: false }];
  },
};

export default nextConfig;
