/*
  # Enable RLS on all tables missing it

  1. Security Changes
    - Enables Row Level Security on 18 tables that had policies defined but RLS disabled:
      - audit_log
      - clients
      - constants_by_service
      - contract_signatures
      - contracts
      - custom_cost_overrides
      - discount_plans
      - login_codes
      - operators
      - promotional_code_usage
      - promotional_codes
      - simulation_details
      - simulations
      - subscriptions
      - tariffs
      - user_preferences
      - user_profiles
      - users

  2. Important Notes
    - Without RLS enabled, existing policies on these tables were not being enforced
    - After this migration, only requests matching existing RLS policies will succeed
*/

ALTER TABLE IF EXISTS audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS constants_by_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_cost_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS discount_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promotional_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS promotional_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulation_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
