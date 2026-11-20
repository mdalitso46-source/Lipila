import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lipila",
    short_name: "Lipila",
    description: "Send USDC or lumens to a Zambian phone number on Stellar testnet.",
    start_url: "/",
    display: "standalone",
    background_color: "#081C15",
    theme_color: "#081C15",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
