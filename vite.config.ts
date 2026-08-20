import { defineConfig } from "vite";

// base: "./" keeps built asset URLs relative so the app works regardless of
// which path/domain it's hosted behind (Telegram Mini Apps are opened via a
// bot-configured URL, not necessarily served from a domain root).
export default defineConfig({
  base: "./",
});
