import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // Relative base so the built bundle works on any subpath — GitHub Pages
  // (yotamlevit.github.io/HTTPVisualizer/), a custom domain, or `vite preview`
  // at the root all resolve assets correctly.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
