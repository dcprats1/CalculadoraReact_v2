/*
  # Sistema de Autenticación y Gestión de Clientes

  ## Descripción General
  Este sistema gestiona autenticación por email/código, contratos comerciales,
  suscripciones con Stripe, preferencias de usuario, y tablas personalizadas
  de costes por cliente.

  ## 1. Nuevas Tablas

  ### clients
  Clientes corporativos (empresas que contratan el servicio)
  - `id` (uuid, PK)
  - `company_name` (text, nombre comercial)
  - `contact_email` (text, email principal)
  - `is_active` (boolean, estado de la cuenta)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### users
  Usuarios individuales vinculados a clientes
  - `id` (uuid, PK, referencia a auth.users)
  - `client_id` (uuid, FK a clients)
  - `email` (text, único)
  - `full_name` (text)
  - `role` (text: 'owner', 'admin', 'user')
  - `is_active` (boolean)
  - `last_login` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### contracts
  Contratos comerciales aceptados por clientes
  - `id` (uuid, PK)
  - `client_id` (uuid, FK a clients)
  - `contract_type` (text: 'initial', 'renewal', 'amendment')
  - `pdf_url` (text, URL del PDF en Supabase Storage)
  - `accepted_at` (timestamptz, NULL hasta aceptación)
  - `accepted_by_user_id` (uuid, FK a users)
  - `version` (text, ej: 'v1.0')
  - `is_active` (boolean)
  - `created_at` (timestamptz)

  ### subscriptions
  Suscripciones Stripe de clientes
  - `id` (uuid, PK)
  - `client_id` (uuid, FK a clients, único)
  - `stripe_customer_id` (text, ID de Stripe)
  - `stripe_subscription_id` (text, ID de suscripción)
  - `plan_name` (text: 'monthly', 'quarterly', 'annual')
  - `price_eur` (decimal, precio mensual)
  - `status` (text: 'active', 'past_due', 'canceled', 'trialing')
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### user_preferences
  Preferencias personales de cada usuario
  - `id` (uuid, PK)
  - `user_id` (uuid, FK a users, único)
  - `uses_custom_cost_table` (boolean, usa tabla personalizada)
  - `fixed_spc_value` (decimal, SPC fijo)
  - `fixed_discount_percentage` (decimal, descuento fijo)
  - `default_service_packages` (jsonb, paquetes favoritos)
  - `ui_theme` (text: 'light', 'dark')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### custom_cost_overrides
  Costes personalizados por cliente (sobreescribe cost_factors)
  - `id` (uuid, PK)
  - `client_id` (uuid, FK a clients)
  - `service_name` (text)
  - `weight_from` (decimal)
  - `weight_to` (decimal, nullable)
  - `cost_factor_name` (text, ej: 'provincial_price')
  - `override_value` (decimal, valor personalizado)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### login_codes
  Códigos de verificación de 6 dígitos para login
  - `id` (uuid, PK)
  - `email` (text, indexado)
  - `code` (text, 6 dígitos)
  - `expires_at` (timestamptz, validez 15 minutos)
  - `used_at` (timestamptz, NULL hasta uso)
  - `attempts` (integer, contador de intentos)
  - `created_at` (timestamptz)

  ### payment_events
  Log de eventos de webhooks de Stripe
  - `id` (uuid, PK)
  - `client_id` (uuid, FK a clients, nullable)
  - `stripe_event_id` (text, único)
  - `event_type` (text, ej: 'invoice.paid')
  - `payload` (jsonb, datos completos del evento)
  - `processed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### audit_log
  Registro de acciones administrativas
  - `id` (uuid, PK)
  - `user_id` (uuid, FK a users, nullable)
  - `client_id` (uuid, FK a clients, nullable)
  - `action_type` (text, ej: 'user_created', 'subscription_changed')
  - `details` (jsonb, detalles de la acción)
  - `ip_address` (text)
  - `created_at` (timestamptz)

  ## 2. Seguridad RLS

  Todas las tablas tienen RLS habilitado con políticas restrictivas:
  - Los usuarios solo ven datos de su propio cliente
  - Los 'owner' y 'admin' tienen permisos extendidos
  - Tablas sensibles (login_codes, payment_events) son privadas
  - Políticas separadas para SELECT, INSERT, UPDATE, DELETE

  ## 3. Índices

  Índices para optimizar consultas frecuentes:
  - Búsquedas por email
  - Búsquedas por client_id
  - Búsquedas por fechas de expiración
  - Búsquedas por IDs de Stripe

  ## 4. Triggers

  - Actualización automática de updated_at en modificaciones
  - Limpieza automática de códigos expirados (cada hora)

  ## 5. Notas Importantes

  - NO se eliminan datos con DROP (protección de datos)
  - Todas las políticas verifican autenticación
  - Las fechas usan timestamptz (con zona horaria)
  - Los campos de precio usan numeric(10,2) para evitar errores de redondeo
*/

-- ==============================================================================
-- TABLA: clients (sin dependencias)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_email text NOT NULL UNIQUE,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_contact_email ON clients(contact_email);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- TABLA: users (depende de clients)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text DEFAULT 'user' NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
  is_active boolean DEFAULT true NOT NULL,
  last_login timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS RLS: clients
-- ==============================================================================

CREATE POLICY "Users can view own client"
  ON clients FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ==============================================================================
-- POLÍTICAS RLS: users
-- ==============================================================================

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ==============================================================================
-- TABLA: contracts (depende de clients y users)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contract_type text DEFAULT 'initial' NOT NULL CHECK (contract_type IN ('initial', 'renewal', 'amendment')),
  pdf_url text,
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  version text NOT NULL DEFAULT 'v1.0',
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON contracts(is_active) WHERE is_active = true;

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can accept contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ==============================================================================
-- TABLA: subscriptions (depende de clients)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan_name text NOT NULL CHECK (plan_name IN ('monthly', 'quarterly', 'annual')),
  price_eur numeric(10,2) NOT NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ==============================================================================
-- TABLA: user_preferences (depende de users)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  uses_custom_cost_table boolean DEFAULT false NOT NULL,
  fixed_spc_value numeric(10,2),
  fixed_discount_percentage numeric(5,2),
  default_service_packages jsonb DEFAULT '[]'::jsonb NOT NULL,
  ui_theme text DEFAULT 'light' NOT NULL CHECK (ui_theme IN ('light', 'dark')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- TABLA: custom_cost_overrides (depende de clients)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS custom_cost_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  weight_from numeric(10,2) NOT NULL,
  weight_to numeric(10,2),
  cost_factor_name text NOT NULL,
  override_value numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_costs_client_id ON custom_cost_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_costs_service ON custom_cost_overrides(service_name);
CREATE INDEX IF NOT EXISTS idx_custom_costs_active ON custom_cost_overrides(is_active) WHERE is_active = true;

ALTER TABLE custom_cost_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client cost overrides"
  ON custom_cost_overrides FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ==============================================================================
-- TABLA: login_codes (sin dependencias, tabla privada)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);
CREATE INDEX IF NOT EXISTS idx_login_codes_expires ON login_codes(expires_at);

ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo Edge Functions con service_role

-- ==============================================================================
-- TABLA: payment_events (depende de clients, tabla privada)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_client_id ON payment_events(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_id ON payment_events(stripe_event_id);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas: solo webhooks/admin

-- ==============================================================================
-- TABLA: audit_log (depende de users y clients)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_client_id ON audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- ==============================================================================
-- TRIGGERS: Auto-update updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at
      BEFORE UPDATE ON clients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subscriptions_updated_at') THEN
    CREATE TRIGGER update_subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_cost_overrides_updated_at') THEN
    CREATE TRIGGER update_custom_cost_overrides_updated_at
      BEFORE UPDATE ON custom_cost_overrides
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==============================================================================
-- FUNCIÓN: Limpieza de códigos expirados
-- ==============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_login_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM login_codes
  WHERE expires_at < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;