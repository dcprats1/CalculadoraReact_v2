/*
  # Admin User Setup Instructions

  1. Manual Steps Required
    - Cannot create auth.users via SQL migration
    - Must be done via Supabase Dashboard or Auth API

  2. Admin Setup Process:
    
    OPTION A: Via Supabase Dashboard
    1. Go to Authentication > Users
    2. Click "Add user"
    3. Email: dcprats@gmail.com
    4. Password: (auto-generated or manual)
    5. Confirm email automatically
    6. Copy the user UUID
    
    OPTION B: Via Edge Function (recommended)
    - Create admin-create-user Edge Function
    - Call with service_role key
    - Automatically creates user + profile
    
  3. After User Creation:
    Run this SQL to create admin profile:
    
    INSERT INTO user_profiles (
      id,
      email,
      subscription_status,
      subscription_tier,
      max_devices,
      subscription_start_date,
      subscription_end_date,
      payment_method
    ) VALUES (
      'USER_UUID_HERE',
      'dcprats@gmail.com',
      'active',
      5,
      999,
      now(),
      now() + interval '10 years',
      'admin_grant'
    )
    ON CONFLICT (id) DO NOTHING;

  4. Admin Verification Query:
    
    SELECT id, email, subscription_status, subscription_tier, max_devices
    FROM user_profiles
    WHERE email = 'dcprats@gmail.com';

  5. Notes
    - Admin has tier 5 (highest)
    - Admin has 999 devices (unlimited)
    - Admin subscription expires in 10 years
    - All Edge Functions check admin status via service_role
*/

-- This migration serves as documentation only
-- No actual SQL operations performed
SELECT 'Admin user must be created manually via Supabase Dashboard' AS instruction;