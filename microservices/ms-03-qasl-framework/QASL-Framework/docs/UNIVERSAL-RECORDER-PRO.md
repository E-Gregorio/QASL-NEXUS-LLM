# Universal Recorder Pro v5.0

## Overview

Universal Recorder Pro is an advanced test recording tool that surpasses Playwright Codegen in selector intelligence and reliability. It runs directly in the browser DevTools and generates production-ready Playwright test code.

---

## Why Universal Recorder Pro?

| Feature | Playwright Codegen | Universal Recorder Pro |
|---------|-------------------|------------------------|
| Selector strategy levels | 5 | **11** |
| Confidence scoring | No | **Yes (0-100%)** |
| Dynamic pattern detection | Basic | **Advanced** |
| Element type detection | Limited | **Comprehensive** |
| Debouncing | Basic | **Intelligent** |
| SVG/Path handling | Manual | **Automatic** |
| UI persistence | No | **Auto-respawn** |
| Real-time feedback | No | **Yes** |

---

## 11-Level Selector Strategy

The recorder uses an intelligent 11-level priority system to find the most reliable selector:

| Level | Method | Confidence | Example |
|-------|--------|------------|---------|
| 1 | `data-testid` | 100% | `page.getByTestId('submit-btn')` |
| 2 | `aria-label` | 95% | `page.getByLabel('Submit form')` |
| 3 | Associated label | 90% | `page.getByLabel('Username')` |
| 4 | Placeholder | 85% | `page.getByPlaceholder('Enter email')` |
| 5 | Role + Name (button) | 90% | `page.getByRole('button', { name: 'Submit' })` |
| 6 | Role + Name (link) | 85% | `page.getByRole('link', { name: 'Home' })` |
| 7 | Title attribute | 80% | `page.getByTitle('Close dialog')` |
| 8 | Static ID | 75% | `page.locator('#username')` |
| 9 | Name attribute | 70% | `page.locator('[name="email"]')` |
| 10 | Unique class | 60% | `page.locator('.submit-button')` |
| 11 | Text filter | 50% | `page.locator('button').filter({ hasText: 'Submit' })` |

### Fallback Strategy

If none of the above work:
- **nth selector** (30%): `page.locator('button').nth(2)`
- **first fallback** (20%): `page.locator('div').first()`

---

## Dynamic Pattern Detection

The recorder automatically avoids unreliable dynamic values:

### Detected Patterns

| Pattern | Example | Action |
|---------|---------|--------|
| UUIDs | `btn-a8ed8ea1-84ac-faa7-63dd` | Skip |
| Long hashes | `element-7b3d9f8e2a1c` | Skip |
| Timestamps | `item-1701792000000` | Skip |
| Numeric IDs | `row-123456789` | Skip |
| CSS-in-JS classes | `css-1abc2de`, `sc-bdVaJa` | Skip |

### Example

```html
<!-- Bad selector (dynamic) -->
<button id="btn-a8ed8ea1-84ac">Submit</button>

<!-- Recorder will use text instead -->
page.getByRole('button', { name: 'Submit' })  // 90% confidence
```

---

## Element Type Detection

Automatically detects and handles different element types:

| Element | Detection | Generated Code |
|---------|-----------|----------------|
| Checkbox | `input[type=checkbox]` | `.check()` |
| Radio | `input[type=radio]` | `.check()` |
| Select | `<select>` | `.selectOption()` |
| Text input | `input[type=text/email/...]` | `.fill()` |
| Textarea | `<textarea>` | `.fill()` |
| Button | `<button>`, `role=button` | `.click()` |
| Link | `<a>` | `.click()` |

---

## Usage

### Step 1: Open DevTools

Press `F12` or right-click > "Inspect" to open browser DevTools.

### Step 2: Go to Console

Click on the "Console" tab.

### Step 3: Paste the Script

Copy the entire content of `universal_recorder_pro.js` and paste it in the console.

### Step 4: Start Recording

The recorder starts automatically. You'll see a floating UI panel:

```
┌─────────────────────────┐
│ 🎬 RECORDER PRO v5.0    │
├─────────────────────────┤
│ Acciones:    0          │
│ Confianza:   0%         │
├─────────────────────────┤
│ [⏹ STOP & EXPORT]      │
└─────────────────────────┘
```

### Step 5: Interact with the Page

- Click buttons
- Fill inputs
- Select options
- Navigate

Each action is recorded with visual feedback (blue highlight).

### Step 6: Stop and Export

Click "STOP & EXPORT". The generated code is:
1. Logged to console
2. Copied to clipboard
3. Shows statistics alert

---

## Generated Code Example

```typescript
import { test, expect } from '@playwright/test';

test('Grabación automatizada', async ({ page }) => {
  await page.goto('https://example.com/login');

  await page.getByLabel('Username').fill('testuser');
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Navegación detectada
  await page.waitForURL('https://example.com/dashboard');

  // ⚠️ Selector de baja confianza (50%) - Revisar
  await page.locator('div').filter({ hasText: 'Welcome' }).click();
});
```

---

## Console Output

Real-time logging with color-coded confidence:

```
[1] FILL 90% label
    await page.getByLabel('Username').fill('testuser');

[2] FILL 90% label
    await page.getByLabel('Password').fill('secret123');

[3] CLICK 90% role-button
    await page.getByRole('button', { name: 'Sign In' }).click();

[4] CLICK 50% text-filter
    await page.locator('div').filter({ hasText: 'Welcome' }).click();
```

**Color codes:**
- 🟢 Green (≥80%): Reliable selector
- 🟡 Orange (60-79%): Moderate reliability
- 🔴 Red (<60%): Review recommended

---

## Advanced Features

### Debouncing

**Input debouncing**: Waits 1.5 seconds after typing stops to capture final value (avoids recording each keystroke).

**Click debouncing**: 300ms threshold to prevent double-click recording on single clicks.

### Navigation Detection

Automatically detects URL changes and inserts `waitForURL()`:

```typescript
await page.click('#dashboard-link');

// Navegación detectada
await page.waitForURL('https://example.com/dashboard');
```

### SVG/Path Handling

Clicks on SVG icons automatically find the clickable parent:

```html
<button id="close-btn">
  <svg><path d="M..."/></svg>
</button>
```

Click on `<path>` → Generates: `page.locator('#close-btn').click()`

### Auto-Respawn UI

If UI is accidentally closed or hidden, it automatically respawns every second.

### Warning on Page Leave

Prevents accidental navigation loss with `beforeunload` warning.

---

## Statistics

After stopping, you get:

```
✅ TEST GENERADO
📊 ESTADÍSTICAS:
   Total acciones: 12
   Confianza promedio: 85%
   Selectores débiles: 2
```

---

## Best Practices

### 1. Add data-testid to Your App

For 100% reliable selectors:

```html
<button data-testid="submit-form">Submit</button>
```

### 2. Review Low-Confidence Selectors

Anything below 60% should be manually reviewed and improved.

### 3. Use Semantic HTML

The recorder works best with proper HTML structure:
- Use `<button>` for buttons
- Use `<a>` for links
- Use `<label>` for form fields
- Use ARIA attributes when needed

### 4. Record in Incognito

Avoid extensions interfering with recording.

---

## Troubleshooting

### UI Doesn't Appear

- Refresh and try again
- Check for CSP blocking inline scripts
- Try in incognito mode

### Selectors Are All Low Confidence

- The app lacks semantic HTML
- Add `data-testid` attributes
- Use proper form labels

### Actions Not Recording

- Make sure you're not clicking inside the recorder UI
- Check console for errors
- Element might be in iframe (limited support)

---

## Comparison with Alternatives

| Tool | Recorder Type | Selector Intelligence | Confidence Score | Free |
|------|--------------|----------------------|------------------|------|
| **Universal Recorder Pro** | Browser script | 11 levels | Yes | Yes |
| Playwright Codegen | CLI | 5 levels | No | Yes |
| Selenium IDE | Extension | Basic | No | Yes |
| Cypress Studio | Built-in | Basic | No | Yes |
| TestCafe Studio | App | Medium | No | Paid |

---

## Future Enhancements

- [ ] Export to Cypress format
- [ ] Export to Selenium format
- [ ] Cloud sync for recordings
- [ ] AI-powered selector improvement
- [ ] Assertion recording
- [ ] Visual diff recording

---

## Credits

Created by Elyer Maldonado as part of the QASL Framework.

Part of the Shift-Left Testing Platform for comprehensive QA automation.
