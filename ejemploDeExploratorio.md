import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Exploración - ABL Hotelería 2026
 *
 * Este script entra a la app y captura:
 * - HTML completo de la página
 * - Todos los elementos interactivos (inputs, buttons, selects)
 * - Estructura de tablas
 * - URLs de APIs que se llaman
 *
 * Los resultados se guardan en la carpeta 'exploracion/'
 */

const DELAY = 2000;

test.describe('Exploración App ABL Hotelería 2026', () => {

  test('Capturar estructura completa de la aplicación', async ({ page }) => {

    // Crear carpeta para resultados
    const exploracionDir = path.join(process.cwd(), 'exploracion');
    if (!fs.existsSync(exploracionDir)) {
      fs.mkdirSync(exploracionDir, { recursive: true });
    }

    // Array para capturar llamadas de red (APIs)
    const apiCalls: string[] = [];

    // Interceptar todas las llamadas de red
    page.on('request', request => {
      const url = request.url();
      if (url.includes('api') || url.includes('service') || url.includes('.json') ||
          request.method() === 'POST' || url.includes('agip')) {
        apiCalls.push(`${request.method()} ${url}`);
      }
    });

    // ==========================================
    // FLUJO DE ACCESO (igual que antes)
    // ==========================================
    console.log('=== INICIANDO EXPLORACIÓN ===\n');
    console.log('PASO 1: Accediendo al formulario...');
    await page.goto('https://dp002018.agip.gov.ar/testsJava/test.html');
    await page.waitForTimeout(DELAY);

    // Configurar campos
    console.log('PASO 2: Configurando campos...');
    const serviciosSelect = page.locator('select').first();
    await serviciosSelect.selectOption({ label: 'Alivio Fiscal Hoteleria 2021 - Desarrollo' });

    const servidor = page.locator('tr:has-text("Servidor") input').first();
    await servidor.clear();
    await servidor.fill('hml.agip.gob.ar');
    await page.waitForTimeout(DELAY);

    // Ingresar
    console.log('PASO 3: Ingresando...');
    const btnIngresar = page.locator('input[value="ingresar"]').first();
    await btnIngresar.click();

    // Esperar navegación
    console.log('Esperando redirección...');
    await page.waitForURL('**/AlivioFiscalHotelero/**', { timeout: 60000 });
    await page.waitForTimeout(DELAY);

    // Cambiar a app 2026
    console.log('PASO 4: Cambiando a app 2026...');
    const urlActual = page.url();
    const url2026 = urlActual.replace('AlivioFiscalHotelero', 'ExencionInmABLHoteleria2026');
    await page.goto(url2026);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DELAY);

    console.log('\n=== DENTRO DE LA APP 2026 ===\n');
    console.log('URL: ' + page.url());

    // ==========================================
    // CAPTURAR INFORMACIÓN DE LA PÁGINA
    // ==========================================

    // 1. Screenshot completo
    console.log('\n📸 Capturando screenshot...');
    await page.screenshot({
      path: path.join(exploracionDir, '01-pantalla-principal.png'),
      fullPage: true
    });

    // 2. HTML completo
    console.log('📄 Capturando HTML...');
    const htmlCompleto = await page.content();
    fs.writeFileSync(
      path.join(exploracionDir, '02-html-completo.html'),
      htmlCompleto
    );

    // 3. Extraer información de elementos
    console.log('🔍 Analizando elementos...');

    const elementosInfo = await page.evaluate(() => {
      const info: any = {
        titulo: document.title,
        h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent?.trim()),
        h2: Array.from(document.querySelectorAll('h2')).map(el => el.textContent?.trim()),

        // Formularios
        formularios: Array.from(document.querySelectorAll('form')).map(form => ({
          id: form.id,
          name: form.getAttribute('name'),
          action: form.action,
          method: form.method
        })),

        // Inputs
        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          id: input.id,
          name: input.name,
          placeholder: input.placeholder,
          value: input.value,
          class: input.className
        })),

        // Selects (dropdowns)
        selects: Array.from(document.querySelectorAll('select')).map(select => ({
          id: select.id,
          name: select.name,
          options: Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
          }))
        })),

        // Botones
        botones: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(btn => ({
          type: btn.getAttribute('type'),
          id: btn.id,
          text: btn.textContent?.trim() || (btn as HTMLInputElement).value,
          class: btn.className
        })),

        // Tablas
        tablas: Array.from(document.querySelectorAll('table')).map(table => ({
          id: table.id,
          class: table.className,
          headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
          rowCount: table.querySelectorAll('tr').length
        })),

        // Links
        links: Array.from(document.querySelectorAll('a')).map(a => ({
          href: a.href,
          text: a.textContent?.trim()
        })),

        // Textos importantes (labels, spans con info)
        labels: Array.from(document.querySelectorAll('label')).map(label => ({
          for: label.htmlFor,
          text: label.textContent?.trim()
        })),

        // Divs con clases importantes (contenedores)
        contenedores: Array.from(document.querySelectorAll('div[class*="container"], div[class*="card"], div[class*="panel"], div[class*="modal"]')).map(div => ({
          class: div.className,
          id: div.id
        }))
      };

      return info;
    });

    // 4. Guardar análisis
    fs.writeFileSync(
      path.join(exploracionDir, '03-elementos-analizados.json'),
      JSON.stringify(elementosInfo, null, 2)
    );

    // 5. Guardar llamadas API
    fs.writeFileSync(
      path.join(exploracionDir, '04-api-calls.txt'),
      apiCalls.join('\n')
    );

    // ==========================================
    // MOSTRAR RESUMEN EN CONSOLA
    // ==========================================
    console.log('\n========================================');
    console.log('📊 RESUMEN DE LA EXPLORACIÓN');
    console.log('========================================\n');

    console.log('📌 TÍTULO:', elementosInfo.titulo);
    console.log('\n📌 ENCABEZADOS H1:', elementosInfo.h1);
    console.log('📌 ENCABEZADOS H2:', elementosInfo.h2);

    console.log('\n📌 FORMULARIOS encontrados:', elementosInfo.formularios.length);
    elementosInfo.formularios.forEach((f: any, i: number) => {
      console.log(`   ${i+1}. ID: ${f.id || 'sin-id'}, Action: ${f.action}`);
    });

    console.log('\n📌 INPUTS encontrados:', elementosInfo.inputs.length);
    elementosInfo.inputs.forEach((inp: any, i: number) => {
      console.log(`   ${i+1}. [${inp.type}] name="${inp.name}" id="${inp.id}" placeholder="${inp.placeholder}"`);
    });

    console.log('\n📌 SELECTS (dropdowns):', elementosInfo.selects.length);
    elementosInfo.selects.forEach((sel: any, i: number) => {
      console.log(`   ${i+1}. name="${sel.name}" con ${sel.options.length} opciones`);
      sel.options.slice(0, 5).forEach((opt: any) => {
        console.log(`      - ${opt.value}: ${opt.text}`);
      });
      if (sel.options.length > 5) console.log(`      ... y ${sel.options.length - 5} más`);
    });

    console.log('\n📌 BOTONES:', elementosInfo.botones.length);
    elementosInfo.botones.forEach((btn: any, i: number) => {
      console.log(`   ${i+1}. "${btn.text}" [${btn.type}] class="${btn.class}"`);
    });

    console.log('\n📌 TABLAS:', elementosInfo.tablas.length);
    elementosInfo.tablas.forEach((tbl: any, i: number) => {
      console.log(`   ${i+1}. Headers: ${tbl.headers.join(', ')}`);
      console.log(`      Filas: ${tbl.rowCount}`);
    });

    console.log('\n📌 LLAMADAS API capturadas:', apiCalls.length);
    apiCalls.slice(0, 10).forEach((call, i) => {
      console.log(`   ${i+1}. ${call}`);
    });

    console.log('\n========================================');
    console.log('✅ Exploración completada!');
    console.log('📁 Resultados guardados en: exploracion/');
    console.log('========================================\n');

    // Screenshot final
    await page.screenshot({
      path: path.join(exploracionDir, '05-estado-final.png'),
      fullPage: true
    });
  });

});
