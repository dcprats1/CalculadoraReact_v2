/*
  # Create promotional_codes table

  1. New Tables
    - `promotional_codes`
      - `id` (uuid, primary key)
      - `code` (text, único, ej: 'GIFT-A7F2B9', 'DISC-X9K2M4')
      - `code_type` (enum: 'gift' | 'discount')
      - `discount_percentage` (integer, nullable, 10-100, solo para type='discount')
      - `free_days` (integer, nullable, default 30, solo para type='gift')
      - `max_uses` (integer, nullable, null = ilimitado)
      - `current_uses` (integer, default 0)
      - `valid_until` (timestamptz, nullable)
      - `is_active` (boolean, default true)
      - `created_by` (uuid, nullable, FK a user_profiles, admin)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `promotional_codes` table
    - Only service role can access (admin access via Edge Function)
    - Validation happens in Edge Functions

  3. Notes
    - Códigos auto-generados aleatoriamente
    - GIFT-XXXXXX → 30 días gratis
    - DISC-XXXXXX → X% descuento primer mes (vía Stripe)
    - Admin puede desactivar código manualmente
*/

-- Create code_type enum
CREATE TYPE promo_code_type AS ENUM ('gift', 'discount');

-- Create promotional_codes table
CREATE TABLE IF NOT EXISTS promotional_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  code_type promo_code_type NOT NULL,
  discount_percentage integer CHECK (discount_percentage >= 10 AND discount_percentage <= 100),
  free_days integer DEFAULT 30 CHECK (free_days > 0),
  max_uses integer CHECK (max_uses > 0),
  current_uses integer DEFAULT 0 CHECK (current_uses >= 0),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE promotional_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (admin queries via Edge Function)
CREATE POLICY "Service role has full access to promotional_codes"
  ON promotional_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_promotional_codes_updated_at
  BEFORE UPDATE ON promotional_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_promotional_codes_code ON promotional_codes(code);

-- Create index on is_active for filtering active codes
CREATE INDEX IF NOT EXISTS idx_promotional_codes_is_active ON promotional_codes(is_active);

-- Create index on code_type for filtering
CREATE INDEX IF NOT EXISTS idx_promotional_codes_code_type ON promotional_codes(code_type);

-- Create composite index for active valid codes
CREATE INDEX IF NOT EXISTS idx_promotional_codes_active_valid 
  ON promotional_codes(is_active, valid_until) 
  WHERE is_active = true;