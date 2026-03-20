/** @type {import('next').NextConfig} */
const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      (process.env.NODE_ENV === "production" ? PRODUCTION_GO_API_DEFAULT : ""),
  },
};

export default nextConfig


