import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  reporter: [
    ['./src/reporter.ts'],
    ['html', { outputFolder: 'reports/html' }],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        FRAMEWORK: 'INGRID-AI-Testing-Framework',
        TARGET: process.env.CHATBOT_URL || 'Not configured',
        NODE_VERSION: process.version,
      },
    }],
    ['json', { outputFile: 'reports/results.json' }],
  ],

  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: process.env.CHATBOT_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'on',
    video: 'on',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo: 100,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
