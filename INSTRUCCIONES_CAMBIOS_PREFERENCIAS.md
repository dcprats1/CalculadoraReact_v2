# Instrucciones: Cambios en Propagación de Preferencias

**Fecha:** 21 de Octubre de 2025
**Estado:** ✅ Implementado y listo para testing

---

## ¿Qué se ha corregido?

Se han resuelto tres problemas principales:

1. **✅ Propagación de SPC y Descuento Lineal**
   - Los valores configurados en Usuario → Configuración → Preferencias ahora se cargan automáticamente al iniciar sesión
   - Ya no es necesario que los valores estén en 0 para que se carguen

2. **✅ Validación de Tabla Personalizada**
   - El botón "Tabla Oficial Activa" / "Tabla Personalizada Activa" ahora valida que existan datos antes de activar
   - Muestra un mensaje claro si intentas activar sin haber creado la tabla personalizada

3. **✅ Unificación de Campos**
   - Todos los componentes ahora usan los nombres correctos de la base de datos
   - No más inconsistencias entre frontend y backend

---

## Archivos Modificados

```
✓ src/contexts/PreferencesContext.tsx
✓ src/components/settings/PreferencesTab.tsx
✓ src/components/TariffCalculator.tsx
✓ supabase/functions/update-preferences/index.ts
```

**Total:** 4 archivos modificados
**Nuevos archivos:**
- `CHANGELOG_PROPAGACION_PREFERENCIAS.md` (documentación detallada)
- `RESUMEN_CAMBIOS_PREFERENCIAS.md` (resumen técnico)
- `INSTRUCCIONES_CAMBIOS_PREFERENCIAS.md` (este archivo)

---

## Cómo Funciona Ahora

### 1. Configurar Valores Predeterminados

**Ruta:** Usuario → Configuración → Preferencias

1. Ingresa el valor de SPC que quieres usar siempre (ej: 2.50)
   - Puede ser positivo o negativo
   - Con 2 decimales

2. Ingresa el descuento lineal que quieres aplicar siempre (ej: 5.0)
   - Debe ser positivo (0-100)
   - Es un porcentaje

3. Haz clic en **"Guardar cambios"**

4. Los valores quedan guardados en tu perfil

### 2. Uso en el Panel Principal

**Al iniciar sesión:**
- El sistema carga automáticamente tus valores guardados
- Aparecen en el panel "Ajustes de Costes"
- Los cálculos los usan inmediatamente

**Modificación temporal:**
- Puedes cambiar los valores directamente en el panel
- Los cambios se usan para los cálculos actuales
- NO se guardan en tu perfil
- Al recargar la página, vuelven a los valores guardados

**Para guardar permanentemente:**
- Ve a Usuario → Configuración → Preferencias
- Modifica los valores
- Haz clic en "Guardar cambios"

### 3. Tabla de Costes Personalizada

**Crear tu tabla:**
1. Ve a Usuario → Configuración → Tarifas Personalizadas
2. Selecciona el servicio que quieres personalizar
3. Edita los valores de costes
4. Haz clic en "GRABAR"

**Activar tu tabla:**
1. En el panel principal, selecciona el servicio
2. Haz clic en el botón "Tabla Oficial Activa"
3. Si tienes datos guardados, cambiará a "Tabla Personalizada Activa"
4. Si no tienes datos, verás un mensaje indicándote dónde crearlos

**Desactivar tu tabla:**
1. Haz clic en "Tabla Personalizada Activa"
2. Volverá a "Tabla Oficial Activa"
3. Los cálculos usarán las tarifas estándar

---

## Qué Debes Testear

### Test 1: Propagación de Valores
```
1. Ir a Usuario → Configuración → Preferencias
2. Establecer SPC = 2.50
3. Establecer Descuento = 5.0
4. Guardar cambios
5. Recargar la aplicación
✓ Verificar que los valores aparecen en "Ajustes de Costes"
```

### Test 2: Modificación Temporal
```
1. Con valores configurados (del test anterior)
2. En el panel principal, cambiar SPC a 3.00
3. Observar que los cálculos usan 3.00
4. Recargar la aplicación
✓ Verificar que SPC vuelve a 2.50
```

### Test 3: Validación de Tabla Personalizada
```
1. Asegurarte de NO tener tabla personalizada para "Urg8:30H Courier"
2. Seleccionar ese servicio en el panel principal
3. Intentar activar "Tabla Personalizada"
✓ Verificar que aparece mensaje: "No tienes una tabla de costes personalizada..."
✓ El mensaje debe indicar la ruta: "Usuario → Configuración → Tarifas Personalizadas"
```

### Test 4: Tabla Personalizada Funcional
```
1. Ir a Usuario → Configuración → Tarifas Personalizadas
2. Seleccionar "Urg8:30H Courier"
3. Editar algunos valores
4. Hacer clic en "GRABAR"
5. Ir al panel principal
6. Seleccionar "Urg8:30H Courier"
7. Hacer clic en "Tabla Oficial Activa"
✓ Debe cambiar a "Tabla Personalizada Activa"
✓ Los cálculos deben usar tus valores personalizados
```

### Test 5: SPC Negativo
```
1. Ir a Usuario → Configuración → Preferencias
2. Establecer SPC = -1.50 (negativo)
3. Guardar cambios
4. Recargar la aplicación
✓ Verificar que SPC = -1.50 aparece en "Ajustes de Costes"
✓ Los cálculos deben funcionar correctamente con valor negativo
```

---

## Si Algo Sale Mal

### Problema: Los valores no se cargan al iniciar
**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Toma captura de pantalla
4. Revierte los cambios (ver sección siguiente)

### Problema: Error al guardar preferencias
**Solución:**
1. Verifica que los valores sean válidos:
   - SPC: número con 2 decimales (positivo o negativo)
   - Descuento: número entre 0 y 100
2. Si persiste, revisa la consola del navegador
3. Revierte los cambios si es necesario

### Problema: El botón de tabla personalizada no funciona
**Solución:**
1. Verifica que hayas creado tarifas personalizadas para ese servicio
2. Revisa la consola del navegador por errores
3. Contacta con desarrollo si persiste

---

## Cómo Revertir los Cambios

Si necesitas volver al estado anterior:

### Opción 1: Revertir commit (recomendado)
```bash
# Ver historial
git log --oneline

# Revertir el commit de estos cambios (crea un nuevo commit)
git revert [hash-del-commit]

# Push al repositorio
git push origin main
```

### Opción 2: Reset duro (CUIDADO: elimina cambios)
```bash
# Ver historial
git log --oneline

# Volver al commit anterior
git reset --hard [hash-del-commit-anterior]

# Forzar push (CUIDADO)
git push origin main --force
```

### Archivos a revertir manualmente (si es necesario):
1. `src/contexts/PreferencesContext.tsx`
2. `src/components/settings/PreferencesTab.tsx`
3. `src/components/TariffCalculator.tsx`
4. `supabase/functions/update-preferences/index.ts`

**Ver detalles exactos en:** `RESUMEN_CAMBIOS_PREFERENCIAS.md`

---

## Comandos Útiles

### Ver estado de Git
```bash
git status
```

### Ver cambios realizados
```bash
git diff
```

### Ver historial de commits
```bash
git log --oneline --graph --all
```

### Crear commit de estos cambios
```bash
git add .
git commit -m "fix: propagación y persistencia de preferencias SPC y descuento lineal"
git push origin main
```

---

## Documentación Adicional

📄 **CHANGELOG_PROPAGACION_PREFERENCIAS.md**
- Explicación técnica completa
- Escenarios de testing detallados
- Esquema de base de datos
- Comportamiento del sistema

📄 **RESUMEN_CAMBIOS_PREFERENCIAS.md**
- Resumen ejecutivo de cambios
- Líneas exactas modificadas
- Comandos Git útiles
- Checklist de verificación

---

## Contacto

Si tienes dudas o encuentras problemas:
1. Revisa la documentación completa en `CHANGELOG_PROPAGACION_PREFERENCIAS.md`
2. Verifica la consola del navegador (F12) por errores
3. Toma capturas de pantalla del problema
4. Contacta con el equipo de desarrollo

---

**Documentado por:** Sistema de desarrollo
**Fecha:** 21 de Octubre de 2025
**Estado:** ✅ Listo para testing
**Versión:** 1.0.0
