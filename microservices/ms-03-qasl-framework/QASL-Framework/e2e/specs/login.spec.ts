import { test, expect } from '../test-base/TestBase';
import { Allure } from '../utils/AllureDecorators';
import { DBReader, HUTestPlan } from '../utils/DBReader';

const HU_ID = 'HU_LOGIN_01';

let testPlan: HUTestPlan | null;

test.beforeAll(async () => {
    const db = new DBReader();
    testPlan = await db.getTestPlanByHU(HU_ID);
    await db.close();
});

test.describe('TS-01: Escenarios Positivos - Login', () => {

    test.beforeEach(async () => {
        await Allure.setup({
            epic: testPlan?.epic_nombre || 'Autenticacion y Seguridad',
            feature: 'Login de Usuario',
            story: `${HU_ID}: ${testPlan?.hu_nombre || 'Login'}`,
            severity: 'critical',
            owner: 'QASL NEXUS LLM',
            tags: ['e2e', 'login', 'positivo', 'smoke']
        });
    });

    test('TC-001: Login exitoso con credenciales validas', async ({ loginPage }) => {
        await Allure.parameter('HU', HU_ID);
        await Allure.parameter('VCR', String(testPlan?.vcr_total || 0));

        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa credenciales validas', async () => {
            await loginPage.login('admin@test.local', 'Test123!');
        });

        await Allure.step('ENTONCES accede al dashboard correctamente', async () => {
            await expect(loginPage.dashboardTitle).toBeVisible();
        });
    });

    test('TC-002: Login exitoso y verificacion de sesion activa', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa credenciales validas y accede', async () => {
            await loginPage.loginAndWaitForDashboard('admin@test.local', 'Test123!');
        });

        await Allure.step('ENTONCES el boton de logout esta visible', async () => {
            await expect(loginPage.logoutButton).toBeVisible();
        });
    });
});

test.describe('TS-02: Escenarios Negativos - Login', () => {

    test.beforeEach(async () => {
        await Allure.setup({
            epic: testPlan?.epic_nombre || 'Autenticacion y Seguridad',
            feature: 'Login de Usuario',
            story: `${HU_ID}: ${testPlan?.hu_nombre || 'Login'}`,
            severity: 'critical',
            owner: 'QASL NEXUS LLM',
            tags: ['e2e', 'login', 'negativo']
        });
    });

    test('TC-003: Login fallido con password incorrecto', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa un password incorrecto', async () => {
            await loginPage.loginWithInvalidCredentials('admin@test.local', 'WrongPassword');
        });

        await Allure.step('ENTONCES se muestra mensaje de error', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
        });
    });

    test('TC-004: Login fallido con email no registrado', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa un email que no existe', async () => {
            await loginPage.loginWithInvalidCredentials('noexiste@test.local', 'Test123!');
        });

        await Allure.step('ENTONCES se muestra mensaje de credenciales invalidas', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
        });
    });

    test('TC-005: Login fallido con campos vacios', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO hace clic en submit sin llenar campos', async () => {
            await loginPage.submitButton.click();
        });

        await Allure.step('ENTONCES se muestra validacion de campos requeridos', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
        });
    });

    test('TC-006: Login fallido con formato de email invalido', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa un email con formato invalido', async () => {
            await loginPage.loginWithInvalidCredentials('email-invalido', 'Test123!');
        });

        await Allure.step('ENTONCES se muestra error de formato de email', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
        });
    });
});

test.describe('TS-03: Seguridad OWASP - Login', () => {

    test.beforeEach(async () => {
        await Allure.setup({
            epic: testPlan?.epic_nombre || 'Autenticacion y Seguridad',
            feature: 'Login de Usuario - Seguridad',
            story: `${HU_ID}: ${testPlan?.hu_nombre || 'Login'}`,
            severity: 'blocker',
            owner: 'QASL NEXUS LLM',
            tags: ['e2e', 'login', 'seguridad', 'owasp']
        });
    });

    test('TC-007: Bloqueo de cuenta tras 3 intentos fallidos', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa password incorrecto 3 veces consecutivas', async () => {
            await loginPage.attemptLoginMultipleTimes('admin@test.local', 'WrongPass', 3);
        });

        await Allure.step('ENTONCES la cuenta se bloquea y muestra mensaje de lockout', async () => {
            await expect(loginPage.lockoutMessage).toBeVisible();
        });
    });

    test('TC-008: Proteccion contra inyeccion SQL en login', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO intenta inyeccion SQL en el campo email', async () => {
            await loginPage.loginWithInvalidCredentials("' OR 1=1 --", 'Test123!');
        });

        await Allure.step('ENTONCES el sistema rechaza el intento sin exponer informacion', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
            await expect(loginPage.dashboardTitle).not.toBeVisible();
        });
    });

    test('TC-009: Proteccion contra XSS en campos de login', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO intenta XSS en el campo email', async () => {
            await loginPage.loginWithInvalidCredentials('<script>alert("xss")</script>', 'Test123!');
        });

        await Allure.step('ENTONCES el sistema sanitiza la entrada', async () => {
            await expect(loginPage.errorMessage).toBeVisible();
        });
    });

    test('TC-010: Password no visible en texto plano', async ({ loginPage }) => {
        await Allure.step('DADO que el usuario navega a la pagina de login', async () => {
            await loginPage.navigate();
        });

        await Allure.step('CUANDO ingresa el password', async () => {
            await loginPage.passwordInput.fill('Test123!');
        });

        await Allure.step('ENTONCES el campo password tiene type=password', async () => {
            await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
        });
    });
});
