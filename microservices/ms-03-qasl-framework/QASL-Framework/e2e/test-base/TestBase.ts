import { test as base, expect as pwExpect, Page } from '@playwright/test';
import { DemoQaPage } from '../pages/DemoQaPage';

type Fixtures = {
  demoQaPage: DemoQaPage;
};

export const test = base.extend<Fixtures>({
  demoQaPage: async ({ page }, use) => {
    const demoQaPage = new DemoQaPage(page);
    await use(demoQaPage);
  },
});

export const expect = pwExpect;
