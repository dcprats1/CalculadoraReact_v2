/*
  # Crear tabla tariffsPDF para importación de PDFs

  1. Nueva Tabla
    - `tariffsPDF`
      - Copia exacta de la estructura de `custom_tariffs`
      - SIN campo `user_id` (será tabla global para pruebas)
      - Incluye todos los campos de precios para destinos
      - Estructura idéntica para validar importación de PDFs antes de usar en producción
  
  2. Propósito
    - Tabla de prueba para importación automática de PDFs de tarifas GLS
    - Permite probar sin riesgo de afectar datos de producción
    - Una vez validada, se decidirá qué tabla usar en la app
  
  3. Seguridad
    - RLS habilitado pero permisivo para usuarios autenticados (solo pruebas)
    - Los usuarios autenticados pueden leer/escribir para validar importaciones
  
  4. Índices
    - Índice en (service_name, weight_from, weight_to) para búsquedas rápidas
    - Índice en service_name para filtrado por servicio
*/

-- Crear tabla tariffsPDF
CREATE TABLE IF NOT EXISTS public.tariffsPDF (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  weight_from character varying(3) NOT NULL,
  weight_to character varying(3) NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  provincial_sal numeric(12, 4) NULL,
  provincial_rec numeric(12, 4) NULL,
  provincial_int numeric(12, 4) NULL,
  regional_sal numeric(12, 4) NULL,
  regional_rec numeric(12, 4) NULL,
  regional_int numeric(12, 4) NULL,
  nacional_sal numeric(12, 4) NULL,
  nacional_rec numeric(12, 4) NULL,
  nacional_int numeric(12, 4) NULL,
  portugal_sal numeric(12, 4) NULL,
  portugal_rec numeric(12, 4) NULL,
  portugal_int numeric(12, 4) NULL,
  andorra_sal numeric(12, 4) NULL,
  andorra_rec numeric(12, 4) NULL,
  andorra_int numeric(12, 4) NULL,
  gibraltar_sal numeric(12, 4) NULL,
  gibraltar_rec numeric(12, 4) NULL,
  gibraltar_int numeric(12, 4) NULL,
  canarias_mayores_sal numeric(12, 4) NULL,
  canarias_mayores_rec numeric(12, 4) NULL,
  canarias_mayores_int numeric(12, 4) NULL,
  canarias_menores_sal numeric(12, 4) NULL,
  canarias_menores_rec numeric(12, 4) NULL,
  canarias_menores_int numeric(12, 4) NULL,
  baleares_mayores_sal numeric(12, 4) NULL,
  baleares_mayores_rec numeric(12, 4) NULL,
  baleares_mayores_int numeric(12, 4) NULL,
  baleares_menores_sal numeric(12, 4) NULL,
  baleares_menores_rec numeric(12, 4) NULL,
  baleares_menores_int numeric(12, 4) NULL,
  ceuta_sal numeric(12, 4) NULL,
  ceuta_rec numeric(12, 4) NULL,
  ceuta_int numeric(12, 4) NULL,
  melilla_sal numeric(12, 4) NULL,
  melilla_rec numeric(12, 4) NULL,
  melilla_int numeric(12, 4) NULL,
  azores_mayores_sal numeric(12, 4) NULL,
  azores_mayores_rec numeric(12, 4) NULL,
  azores_mayores_int numeric(12, 4) NULL,
  azores_menores_sal numeric(12, 4) NULL,
  azores_menores_rec numeric(12, 4) NULL,
  azores_menores_int numeric(12, 4) NULL,
  madeira_mayores_sal numeric(12, 4) NULL,
  madeira_mayores_rec numeric(12, 4) NULL,
  madeira_mayores_int numeric(12, 4) NULL,
  madeira_menores_sal numeric(12, 4) NULL,
  madeira_menores_rec numeric(12, 4) NULL,
  madeira_menores_int numeric(12, 4) NULL,
  andorra_arr numeric(12, 4) NULL,
  baleares_mayores_arr numeric(12, 4) NULL,
  baleares_menores_arr numeric(12, 4) NULL,
  canarias_mayores_arr numeric(12, 4) NULL,
  canarias_menores_arr numeric(12, 4) NULL,
  ceuta_arr numeric(12, 4) NULL,
  gibraltar_arr numeric(12, 4) NULL,
  melilla_arr numeric(12, 4) NULL,
  nacional_arr numeric(12, 4) NULL,
  portugal_arr numeric(12, 4) NULL,
  provincial_arr numeric(12, 4) NULL,
  regional_arr numeric(12, 4) NULL,
  CONSTRAINT tariffsPDF_pkey PRIMARY KEY (id)
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tariffsPDF_service 
  ON public.tariffsPDF USING btree (service_name);

CREATE INDEX IF NOT EXISTS idx_tariffsPDF_lookup 
  ON public.tariffsPDF USING btree (service_name, weight_from, weight_to);

-- Habilitar RLS
ALTER TABLE public.tariffsPDF ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permisivas para usuarios autenticados (solo pruebas)
CREATE POLICY "Authenticated users can view tariffsPDF"
  ON public.tariffsPDF
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tariffsPDF"
  ON public.tariffsPDF
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tariffsPDF"
  ON public.tariffsPDF
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tariffsPDF"
  ON public.tariffsPDF
  FOR DELETE
  TO authenticated
  USING (true);

-- Reutilizar función trigger existente para updated_at
CREATE TRIGGER trigger_tariffsPDF_updated_at
  BEFORE UPDATE ON public.tariffsPDF
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_tariffs_updated_at();