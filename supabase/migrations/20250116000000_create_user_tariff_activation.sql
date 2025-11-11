/*
  # Crear sistema de activación de usuarios mediante PDF

  1. Nueva Tabla: user_tariff_activation
    - Rastrea qué usuarios han subido y validado su PDF oficial
    - Controla el acceso a las tarifas de la BBDD

  2. Seguridad
    - RLS habilitado
    - Solo el propio usuario puede ver su registro
    - Solo usuarios activados pueden ver las tarifas

  3. Índices
    - Índice en user_id para búsquedas rápidas
    - Índice en is_activated para consultas de usuarios activos
*/

-- Crear tabla de activación de usuarios
CREATE TABLE IF NOT EXISTS public.user_tariff_activation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_uploaded_at timestamp with time zone DEFAULT now(),
  pdf_filename text,
  pdf_validation_score integer CHECK (pdf_validation_score >= 0 AND pdf_validation_score <= 100),
  is_activated boolean DEFAULT false,
  activation_date timestamp with time zone,
  pdf_storage_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_tariff_activation_pkey PRIMARY KEY (id),
  CONSTRAINT user_tariff_activation_user_id_unique UNIQUE (user_id)
);

-- Índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_user_tariff_activation_user_id
  ON public.user_tariff_activation(user_id);

-- Índice para búsquedas de usuarios activados
CREATE INDEX IF NOT EXISTS idx_user_tariff_activation_activated
  ON public.user_tariff_activation(is_activated) WHERE is_activated = true;

-- Habilitar RLS
ALTER TABLE public.user_tariff_activation ENABLE ROW LEVEL SECURITY;

-- Política: Usuario solo ve su propio registro
CREATE POLICY "Users can view their own activation status"
  ON public.user_tariff_activation
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Usuario puede insertar su propio registro
CREATE POLICY "Users can create their own activation record"
  ON public.user_tariff_activation
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuario puede actualizar su propio registro
CREATE POLICY "Users can update their own activation record"
  ON public.user_tariff_activation
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_tariff_activation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_tariff_activation_updated_at
  BEFORE UPDATE ON public.user_tariff_activation
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tariff_activation_updated_at();

-- Trigger para auto-setear activation_date cuando is_activated cambia a true
CREATE OR REPLACE FUNCTION set_activation_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_activated = true AND (OLD.is_activated IS NULL OR OLD.is_activated = false) THEN
    NEW.activation_date = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_activation_date
  BEFORE UPDATE ON public.user_tariff_activation
  FOR EACH ROW
  EXECUTE FUNCTION set_activation_date();

-- Actualizar RLS de tariffsPDF para requerir activación
DROP POLICY IF EXISTS "Authenticated users can view tariffsPDF" ON public.tariffsPDF;

CREATE POLICY "Only activated users can view tariffsPDF"
  ON public.tariffsPDF
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tariff_activation
      WHERE user_id = auth.uid()
        AND is_activated = true
    )
  );

-- Mantener políticas de INSERT/UPDATE/DELETE para authenticated (para testing)
-- En producción, estas podrían ser más restrictivas

COMMENT ON TABLE public.user_tariff_activation IS 'Controla qué usuarios han validado su PDF oficial de tarifas y pueden acceder a los datos';
COMMENT ON COLUMN public.user_tariff_activation.pdf_validation_score IS 'Puntuación de confianza de la validación (0-100)';
COMMENT ON COLUMN public.user_tariff_activation.is_activated IS 'TRUE si el PDF fue validado y el usuario puede ver las tarifas';
