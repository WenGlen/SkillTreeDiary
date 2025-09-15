// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/SkillTreeDiary/', // ← 這裡改成你的 repo 名稱
})
