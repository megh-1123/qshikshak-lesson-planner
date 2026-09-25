import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// All date logic works on local "YYYY-MM-DD" strings, so pin the timezone
// to keep results identical on every machine / CI runner.
process.env.TZ = 'Asia/Kolkata';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.js'],
      include: ['tests/**/*.test.{js,jsx}'],
      restoreMocks: true,
    },
  }),
);