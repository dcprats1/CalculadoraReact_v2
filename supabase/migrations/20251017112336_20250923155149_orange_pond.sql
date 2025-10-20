/*
  # Sistema de Tarifario - Base de Datos

  1. Nuevas Tablas
     - `discount_plans` - Planes de descuento aplicables
     - `constants_by_service` - Variables internas y reglas por servicio
     - `simulations` - Historial de simulaciones guardadas
     - `simulation_details` - Detalles de bultos por simulación

  2. Seguridad
     - Habilitar RLS en todas las tablas
     - Políticas para usuarios autenticados
*/

-- Tabla de planes de descuento
CREATE TABLE IF NOT EXISTS discount_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  service_name text NOT NULL,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed', 'custom')) DEFAULT 'percentage',
  discount_value decimal(10,2) DEFAULT 0,
  min_volume decimal(10,2) DEFAULT 0,
  max_volume decimal(10,2),
  applies_to text CHECK (applies_to IN ('price', 'cost', 'both')) DEFAULT 'price',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabla de constantes por servicio
CREATE TABLE IF NOT EXISTS constants_by_service (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  constant_name text NOT NULL,
  constant_value text NOT NULL,
  constant_type text CHECK (constant_type IN ('decimal', 'integer', 'text', 'boolean')) DEFAULT 'decimal',
  description text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de simulaciones guardadas
CREATE TABLE IF NOT EXISTS simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  simulation_name text NOT NULL,
  service_name text NOT NULL,
  destination_zone text NOT NULL,
  margin_percentage decimal(5,2) NOT NULL,
  discount_plan_id uuid REFERENCES discount_plans(id),
  total_cost decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  total_packages integer NOT NULL,
  total_weight decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabla de detalles de bultos por simulación
CREATE TABLE IF NOT EXISTS simulation_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulations(id) ON DELETE CASCADE,
  package_number integer NOT NULL,
  weight decimal(10,2) NOT NULL,
  cost decimal(10,2) NOT NULL,
  price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE discount_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE constants_by_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_details ENABLE ROW LEVEL SECURITY;

-- Políticas para discount_plans
CREATE POLICY "Discount plans are viewable by everyone"
  ON discount_plans
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage discount plans"
  ON discount_plans
  FOR ALL
  TO authenticated
  USING (true);

-- Políticas para constants_by_service
CREATE POLICY "Constants are viewable by everyone"
  ON constants_by_service
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage constants"
  ON constants_by_service
  FOR ALL
  TO authenticated
  USING (true);

-- Políticas para simulations
CREATE POLICY "Users can view own simulations"
  ON simulations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create simulations"
  ON simulations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulations"
  ON simulations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations"
  ON simulations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para simulation_details
CREATE POLICY "Users can view simulation details"
  ON simulation_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulations 
      WHERE simulations.id = simulation_details.simulation_id 
      AND simulations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create simulation details"
  ON simulation_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM simulations 
      WHERE simulations.id = simulation_details.simulation_id 
      AND simulations.user_id = auth.uid()
    )
  );

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_discount_plans_service ON discount_plans(service_name, is_active);
CREATE INDEX IF NOT EXISTS idx_simulations_user ON simulations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_simulation_details_simulation ON simulation_details(simulation_id);