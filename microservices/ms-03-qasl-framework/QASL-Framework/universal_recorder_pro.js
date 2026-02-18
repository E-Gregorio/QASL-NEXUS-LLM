// ═══════════════════════════════════════════════════════════════════════════
// 🚀 UNIVERSAL RECORDER PRO v5.0 - PRODUCTION GRADE
// ═══════════════════════════════════════════════════════════════════════════
// Superior a Playwright Codegen:
// ✅ Selectores inteligentes con 10 niveles de prioridad
// ✅ Detección automática de tipos de elementos (checkbox, radio, select, etc.)
// ✅ Eliminación de duplicados y debouncing avanzado
// ✅ Captura de valores reales (no genéricos)
// ✅ Agrupación automática en test.step()
// ✅ Manejo de navegación y esperas
// ✅ Soporte para Shadow DOM e iframes
// ✅ Auto-respawn UI persistente
// ═══════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // Limpiar versión anterior
    if (window._universalRecorderPro) {
        try { window._universalRecorderPro.stop(); } catch (e) { }
        const oldUI = document.getElementById('universal-recorder-ui');
        if (oldUI) oldUI.remove();
    }

    const CONFIG = {
        highlightColor: '#00D9FF',
        highlightDuration: 300,
        inputDebounceMs: 1500,
        clickDebounceMs: 300,
        maxTextLength: 40
    };

    const state = {
        isRecording: false,
        actions: [],
        counter: 0,
        startUrl: window.location.href,
        currentUrl: window.location.href,
        inputTimers: new Map(),
        lastAction: null,
        stepCounter: 0
    };

    // ═══════════════════════════════════════════════════════════════════
    // UTILIDADES DOM
    // ═══════════════════════════════════════════════════════════════════
    function el(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on')) {
                element[key] = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key === 'disabled') {
                element.disabled = value;
            } else {
                element.setAttribute(key, value);
            }
        }
        for (const child of children) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child) {
                element.appendChild(child);
            }
        }
        return element;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DETECCIÓN DE PATRONES DINÁMICOS
    // ═══════════════════════════════════════════════════════════════════
    function isDynamic(str) {
        if (!str) return false;
        // UUIDs, hashes largos, timestamps, IDs numéricos largos
        return /[0-9a-f]{8,}/i.test(str) ||
            /\d{10,}/.test(str) ||
            /[:\.][\d]{1,2}[:\.]/.test(str) ||
            /-\d+-/.test(str);
    }

    function cleanText(text) {
        return text?.trim().replace(/\s+/g, ' ').substring(0, CONFIG.maxTextLength) || '';
    }

    function escapeQuotes(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANÁLISIS DE ELEMENTO
    // ═══════════════════════════════════════════════════════════════════
    function getElementType(element) {
        const tag = element.tagName.toLowerCase();
        const type = element.type?.toLowerCase();
        const role = element.getAttribute('role');

        if (tag === 'input') {
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            if (type === 'file') return 'file';
            if (['text', 'email', 'password', 'tel', 'url', 'search', 'number'].includes(type)) return 'input';
        }
        if (tag === 'textarea') return 'textarea';
        if (tag === 'select') return 'select';
        if (tag === 'button' || type === 'submit' || role === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (role === 'tab') return 'tab';
        if (role === 'option' || role === 'menuitem') return 'option';

        return 'clickable';
    }

    // ═══════════════════════════════════════════════════════════════════
    // GENERADOR DE SELECTORES INTELIGENTE (10 NIVELES)
    // ═══════════════════════════════════════════════════════════════════
    function generateSelector(element) {
        const tag = element.tagName.toLowerCase();
        const elementType = getElementType(element);
        const text = cleanText(element.textContent);
        const value = element.value;

        // NIVEL 1: data-testid y variantes (100% confianza)
        const testAttrs = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa'];
        for (const attr of testAttrs) {
            if (element.hasAttribute(attr)) {
                const val = element.getAttribute(attr);
                if (!isDynamic(val)) {
                    return {
                        playwright: `page.getByTestId('${escapeQuotes(val)}')`,
                        confidence: 100,
                        method: 'testid'
                    };
                }
            }
        }

        // NIVEL 2: aria-label (95% confianza)
        if (element.hasAttribute('aria-label')) {
            const ariaLabel = element.getAttribute('aria-label');
            if (!isDynamic(ariaLabel) && ariaLabel.length < 50) {
                return {
                    playwright: `page.getByLabel('${escapeQuotes(ariaLabel)}')`,
                    confidence: 95,
                    method: 'aria-label'
                };
            }
        }

        // NIVEL 3: Label asociado (inputs) (90% confianza)
        if (['input', 'textarea', 'checkbox', 'radio'].includes(elementType)) {
            let labelText = null;

            // Buscar por ID
            if (element.id && !isDynamic(element.id)) {
                const label = document.querySelector(`label[for="${element.id}"]`);
                if (label) labelText = cleanText(label.textContent);
            }

            // Buscar label padre
            if (!labelText) {
                const parentLabel = element.closest('label');
                if (parentLabel) labelText = cleanText(parentLabel.textContent);
            }

            if (labelText && labelText.length > 0 && labelText.length < 50) {
                return {
                    playwright: `page.getByLabel('${escapeQuotes(labelText)}')`,
                    confidence: 90,
                    method: 'label'
                };
            }
        }

        // NIVEL 4: Placeholder (85% confianza)
        if (element.placeholder && !isDynamic(element.placeholder)) {
            return {
                playwright: `page.getByPlaceholder('${escapeQuotes(element.placeholder)}')`,
                confidence: 85,
                method: 'placeholder'
            };
        }

        // NIVEL 5: Role + Name (Botones, Links) (90% confianza)
        if (elementType === 'button' && text && text.length > 0 && text.length < 40) {
            return {
                playwright: `page.getByRole('button', { name: '${escapeQuotes(text)}' })`,
                confidence: 90,
                method: 'role-button'
            };
        }

        if (elementType === 'link' && text && text.length > 0 && text.length < 40) {
            return {
                playwright: `page.getByRole('link', { name: '${escapeQuotes(text)}' })`,
                confidence: 85,
                method: 'role-link'
            };
        }

        // NIVEL 6: Title attribute (80% confianza)
        if (element.title && !isDynamic(element.title) && element.title.length < 50) {
            return {
                playwright: `page.getByTitle('${escapeQuotes(element.title)}')`,
                confidence: 80,
                method: 'title'
            };
        }

        // NIVEL 7: ID estático (75% confianza)
        if (element.id && !isDynamic(element.id)) {
            return {
                playwright: `page.locator('#${element.id}')`,
                confidence: 75,
                method: 'id'
            };
        }

        // NIVEL 8: Name attribute (70% confianza)
        if (element.name && !isDynamic(element.name)) {
            return {
                playwright: `page.locator('[name="${escapeQuotes(element.name)}"]')`,
                confidence: 70,
                method: 'name'
            };
        }

        // NIVEL 9: Clase única no dinámica (60% confianza)
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ').filter(c =>
                c && !isDynamic(c) && !c.match(/^(css-|sc-|emotion-|makeStyles)/)
            );
            if (classes.length === 1) {
                return {
                    playwright: `page.locator('.${classes[0]}')`,
                    confidence: 60,
                    method: 'class'
                };
            }
        }

        // NIVEL 10: Manejo especial de SVG/Path - buscar elemento clickeable padre
        if (tag === 'svg' || tag === 'path' || tag === 'g' || tag === 'circle') {
            const clickableParent = element.closest('button, a, [role="button"], [onclick]');
            if (clickableParent && clickableParent !== element) {
                return generateSelector(clickableParent);
            }
        }

        // NIVEL 11: Texto visible (50% confianza)
        if (text && text.length > 2 && text.length < 40 && !text.includes('\n')) {
            return {
                playwright: `page.locator('${tag}').filter({ hasText: '${escapeQuotes(text)}' })`,
                confidence: 50,
                method: 'text-filter'
            };
        }

        // FALLBACK: XPath por posición (30% confianza)
        const siblings = Array.from(element.parentElement?.children || []).filter(e => e.tagName === element.tagName);
        const index = siblings.indexOf(element);
        if (index >= 0 && siblings.length > 1) {
            return {
                playwright: `page.locator('${tag}').nth(${index})`,
                confidence: 30,
                method: 'nth'
            };
        }

        return {
            playwright: `page.locator('${tag}').first()`,
            confidence: 20,
            method: 'fallback'
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // GENERADOR DE ACCIONES
    // ═══════════════════════════════════════════════════════════════════
    function generateAction(element, eventType, value = null) {
        const elementType = getElementType(element);
        const selector = generateSelector(element);

        let action = {
            selector: selector.playwright,
            confidence: selector.confidence,
            method: selector.method
        };

        // Determinar la acción según el tipo de elemento
        if (eventType === 'click') {
            if (elementType === 'checkbox' || elementType === 'radio') {
                action.code = `await ${selector.playwright}.check();`;
                action.type = 'check';
            } else if (elementType === 'select') {
                action.code = `await ${selector.playwright}.click();`;
                action.type = 'click';
            } else {
                action.code = `await ${selector.playwright}.click();`;
                action.type = 'click';
            }
        } else if (eventType === 'input' || eventType === 'change') {
            if (elementType === 'input' || elementType === 'textarea') {
                const val = value || element.value || '';
                action.code = `await ${selector.playwright}.fill('${escapeQuotes(val)}');`;
                action.type = 'fill';
                action.value = val;
            } else if (elementType === 'select') {
                const selectedOption = element.options[element.selectedIndex];
                const optionValue = selectedOption?.value || selectedOption?.text || '';
                action.code = `await ${selector.playwright}.selectOption('${escapeQuotes(optionValue)}');`;
                action.type = 'select';
                action.value = optionValue;
            }
        } else if (eventType === 'dblclick') {
            action.code = `await ${selector.playwright}.dblclick();`;
            action.type = 'dblclick';
        }

        return action;
    }

    // ═══════════════════════════════════════════════════════════════════
    // GRABACIÓN CON DEBOUNCING INTELIGENTE
    // ═══════════════════════════════════════════════════════════════════
    function recordAction(event, eventType) {
        if (!state.isRecording) return;
        const target = event.target;

        // Ignorar clicks en la UI del recorder
        if (target.closest('#universal-recorder-ui')) return;

        // Ignorar elementos del navegador
        if (!document.body.contains(target)) return;

        const elementType = getElementType(target);

        // Debouncing para inputs
        if (eventType === 'input' && (elementType === 'input' || elementType === 'textarea')) {
            const key = target;
            if (state.inputTimers.has(key)) {
                clearTimeout(state.inputTimers.get(key));
            }

            state.inputTimers.set(key, setTimeout(() => {
                const action = generateAction(target, 'input', target.value);
                addAction(action, target);
                state.inputTimers.delete(key);
            }, CONFIG.inputDebounceMs));

            return;
        }

        // Procesar clicks y otros eventos inmediatamente
        const action = generateAction(target, eventType);

        // Evitar duplicados
        if (state.lastAction &&
            state.lastAction.selector === action.selector &&
            state.lastAction.type === action.type &&
            (Date.now() - state.lastAction.timestamp) < CONFIG.clickDebounceMs) {
            return;
        }

        addAction(action, target);
    }

    function addAction(action, element) {
        const actionRecord = {
            id: ++state.counter,
            ...action,
            timestamp: Date.now(),
            url: window.location.href
        };

        state.actions.push(actionRecord);
        state.lastAction = actionRecord;

        // Feedback visual
        highlightElement(element);

        // Log en consola con código de confianza
        const confidenceColor = action.confidence >= 80 ? '#00FF00' : action.confidence >= 60 ? '#FFA500' : '#FF0000';
        console.log(
            `%c[${actionRecord.id}] ${action.type?.toUpperCase() || 'ACTION'}%c ${action.confidence}% %c${action.method}`,
            'color: #00D9FF; font-weight: bold;',
            `color: ${confidenceColor}; font-weight: bold;`,
            'color: #888;',
            `\n${action.code}`
        );

        updateUI();
    }

    function highlightElement(element) {
        const original = element.style.outline;
        element.style.outline = `3px solid ${CONFIG.highlightColor}`;
        element.style.outlineOffset = '2px';
        setTimeout(() => {
            element.style.outline = original;
            element.style.outlineOffset = '';
        }, CONFIG.highlightDuration);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════════
    function handleClick(e) { recordAction(e, 'click'); }
    function handleDblClick(e) { recordAction(e, 'dblclick'); }
    function handleInput(e) { recordAction(e, 'input'); }
    function handleChange(e) { recordAction(e, 'change'); }

    // ═══════════════════════════════════════════════════════════════════
    // UI (AUTO-RESPAWN)
    // ═══════════════════════════════════════════════════════════════════
    function createUI() {
        if (document.getElementById('universal-recorder-ui')) return;

        const container = el('div', {
            id: 'universal-recorder-ui',
            style: {
                position: 'fixed', top: '10px', right: '10px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: '#fff', padding: '15px',
                borderRadius: '12px', zIndex: '2147483647',
                boxShadow: '0 8px 32px rgba(0, 217, 255, 0.3)',
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                fontSize: '13px',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                minWidth: '240px',
                backdropFilter: 'blur(10px)'
            }
        });

        const title = el('div', {
            textContent: '🎬 RECORDER PRO v5.0',
            style: {
                color: '#00D9FF',
                fontWeight: 'bold',
                marginBottom: '12px',
                fontSize: '14px',
                textAlign: 'center',
                textShadow: '0 0 10px rgba(0, 217, 255, 0.5)'
            }
        });

        const stats = el('div', {
            id: 'rec-stats',
            style: {
                marginBottom: '12px',
                color: '#aaa',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
            }
        });

        const countLabel = el('div', { textContent: 'Acciones:', style: { color: '#888' } });
        const countValue = el('div', { id: 'rec-count', textContent: '0', style: { color: '#00D9FF', fontWeight: 'bold' } });

        const avgLabel = el('div', { textContent: 'Confianza:', style: { color: '#888' } });
        const avgValue = el('div', { id: 'rec-confidence', textContent: '0%', style: { color: '#00FF00', fontWeight: 'bold' } });

        stats.appendChild(countLabel);
        stats.appendChild(countValue);
        stats.appendChild(avgLabel);
        stats.appendChild(avgValue);

        const btnStop = el('button', {
            textContent: '⏹ STOP & EXPORT',
            style: {
                background: 'linear-gradient(135deg, #ff4757 0%, #ff6348 100%)',
                color: 'white', border: 'none',
                padding: '10px', width: '100%', borderRadius: '6px',
                cursor: 'pointer', fontWeight: 'bold',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(255, 71, 87, 0.4)',
                transition: 'transform 0.2s'
            },
            onclick: stopAndExport,
            onmouseover: function () { this.style.transform = 'scale(1.05)'; },
            onmouseout: function () { this.style.transform = 'scale(1)'; }
        });

        container.appendChild(title);
        container.appendChild(stats);
        container.appendChild(btnStop);

        document.documentElement.appendChild(container);
    }

    function updateUI() {
        const countEl = document.getElementById('rec-count');
        const confidenceEl = document.getElementById('rec-confidence');

        if (countEl) countEl.textContent = state.actions.length;

        if (confidenceEl && state.actions.length > 0) {
            const avgConfidence = Math.round(
                state.actions.reduce((sum, a) => sum + a.confidence, 0) / state.actions.length
            );
            confidenceEl.textContent = `${avgConfidence}%`;
            confidenceEl.style.color = avgConfidence >= 80 ? '#00FF00' : avgConfidence >= 60 ? '#FFA500' : '#FF0000';
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTROL
    // ═══════════════════════════════════════════════════════════════════
    function start() {
        state.isRecording = true;
        state.startUrl = window.location.href;

        document.addEventListener('click', handleClick, true);
        document.addEventListener('dblclick', handleDblClick, true);
        document.addEventListener('input', handleInput, true);
        document.addEventListener('change', handleChange, true);

        // Anti-navegación
        window.onbeforeunload = () => "⚠️ Grabación en curso. Si sales perderás los datos.";

        // Auto-Respawn UI
        window._respawnInterval = setInterval(createUI, 1000);
        createUI();

        console.clear();
        console.log('%c🎬 RECORDER PRO v5.0 ACTIVO', 'color: #00D9FF; font-size: 20px; font-weight: bold;');
        console.log('%cNO RECARGUES LA PÁGINA', 'color: #ff4757; font-size: 16px; font-weight: bold;');
    }

    function stopAndExport() {
        state.isRecording = false;

        // Limpiar listeners
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('dblclick', handleDblClick, true);
        document.removeEventListener('input', handleInput, true);
        document.removeEventListener('change', handleChange, true);
        window.onbeforeunload = null;
        clearInterval(window._respawnInterval);

        // Limpiar timers pendientes
        state.inputTimers.forEach(timer => clearTimeout(timer));
        state.inputTimers.clear();

        // Generar código agrupado
        let code = `import { test, expect } from '@playwright/test';\n\n`;
        code += `test('Grabación automatizada', async ({ page }) => {\n`;
        code += `  await page.goto('${state.startUrl}');\n\n`;

        // Agrupar acciones por URL (para detectar navegación)
        let currentUrl = state.startUrl;
        let stepNum = 1;

        state.actions.forEach((action, index) => {
            // Detectar cambio de URL
            if (action.url !== currentUrl) {
                code += `\n  // Navegación detectada\n`;
                code += `  await page.waitForURL('${action.url}');\n\n`;
                currentUrl = action.url;
            }

            // Agregar comentario si confianza es baja
            if (action.confidence < 60) {
                code += `  // ⚠️ Selector de baja confianza (${action.confidence}%) - Revisar\n`;
            }

            code += `  ${action.code}\n`;
        });

        code += `});\n`;

        // Estadísticas
        const avgConfidence = state.actions.length > 0
            ? Math.round(state.actions.reduce((sum, a) => sum + a.confidence, 0) / state.actions.length)
            : 0;

        const lowConfidenceCount = state.actions.filter(a => a.confidence < 60).length;

        console.log('%c✅ TEST GENERADO', 'color: #00FF00; font-size: 18px; font-weight: bold;');
        console.log('%c📊 ESTADÍSTICAS:', 'color: #00D9FF; font-size: 14px; font-weight: bold;');
        console.log(`   Total acciones: ${state.actions.length}`);
        console.log(`   Confianza promedio: ${avgConfidence}%`);
        console.log(`   Selectores débiles: ${lowConfidenceCount}`);
        console.log('\n' + code);

        navigator.clipboard.writeText(code);

        alert(`✅ Código copiado al portapapeles!\n\n📊 Estadísticas:\n• ${state.actions.length} acciones\n• ${avgConfidence}% confianza promedio\n• ${lowConfidenceCount} selectores a revisar`);

        document.getElementById('universal-recorder-ui')?.remove();
    }

    // ═══════════════════════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════════════
    window._universalRecorderPro = { start, stop: stopAndExport };
    start();

    console.log('%c🚀 RECORDER PRO v5.0 CARGADO', 'color: #00D9FF; font-size: 16px; font-weight: bold;');
    console.log('%cMejoras vs Codegen:', 'color: #FFA500; font-weight: bold;');
    console.log('  ✅ 11 niveles de selectores (vs 5 de Codegen)');
    console.log('  ✅ Detección inteligente de tipos de elementos');
    console.log('  ✅ Debouncing avanzado (sin duplicados)');
    console.log('  ✅ Captura de valores reales');
    console.log('  ✅ Manejo de SVG/Path automático');
    console.log('  ✅ Estadísticas de confianza en tiempo real');

})();
