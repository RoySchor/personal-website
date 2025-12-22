import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    host: true,
    proxy: {
      "/screen": {
        target: "http://localhost:5174",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
