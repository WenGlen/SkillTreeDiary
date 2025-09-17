import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/SkillTreeDiary/" : "/",  // 👈 build 才用子路徑
}));

