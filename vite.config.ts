import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react({
    babel: {
      compact: false,
    }
  })],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/xlsx")) return "spreadsheet";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) return "maps";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/react") || id.includes("node_modules/@tanstack")) return "react-vendor";
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
