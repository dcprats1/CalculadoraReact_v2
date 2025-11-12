/*
  # Create custom commercial plans table

  1. New Tables
    - `custom_commercial_plans`
      - `id` (uuid, primary key) - Unique identifier for the plan
      - `user_id` (uuid, foreign key) - References auth.users, owner of the plan
      - `plan_name` (text) - Display name of the plan
      - `discounts` (jsonb) - Structure containing discount percentages by service and weight range
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update

  2. Security
    - Enable RLS on `custom_commercial_plans` table
    - Add policies for authenticated users to manage their own plans

  3. Structure of discounts JSON:
    {
      "domestic": {
        "Express8:30": { "1kg": 35, "3kg": 35, "5kg": 35, "10kg": 35, "15kg": 35, "additional": 15 },
        "Express10:30": { "1kg": 50, "3kg": 50, "5kg": 40, "10kg": 35, "15kg": 35, "additional": 15 },
        "Express14:00": { "1kg": 50, "3kg": 50, "5kg": 40, "10kg": 35, "15kg": 35, "additional": 15 },
        "Express19:00": { "1kg": 50, "3kg": 50, "5kg": 40, "10kg": 35, "15kg": 35, "additional": 15 },
        "BusinessParcel": { "1kg": 60, "3kg": 60, "5kg": 50, "10kg": 50, "15kg": 50, "additional": 40 },
        "EconomyParcel": { "1kg": 40, "3kg": 40, "5kg": 40, "10kg": 40, "15kg": 40, "additional": 35 }
      },
      "international": {
        "EuroBusinessParcel": { "under15kg": 7.5, "15kg": 0, "additional": 0 }
      }
    }
*/

-- Create custom commercial plans table
CREATE TABLE IF NOT EXISTS custom_commercial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  discounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_plan_name_per_user UNIQUE (user_id, plan_name)
);

-- Enable Row Level Security
ALTER TABLE custom_commercial_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own plans
CREATE POLICY "Users can view own commercial plans"
  ON custom_commercial_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own plans
CREATE POLICY "Users can insert own commercial plans"
  ON custom_commercial_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own plans
CREATE POLICY "Users can update own commercial plans"
  ON custom_commercial_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own plans
CREATE POLICY "Users can delete own commercial plans"
  ON custom_commercial_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_custom_commercial_plans_user_id
  ON custom_commercial_plans(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_commercial_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_custom_commercial_plans_timestamp
  BEFORE UPDATE ON custom_commercial_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_commercial_plans_updated_at();
