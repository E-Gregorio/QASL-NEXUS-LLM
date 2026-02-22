import { Page, Locator } from '@playwright/test';
import { LoginLocators } from '../locators/LoginLocators';

export class LoginPage {
    readonly page: Page;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly errorMessage: Locator;
    readonly successMessage: Locator;
    readonly lockoutMessage: Locator;
    readonly dashboardTitle: Locator;
    readonly logoutButton: Locator;
    readonly sessionExpiredModal: Locator;
    readonly loadingSpinner: Locator;

    constructor(page: Page) {
        this.page = page;
        this.emailInput = page.locator(LoginLocators.emailInput);
        this.passwordInput = page.locator(LoginLocators.passwordInput);
        this.submitButton = page.locator(LoginLocators.submitButton);
        this.errorMessage = page.locator(LoginLocators.errorMessage);
        this.successMessage = page.locator(LoginLocators.successMessage);
        this.lockoutMessage = page.locator(LoginLocators.lockoutMessage);
        this.dashboardTitle = page.locator(LoginLocators.dashboardTitle);
        this.logoutButton = page.locator(LoginLocators.logoutButton);
        this.sessionExpiredModal = page.locator(LoginLocators.sessionExpiredModal);
        this.loadingSpinner = page.locator(LoginLocators.loadingSpinner);
    }

    async navigate(): Promise<void> {
        await this.page.goto('/login');
    }

    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
        await this.login(email, password);
        await this.dashboardTitle.waitFor({ state: 'visible' });
    }

    async loginWithInvalidCredentials(email: string, password: string): Promise<void> {
        await this.login(email, password);
        await this.errorMessage.waitFor({ state: 'visible' });
    }

    async attemptLoginMultipleTimes(email: string, password: string, times: number): Promise<void> {
        for (let i = 0; i < times; i++) {
            await this.emailInput.fill(email);
            await this.passwordInput.fill(password);
            await this.submitButton.click();
            if (i < times - 1) {
                await this.errorMessage.waitFor({ state: 'visible' });
            }
        }
    }

    async logout(): Promise<void> {
        await this.logoutButton.click();
    }

    async getErrorText(): Promise<string> {
        return await this.errorMessage.textContent() || '';
    }

    async getLockoutText(): Promise<string> {
        return await this.lockoutMessage.textContent() || '';
    }

    async isSessionExpiredVisible(): Promise<boolean> {
        return await this.sessionExpiredModal.isVisible();
    }
}
