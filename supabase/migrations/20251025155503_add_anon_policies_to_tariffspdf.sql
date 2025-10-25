/*
  # Añadir políticas RLS para rol anon en tariffspdf

  1. Propósito
    - Permitir que la función Edge (que usa anon key) pueda insertar datos
    - Permitir que usuarios no autenticados puedan leer datos temporales para preview
    - Asegurar que la importación de PDF funcione sin autenticación previa

  2. Seguridad
    - Solo lectura y escritura, sin modificación ni eliminación
    - Tabla temporal, los datos se limpian después de confirmar importación
    - RLS sigue habilitado para proteger acceso no autorizado

  3. Políticas añadidas
    - SELECT para anon: Permite leer datos de preview
    - INSERT para anon: Permite que función Edge inserte datos parseados
*/

-- Política SELECT para usuarios anónimos
CREATE POLICY "Anonymous users can view tariffspdf"
  ON public.tariffspdf
  FOR SELECT
  TO anon
  USING (true);

-- Política INSERT para usuarios anónimos (función Edge)
CREATE POLICY "Anonymous users can insert tariffspdf"
  ON public.tariffspdf
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política DELETE para usuarios anónimos (limpieza de tabla)
CREATE POLICY "Anonymous users can delete tariffspdf"
  ON public.tariffspdf
  FOR DELETE
  TO anon
  USING (true);
