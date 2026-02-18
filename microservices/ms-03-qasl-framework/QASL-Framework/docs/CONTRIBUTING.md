# Contributing to QASL Framework

First off, thank you for considering contributing to QASL Framework! It's people like you that make this tool better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)

---

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

---

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When creating a bug report, include:**
- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Environment details (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting an enhancement, include:**
- Clear and descriptive title
- Step-by-step description of the suggested enhancement
- Explanation of why this would be useful
- Possible implementation approach (if any)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## Development Setup

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- Docker Desktop
- K6 installed globally
- Git

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/QASL-Framework.git
cd QASL-Framework

# Add upstream remote
git remote add upstream https://github.com/E-Gregorio/QASL-Framework.git

# Install dependencies
npm install
npx playwright install

# Install Python dependencies
cd sigma_analyzer
pip install -r requirements.txt
cd ..

# Start services
npm run docker:up

# Run tests to verify setup
npm run e2e
```

### Project Structure

```
QASL-Framework/
├── sigma_analyzer/      # Static analysis (Python)
├── e2e/                 # E2E tests (TypeScript)
├── scripts/             # Execution scripts (Node.js)
├── scripts_metricas/    # Metrics senders (Node.js)
├── docker/              # Docker configurations
└── docs/                # Documentation
```

---

## Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Run the full pipeline** before submitting:
   ```bash
   npm run clean
   npm run e2e:capture
   npm run api
   npm run k6 -- --type=load --vus=5 --duration=30s
   npm run zap
   ```
4. **Update CHANGELOG.md** with your changes
5. **Request review** from maintainers

### PR Title Convention

Use conventional commits format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add tests`
- `chore: maintenance tasks`

---

## Style Guidelines

### JavaScript/TypeScript

- Use ESLint configuration provided
- Use Prettier for formatting
- Prefer `const` over `let`
- Use async/await over promises
- Document complex functions with JSDoc

```javascript
/**
 * Sends metrics to InfluxDB
 * @param {Object} metrics - The metrics object
 * @param {string} metrics.suite - Test suite name
 * @param {number} metrics.passed - Passed tests count
 * @returns {Promise<boolean>} Success status
 */
async function sendMetrics(metrics) {
    // Implementation
}
```

### Python (sigma_analyzer)

- Follow PEP 8
- Use type hints
- Document with docstrings

```python
def analyze_user_story(hu_path: str) -> dict:
    """
    Analyze a User Story file for coverage gaps.

    Args:
        hu_path: Path to the User Story markdown file

    Returns:
        Dictionary containing analysis results
    """
    pass
```

### Test Files

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Use Allure decorators for traceability

```typescript
test('TC-001: Should display error for invalid credentials', async ({ page }) => {
    // Arrange
    await page.goto('/login');

    // Act
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'invalid');
    await page.click('#submit');

    // Assert
    await expect(page.locator('.error')).toBeVisible();
});
```

---

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding tests |
| `chore` | Maintenance |
| `perf` | Performance improvement |

### Examples

```bash
# Feature
git commit -m "feat(e2e): add API capture during test execution"

# Bug fix
git commit -m "fix(metrics): correct path for E2E results"

# Documentation
git commit -m "docs: update README with new commands"

# Refactor
git commit -m "refactor(scripts): simplify metric sending logic"
```

---

## Questions?

Feel free to open an issue with the `question` label or reach out to the maintainers.

---

## Recognition

Contributors will be recognized in:
- README.md Contributors section
- Release notes
- Project documentation

Thank you for contributing!
