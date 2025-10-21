# Instrucciones de Uso - Nuevas Funcionalidades

## 🎉 ¿Qué hay de nuevo?

Se han implementado tres mejoras importantes:

1. **Propagación automática de SPC y Descuento Lineal** desde tus preferencias
2. **Tabla de costes personalizada** ahora funciona completamente
3. **Recarga automática** al cambiar entre tabla oficial y personalizada

---

## 📖 Cómo Usar las Nuevas Funcionalidades

### 1. Configurar Valores por Defecto de SPC y Descuento Lineal

#### Paso 1: Acceder a Configuración
1. Haz clic en el icono de **Configuración** (⚙️) en la esquina superior derecha
2. Selecciona la pestaña **"Preferencias"**

#### Paso 2: Establecer Valores
1. Busca la sección **"Preferencias de cálculo"**
2. Ingresa tu valor preferido en:
   - **"Valor SPC fijo"**: Por ejemplo, `1.50`
   - **"Descuento lineal fijo %"**: Por ejemplo, `5.0`
3. Haz clic en **"Guardar cambios"**

#### Paso 3: Verificar
1. Vuelve al calculador principal
2. Mira el panel **"Ajustes de Costes"**
3. Deberías ver tus valores configurados automáticamente cargados

#### 💡 Notas Importantes:
- Estos valores son **opcionales** - si no los configuras, el sistema funciona como siempre
- Se cargan **automáticamente** cada vez que abres el calculador
- Puedes **modificarlos** durante tu sesión de trabajo sin problemas
- Los cambios que hagas "in-situ" solo duran durante la sesión actual
- Al recargar la página, volverán a cargarse tus valores configurados

---

### 2. Usar Tabla de Costes Personalizada

#### Paso 1: Crear Tarifas Personalizadas
1. Ve a **Configuración** → pestaña **"Costes Personalizados"**
2. Crea o edita tus tarifas personalizadas para los servicios que necesites
3. Guarda los cambios

#### Paso 2: Activar Tabla Personalizada
1. En el calculador principal, busca el botón **"Tabla Oficial Activa"**
   - Lo encontrarás en la parte superior del panel de costes
2. Haz clic en el botón
3. El botón cambiará a **"Tabla Personalizada Activa"** (color verde)
4. **Automáticamente** los costes se recalcularán usando tu tabla personalizada

#### Paso 3: Volver a Tabla Oficial
1. Haz clic nuevamente en el botón (ahora dice "Tabla Personalizada Activa")
2. Volverá a cambiar a **"Tabla Oficial Activa"**
3. Los costes se recalcularán automáticamente con la tabla oficial

#### 💡 Notas Importantes:
- El cambio es **inmediato** - no necesitas recargar la página
- Solo afecta al **servicio actualmente seleccionado**
- Puedes alternar entre tablas tantas veces como quieras
- Tu preferencia se guarda para la próxima sesión

---

## 🔍 Preguntas Frecuentes

### ¿Qué pasa si no configuro valores de SPC o Descuento?
- El sistema funciona **exactamente como antes**
- Puedes seguir ingresando valores manualmente en "Ajustes de Costes"

### ¿Los valores configurados sobrescriben lo que ingreso manualmente?
- **No**. Los valores configurados solo se cargan **al inicio**
- Si ya cambiaste un valor durante tu sesión, no se sobrescribirá

### ¿Puedo tener diferentes valores de SPC para diferentes servicios?
- Los valores en preferencias son **globales** (se aplican al inicio para todos los servicios)
- Pero puedes modificarlos libremente para cada servicio durante tu sesión
- Si necesitas valores específicos permanentes por servicio, usa las **tarifas personalizadas**

### ¿La tabla personalizada afecta las exportaciones (SOP, Mini-SOP)?
- **Sí**. Si tienes la tabla personalizada activa, las exportaciones usarán esos valores
- Puedes cambiar a tabla oficial antes de exportar si lo prefieres

### ¿Qué pasa si tengo tabla personalizada activa pero no he configurado tarifas?
- El sistema usará la tabla oficial automáticamente
- No habrá errores ni problemas

---

## ✅ Checklist de Verificación

Usa esta lista para confirmar que todo funciona correctamente:

### Configuración de Preferencias
- [ ] Puedo acceder a Configuración → Preferencias
- [ ] Puedo ingresar un valor de SPC
- [ ] Puedo ingresar un valor de Descuento Lineal
- [ ] Al guardar, veo el mensaje de éxito

### Propagación de Valores
- [ ] Al volver al calculador, veo mis valores configurados en "Ajustes de Costes"
- [ ] Puedo modificar estos valores manualmente
- [ ] Los cálculos se actualizan correctamente

### Tabla Personalizada
- [ ] Veo el botón "Tabla Oficial Activa"
- [ ] Al hacer clic, cambia a "Tabla Personalizada Activa" (verde)
- [ ] Los costes se actualizan automáticamente
- [ ] Puedo volver a tabla oficial con otro clic

### Funcionalidades Existentes (deben seguir funcionando)
- [ ] Puedo generar SOP completo
- [ ] Puedo generar Mini-SOP desde el comparador
- [ ] Puedo aplicar planes comerciales de descuento
- [ ] Los cálculos son correctos
- [ ] Las exportaciones Excel funcionan

---

## 🆘 Soporte

Si algo no funciona como se describe aquí:

1. **Recarga la página** - A veces ayuda reiniciar la sesión
2. **Verifica tu conexión** - Algunos cambios requieren guardar en la base de datos
3. **Revisa la consola del navegador** - Presiona F12 y busca errores en rojo
4. **Contacta al equipo técnico** - Con capturas de pantalla si es posible

---

## 📝 Notas Técnicas

### ¿Por qué solo se cargan al inicio?
- Para no interferir con tu trabajo durante la sesión
- Te da control total sobre los valores que usas
- Evita sobrescrituras inesperadas

### ¿Dónde se guardan mis preferencias?
- En la base de datos de Supabase
- Asociadas a tu cuenta de usuario
- Sincronizadas automáticamente

### ¿Afecta esto mis datos históricos?
- **No**. Solo afecta cálculos nuevos
- No modifica exportaciones previas
- No cambia datos guardados

---

**Fecha de implementación**: 2025-10-21
**Versión**: 1.0

¡Disfruta de las nuevas funcionalidades! 🚀
