/*
  # Create promotional_code_usage table

  1. New Tables
    - `promotional_code_usage`
      - `id` (uuid, primary key)
      - `code_id` (uuid, foreign key to promotional_codes)
      - `user_id` (uuid, foreign key to user_profiles)
      - `used_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `promotional_code_usage` table
    - Only service role can access (tracking via Edge Functions)

  3. Notes
    - Historial de uso de códigos
    - Un usuario solo puede usar un código una vez
    - Incrementa current_uses en promotional_codes
*/

-- Create promotional_code_usage table
CREATE TABLE IF NOT EXISTS promotional_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES promotional_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now(),
  UNIQUE(code_id, user_id)
);

-- Enable RLS
ALTER TABLE promotional_code_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access
CREATE POLICY "Service role has full access to promotional_code_usage"
  ON promotional_code_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index on code_id for usage tracking
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_code_id ON promotional_code_usage(code_id);

-- Create index on user_id for user's used codes
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_user_id ON promotional_code_usage(user_id);

-- Create index on used_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_promotional_code_usage_used_at ON promotional_code_usage(used_at DESC);

-- Create function to increment current_uses when code is used
CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE promotional_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment usage counter
CREATE TRIGGER on_promo_code_used
  AFTER INSERT ON promotional_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_promo_code_usage();