import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type QASLFixtures = {
    loginPage: LoginPage;
};

export const test = base.extend<QASLFixtures>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    }
});

export { expect };
