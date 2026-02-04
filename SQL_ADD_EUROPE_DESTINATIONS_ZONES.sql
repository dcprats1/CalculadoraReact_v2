/*
  # Add new Europe destinations and split Reino Unido

  Run this SQL in Supabase Dashboard > SQL Editor

  Changes:
    - Remove generic 'Reino Unido'
    - Add 'Reino Unido Z1' (Gales, Inglaterra)
    - Add 'Reino Unido Z2' (Escocia, Irlanda Norte, Islas)
    - Add 'San Marino' (same tariff as Italia)
    - Add 'Vaticano' (same tariff as Italia)
    - Add 'Corcega' (Francia Zona 2 tariff)
*/

DELETE FROM tariffs_international_europe
WHERE service_name = 'EUROBUSINESS PARCEL' AND country = 'Reino Unido';

INSERT INTO tariffs_international_europe (service_name, country, weight_from, weight_to, cost) VALUES
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 0, 1, 8.262),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 1, 2, 8.502),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 2, 3, 8.862),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 3, 4, 10.2),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 4, 5, 11.562),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 5, 7, 12.408),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 7, 10, 13.638),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 10, 15, 16.14),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 15, 20, 20.502),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 20, 25, 24.468),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 25, 30, 27.912),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 30, 35, 31.35),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 35, 40, 33.408),
('EUROBUSINESS PARCEL', 'Reino Unido Z1', 40, NULL, 0.828),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 0, 1, 8.76),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 1, 2, 9.012),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 2, 3, 9.372),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 3, 4, 11.43),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 4, 5, 13.5),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 5, 7, 14.238),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 7, 10, 15.93),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 10, 15, 18.762),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 15, 20, 22.26),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 20, 25, 26.742),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 25, 30, 30.12),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 30, 35, 33.498),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 35, 40, 35.562),
('EUROBUSINESS PARCEL', 'Reino Unido Z2', 40, NULL, 0.888),
('EUROBUSINESS PARCEL', 'San Marino', 0, 1, 6.798),
('EUROBUSINESS PARCEL', 'San Marino', 1, 2, 7.26),
('EUROBUSINESS PARCEL', 'San Marino', 2, 3, 7.65),
('EUROBUSINESS PARCEL', 'San Marino', 3, 4, 8.358),
('EUROBUSINESS PARCEL', 'San Marino', 4, 5, 9.12),
('EUROBUSINESS PARCEL', 'San Marino', 5, 7, 11.178),
('EUROBUSINESS PARCEL', 'San Marino', 7, 10, 13.728),
('EUROBUSINESS PARCEL', 'San Marino', 10, 15, 15.42),
('EUROBUSINESS PARCEL', 'San Marino', 15, 20, 17.07),
('EUROBUSINESS PARCEL', 'San Marino', 20, 25, 20.13),
('EUROBUSINESS PARCEL', 'San Marino', 25, 30, 23.238),
('EUROBUSINESS PARCEL', 'San Marino', 30, 35, 26.352),
('EUROBUSINESS PARCEL', 'San Marino', 35, 40, 28.41),
('EUROBUSINESS PARCEL', 'San Marino', 40, NULL, 0.708),
('EUROBUSINESS PARCEL', 'Vaticano', 0, 1, 6.798),
('EUROBUSINESS PARCEL', 'Vaticano', 1, 2, 7.26),
('EUROBUSINESS PARCEL', 'Vaticano', 2, 3, 7.65),
('EUROBUSINESS PARCEL', 'Vaticano', 3, 4, 8.358),
('EUROBUSINESS PARCEL', 'Vaticano', 4, 5, 9.12),
('EUROBUSINESS PARCEL', 'Vaticano', 5, 7, 11.178),
('EUROBUSINESS PARCEL', 'Vaticano', 7, 10, 13.728),
('EUROBUSINESS PARCEL', 'Vaticano', 10, 15, 15.42),
('EUROBUSINESS PARCEL', 'Vaticano', 15, 20, 17.07),
('EUROBUSINESS PARCEL', 'Vaticano', 20, 25, 20.13),
('EUROBUSINESS PARCEL', 'Vaticano', 25, 30, 23.238),
('EUROBUSINESS PARCEL', 'Vaticano', 30, 35, 26.352),
('EUROBUSINESS PARCEL', 'Vaticano', 35, 40, 28.41),
('EUROBUSINESS PARCEL', 'Vaticano', 40, NULL, 0.708),
('EUROBUSINESS PARCEL', 'Corcega', 0, 1, 20.058),
('EUROBUSINESS PARCEL', 'Corcega', 1, 2, 20.73),
('EUROBUSINESS PARCEL', 'Corcega', 2, 3, 21.618),
('EUROBUSINESS PARCEL', 'Corcega', 3, 4, 21.942),
('EUROBUSINESS PARCEL', 'Corcega', 4, 5, 22.26),
('EUROBUSINESS PARCEL', 'Corcega', 5, 7, 23.028),
('EUROBUSINESS PARCEL', 'Corcega', 7, 10, 26.79),
('EUROBUSINESS PARCEL', 'Corcega', 10, 15, 29.592),
('EUROBUSINESS PARCEL', 'Corcega', 15, 20, 32.16),
('EUROBUSINESS PARCEL', 'Corcega', 20, 25, 34.938),
('EUROBUSINESS PARCEL', 'Corcega', 25, 30, 37.908),
('EUROBUSINESS PARCEL', 'Corcega', 30, 35, 40.89),
('EUROBUSINESS PARCEL', 'Corcega', 35, 40, 42.948),
('EUROBUSINESS PARCEL', 'Corcega', 40, NULL, 1.068);

-- Verify
SELECT country, COUNT(*) as rangos FROM tariffs_international_europe
WHERE service_name = 'EUROBUSINESS PARCEL' GROUP BY country ORDER BY country;
