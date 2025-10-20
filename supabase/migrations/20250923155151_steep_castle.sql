/*
  # Datos de ejemplo para el sistema de tarifario

  1. Datos de muestra
     - Servicios comunes (Economy, Urgente, Business, Islas)
     - Rangos de peso estándar
     - Planes de descuento típicos
     - Constantes por servicio
*/

-- Insertar tarifas de ejemplo para Economy
INSERT INTO tariffs (service_name, weight_from, weight_to, provincial_price, regional_price, national_price, provincial_cost, regional_cost, national_cost) VALUES
('ECONOMY', 0, 1, 5.50, 7.20, 9.80, 4.40, 5.76, 7.84),
('ECONOMY', 1.01, 2, 6.20, 8.10, 11.50, 4.96, 6.48, 9.20),
('ECONOMY', 2.01, 5, 8.70, 11.40, 16.20, 6.96, 9.12, 12.96),
('ECONOMY', 5.01, 10, 12.30, 16.10, 22.90, 9.84, 12.88, 18.32),
('ECONOMY', 10.01, 20, 18.50, 24.20, 34.40, 14.80, 19.36, 27.52),
('ECONOMY', 20.01, 30, 24.70, 32.30, 45.90, 19.76, 25.84, 36.72);

-- Insertar tarifas para Urgente 8:30
INSERT INTO tariffs (service_name, weight_from, weight_to, provincial_price, regional_price, national_price, provincial_cost, regional_cost, national_cost) VALUES
('URGENTE 8:30', 0, 1, 8.90, 11.60, 15.80, 7.12, 9.28, 12.64),
('URGENTE 8:30', 1.01, 2, 10.20, 13.30, 18.90, 8.16, 10.64, 15.12),
('URGENTE 8:30', 2.01, 5, 14.30, 18.70, 26.60, 11.44, 14.96, 21.28),
('URGENTE 8:30', 5.01, 10, 20.20, 26.40, 37.60, 16.16, 21.12, 30.08),
('URGENTE 8:30', 10.01, 20, 30.40, 39.70, 56.50, 24.32, 31.76, 45.20),
('URGENTE 8:30', 20.01, 30, 40.60, 53.00, 75.40, 32.48, 42.40, 60.32);

-- Insertar tarifas para Business
INSERT INTO tariffs (service_name, weight_from, weight_to, provincial_price, regional_price, national_price, provincial_cost, regional_cost, national_cost) VALUES
('BUSINESS', 0, 1, 7.20, 9.40, 12.80, 5.76, 7.52, 10.24),
('BUSINESS', 1.01, 2, 8.10, 10.60, 15.00, 6.48, 8.48, 12.00),
('BUSINESS', 2.01, 5, 11.40, 14.90, 21.20, 9.12, 11.92, 16.96),
('BUSINESS', 5.01, 10, 16.10, 21.00, 29.90, 12.88, 16.80, 23.92),
('BUSINESS', 10.01, 20, 24.20, 31.60, 44.90, 19.36, 25.28, 35.92),
('BUSINESS', 20.01, 30, 32.30, 42.20, 59.90, 25.84, 33.76, 47.92);

-- Insertar tarifas para Islas
INSERT INTO tariffs (service_name, weight_from, weight_to, provincial_price, regional_price, national_price, provincial_cost, regional_cost, national_cost) VALUES
('ISLAS', 0, 1, 12.50, 15.80, 22.40, 10.00, 12.64, 17.92),
('ISLAS', 1.01, 2, 14.20, 17.90, 25.60, 11.36, 14.32, 20.48),
('ISLAS', 2.01, 5, 19.90, 25.10, 35.80, 15.92, 20.08, 28.64),
('ISLAS', 5.01, 10, 28.10, 35.50, 50.60, 22.48, 28.40, 40.48),
('ISLAS', 10.01, 20, 42.20, 53.30, 76.00, 33.76, 42.64, 60.80),
('ISLAS', 20.01, 30, 56.40, 71.20, 101.50, 45.12, 56.96, 81.20);

-- Insertar planes de descuento
INSERT INTO discount_plans (plan_name, service_name, discount_type, discount_value, min_volume, applies_to, is_active) VALUES
('Plan Básico', 'ECONOMY', 'percentage', 5.00, 0, 'price', true),
('Plan Básico', 'URGENTE 8:30', 'percentage', 5.00, 0, 'price', true),
('Plan Básico', 'BUSINESS', 'percentage', 5.00, 0, 'price', true),
('Plan Básico', 'ISLAS', 'percentage', 5.00, 0, 'price', true),

('Plan Profesional', 'ECONOMY', 'percentage', 10.00, 100, 'price', true),
('Plan Profesional', 'URGENTE 8:30', 'percentage', 8.00, 100, 'price', true),
('Plan Profesional', 'BUSINESS', 'percentage', 12.00, 100, 'price', true),
('Plan Profesional', 'ISLAS', 'percentage', 15.00, 100, 'price', true),

('Plan Empresa', 'ECONOMY', 'percentage', 18.00, 500, 'price', true),
('Plan Empresa', 'URGENTE 8:30', 'percentage', 15.00, 500, 'price', true),
('Plan Empresa', 'BUSINESS', 'percentage', 20.00, 500, 'price', true),
('Plan Empresa', 'ISLAS', 'percentage', 25.00, 500, 'price', true);

-- Insertar constantes por servicio
INSERT INTO constants_by_service (service_name, constant_name, constant_value, constant_type, description) VALUES
('ECONOMY', 'max_weight_kg', '30', 'decimal', 'Peso máximo permitido en kg'),
('ECONOMY', 'delivery_days', '2-3', 'text', 'Días de entrega estimados'),
('ECONOMY', 'insurance_included', 'false', 'boolean', 'Seguro incluido'),

('URGENTE 8:30', 'max_weight_kg', '30', 'decimal', 'Peso máximo permitido en kg'),
('URGENTE 8:30', 'delivery_time', '8:30', 'text', 'Hora límite de entrega'),
('URGENTE 8:30', 'insurance_included', 'true', 'boolean', 'Seguro incluido'),

('BUSINESS', 'max_weight_kg', '30', 'decimal', 'Peso máximo permitido en kg'),
('BUSINESS', 'delivery_days', '1-2', 'text', 'Días de entrega estimados'),
('BUSINESS', 'insurance_included', 'true', 'boolean', 'Seguro incluido'),

('ISLAS', 'max_weight_kg', '30', 'decimal', 'Peso máximo permitido en kg'),
('ISLAS', 'delivery_days', '3-5', 'text', 'Días de entrega estimados'),
('ISLAS', 'insurance_included', 'true', 'boolean', 'Seguro incluido');