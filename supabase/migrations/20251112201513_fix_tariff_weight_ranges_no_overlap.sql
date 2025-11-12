/*
  # Fix: Corrección de solapamiento en rangos de peso de tarifas

  ## Problema
  Los rangos de peso de las tarifas tienen solapamiento en los límites:
  - Rango 5-10kg: weight_to = 10
  - Rango 10-15kg: weight_from = 10
  
  Esto causa que un paquete de 10kg pueda cumplir ambos rangos, generando
  ambigüedad y duplicación de valores en el comparador comercial.

  ## Solución
  1. Ampliar el tamaño de los campos weight_from y weight_to para permitir decimales
  2. Ajustar los límites para evitar solapamiento usando valores decimales

  ## Cambios
  - Ampliar weight_from y weight_to de VARCHAR(3) a VARCHAR(10)
  - Actualizar rangos para evitar solapamiento en límites
*/

-- Paso 1: Ampliar el tamaño de los campos weight_from y weight_to
ALTER TABLE tariffs
ALTER COLUMN weight_from TYPE VARCHAR(10);

ALTER TABLE tariffs
ALTER COLUMN weight_to TYPE VARCHAR(10);

-- Paso 2: Actualizar rangos 10-15kg para que empiecen en 10.001
UPDATE tariffs
SET weight_from = '10.001'
WHERE CAST(weight_from AS NUMERIC) = 10
  AND CAST(weight_to AS NUMERIC) = 15;

-- Paso 3: Actualizar rangos 15+ para que empiecen en 15.001  
UPDATE tariffs
SET weight_from = '15.001'
WHERE CAST(weight_from AS NUMERIC) = 15
  AND (CAST(weight_to AS NUMERIC) >= 999 OR weight_to IS NULL);

-- Paso 4: Ajustar weight_to del rango 5-10 para claridad (10.000)
UPDATE tariffs
SET weight_to = '10.000'
WHERE CAST(weight_from AS NUMERIC) = 5
  AND CAST(weight_to AS NUMERIC) = 10;

-- Paso 5: Ajustar weight_to del rango 10-15 para claridad (15.000)
UPDATE tariffs
SET weight_to = '15.000'
WHERE CAST(weight_from AS NUMERIC) > 10
  AND CAST(weight_from AS NUMERIC) < 11
  AND CAST(weight_to AS NUMERIC) = 15;
