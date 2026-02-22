export const LoginLocators = {
    emailInput: '[data-testid="login-email"]',
    passwordInput: '[data-testid="login-password"]',
    submitButton: '[data-testid="login-submit"]',
    errorMessage: '[data-testid="login-error"]',
    successMessage: '[data-testid="login-success"]',
    lockoutMessage: '[data-testid="login-lockout"]',
    dashboardTitle: '[data-testid="dashboard-title"]',
    logoutButton: '[data-testid="logout-button"]',
    forgotPasswordLink: '[data-testid="forgot-password"]',
    rememberMeCheckbox: '[data-testid="remember-me"]',
    sessionExpiredModal: '[data-testid="session-expired"]',
    loadingSpinner: '[data-testid="loading-spinner"]',

    emailInputFallback: '#email',
    passwordInputFallback: '#password',
    submitButtonFallback: 'button[type="submit"]',
    errorMessageFallback: '.error-message',
    dashboardTitleFallback: 'h1'
} as const;
