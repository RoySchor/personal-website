import { defineConfig } from "vite";

export default defineConfig({
  base: "/personal-website/",
  server: {
    host: true,
    proxy: {
      "/personal-website/screen": {
        target: "http://localhost:5174",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
