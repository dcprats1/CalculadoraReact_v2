# Checklist de Verificación - Corrección Custom Tariffs

## ✅ Completado Automáticamente

- [x] **Migración de base de datos aplicada**
  - Archivo: `supabase/migrations/[timestamp]_fix_custom_tariffs_rls_policies.sql`
  - Políticas RLS actualizadas
  - Constraint único agregado

- [x] **Código optimizado**
  - Archivo: `src/components/settings/CustomTariffsEditor.tsx`
  - Función `handleSave()` reescrita
  - Solo guarda filas modificadas
  - Mejores mensajes de error

- [x] **Compilación exitosa**
  - `npm run build` ejecutado sin errores
  - 1578 módulos transformados
  - Build generado correctamente

- [x] **Documentación creada**
  - `CAMBIOS_CUSTOM_TARIFFS_FIX.md` (técnico completo)
  - `RESUMEN_EJECUTIVO_CUSTOM_TARIFFS.md` (resumen ejecutivo)
  - `CHECKLIST_VERIFICACION.md` (este archivo)
  - README.md actualizado

- [x] **Sin interferencias**
  - SOP/MiniSOP intactos ✅
  - Autenticación OTP intacta ✅
  - Cálculos intactos ✅
  - Demás componentes intactos ✅

---

## 🧪 Pruebas Manuales Pendientes

### Prueba 1: Guardado Básico
- [ ] Iniciar sesión en la aplicación
- [ ] Ir a Configuración → Tabla de Costes Personalizada
- [ ] Modificar una celda (ej: Provincial 0-1kg SAL del servicio 8:30H)
- [ ] Pulsar GRABAR
- [ ] **Verificar:** No aparece error 401
- [ ] **Verificar:** Mensaje "Guardadas 1 fila(s) con modificaciones"

### Prueba 2: Múltiples Modificaciones
- [ ] Modificar celdas en diferentes rangos de peso (ej: 0-1kg, 3-5kg, 10-15kg)
- [ ] Pulsar GRABAR
- [ ] **Verificar:** Mensaje muestra número correcto de filas guardadas (3 en este ejemplo)

### Prueba 3: Persistencia
- [ ] Modificar y guardar alguna celda
- [ ] Cerrar el modal de la tabla personalizada
- [ ] Volver a abrir la tabla
- [ ] **Verificar:** El valor modificado se mantiene

### Prueba 4: Restauración
- [ ] Con valores personalizados guardados, pulsar "Restaurar Oficial"
- [ ] Pulsar GRABAR
- [ ] **Verificar:** Los valores vuelven a ser los oficiales

### Prueba 5: Cambio de Servicio
- [ ] Modificar y guardar valores en servicio 8:30H
- [ ] Cambiar a otro servicio (ej: Business)
- [ ] **Verificar:** Muestra valores oficiales de Business
- [ ] Volver a servicio 8:30H
- [ ] **Verificar:** Muestra valores personalizados guardados

### Prueba 6: Activación de Tabla Personalizada
- [ ] Guardar valores personalizados
- [ ] Ir a Preferencias
- [ ] Activar "Usar tabla de costes personalizada"
- [ ] Volver al calculador principal
- [ ] **Verificar:** Los cálculos usan los valores personalizados

---

## 🐛 Si Encuentras Problemas

### Error 401 Persiste
1. Verificar sesión activa:
   ```javascript
   // En consola del navegador (F12):
   console.log(localStorage.getItem('user_session'));
   ```
2. Si no hay sesión, cerrar sesión y volver a iniciar
3. Verificar que la migración se aplicó correctamente en Supabase

### Los Valores No Se Guardan
1. Abrir consola del navegador (F12)
2. Intentar guardar
3. Buscar mensajes de error en la consola
4. Verificar que hay cambios reales vs valores oficiales

### Los Valores No Aparecen
1. Verificar en Supabase que los datos están en la tabla:
   ```sql
   SELECT * FROM custom_tariffs
   WHERE user_id = '[tu_user_id]'
   AND service_name = '8:30H';
   ```
2. Verificar que la tabla está activada en Preferencias

---

## 📋 Archivos para Revisar

### Documentación:
- [ ] Leer `RESUMEN_EJECUTIVO_CUSTOM_TARIFFS.md` (5 min)
- [ ] Revisar `CAMBIOS_CUSTOM_TARIFFS_FIX.md` si necesitas detalles técnicos (15 min)

### Código Modificado:
- [ ] `src/components/settings/CustomTariffsEditor.tsx` (líneas 294-359)
  - Solo se modificó la función `handleSave()`
  - El resto del archivo está intacto

### Base de Datos:
- [ ] Verificar en Supabase que existe la migración `fix_custom_tariffs_rls_policies`
- [ ] Verificar que la tabla `custom_tariffs` tiene el constraint único

---

## ✅ Confirmación Final

Una vez completadas todas las pruebas manuales:

- [ ] **Prueba 1:** Guardado básico funciona ✅
- [ ] **Prueba 2:** Múltiples modificaciones funcionan ✅
- [ ] **Prueba 3:** Persistencia funciona ✅
- [ ] **Prueba 4:** Restauración funciona ✅
- [ ] **Prueba 5:** Cambio de servicio funciona ✅
- [ ] **Prueba 6:** Activación funciona ✅

**Firma y fecha:**
- Probado por: _____________________
- Fecha: ___/___/2025
- Estado: [ ] OK  [ ] Con issues

---

## 📞 Contacto

Si todo funciona correctamente:
- ✅ Marcar como completado en el sistema de tickets
- ✅ Archivar esta documentación para referencia futura

Si encuentras problemas:
- 🔍 Revisar logs en consola del navegador
- 📧 Reportar con capturas de pantalla y mensajes de error exactos
- 📋 Incluir qué prueba falló y en qué paso

---

**Estado del Checklist:** ⏳ PENDIENTE DE PRUEBAS MANUALES
**Última actualización:** 21 de Octubre de 2025
