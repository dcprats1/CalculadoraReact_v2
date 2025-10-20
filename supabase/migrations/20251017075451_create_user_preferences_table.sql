/*
  # Create user_preferences table

  1. New Tables
    - `user_preferences`
      - `user_id` (uuid, primary key, FK a user_profiles)
      - `fixed_spc` (decimal(10,2), nullable)
      - `fixed_linear_discount` (decimal(5,2), nullable)
      - `agency_name` (text, nullable)
      - `agency_address` (text, nullable)
      - `agency_postal_code` (text, nullable)
      - `agency_city` (text, nullable)
      - `agency_province` (text, nullable)
      - `agency_email` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_preferences` table
    - Users can read/update their own preferences
    - Service role has full access

  3. Notes
    - Valores se replican en TODAS las licencias del usuario
    - Si campo es NULL → usuario debe ingresar manualmente
    - Usuario puede actualizar cuando quiera
*/

-- Create user_preferences table if not exists
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  fixed_spc decimal(10,2) CHECK (fixed_spc >= 0),
  fixed_linear_discount decimal(5,2) CHECK (fixed_linear_discount >= 0 AND fixed_linear_discount <= 100),
  agency_name text,
  agency_address text,
  agency_postal_code text,
  agency_city text,
  agency_province text,
  agency_email text CHECK (agency_email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' OR agency_email IS NULL),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Service role has full access to user_preferences" ON user_preferences;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to user_preferences"
  ON user_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger if not exists
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);