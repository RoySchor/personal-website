/* global console */
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
        ws: true,
        // A phone that sleeps or closes the tab drops its sockets mid-stream; without a
        // handler the reset is an unhandled 'error' and takes the whole dev server down.
        configure: (proxy) => {
          proxy.on("error", (err) => console.warn(`[screen proxy] ${err.message}`));
          proxy.on("proxyReqWs", (_proxyReq, _req, socket) => {
            socket.on("error", (err) => console.warn(`[screen proxy ws] ${err.message}`));
          });
        },
      },
    },
  },
});
