# 📊 Reporte de Análisis Estático

| Campo | Valor |
|-------|-------|
| **Proyecto** | SIGMA |
| **HU Analizada** | HU_LOGIN_01 - Inicio de Sesion de Usuario |
| **Épica** | EP-001: Autenticacion y Control de Acceso Enlace a documentacion de la Epica |
| **Fecha** | 2026-02-18 06:22 |
| **Estado** | ❌ **FAILED** |
| **Analizador** | SIGMA Static Analyzer v3.0 AI |

---

## 🚦 SEMÁFORO DE ESTADO

| Indicador | Valor |
|-----------|-------|
| **Estado** | 🔴 ROJO |
| **Cobertura** | `[██████░░░░░░░░░░░░░░]` **30.0%** |
| **Descripción** | BLOQUEADO - Gaps críticos detectados que requieren atención inmediata |

### 📈 Resumen de Gaps por Severidad

| Severidad | Emoji | Cantidad |
|-----------|-------|----------|
| 🔴 CRÍTICO | Bloqueante | **5** |
| 🟠 ALTO | Importante | **2** |
| 🟡 MEDIO | Moderado | **0** |
| 🟢 BAJO | Menor | **0** |
| **TOTAL** | | **7** |

---

## 📊 DASHBOARD DE MÉTRICAS

| Métrica | Valor | Fórmula |
|---------|-------|---------|
| 📋 Reglas de Negocio (BRs) | 5 | - |
| 📝 Escenarios Necesarios | 10 | BRs × 2 (1 positivo + 1 negativo) |
| 🧪 Escenarios Documentados | 3 | - |
| ✅ Escenarios Positivos | 2 | - |
| ❌ Escenarios Negativos | 0 | - |
| ⚠️ Gaps (Escenarios Faltantes) | 7 | Necesarios - Documentados |
| ✅ BRs con 100% Cobertura | 0 | Tiene positivo Y negativo |
| 🟡 BRs con 50% Cobertura | 3 | Solo positivo O solo negativo |
| 🔴 BRs sin Cobertura | 2 | Sin escenarios |

---

## 🔍 BRECHAS IDENTIFICADAS

| # | BR | Tipo | Severidad | Descripción |
|---|-----|------|-----------|-------------|
| 1 | BR1 | falta_negativo | 🟠 ALTO | Falta escenario negativo para BR1 |
| 2 | BR2 | falta_negativo | 🟠 ALTO | Falta escenario negativo para BR2 |
| 3 | BR3 | falta_negativo | 🔴 CRITICO | Falta escenario negativo para BR3 |
| 4 | BR4 | falta_positivo | 🔴 CRITICO | Falta escenario positivo para BR4 |
| 5 | BR4 | falta_negativo | 🔴 CRITICO | Falta escenario negativo para BR4 |
| 6 | BR5 | falta_positivo | 🔴 CRITICO | Falta escenario positivo para BR5 |
| 7 | BR5 | falta_negativo | 🔴 CRITICO | Falta escenario negativo para BR5 |

---

## 📋 MATRIZ DE COBERTURA POR BR

| BR | Descripción | Positivo | Negativo | Cobertura |
|-----|-------------|:--------:|:--------:|-----------|
| **BR1** | El correo electronico debe tener formato valido (u... | ✅ | ❌ | 🟡 50% |
| **BR2** | La contrasena debe tener minimo 8 caracteres, incl... | ✅ | ❌ | 🟡 50% |
| **BR3** | Despues de 3 intentos fallidos consecutivos, la cu... | ✅ | ❌ | 🟡 50% |
| **BR4** | La sesion expira automaticamente despues de 30 min... | ❌ | ❌ | 🔴 0% |
| **BR5** | El sistema debe registrar cada intento de login (e... | ❌ | ❌ | 🔴 0% |

---

## 📝 DETALLE DE GAPS

### GAP-001 🟠 ALTO

**Falta escenario negativo para BR1**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR1** |
| Texto BR | El correo electronico debe tener formato valido (usuario@dominio.com) |
| Razón | falta_negativo |
| OWASP | 🔒 A03:2021 |

### GAP-002 🟠 ALTO

**Falta escenario negativo para BR2**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR2** |
| Texto BR | La contrasena debe tener minimo 8 caracteres, incluyendo mayuscula, minuscula y numero |
| Razón | falta_negativo |
| OWASP | 🔒 A07:2021 |

### GAP-003 🔴 CRITICO

**Falta escenario negativo para BR3**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR3** |
| Texto BR | Despues de 3 intentos fallidos consecutivos, la cuenta se bloquea por 15 minutos |
| Razón | falta_negativo |
| OWASP | 🔒 A07:2021 |

### GAP-004 🔴 CRITICO

**Falta escenario positivo para BR4**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR4** |
| Texto BR | La sesion expira automaticamente despues de 30 minutos de inactividad |
| Razón | falta_positivo |
| OWASP | 🔒 A07:2021 |

### GAP-005 🔴 CRITICO

**Falta escenario negativo para BR4**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR4** |
| Texto BR | La sesion expira automaticamente despues de 30 minutos de inactividad |
| Razón | falta_negativo |
| OWASP | 🔒 A07:2021 |

### GAP-006 🔴 CRITICO

**Falta escenario positivo para BR5**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR5** |
| Texto BR | El sistema debe registrar cada intento de login (exitoso o fallido) en el log de auditoria CU-001 | Caso de uso: Autenticacion de usuario |
| Razón | falta_positivo |
| OWASP | 🔒 A09:2021 |

### GAP-007 🔴 CRITICO

**Falta escenario negativo para BR5**

| Campo | Valor |
|-------|-------|
| BR Afectada | **BR5** |
| Texto BR | El sistema debe registrar cada intento de login (exitoso o fallido) en el log de auditoria CU-001 | Caso de uso: Autenticacion de usuario |
| Razón | falta_negativo |
| OWASP | 🔒 A09:2021 |

---

## 💡 ESCENARIOS SUGERIDOS

Los siguientes escenarios se sugieren para cerrar las brechas identificadas:

### 🟠 GAP-001: Falta escenario negativo para BR1

**BR Afectada:** BR1

```gherkin
DADO el usuario accede a la pantalla de inicio de sesion
CUANDO ingresa un correo electronico con formato invalido (sin @, sin dominio, caracteres especiales no permitidos) y una contrasena valida y presiona el boton Iniciar Sesion
ENTONCES el sistema muestra el mensaje de error "Formato de correo electronico invalido" y no permite el acceso
Y el sistema mantiene al usuario en la pantalla de login sin incrementar el contador de intentos fallidos
```

🔒 **Referencia OWASP:** A03:2021


### 🟠 GAP-002: Falta escenario negativo para BR2

**BR Afectada:** BR2

```gherkin
DADO el usuario accede a la pantalla de inicio de sesion
CUANDO ingresa su correo electronico correcto y una contrasena que no cumple los requisitos (menos de 8 caracteres, sin mayuscula, sin minuscula o sin numero) y presiona el boton Iniciar Sesion
ENTONCES el sistema muestra el mensaje de error "La contrasena no cumple con los requisitos de complejidad" y no permite el acceso
Y el sistema indica los requisitos minimos necesarios para la contrasena
```

🔒 **Referencia OWASP:** A07:2021


### 🔴 GAP-003: Falta escenario negativo para BR3

**BR Afectada:** BR3

```gherkin
DADO el usuario tiene una cuenta activa en el sistema
CUANDO realiza 1 o 2 intentos fallidos de login con contrasena incorrecta
ENTONCES el sistema muestra el mensaje de error "Credenciales invalidas" pero NO bloquea la cuenta
Y el sistema permite seguir intentando el login sin restricciones temporales
```

🔒 **Referencia OWASP:** A07:2021


### 🔴 GAP-004: Falta escenario positivo para BR4

**BR Afectada:** BR4

```gherkin
DADO el usuario ha iniciado sesion correctamente en el sistema
CUANDO transcurren 30 minutos sin realizar ninguna accion en el sistema
ENTONCES el sistema cierra automaticamente la sesion y redirige al usuario a la pantalla de login
Y el sistema muestra el mensaje "Su sesion ha expirado por inactividad. Por favor inicie sesion nuevamente"
```

🔒 **Referencia OWASP:** A07:2021


### 🔴 GAP-005: Falta escenario negativo para BR4

**BR Afectada:** BR4

```gherkin
DADO el usuario ha iniciado sesion correctamente en el sistema
CUANDO realiza acciones en el sistema dentro de los 30 minutos de inactividad (cada 20 minutos por ejemplo)
ENTONCES el sistema mantiene la sesion activa y NO cierra la sesion del usuario
Y el sistema reinicia el contador de inactividad con cada accion realizada
```

🔒 **Referencia OWASP:** A07:2021


### 🔴 GAP-006: Falta escenario positivo para BR5

**BR Afectada:** BR5

```gherkin
DADO el usuario tiene una cuenta activa registrada en el sistema
CUANDO ingresa su correo electronico y contrasena correctos y presiona el boton Iniciar Sesion
ENTONCES el sistema autentica al usuario, lo redirige al dashboard principal y registra en el log de auditoria el intento exitoso con fecha, hora, correo del usuario y direccion IP
Y el registro de auditoria incluye el codigo CU-001 asociado al caso de uso de Autenticacion de usuario
```

🔒 **Referencia OWASP:** A09:2021


### 🔴 GAP-007: Falta escenario negativo para BR5

**BR Afectada:** BR5

```gherkin
DADO el usuario tiene una cuenta activa en el sistema
CUANDO ingresa su correo electronico correcto pero una contrasena incorrecta y presiona el boton Iniciar Sesion
ENTONCES el sistema muestra el mensaje de error "Credenciales invalidas", no permite el acceso y registra en el log de auditoria el intento fallido con fecha, hora, correo del usuario, direccion IP y motivo del fallo
Y el registro de auditoria incluye el codigo CU-001 y marca el evento como intento fallido
```

🔒 **Referencia OWASP:** A09:2021


---

## 📚 REFERENCIAS

- IEEE 1028: Software Reviews and Audits
- IEEE 829: Software Test Documentation
- OWASP Top 10 2021
- ISTQB Foundation Level Syllabus

---

🤖 **SIGMA Static Analyzer v3.0 AI** | 2026-02-18 06:22:34

*Análisis potenciado por Anthropic Claude AI para precisión semántica.*
