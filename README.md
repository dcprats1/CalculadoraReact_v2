# Calculadora de Costes, Márgenes y Operadores

Aplicación React + TypeScript que replica el tarifario corporativo para calcular costes, márgenes y precios de venta de envíos en función de las tarifas almacenadas en Supabase. La herramienta permite analizar combinaciones servicio/zona/peso, detectar bultos irregulares y generar documentación SOP directamente desde el navegador.

## Funcionalidades principales

### Dashboard interactivo
- Selección de servicio con margen sobre venta (controlado por input numérico y deslizador, 40 % por defecto) y selector de plan comercial aplicable.
- Gestión de bultos con cantidades, pesos y medidas, cálculo volumétrico automático y resumen de pesos acumulados.
- Ajustes adicionales (SPC y suplementos) y control de entrega en sábado.
- Desglose dinámico de costes por zona de destino con aplicación automática de Climate Protect, cánones, energía, incrementos 2024/2025 y márgenes.
- Estados de carga y error renderizados previamente mediante retornos tempranos en `TariffCalculator` para evitar cierres de JSX
  sin pareja y bloquear el bundle cuando Supabase todavía no responde.
- Estructura de layout encapsulada (cabecera fija + contenido principal) para evitar cierres huérfanos en JSX y mantener estables los paneles de cálculo.
- Resumen de zonas más competitivas y rango de PVP generados.
- El banner superior incorpora una cuarta tarjeta "Descuento Coste Aplicado" que resume el plan comercial o descuento lineal vigente.
- Tabla de PVP con columna de margen sin IVA y resaltado manual de la fila seleccionada para facilitar la lectura.
- Panel "Comparador comercial" accesible desde el dashboard como modal centrado y desplazable, con controles alineados en la cabecera (cierre, servicio, plan, deslizador, casilla de margen y acciones), el bloque de "Precios competencia" editable, el bloque de "Costes base agencia" alimentado automáticamente según el servicio/plan seleccionados y resaltado en rojo cuando supera a la competencia, y "Precios a ofrecer" con deslizador de margen (0‑100 %) y casilla numérica sincronizada que colorean las celdas según la comparación, admiten ediciones manuales, navegan con TAB izquierda→derecha / arriba→abajo, muestran leyenda de colores y reflejan el margen medio ponderado por zona/rango en tiempo real.
- Panel "Comparador comercial" accesible desde el dashboard como modal centrado y desplazable, con controles alineados en la cabecera (cierre, servicio, plan, deslizador, casilla de margen y acciones), el bloque de "Precios competencia" editable, el bloque de "Costes base agencia" alimentado automáticamente según el servicio/plan seleccionados y resaltado en rojo cuando supera a la competencia, y "Precios a ofrecer" con deslizador de margen (0‑100 %) y casilla numérica sincronizada que colorean las celdas según la comparación, admiten ediciones manuales, navegan con TAB izquierda→derecha / arriba→abajo, muestran leyenda de colores y reflejan el margen medio ponderado por zona/rango en tiempo real. El botón **Ajustar a la competencia** copia los precios introducidos en la tabla amarilla (con confirmación para celdas vacías y usando el coste como mínimo) y recalcula el margen objetivo manteniendo las celdas editables para posteriores ajustes con el deslizador.
- Botón **Generar MiniSOP** en el panel "Precios a ofrecer" del comparador que descarga la plantilla del FTP, escribe en la hoja "General" solo el servicio seleccionado con los precios exactos de la tabla de oferta, copia esos precios a la hoja específica del servicio y descarga un Excel con únicamente esa hoja (sin generar el SOP completo). Permite exportaciones rápidas de ofertas específicas por servicio sin necesidad de completar todo el formulario del SOP principal.
- La selección de plan comercial se propaga entre servicios, bloquea el descuento lineal manual y se comparte con el comparador y la exportación SOP.

### Motor de cálculo
- Factores volumétricos específicos (167 kg/m³ por defecto, 333 kg/m³ para servicios marítimos e islas según servicio).
- Localización del rango de peso adecuado (0-15 kg) y cálculo incremental a partir del tramo abierto (15-999 kg).
- Incrementos 2024 y 2025 consolidados por servicio y zona, con porcentajes bloqueados.
- Todos los suplementos e incrementos se calculan siempre sobre el coste base original antes de aplicar descuentos lineales o planes comerciales, manteniendo resultados coherentes aunque se modifique el coste provincial o exista un plan activo.
- Para el servicio **Parcel Shop** no se añaden recargos internos (Climate Protect, cánones, energía, cobertura, etc.) ni se aplica descuento lineal; sólo el SPC configurable suma coste, mientras que los cargos sobre PVP (Sup. energía, Climate Protect y Seguro Opcional) continúan disponibles para el precio de venta.
- Los planes comerciales calculan su descuento a partir de las columnas de "arrastre" (`*_arr`) de Supabase: el importe que se resta al coste base es el porcentaje del plan sobre dicho arrastre; si no existe columna `*_arr` para una combinación, el plan no altera el coste.  Cuando el peso supera el último tramo cerrado disponible, el plan descuenta primero el arrastre de ese tramo y aplica el porcentaje correspondiente al tramo "kg adicional" sobre el arrastre del rango abierto (multiplicado por los kilos adicionales).  El peso usado para esta lógica siempre es el peso facturable de la zona (incluyendo factores volumétricos específicos).
- Detección automática de bultos irregulares (7 € por bulto) y avisos de encintado/sábado para servicios exprés.
- Marcado de zonas sin tarifa como "NO" cuando Supabase no ofrece coste para la combinación solicitada.
- Los ajustes de coste desglosan los incrementos 2025 de Canarias y Baleares cuando solo aplican a esos destinos específicos.
- Todos los suplementos y totales monetarios se redondean al céntimo hacia arriba (p. ej. 1,621 → 1,63) antes de mostrarse o exportarse.

### Generación de SOP
- Descarga la plantilla oficial desde el FTP (`base SOP FTP.xlsx`) y construye una tabla virtual con los PVP calculados.
- La descarga conserva la pestaña **General** para facilitar la auditoría de los PVP que se propagan al resto de hojas.
- Actualiza la hoja `General` sin modificar el archivo original, rellenando la columna de PVP para cada servicio/zona/peso.
- Copia cada PVP sin IVA desde la columna `G` de `General` a la hoja y celda indicadas en las columnas `H` e `I`, dejando en
  blanco las combinaciones sin tarifa y preservando las celdas vacías originales.
- Convierte las fórmulas en valores antes de exportar y mantiene la pestaña `General` en la copia descargada, evitando acceder a propiedades internas como `_merges` y previniendo errores de ExcelJS durante la descarga.
- Opera con la dependencia local `exceljs` instalada vía npm (sin cargas remotas tipo Skypack), asegurando versiones corregidas del motor y evitando errores de inicialización.
- Completa los datos comerciales en las hojas `Express 8_30`, `cierre personalizado` y `Costes_Adicionales`.
- Genera un Excel listo para compartir (copiando todas las hojas y sustituyendo fórmulas por valores).
- El modal permite reutilizar el plan comercial global, escoger otro plan del catálogo ("Plan Integral 2026", "Plan Integral 2025 +10") o exportar sin plan antes de generar el Excel.
- Normaliza los nombres de servicio/zona del libro (`Express 8_30`, `PEN.`, `Can.My.`, etc.), resuelve el tramo "kg. adc" como 15‑999 y aplica los descuentos/recargos calculados en la web para cada combinación servicio‑zona‑peso.
- Replica exactamente la lógica de la tabla de costes (recargos, incrementos, SPC, planes o descuentos lineales y bloqueos por coste provincial) para todos los tramos de peso del SOP y escribe el PVP sin IVA en `General` y en las hojas/celdas referenciadas, dejando en blanco las combinaciones sin tarifa.
- Al aplicar planes comerciales en el SOP se utiliza el mismo "arrastre" (`*_arr`) que en el dashboard para calcular el descuento previo al margen, incluyendo la combinación de último tramo cerrado + tramo adicional y el peso facturable por zona; de este modo los PVP exportados coinciden con la vista de costes/PVP del usuario.
- Reconoce explícitamente las zonas de Azores/Madeira (mayores y menores) y trata las modalidades Salida/Recogida/Interciudad como columnas independientes al poblar `General`, de modo que cada tarifa `_sal`, `_rec` e `_int` mantiene su propio PVP.
- Emite logs de depuración (solo en modo desarrollo) detallando costes base, descuentos, suplementos y celdas actualizadas para facilitar el seguimiento del proceso de exportación.
- Antes de descargar se valida que "Cliente/Tarifa" y "Nombre y nº de agencia" estén informados, se proponen fechas por defecto (hoy / 31 de diciembre) y se muestra un aviso de confirmación para revisar las hojas "Aduanas" y "Costes Adicionales".
- El formulario del SOP rellena automáticamente todos los destinos indicados en las hojas Express, Business, Economy y Shop (incluidos porcentajes formateados como `%`, importes mínimo/máximo/fijo y seguro opcional) respetando el bloqueo mutuo entre comisión (%) e importe fijo. Las fórmulas de `BusinessParcel_Tránsito` se conservan en la copia descargada.

## Estructura del proyecto

```
src/
├── App.tsx
├── components/
│   ├── TariffCalculator.tsx               # Vista principal y orquestación
│   ├── PackageManager.tsx                 # Gestión de bultos y medidas
│   ├── CostBreakdownTable.tsx             # Tabla de costes/PVP por zona
│   ├── CommercialComparatorPanel.tsx      # Modal comparador comercial
│   ├── ServiceComparison.tsx              # Comparativa de servicios (placeholder)
│   └── sop/
│       ├── SOPGenerator.tsx               # Asistente de generación SOP completo
│       ├── MiniSOPLauncher.tsx            # Mini SOP simple (tabla plana)
│       └── ComparatorMiniSOPGenerator.tsx # Mini SOP desde comparador (con FTP)
├── hooks/useSupabaseData.ts               # Carga de tarifas y planes desde Supabase
├── lib/supabase.ts                        # Cliente y tipos de tablas
└── utils/
    ├── calculations.ts                    # Motor de cálculo y utilidades
    ├── customPlans.ts                     # Planes comerciales personalizados
    └── sopHelpers.ts                      # Utilidades compartidas para SOP
```

## Puesta en marcha

```bash
npm install
npm run dev
```

Variables de entorno necesarias:

```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
```

## Generar documentación SOP
1. Calcula previamente los costes para disponer de los PVP actualizados.
2. Pulsa **Generar SOP** en la esquina superior derecha.
3. Rellena los datos comerciales (cliente, agencia, validez, comisiones, suplementos).
4. Descarga el Excel (incluyendo la pestaña `General`) listo para compartir con precios planos y revisar la matriz completa de PVP.

> El archivo del FTP no se modifica: la herramienta trabaja sobre una copia en memoria y fuerza el recálculo del libro al abrirlo en Excel.

## Scripts disponibles

| Comando       | Descripción                         |
|---------------|-------------------------------------|
| `npm run dev` | Arranca Vite en modo desarrollo.     |
| `npm run build` | Genera la build de producción.     |
| `npm run preview` | Previsualiza la build estática. |

## Próximos pasos sugeridos
- Activar la comparativa multioperador (`ServiceComparison`).
- Persistir simulaciones y configuraciones en Supabase.
- Añadir validaciones específicas por servicio (límites de peso/medidas avanzados).
- Integrar exportación a PDF con maquetación idéntica a las hojas originales.

## Notas de mantenimiento
- Restauración operativa desde el commit estable `8a29a71c2eb7f1c59f73dbbb4aa1d83da842d2f5`, manteniendo intacto el generador SOP basado en `exceljs` y reexponiendo la calculadora dinámica previa al botón de cálculo manual.
- Se documenta la tabla virtual que alimenta la hoja `General` del SOP reutilizando las tarifas de Supabase y el margen configurado en el dashboard.
- Correcciones de JSX en `PackageManager` y `CostBreakdownTable` para restablecer los contenedores principales tras la restauración selectiva del commit y evitar errores de compilación al montar los paneles de costes y gestión de bultos.
- Se normalizaron los cálculos de kilometraje en `TariffCalculator` para derivarlos de forma directa según servicio y entrega en sábado, evitando dependencias memoradas que producían errores de análisis.
- La exportación SOP aplica el margen sobre venta dividiendo el coste total sin IVA entre `(1 - margen%)`, de modo que los PVP del Excel coinciden exactamente con los mostrados en la tabla de PVP de la aplicación.
- Cuando un plan de descuentos está activo, el motor desglosa el arrastre del último tramo cerrado y el tramo "kg adicional" aplicando el porcentaje correspondiente a cada bloque (incluidos los servicios marítimos con su factor volumétrico zonal), por lo que los descuentos son coherentes a partir de 15 kg y el SOP refleja el mismo resultado que la vista de costes.
- El motor de cálculo (`calculatePackageCost`) reutiliza ahora un único coste base interno, eliminando duplicidades de símbolos en el bundle.
- Se memoizaron los totales de kilometraje para garantizar dependencias válidas en React Hooks y prevenir errores de análisis durante la compilación.
- Consolidado el cálculo de kilometraje en un único `useMemo` dentro de `TariffCalculator` para evitar retornos fuera de contexto cuando React recompila el componente.
- Se reforzó `PackageManager` para ignorar actualizaciones mientras el controlador `onChange` aún no está disponible, evitando errores al añadir bultos.
- `CostBreakdownTable` valida las colecciones de bultos antes de calcular totales, lo que impide fallos de `reduce` cuando el estado todavía se está inicializando.
- El asistente SOP comprueba que las tarifas recibidas desde Supabase sean iterables antes de construir la tabla virtual, eliminando el error «tariffs is not iterable» durante la descarga del Excel.
- Se alinearon las columnas del desglose de costes con los campos calculados (`noVol`, `amplCobertura`, `energia`, `suplementos`, `irregular`) y se añadió la columna de kilometraje para que todos los recargos aparezcan en pantalla.
- El coste de kilometraje se incorpora ahora al subtotal de cada zona y se refleja en el PVP gracias a la nueva integración con `calculateCostBreakdown`.
- La tabla de costes muestra los incrementos de 2024/2025/2026 con su importe y porcentaje aplicado, aplicando las reglas por servicio/zona (5 % exprés en península/Portugal, 3 % Urg19 y 3 % universal en Canarias/Baleares) y eliminando el destino «Portugal Islas» del flujo principal y de la exportación SOP.
- Los incrementos de 2025 se modelaron con un mapa explícito por servicio y zona para que se apliquen incluso cuando 2024 sea 0 %, manteniendo sincronizados el motor de cálculo, el dashboard y la generación SOP.
- Se implementó el botón **Generar MiniSOP** en el panel "Precios a Ofrecer" del comparador comercial que genera un Excel SOP reducido: descarga la plantilla del FTP, escribe en la hoja "General" solo los precios del servicio seleccionado tomándolos directamente de la tabla de oferta, copia esos precios a la hoja específica del servicio y exporta el Workbook con únicamente esa hoja. Se creó el archivo `sopHelpers.ts` con funciones compartidas (normalización de servicios, zonas, descarga FTP) para evitar duplicación de código entre `SOPGenerator.tsx` y `ComparatorMiniSOPGenerator.tsx`. El componente mapea las zonas del comparador (Prov., Reg., Pen., etc.) a claves de base de datos (provincial, regional, nacional, etc.) y los rangos de peso (0 a 1kg, 1 a 3kg, etc.) a tramos numéricos. Incluye manejo de errores completo y logs de depuración en modo desarrollo para facilitar el seguimiento del proceso de exportación. **Corrección crítica 1**: Se corrigió la lectura de columnas de la hoja "General" del Excel del FTP (A=weight_from, C=service_name, D=zone, F=weight_to, G=PVP) y se implementó `normalizeRangeName` en `sopHelpers.ts` para manejar correctamente los sufijos de modalidad (_sal, _rec, _int) tal como lo hace el generador SOP completo, solucionando el error "No se pudieron escribir precios en la hoja General". **Corrección crítica 2**: Se reemplazó `findServiceSheet` (que buscaba por nombre de servicio) por `findServiceSheetFromGeneral` que lee la columna H de "General" para determinar la hoja destino correcta (ej: "Urg8:30H Courier" → "Express 8_30"), contando las referencias y seleccionando la hoja más mencionada, tal como hace el generador SOP completo. **Corrección crítica 3**: Se eliminó la creación de un nuevo workbook vacío y la copia manual de contenido (que perdía imágenes, configuraciones de impresión, estilos avanzados, etc.). Ahora se modifica el workbook original del FTP eliminando las hojas innecesarias con `workbook.removeWorksheet()` y conservando solo la hoja del servicio, preservando así todos los elementos visuales, configuraciones de página y formato original del Excel.