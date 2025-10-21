/*
  # Create Custom Tariffs Tables

  1. New Tables
    - `custom_tariffs`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key to auth.users) - Owner of the custom tariff
      - `service_name` (text) - Name of the shipping service
      - `weight_from` (varchar(3)) - Weight range start (0, 1, 3, 5, 10, 15)
      - `weight_to` (varchar(3), nullable) - Weight range end
      - All price columns matching public.tariffs structure
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp
    
    - `custom_tariffs_active`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key to auth.users) - User who owns this configuration
      - `service_name` (text) - Service name for which custom tariffs are active
      - `is_active` (boolean) - Whether custom tariffs are active for this service
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Index on (user_id, service_name, weight_from, weight_to) for custom_tariffs
    - Unique index on (user_id, service_name) for custom_tariffs_active

  3. Security
    - Enable RLS on both tables
    - Users can only access their own custom tariffs
    - Users can only manage their own activation states

  4. Important Notes
    - This table structure mirrors public.tariffs to allow seamless integration
    - RLS ensures complete data isolation between users
    - Triggers maintain updated_at timestamps automatically
*/

-- Create custom_tariffs table
CREATE TABLE IF NOT EXISTS public.custom_tariffs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  CONSTRAINT custom_tariffs_pkey PRIMARY KEY (id)
);

-- Create custom_tariffs_active table
CREATE TABLE IF NOT EXISTS public.custom_tariffs_active (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_tariffs_active_pkey PRIMARY KEY (id)
);

-- Create indexes for custom_tariffs
CREATE INDEX IF NOT EXISTS idx_custom_tariffs_user_service 
  ON public.custom_tariffs USING btree (user_id, service_name);

CREATE INDEX IF NOT EXISTS idx_custom_tariffs_lookup 
  ON public.custom_tariffs USING btree (user_id, service_name, weight_from, weight_to);

-- Create unique index for custom_tariffs_active
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_tariffs_active_user_service 
  ON public.custom_tariffs_active USING btree (user_id, service_name);

-- Enable RLS on custom_tariffs
ALTER TABLE public.custom_tariffs ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_tariffs
CREATE POLICY "Users can view own custom tariffs"
  ON public.custom_tariffs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom tariffs"
  ON public.custom_tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom tariffs"
  ON public.custom_tariffs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tariffs"
  ON public.custom_tariffs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable RLS on custom_tariffs_active
ALTER TABLE public.custom_tariffs_active ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_tariffs_active
CREATE POLICY "Users can view own activation states"
  ON public.custom_tariffs_active
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activation states"
  ON public.custom_tariffs_active
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activation states"
  ON public.custom_tariffs_active
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activation states"
  ON public.custom_tariffs_active
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_custom_tariffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_custom_tariffs_updated_at
  BEFORE UPDATE ON public.custom_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_tariffs_updated_at();

CREATE TRIGGER trigger_custom_tariffs_active_updated_at
  BEFORE UPDATE ON public.custom_tariffs_active
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_tariffs_updated_at();