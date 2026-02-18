# INGRID - Guia de Demo para Ventas

## Requisitos Previos (una sola vez)

- Docker Desktop instalado y corriendo
- Node.js 18+ instalado
- API Key de Anthropic configurada en `.env`
- Dependencias instaladas (`npm install`)

---

## COMANDOS DE TESTS DISPONIBLES

| Comando | Que ejecuta | OWASP aparece? |
|---------|-------------|----------------|
| `npm run test:chatbot:functional -- --headed` | Solo tests funcionales | NO |
| `npm run test:chatbot:security -- --headed` | Solo tests de seguridad | SI |
| `npm run test:chatbot:performance -- --headed` | Solo tests de performance | NO |
| `npm test -- --headed` | TODOS los tests | SI |
| `npm run test:gemini` | Tests en Google Gemini | SI |

---

## DEMO 1: Chatbot Demo (Solo Funcionales)

Si quieres mostrar SOLO tests funcionales SIN OWASP:

```powershell
# ══════════════════════════════════════════════════════════════
# PASO 1: Limpiar Docker (una sola vez si hay problemas)
# ══════════════════════════════════════════════════════════════
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)

# ══════════════════════════════════════════════════════════════
# PASO 2: Levantar Grafana
# ══════════════════════════════════════════════════════════════
npm run grafana:up

# Esperar 20 segundos...

# ══════════════════════════════════════════════════════════════
# PASO 3: Limpiar metricas locales
# ══════════════════════════════════════════════════════════════
npm run clean:metrics
npm run clean

# ══════════════════════════════════════════════════════════════
# PASO 4: Liberar puerto 3333 si esta ocupado
# ══════════════════════════════════════════════════════════════
Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# ══════════════════════════════════════════════════════════════
# PASO 5: Abrir Grafana - Verificar "No data"
# ══════════════════════════════════════════════════════════════
# http://localhost:3002 (admin / admin)

# ══════════════════════════════════════════════════════════════
# PASO 6: Levantar chatbot demo (TERMINAL 1 - dejar corriendo)
# ══════════════════════════════════════════════════════════════
npm run demo

# ══════════════════════════════════════════════════════════════
# PASO 7: Ejecutar SOLO tests funcionales (TERMINAL 2)
# ══════════════════════════════════════════════════════════════
npm run test:chatbot:functional -- --headed

# ══════════════════════════════════════════════════════════════
# PASO 8: Generar PDF
# ══════════════════════════════════════════════════════════════
npm run pdf
```

---

## DEMO 2: Chatbot Demo (Con OWASP)

Si quieres mostrar tests de seguridad CON OWASP:

```powershell
# Pasos 1-6 igual que arriba...

# ══════════════════════════════════════════════════════════════
# PASO 7: Ejecutar tests de seguridad (TERMINAL 2)
# ══════════════════════════════════════════════════════════════
npm run test:chatbot:security -- --headed

# ══════════════════════════════════════════════════════════════
# PASO 8: Generar PDF
# ══════════════════════════════════════════════════════════════
npm run pdf
```

---

## DEMO 3: Chatbot Demo (TODOS los tests)

Si quieres mostrar TODO (funcionales + seguridad + performance):

```powershell
# Pasos 1-6 igual que arriba...

# ══════════════════════════════════════════════════════════════
# PASO 7: Ejecutar TODOS los tests (TERMINAL 2)
# ══════════════════════════════════════════════════════════════
npm test -- --headed

# ══════════════════════════════════════════════════════════════
# PASO 8: Generar PDF
# ══════════════════════════════════════════════════════════════
npm run pdf
```

---

## DEMO 4: Google Gemini (IA Real)

Para testear Google Gemini directamente (sin chatbot demo):

```powershell
# ══════════════════════════════════════════════════════════════
# PASO 1: Limpiar y levantar Grafana
# ══════════════════════════════════════════════════════════════
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
npm run grafana:up

# Esperar 20 segundos...

npm run clean:metrics
npm run clean

# ══════════════════════════════════════════════════════════════
# PASO 2: Abrir Grafana
# ══════════════════════════════════════════════════════════════
# http://localhost:3002 (admin / admin)

# ══════════════════════════════════════════════════════════════
# PASO 3: Ejecutar tests de Gemini
# ══════════════════════════════════════════════════════════════
npm run test:gemini

# ══════════════════════════════════════════════════════════════
# PASO 4: Generar PDF
# ══════════════════════════════════════════════════════════════
npm run pdf
```

---

## Troubleshooting

### Puerto 3333 en uso (Demo Server)
```powershell
Get-NetTCPConnection -LocalPort 3333 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Puerto 3002 en uso (Grafana)
```powershell
docker ps
docker stop <nombre-del-contenedor>
```

### Grafana muestra datos viejos
```powershell
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
npm run grafana:up
# Esperar 20 segundos...
npm run clean:metrics
npm run clean
```

### Docker no esta corriendo
Abre Docker Desktop y espera a que inicie.

---

## Resumen Rapido

| Quiero... | Comando |
|-----------|---------|
| Solo funcionales | `npm run test:chatbot:functional -- --headed` |
| Solo seguridad (OWASP) | `npm run test:chatbot:security -- --headed` |
| Solo performance | `npm run test:chatbot:performance -- --headed` |
| Todo | `npm test -- --headed` |
| Gemini | `npm run test:gemini` |

---

## Autor

**Elyer Maldonado** - QA Lead | AI Testing Specialist

Framework: INGRID v2.0
