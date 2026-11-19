import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@stellar/stellar-sdk", "pg", "@netlify/database"],
};

export default nextConfig;
