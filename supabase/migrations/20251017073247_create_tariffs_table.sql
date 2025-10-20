/*
  # Create tariffs table

  1. New Tables
    - `tariffs`
      - `id` (uuid, primary key) - Unique identifier
      - `service_name` (text) - Name of the shipping service
      - `weight_from` (varchar(3)) - Weight range start
      - `weight_to` (varchar(3), nullable) - Weight range end (null for open ranges)
      - All price columns for different zones and services (sal, rec, int, arr)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Unique index on (service_name, weight_from, weight_to)
    - Unique index on service_name where weight_to is null

  3. Security
    - Enable RLS on `tariffs` table
    - Add policy for authenticated users to read tariff data
    - Add policy for authenticated users to insert/update tariffs (for admin)

  4. Important Notes
    - This table stores cost pricing for all shipping services and zones
    - Supports both closed weight ranges (from-to) and open ranges (from onwards)
    - All price columns are nullable to allow partial data entry
*/

-- Create the tariffs table
CREATE TABLE IF NOT EXISTS public.tariffs (
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
  CONSTRAINT tariffs_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS tariffs_service_weight_idx 
  ON public.tariffs USING btree (service_name, weight_from, weight_to);

CREATE UNIQUE INDEX IF NOT EXISTS tariffs_open_range_idx 
  ON public.tariffs USING btree (service_name) 
  WHERE (weight_to IS NULL);

-- Enable RLS
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read tariffs"
  ON public.tariffs
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert tariffs"
  ON public.tariffs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tariffs"
  ON public.tariffs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tariffs"
  ON public.tariffs
  FOR DELETE
  TO authenticated
  USING (true);