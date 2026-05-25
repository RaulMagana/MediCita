# 🔐 Guía de Solución: Token JWT Inválido

## Problema
Recibo el error: `"Token inválido"` o `"Token de autenticación requerido"`

---

## ✅ Checklist de Diagnóstico

### 1️⃣ Verificar que el servidor está corriendo

```bash
curl http://localhost:3000/health
# Debe responder: { "status": "ok", "timestamp": "..." }
```

Si no responde:
```bash
# En terminal 1:
cd /home/magana/Documents/Repositories/MediCita/src/backend
pnpm run dev
```

---

### 2️⃣ Verificar variables de entorno

```bash
cd /home/magana/Documents/Repositories/MediCita/src/backend

# Ver configuración del servidor
curl http://localhost:3000/debug/config

# Debe mostrar:
# {
#   "NODE_ENV": "development",
#   "JWT_ACCESS_EXPIRES": "15m",
#   "JWT_REFRESH_EXPIRES": "7d",
#   "JWT_SECRETS_CONFIGURED": true,
#   ...
# }
```

Si `JWT_SECRETS_CONFIGURED` es `false`:
```bash
# Edita .env y verifica que existan:
# JWT_ACCESS_SECRET=<valor_largo>
# JWT_REFRESH_SECRET=<valor_largo>
```

---

### 3️⃣ Probar login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "doctor.admin",
    "password": "Admin2026"
  }'

# Respuesta exitosa:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "abc123def456...",
#   "user": {
#     "id": "uuid-here",
#     "username": "doctor.admin",
#     "role": "doctor"
#   }
# }
```

---

### 4️⃣ Validar el token obtenido

```bash
# Reemplaza TU_TOKEN con el accessToken del paso anterior

curl -X POST http://localhost:3000/debug/test-token \
  -H "Authorization: Bearer TU_TOKEN"

# Respuesta exitosa:
# {
#   "message": "Token válido",
#   "decoded": {
#     "sub": "...",
#     "username": "...",
#     "role": "...",
#     "iat": 1700000000,
#     "exp": 1700000900
#   },
#   "expiresIn": "2024-11-15T10:15:00.000Z"
# }
```

**Si ves error "Token inválido":**
- ✅ El token fue generado pero falló la verificación
- Esto significa que los secretos JWT no coinciden entre generación y verificación
- Ver solución en "Problema común #1" abajo

---

### 5️⃣ Usar herramientas de debugging

#### Test automático:
```bash
cd /home/magana/Documents/Repositories/MediCita
node tests/integration/jwt-test.js
```

#### Herramienta interactiva:
```bash
cd /home/magana/Documents/Repositories/MediCita
node tests/integration/debug-jwt.js
```

---

## 🐛 Problemas Comunes

### Problema #1: Token Válido en Decodificación pero Inválido en Verificación

**Causa:** Los secretos JWT en `.env` no coinciden entre servidor y cliente

**Solución:**
1. Verifica que `.env` tenga los secretos correctos
2. Reinicia el servidor: `Ctrl+C` y `pnpm run dev`
3. Genera un nuevo token de login

```bash
# Detener servidor
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Esperar un segundo
sleep 1

# Reiniciar
cd /home/magana/Documents/Repositories/MediCita/src/backend
pnpm run dev
```

---

### Problema #2: Token Expirado

**Síntoma:** Error: `"Token expirado"` o `code: TOKEN_EXPIRED`

**Solución:**
1. Haz login de nuevo para obtener un token fresco
2. El access token dura 15 minutos (por defecto)
3. Usa el `refreshToken` para obtener uno nuevo:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "tu_refresh_token_aqui"
  }'
```

---

### Problema #3: Header Authorization Malformado

**Síntoma:** Error: `"Token de autenticación requerido"`

**Causas comunes:**
- ❌ Falta el header `Authorization`
- ❌ Formato incorrecto (no usa `Bearer `)
- ❌ Token vacío o incompleto

**Soluciones:**

✅ Correcto:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

❌ Incorrecto:
```bash
Authorization: eyJhbGciOiJIUzI1NiIs...        # Falta "Bearer"
Authorization: Bearer                         # Falta token
Authorization: Basic dXNlcjpwYXNz             # Tipo incorrecto
```

---

### Problema #4: Token en el Frontend

Si usas un cliente JavaScript (React, Vue, etc.):

```javascript
// ✅ Correcto
fetch('http://localhost:3000/api/v1/appointments', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})

// ❌ Incorrecto
fetch('http://localhost:3000/api/v1/appointments', {
  method: 'GET',
  headers: {
    'Authorization': accessToken,  // Falta "Bearer "
    'Content-Type': 'application/json'
  }
})
```

---

### Problema #5: CORS o Content-Type

```bash
# ✅ Correcto
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slotId": "uuid-aqui"}'

# ❌ Incorrecto (sin Content-Type)
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"slotId": "uuid-aqui"}'
```

---

## 📊 Flujo de Autenticación

```
1. REGISTRO / LOGIN
   └─> POST /auth/login
       └─> Devuelve: accessToken + refreshToken

2. USAR TOKEN EN REQUESTS
   └─> GET /appointments
       Header: Authorization: Bearer <accessToken>

3. SI EXPIRA (15 min)
   └─> POST /auth/refresh
       Body: { refreshToken }
       └─> Devuelve nuevo: accessToken

4. LOGOUT (opcional)
   └─> POST /auth/logout
       Body: { refreshToken }
```

---

## 🧪 Script de Prueba Completo

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

# 1. Login
echo "🔐 Haciendo login..."
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"doctor.admin","password":"Admin2026"}')

ACCESS_TOKEN=$(echo $LOGIN | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error en login"
  exit 1
fi

echo "✅ Token obtenido: ${ACCESS_TOKEN:0:50}..."

# 2. Verificar token
echo ""
echo "🔍 Verificando token..."
curl -s -X POST http://localhost:3000/debug/test-token \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

# 3. Usar token en endpoint protegido
echo ""
echo "📊 Accediendo a /patients..."
curl -s -X GET "$BASE_URL/patients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## 🆘 Si Nada Funciona

1. **Reinicia todo:**
   ```bash
   # Mata procesos Node
   pkill -f "node"
   
   # Limpia node_modules
   cd /home/magana/Documents/Repositories/MediCita/src/backend
   rm -rf node_modules pnpm-lock.yaml
   
   # Reinstala
   pnpm install
   
   # Inicia
   pnpm run dev
   ```

2. **Verifica PostgreSQL:**
   ```bash
   psql -U postgres -d medicita -c "SELECT COUNT(*) FROM users;"
   ```

3. **Revisa logs del servidor:**
   - Busca en la terminal donde corre `pnpm run dev`
   - Debe haber mensajes como "Login exitoso" o errores JWT

4. **Contacta soporte con:**
   - Error exacto recibido
   - Output de `curl http://localhost:3000/debug/config`
   - Output de logs del servidor

---

## 📚 Recursos

- [JWT.io](https://jwt.io) - Decodificador online de JWT
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- Documentación de [`jsonwebtoken` npm](https://www.npmjs.com/package/jsonwebtoken)

---

**Última actualización:** 25 de Mayo, 2026
