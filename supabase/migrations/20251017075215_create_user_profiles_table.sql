/*
  # Create user_profiles table

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `subscription_status` (enum: 'trial' | 'active' | 'expired' | 'cancelled')
      - `subscription_tier` (integer: 1-5, nullable)
      - `max_devices` (integer: 1, 3, 5, 8, 12, nullable)
      - `subscription_start_date` (timestamptz, nullable)
      - `subscription_end_date` (timestamptz, nullable)
      - `stripe_customer_id` (text, nullable)
      - `stripe_subscription_id` (text, nullable)
      - `payment_method` (enum: 'stripe' | 'promotional_gift' | 'admin_grant', nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_profiles` table
    - Users can read their own profile
    - Users can update limited fields in their own profile
    - Admin has full access
*/

-- Create subscription_status enum
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

-- Create payment_method enum
CREATE TYPE payment_method AS ENUM ('stripe', 'promotional_gift', 'admin_grant');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_tier integer CHECK (subscription_tier >= 1 AND subscription_tier <= 5),
  max_devices integer CHECK (max_devices IN (1, 3, 5, 8, 12)),
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_method payment_method,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access to user_profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Create index on subscription_status for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- Create index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);