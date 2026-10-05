import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      includeAssets: [
        "favicon.ico",
        "favicon-16.png",
        "favicon-32.png",
        "apple-touch-icon.png",
        "brand/*.png",
        "icons/*.png",
        "robots.txt",
      ],
      manifest: {
        name: "PFRAM Telemedicine",
        short_name: "PFRAM",
        description: "Pantau Kehamilan, Lindungi Ibu dan Bayi",
        start_url: "/m",
        scope: "/",
        display: "standalone",
        theme_color: "#168C68",
        background_color: "#FFF8F2",
        lang: "id",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Precache only app shell and static brand assets
        // Explicitly zero runtime caching for sensitive clinical / auth API
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");
          if (normalized.includes("/node_modules/")) {
            if (
              normalized.includes("/react/") ||
              normalized.includes("/react-dom/") ||
              normalized.includes("/react-router/") ||
              normalized.includes("/react-router-dom/")
            ) {
              return "vendor-react";
            }
            if (
              normalized.includes("/@tanstack/") ||
              normalized.includes("/react-query/")
            ) {
              return "vendor-query";
            }
            if (
              normalized.includes("/zod/") ||
              normalized.includes("/react-hook-form/") ||
              normalized.includes("/@hookform/")
            ) {
              return "vendor-form";
            }
            return "vendor-common";
          }
          if (normalized.includes("/apps/web/src/pwa/")) {
            return "portal-mother";
          }
          if (
            normalized.includes("/apps/web/src/stage3") ||
            normalized.includes("/apps/web/src/Midwife") ||
            normalized.includes("/apps/web/src/Admin")
          ) {
            return "portal-staff";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3200",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3200",
        changeOrigin: true,
      },
    },
  },
});
