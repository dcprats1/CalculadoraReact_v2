/**
 * Mapa exacto de ubicaciones de datos en el PDF de tarifas GLS 2025
 * Este mapa define dónde está cada dato exactamente en el PDF
 */

export interface TariffDataPoint {
  recogida?: string;
  arrastre?: string;
  entrega?: string;
  salidas?: string;
  recogidas?: string;
  interciudad?: string;
  km?: string;
}

export interface WeightRange {
  weight_from: number;
  weight_to: number;
  label: string;
  Provincial?: TariffDataPoint;
  Regional?: TariffDataPoint;
  Nacional?: TariffDataPoint;
  Portugal_Peninsular?: TariffDataPoint;
  Ceuta_Melilla?: TariffDataPoint;
  Gibraltar?: TariffDataPoint;
  Andorra?: TariffDataPoint;
  Baleares_Mayores?: TariffDataPoint;
  Baleares_Menores?: TariffDataPoint;
  Baleares_Interislas?: TariffDataPoint;
  Canarias_Mayores?: TariffDataPoint;
  Canarias_Menores?: TariffDataPoint;
  Canarias_Interislas?: TariffDataPoint;
  Tenerife_Tenerife?: TariffDataPoint;
  Las_Palmas_Las_Palmas?: TariffDataPoint;
  Madeira_Mayores?: TariffDataPoint;
  Madeira_Menores?: TariffDataPoint;
  Azores_Mayores?: TariffDataPoint;
  Azores_Menores?: TariffDataPoint;
}

export interface ServiceMap {
  service_name: string;
  page: number;
  type?: 'peninsular' | 'insular' | 'maritimo' | 'aereo' | 'internacional';
  weights: WeightRange[];
}

/**
 * Mapa completo de tarifas GLS 2025
 */
export const TARIFF_MAP_2025: ServiceMap[] = [
  // ============================================
  // SERVICIOS PENINSULARES
  // ============================================
  {
    service_name: 'Express08:30',
    page: 4,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,17', arrastre: '2,11', entrega: '5,03', salidas: '7,14', recogidas: '3,28', interciudad: '8,31' },
        Regional: { recogida: '1,17', arrastre: '3,11', entrega: '5,03', salidas: '8,14', recogidas: '4,28', interciudad: '9,31' },
        Nacional: { recogida: '1,17', arrastre: '4,56', entrega: '5,03', salidas: '9,59', recogidas: '5,73', interciudad: '10,76' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,23', arrastre: '2,63', entrega: '5,55', salidas: '8,18', recogidas: '3,86', interciudad: '9,41' },
        Regional: { recogida: '1,23', arrastre: '3,85', entrega: '5,55', salidas: '9,40', recogidas: '5,08', interciudad: '10,63' },
        Nacional: { recogida: '1,23', arrastre: '5,50', entrega: '5,55', salidas: '11,05', recogidas: '6,73', interciudad: '12,28' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,28', arrastre: '3,15', entrega: '6,07', salidas: '9,22', recogidas: '4,43', interciudad: '10,50' },
        Regional: { recogida: '1,28', arrastre: '4,59', entrega: '6,07', salidas: '10,66', recogidas: '5,87', interciudad: '11,94' },
        Nacional: { recogida: '1,28', arrastre: '6,44', entrega: '6,07', salidas: '12,51', recogidas: '7,72', interciudad: '13,79' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,58', arrastre: '4,45', entrega: '7,37', salidas: '11,82', recogidas: '6,03', interciudad: '13,40' },
        Regional: { recogida: '1,58', arrastre: '6,44', entrega: '7,37', salidas: '13,81', recogidas: '8,02', interciudad: '15,39' },
        Nacional: { recogida: '1,58', arrastre: '8,79', entrega: '7,37', salidas: '16,16', recogidas: '10,37', interciudad: '17,74' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,91', arrastre: '5,75', entrega: '8,67', salidas: '14,42', recogidas: '7,66', interciudad: '16,33' },
        Regional: { recogida: '1,91', arrastre: '8,29', entrega: '8,67', salidas: '16,96', recogidas: '10,20', interciudad: '18,87' },
        Nacional: { recogida: '1,91', arrastre: '11,14', entrega: '8,67', salidas: '19,81', recogidas: '13,05', interciudad: '21,72' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,08', arrastre: '0,26', entrega: '0,26', salidas: '0,52', recogidas: '0,34', interciudad: '0,60' },
        Regional: { recogida: '0,08', arrastre: '0,37', entrega: '0,26', salidas: '0,63', recogidas: '0,45', interciudad: '0,71' },
        Nacional: { recogida: '0,08', arrastre: '0,47', entrega: '0,26', salidas: '0,73', recogidas: '0,55', interciudad: '0,81' }
      }
    ]
  },
  {
    service_name: 'Express10:30',
    page: 4,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,17', arrastre: '1,01', entrega: '2,00', salidas: '3,01', recogidas: '2,18', interciudad: '4,18', km: '0,34' },
        Regional: { recogida: '1,17', arrastre: '1,45', entrega: '2,00', salidas: '3,45', recogidas: '2,62', interciudad: '4,62', km: '0,34' },
        Nacional: { recogida: '1,17', arrastre: '2,06', entrega: '2,00', salidas: '4,06', recogidas: '3,23', interciudad: '5,23', km: '0,34' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,23', arrastre: '1,08', entrega: '2,00', salidas: '3,08', recogidas: '2,31', interciudad: '4,31', km: '0,34' },
        Regional: { recogida: '1,23', arrastre: '1,49', entrega: '2,00', salidas: '3,49', recogidas: '2,72', interciudad: '4,72', km: '0,34' },
        Nacional: { recogida: '1,23', arrastre: '2,14', entrega: '2,00', salidas: '4,14', recogidas: '3,37', interciudad: '5,37', km: '0,34' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,28', arrastre: '1,19', entrega: '2,25', salidas: '3,44', recogidas: '2,47', interciudad: '4,72', km: '0,34' },
        Regional: { recogida: '1,28', arrastre: '1,71', entrega: '2,25', salidas: '3,96', recogidas: '2,99', interciudad: '5,24', km: '0,34' },
        Nacional: { recogida: '1,28', arrastre: '2,49', entrega: '2,25', salidas: '4,74', recogidas: '3,77', interciudad: '6,02', km: '0,34' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,58', arrastre: '1,31', entrega: '2,63', salidas: '3,94', recogidas: '2,89', interciudad: '5,52', km: '0,34' },
        Regional: { recogida: '1,58', arrastre: '1,99', entrega: '2,63', salidas: '4,62', recogidas: '3,57', interciudad: '6,20', km: '0,34' },
        Nacional: { recogida: '1,58', arrastre: '3,08', entrega: '2,63', salidas: '5,71', recogidas: '4,66', interciudad: '7,29', km: '0,34' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,91', arrastre: '1,55', entrega: '3,17', salidas: '4,72', recogidas: '3,46', interciudad: '6,63', km: '0,34' },
        Regional: { recogida: '1,91', arrastre: '3,11', entrega: '3,17', salidas: '6,28', recogidas: '5,02', interciudad: '8,19', km: '0,34' },
        Nacional: { recogida: '1,91', arrastre: '4,66', entrega: '3,17', salidas: '7,83', recogidas: '6,57', interciudad: '9,74', km: '0,34' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,08', arrastre: '0,13', entrega: '0,13', salidas: '0,26', recogidas: '0,21', interciudad: '0,34' },
        Regional: { recogida: '0,08', arrastre: '0,25', entrega: '0,13', salidas: '0,38', recogidas: '0,33', interciudad: '0,46' },
        Nacional: { recogida: '0,08', arrastre: '0,34', entrega: '0,13', salidas: '0,47', recogidas: '0,42', interciudad: '0,55' }
      }
    ]
  },
  {
    service_name: 'Express14:00',
    page: 5,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,17', arrastre: '1,01', entrega: '1,25', salidas: '2,26', recogidas: '2,18', interciudad: '3,43' },
        Regional: { recogida: '1,17', arrastre: '1,45', entrega: '1,25', salidas: '2,70', recogidas: '2,62', interciudad: '3,87' },
        Nacional: { recogida: '1,17', arrastre: '2,06', entrega: '1,25', salidas: '3,31', recogidas: '3,23', interciudad: '4,48' },
        Portugal_Peninsular: { recogida: '1,17', arrastre: '2,06', entrega: '1,25', salidas: '3,31', recogidas: '3,23', interciudad: '4,48' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,23', arrastre: '1,08', entrega: '1,31', salidas: '2,39', recogidas: '2,31', interciudad: '3,62' },
        Regional: { recogida: '1,23', arrastre: '1,49', entrega: '1,31', salidas: '2,80', recogidas: '2,72', interciudad: '4,03' },
        Nacional: { recogida: '1,23', arrastre: '2,14', entrega: '1,31', salidas: '3,45', recogidas: '3,37', interciudad: '4,68' },
        Portugal_Peninsular: { recogida: '1,23', arrastre: '2,14', entrega: '1,31', salidas: '3,45', recogidas: '3,37', interciudad: '4,68' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,28', arrastre: '1,19', entrega: '1,37', salidas: '2,56', recogidas: '2,47', interciudad: '3,84' },
        Regional: { recogida: '1,28', arrastre: '1,71', entrega: '1,37', salidas: '3,08', recogidas: '2,99', interciudad: '4,36' },
        Nacional: { recogida: '1,28', arrastre: '2,49', entrega: '1,37', salidas: '3,86', recogidas: '3,77', interciudad: '5,14' },
        Portugal_Peninsular: { recogida: '1,28', arrastre: '2,49', entrega: '1,37', salidas: '3,86', recogidas: '3,77', interciudad: '5,14' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,58', arrastre: '1,31', entrega: '1,50', salidas: '2,81', recogidas: '2,89', interciudad: '4,39' },
        Regional: { recogida: '1,58', arrastre: '1,99', entrega: '1,50', salidas: '3,49', recogidas: '3,57', interciudad: '5,07' },
        Nacional: { recogida: '1,58', arrastre: '3,08', entrega: '1,50', salidas: '4,58', recogidas: '4,66', interciudad: '6,16' },
        Portugal_Peninsular: { recogida: '1,58', arrastre: '3,08', entrega: '1,50', salidas: '4,58', recogidas: '4,66', interciudad: '6,16' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,91', arrastre: '1,55', entrega: '1,70', salidas: '3,25', recogidas: '3,46', interciudad: '5,16' },
        Regional: { recogida: '1,91', arrastre: '3,11', entrega: '1,70', salidas: '4,81', recogidas: '5,02', interciudad: '6,72' },
        Nacional: { recogida: '1,91', arrastre: '4,66', entrega: '1,70', salidas: '6,36', recogidas: '6,57', interciudad: '8,27' },
        Portugal_Peninsular: { recogida: '1,91', arrastre: '4,66', entrega: '1,70', salidas: '6,36', recogidas: '6,57', interciudad: '8,27' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,08', arrastre: '0,13', entrega: '0,08', salidas: '0,21', recogidas: '0,21', interciudad: '0,29' },
        Regional: { recogida: '0,08', arrastre: '0,25', entrega: '0,08', salidas: '0,33', recogidas: '0,33', interciudad: '0,41' },
        Nacional: { recogida: '0,08', arrastre: '0,34', entrega: '0,08', salidas: '0,42', recogidas: '0,42', interciudad: '0,50' },
        Portugal_Peninsular: { recogida: '0,08', arrastre: '0,34', entrega: '0,08', salidas: '0,42', recogidas: '0,42', interciudad: '0,50' }
      }
    ]
  },
  {
    service_name: 'Express19:00',
    page: 6,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,17', arrastre: '1,01', entrega: '1,17', salidas: '2,18', recogidas: '2,18', interciudad: '3,35' },
        Regional: { recogida: '1,17', arrastre: '1,45', entrega: '1,17', salidas: '2,62', recogidas: '2,62', interciudad: '3,79' },
        Nacional: { recogida: '1,17', arrastre: '2,06', entrega: '1,17', salidas: '3,23', recogidas: '3,23', interciudad: '4,40' },
        Portugal_Peninsular: { recogida: '1,17', arrastre: '2,06', entrega: '1,17', salidas: '3,23', recogidas: '3,23', interciudad: '4,40' },
        Ceuta_Melilla: { recogida: '1,17', arrastre: '12,79', entrega: '1,17', salidas: '13,96', recogidas: '13,96', interciudad: '15,13' },
        Gibraltar: { recogida: '1,17', arrastre: '10,19', entrega: '1,17', salidas: '11,36', recogidas: '11,36', interciudad: '12,53' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,23', arrastre: '1,08', entrega: '1,23', salidas: '2,31', recogidas: '2,31', interciudad: '3,54' },
        Regional: { recogida: '1,23', arrastre: '1,49', entrega: '1,23', salidas: '2,72', recogidas: '2,72', interciudad: '3,95' },
        Nacional: { recogida: '1,23', arrastre: '2,14', entrega: '1,23', salidas: '3,37', recogidas: '3,37', interciudad: '4,60' },
        Portugal_Peninsular: { recogida: '1,23', arrastre: '2,14', entrega: '1,23', salidas: '3,37', recogidas: '3,37', interciudad: '4,60' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,28', arrastre: '1,19', entrega: '1,28', salidas: '2,47', recogidas: '2,47', interciudad: '3,75' },
        Regional: { recogida: '1,28', arrastre: '1,71', entrega: '1,28', salidas: '2,99', recogidas: '2,99', interciudad: '4,27' },
        Nacional: { recogida: '1,28', arrastre: '2,49', entrega: '1,28', salidas: '3,77', recogidas: '3,77', interciudad: '5,05' },
        Portugal_Peninsular: { recogida: '1,28', arrastre: '2,49', entrega: '1,28', salidas: '3,77', recogidas: '3,77', interciudad: '5,05' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,58', arrastre: '1,31', entrega: '1,38', salidas: '2,69', recogidas: '2,89', interciudad: '4,27' },
        Regional: { recogida: '1,58', arrastre: '1,99', entrega: '1,38', salidas: '3,37', recogidas: '3,57', interciudad: '4,95' },
        Nacional: { recogida: '1,58', arrastre: '3,08', entrega: '1,38', salidas: '4,46', recogidas: '4,66', interciudad: '6,04' },
        Portugal_Peninsular: { recogida: '1,58', arrastre: '3,08', entrega: '1,38', salidas: '4,46', recogidas: '4,66', interciudad: '6,04' },
        Andorra: { recogida: '1,58', arrastre: '7,27', entrega: '1,38', salidas: '8,65', recogidas: '8,85', interciudad: '10,23' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,91', arrastre: '1,55', entrega: '1,58', salidas: '3,13', recogidas: '3,46', interciudad: '5,04' },
        Regional: { recogida: '1,91', arrastre: '3,11', entrega: '1,58', salidas: '4,69', recogidas: '5,02', interciudad: '6,60' },
        Nacional: { recogida: '1,91', arrastre: '4,66', entrega: '1,58', salidas: '6,24', recogidas: '6,57', interciudad: '8,15' },
        Portugal_Peninsular: { recogida: '1,91', arrastre: '4,66', entrega: '1,58', salidas: '6,24', recogidas: '6,57', interciudad: '8,15' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,08', arrastre: '0,13', entrega: '0,07', salidas: '0,20', recogidas: '0,21', interciudad: '0,28' },
        Regional: { recogida: '0,08', arrastre: '0,25', entrega: '0,07', salidas: '0,32', recogidas: '0,33', interciudad: '0,40' },
        Nacional: { recogida: '0,08', arrastre: '0,34', entrega: '0,07', salidas: '0,41', recogidas: '0,42', interciudad: '0,49' },
        Portugal_Peninsular: { recogida: '0,08', arrastre: '0,34', entrega: '0,07', salidas: '0,41', recogidas: '0,42', interciudad: '0,49' },
        Ceuta_Melilla: { recogida: '0,08', arrastre: '2,84', entrega: '0,07', salidas: '2,91', recogidas: '2,92', interciudad: '2,99' },
        Gibraltar: { recogida: '0,08', arrastre: '1,87', entrega: '0,07', salidas: '1,94', recogidas: '1,95', interciudad: '2,02' },
        Andorra: { recogida: '0,08', arrastre: '0,47', entrega: '0,07', salidas: '0,54', recogidas: '0,55', interciudad: '0,62' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel',
    page: 7,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,17', arrastre: '1,01', entrega: '1,17', salidas: '2,18', recogidas: '2,18', interciudad: '3,35' },
        Regional: { recogida: '1,17', arrastre: '1,45', entrega: '1,17', salidas: '2,62', recogidas: '2,62', interciudad: '3,79' },
        Nacional: { recogida: '1,17', arrastre: '2,06', entrega: '1,17', salidas: '3,23', recogidas: '3,23', interciudad: '4,40' },
        Ceuta_Melilla: { recogida: '1,17', arrastre: '12,79', entrega: '1,17', salidas: '13,96', recogidas: '13,96', interciudad: '15,13' },
        Gibraltar: { recogida: '1,17', arrastre: '10,19', entrega: '1,17', salidas: '11,36', recogidas: '11,36', interciudad: '12,53' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,23', arrastre: '1,08', entrega: '1,23', salidas: '2,31', recogidas: '2,31', interciudad: '3,54' },
        Regional: { recogida: '1,23', arrastre: '1,49', entrega: '1,23', salidas: '2,72', recogidas: '2,72', interciudad: '3,95' },
        Nacional: { recogida: '1,23', arrastre: '2,14', entrega: '1,23', salidas: '3,37', recogidas: '3,37', interciudad: '4,60' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,28', arrastre: '1,19', entrega: '1,28', salidas: '2,47', recogidas: '2,47', interciudad: '3,75' },
        Regional: { recogida: '1,28', arrastre: '1,71', entrega: '1,28', salidas: '2,99', recogidas: '2,99', interciudad: '4,27' },
        Nacional: { recogida: '1,28', arrastre: '2,49', entrega: '1,28', salidas: '3,77', recogidas: '3,77', interciudad: '5,05' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,58', arrastre: '1,31', entrega: '1,38', salidas: '2,69', recogidas: '2,89', interciudad: '4,27' },
        Regional: { recogida: '1,58', arrastre: '1,99', entrega: '1,38', salidas: '3,37', recogidas: '3,57', interciudad: '4,95' },
        Nacional: { recogida: '1,58', arrastre: '3,08', entrega: '1,38', salidas: '4,46', recogidas: '4,66', interciudad: '6,04' },
        Andorra: { recogida: '1,58', arrastre: '7,27', entrega: '1,38', salidas: '8,65', recogidas: '8,85', interciudad: '10,23' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,91', arrastre: '1,55', entrega: '1,58', salidas: '3,13', recogidas: '3,46', interciudad: '5,04' },
        Regional: { recogida: '1,91', arrastre: '3,11', entrega: '1,58', salidas: '4,69', recogidas: '5,02', interciudad: '6,60' },
        Nacional: { recogida: '1,91', arrastre: '4,66', entrega: '1,58', salidas: '6,24', recogidas: '6,57', interciudad: '8,15' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,08', arrastre: '0,13', entrega: '0,07', salidas: '0,20', recogidas: '0,21', interciudad: '0,28' },
        Regional: { recogida: '0,08', arrastre: '0,25', entrega: '0,07', salidas: '0,32', recogidas: '0,33', interciudad: '0,40' },
        Nacional: { recogida: '0,08', arrastre: '0,34', entrega: '0,07', salidas: '0,41', recogidas: '0,42', interciudad: '0,49' },
        Ceuta_Melilla: { recogida: '0,08', arrastre: '2,84', entrega: '0,07', salidas: '2,91', recogidas: '2,92', interciudad: '2,99' },
        Gibraltar: { recogida: '0,08', arrastre: '1,87', entrega: '0,07', salidas: '1,94', recogidas: '1,95', interciudad: '2,02' },
        Andorra: { recogida: '0,08', arrastre: '0,47', entrega: '0,07', salidas: '0,54', recogidas: '0,55', interciudad: '0,62' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel',
    page: 8,
    type: 'peninsular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Provincial: { recogida: '1,00', arrastre: '0,94', entrega: '1,00', salidas: '1,94', recogidas: '1,94', interciudad: '2,94' },
        Regional: { recogida: '1,00', arrastre: '1,29', entrega: '1,00', salidas: '2,29', recogidas: '2,29', interciudad: '3,29' },
        Nacional: { recogida: '1,00', arrastre: '1,35', entrega: '1,00', salidas: '2,35', recogidas: '2,35', interciudad: '3,35' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Provincial: { recogida: '1,00', arrastre: '0,94', entrega: '1,00', salidas: '1,94', recogidas: '1,94', interciudad: '2,94' },
        Regional: { recogida: '1,00', arrastre: '1,34', entrega: '1,00', salidas: '2,34', recogidas: '2,34', interciudad: '3,34' },
        Nacional: { recogida: '1,00', arrastre: '1,85', entrega: '1,00', salidas: '2,85', recogidas: '2,85', interciudad: '3,85' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Provincial: { recogida: '1,10', arrastre: '0,99', entrega: '1,10', salidas: '2,09', recogidas: '2,09', interciudad: '3,19' },
        Regional: { recogida: '1,10', arrastre: '1,42', entrega: '1,10', salidas: '2,52', recogidas: '2,52', interciudad: '3,62' },
        Nacional: { recogida: '1,10', arrastre: '2,35', entrega: '1,10', salidas: '3,45', recogidas: '3,45', interciudad: '4,55' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Provincial: { recogida: '1,25', arrastre: '1,14', entrega: '1,25', salidas: '2,39', recogidas: '2,39', interciudad: '3,64' },
        Regional: { recogida: '1,25', arrastre: '1,95', entrega: '1,25', salidas: '3,20', recogidas: '3,20', interciudad: '4,45' },
        Nacional: { recogida: '1,25', arrastre: '2,60', entrega: '1,25', salidas: '3,85', recogidas: '3,85', interciudad: '5,10' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Provincial: { recogida: '1,55', arrastre: '1,35', entrega: '1,55', salidas: '2,90', recogidas: '2,90', interciudad: '4,45' },
        Regional: { recogida: '1,55', arrastre: '2,86', entrega: '1,55', salidas: '4,41', recogidas: '4,41', interciudad: '5,96' },
        Nacional: { recogida: '1,55', arrastre: '3,80', entrega: '1,55', salidas: '5,35', recogidas: '5,35', interciudad: '6,90' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Provincial: { recogida: '0,06', arrastre: '0,12', entrega: '0,06', salidas: '0,18', recogidas: '0,18', interciudad: '0,24' },
        Regional: { recogida: '0,06', arrastre: '0,21', entrega: '0,06', salidas: '0,27', recogidas: '0,27', interciudad: '0,33' },
        Nacional: { recogida: '0,06', arrastre: '0,28', entrega: '0,06', salidas: '0,34', recogidas: '0,34', interciudad: '0,40' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Baleares Mayores',
    page: 13,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { recogida: '1,17', arrastre: '3,84', entrega: '1,17', salidas: '5,01', recogidas: '5,01', interciudad: '6,18' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Mayores: { recogida: '1,23', arrastre: '5,32', entrega: '1,23', salidas: '6,55', recogidas: '6,55', interciudad: '7,78' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Mayores: { recogida: '1,28', arrastre: '6,30', entrega: '1,28', salidas: '7,58', recogidas: '7,58', interciudad: '8,86' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Mayores: { recogida: '1,58', arrastre: '8,76', entrega: '1,38', salidas: '10,14', recogidas: '10,14', interciudad: '11,52' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Mayores: { recogida: '1,91', arrastre: '11,13', entrega: '1,58', salidas: '12,71', recogidas: '12,71', interciudad: '14,29' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { recogida: '0,08', arrastre: '0,66', entrega: '0,07', salidas: '0,73', recogidas: '0,73', interciudad: '0,80' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Baleares Mayores',
    page: 14,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { recogida: '1,17', arrastre: '3,84', entrega: '1,17', salidas: '5,01', recogidas: '5,01', interciudad: '6,18' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Mayores: { recogida: '1,23', arrastre: '5,32', entrega: '1,23', salidas: '6,55', recogidas: '6,55', interciudad: '7,78' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Mayores: { recogida: '1,28', arrastre: '6,30', entrega: '1,28', salidas: '7,58', recogidas: '7,58', interciudad: '8,86' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Mayores: { recogida: '1,58', arrastre: '8,76', entrega: '1,38', salidas: '10,14', recogidas: '10,14', interciudad: '11,52' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Mayores: { recogida: '1,91', arrastre: '11,13', entrega: '1,58', salidas: '12,71', recogidas: '12,71', interciudad: '14,29' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { recogida: '0,08', arrastre: '0,66', entrega: '0,07', salidas: '0,73', recogidas: '0,73', interciudad: '0,80' }
      }
    ]
  },
  {
    service_name: 'EuroBusinessParcel',
    page: 7,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Portugal_Peninsular: { recogida: '1,17', arrastre: '2,06', entrega: '1,17', salidas: '3,23', recogidas: '3,23', interciudad: '4,40' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Portugal_Peninsular: { recogida: '1,23', arrastre: '2,14', entrega: '1,23', salidas: '3,37', recogidas: '3,37', interciudad: '4,60' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Portugal_Peninsular: { recogida: '1,28', arrastre: '2,49', entrega: '1,28', salidas: '3,77', recogidas: '3,77', interciudad: '5,05' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Portugal_Peninsular: { recogida: '1,58', arrastre: '3,08', entrega: '1,38', salidas: '4,46', recogidas: '4,66', interciudad: '6,04' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Portugal_Peninsular: { recogida: '1,91', arrastre: '4,66', entrega: '1,58', salidas: '6,24', recogidas: '6,57', interciudad: '8,15' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Portugal_Peninsular: { recogida: '0,08', arrastre: '0,34', entrega: '0,07', salidas: '0,41', recogidas: '0,42', interciudad: '0,49' }
      }
    ]
  },
  // ============================================
  // SERVICIOS INSULARES - CANARIAS (Continuación)
  // ============================================
  {
    service_name: 'Express19:00 Baleares Menores',
    page: 13,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Menores: { recogida: '1,17', arrastre: '5,32', entrega: '1,17', salidas: '6,49', recogidas: '6,49', interciudad: '7,66' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Menores: { recogida: '1,23', arrastre: '8,42', entrega: '1,23', salidas: '9,65', recogidas: '9,65', interciudad: '10,88' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Menores: { recogida: '1,28', arrastre: '10,48', entrega: '1,28', salidas: '11,76', recogidas: '11,76', interciudad: '13,04' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Menores: { recogida: '1,58', arrastre: '15,64', entrega: '1,38', salidas: '17,02', recogidas: '17,02', interciudad: '18,40' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Menores: { recogida: '1,91', arrastre: '20,71', entrega: '1,58', salidas: '22,29', recogidas: '22,29', interciudad: '23,87' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Menores: { recogida: '0,08', arrastre: '1,19', entrega: '0,07', salidas: '1,26', recogidas: '1,26', interciudad: '1,33' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Canarias Mayores',
    page: 13,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Mayores: { recogida: '1,17', arrastre: '7,49', entrega: '1,17', salidas: '8,66', recogidas: '8,66', interciudad: '9,83' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { recogida: '0,08', arrastre: '3,41', entrega: '0,07', salidas: '3,48', recogidas: '3,48', interciudad: '3,55' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Canarias Menores',
    page: 13,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Menores: { recogida: '1,17', arrastre: '9,89', entrega: '1,17', salidas: '11,06', recogidas: '11,06', interciudad: '12,23' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Menores: { recogida: '0,08', arrastre: '3,70', entrega: '0,07', salidas: '3,77', recogidas: '3,77', interciudad: '3,84' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Baleares Menores',
    page: 14,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Menores: { recogida: '1,17', arrastre: '5,32', entrega: '1,17', salidas: '6,49', recogidas: '6,49', interciudad: '7,66' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Menores: { recogida: '1,23', arrastre: '8,42', entrega: '1,23', salidas: '9,65', recogidas: '9,65', interciudad: '10,88' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Menores: { recogida: '1,28', arrastre: '10,48', entrega: '1,28', salidas: '11,76', recogidas: '11,76', interciudad: '13,04' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Menores: { recogida: '1,58', arrastre: '15,64', entrega: '1,38', salidas: '17,02', recogidas: '17,02', interciudad: '18,40' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Menores: { recogida: '1,91', arrastre: '20,71', entrega: '1,58', salidas: '22,29', recogidas: '22,29', interciudad: '23,87' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Menores: { recogida: '0,08', arrastre: '1,19', entrega: '0,07', salidas: '1,26', recogidas: '1,26', interciudad: '1,33' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Canarias Mayores',
    page: 14,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Mayores: { recogida: '1,17', arrastre: '7,49', entrega: '1,17', salidas: '8,66', recogidas: '8,66', interciudad: '9,83' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { recogida: '0,08', arrastre: '3,41', entrega: '0,07', salidas: '3,48', recogidas: '3,48', interciudad: '3,55' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Canarias Menores',
    page: 14,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Menores: { recogida: '1,17', arrastre: '9,89', entrega: '1,17', salidas: '11,06', recogidas: '11,06', interciudad: '12,23' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Menores: { recogida: '0,08', arrastre: '3,70', entrega: '0,07', salidas: '3,77', recogidas: '3,77', interciudad: '3,84' }
      }
    ]
  },
  // ============================================
  // SERVICIOS AÉREOS - EXPRESS10:30 Y EXPRESS14:00 ISLAS
  // ============================================
  {
    service_name: 'Express10:30 Baleares Mayores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { recogida: '1,17', arrastre: '6,03', entrega: '2,00', salidas: '8,03', recogidas: '7,20', interciudad: '9,20', km: '0,34' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { recogida: '0,08', arrastre: '3,02', entrega: '0,13', salidas: '3,15', recogidas: '3,10', interciudad: '3,23' }
      }
    ]
  },
  {
    service_name: 'Express10:30 Baleares Interislas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Interislas: { recogida: '1,17', arrastre: '8,53', entrega: '2,00', salidas: '10,53', recogidas: '9,70', interciudad: '11,70', km: '0,34' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Interislas: { recogida: '0,08', arrastre: '4,20', entrega: '0,13', salidas: '4,33', recogidas: '4,28', interciudad: '4,41' }
      }
    ]
  },
  {
    service_name: 'Express10:30 Canarias Mayores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Mayores: { recogida: '1,17', arrastre: '7,50', entrega: '2,00', salidas: '9,50', recogidas: '8,66', interciudad: '10,66', km: '0,34' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { recogida: '0,08', arrastre: '3,41', entrega: '0,13', salidas: '3,54', recogidas: '3,48', interciudad: '3,61' }
      }
    ]
  },
  {
    service_name: 'Express10:30 Canarias Interislas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Interislas: { recogida: '1,17', arrastre: '7,26', entrega: '2,00', salidas: '9,26', recogidas: '8,34', interciudad: '10,34', km: '0,34' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Interislas: { recogida: '0,08', arrastre: '3,56', entrega: '0,13', salidas: '3,69', recogidas: '3,61', interciudad: '3,74' }
      }
    ]
  },
  {
    service_name: 'Express10:30 Tenerife/Las Palmas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Tenerife_Tenerife: { recogida: '2,50', arrastre: '1,21', entrega: '2,50', salidas: '3,71', recogidas: '3,28', interciudad: '5,78' },
        Las_Palmas_Las_Palmas: { recogida: '2,50', arrastre: '1,21', entrega: '2,50', salidas: '3,71', recogidas: '3,28', interciudad: '5,78' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Tenerife_Tenerife: { recogida: '2,66', arrastre: '1,29', entrega: '2,66', salidas: '3,95', recogidas: '3,53', interciudad: '6,19' },
        Las_Palmas_Las_Palmas: { recogida: '2,66', arrastre: '1,29', entrega: '2,66', salidas: '3,95', recogidas: '3,53', interciudad: '6,19' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Tenerife_Tenerife: { recogida: '2,82', arrastre: '1,41', entrega: '2,82', salidas: '4,23', recogidas: '3,81', interciudad: '6,63' },
        Las_Palmas_Las_Palmas: { recogida: '2,82', arrastre: '1,41', entrega: '2,82', salidas: '4,23', recogidas: '3,81', interciudad: '6,63' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Tenerife_Tenerife: { recogida: '3,22', arrastre: '1,56', entrega: '3,22', salidas: '4,78', recogidas: '4,36', interciudad: '7,58' },
        Las_Palmas_Las_Palmas: { recogida: '3,22', arrastre: '1,56', entrega: '3,22', salidas: '4,78', recogidas: '4,36', interciudad: '7,58' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Tenerife_Tenerife: { recogida: '3,62', arrastre: '1,84', entrega: '3,62', salidas: '5,46', recogidas: '5,04', interciudad: '8,66' },
        Las_Palmas_Las_Palmas: { recogida: '3,62', arrastre: '1,84', entrega: '3,62', salidas: '5,46', recogidas: '5,04', interciudad: '8,66' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Tenerife_Tenerife: { recogida: '0,08', arrastre: '0,14', entrega: '0,08', salidas: '0,22', recogidas: '0,22', interciudad: '0,30' },
        Las_Palmas_Las_Palmas: { recogida: '0,08', arrastre: '0,14', entrega: '0,08', salidas: '0,22', recogidas: '0,22', interciudad: '0,30' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Baleares Mayores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { recogida: '1,17', arrastre: '6,11', entrega: '1,25', salidas: '7,36', recogidas: '7,28', interciudad: '8,53' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { recogida: '0,08', arrastre: '3,01', entrega: '0,08', salidas: '3,09', recogidas: '3,09', interciudad: '3,17' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Baleares Menores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Menores: { recogida: '1,17', arrastre: '8,21', entrega: '1,25', salidas: '9,46', recogidas: '9,38', interciudad: '10,63' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Menores: { recogida: '0,08', arrastre: '3,94', entrega: '0,08', salidas: '4,02', recogidas: '4,02', interciudad: '4,10' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Baleares Interislas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Interislas: { recogida: '1,17', arrastre: '8,24', entrega: '1,25', salidas: '9,49', recogidas: '9,41', interciudad: '10,66' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Interislas: { recogida: '0,08', arrastre: '3,97', entrega: '0,08', salidas: '4,05', recogidas: '4,05', interciudad: '4,13' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Canarias Mayores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Mayores: { recogida: '1,17', arrastre: '7,42', entrega: '1,25', salidas: '8,67', recogidas: '8,66', interciudad: '9,91' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { recogida: '0,08', arrastre: '3,41', entrega: '0,08', salidas: '3,49', recogidas: '3,48', interciudad: '3,56' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Canarias Menores',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Menores: { recogida: '1,17', arrastre: '9,81', entrega: '1,25', salidas: '11,06', recogidas: '11,06', interciudad: '12,31' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Menores: { recogida: '0,08', arrastre: '3,70', entrega: '0,08', salidas: '3,78', recogidas: '3,77', interciudad: '3,85' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Canarias Interislas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Interislas: { recogida: '1,17', arrastre: '7,18', entrega: '1,25', salidas: '8,43', recogidas: '8,34', interciudad: '9,59' }
      },
      {
        weight_from: 1,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Interislas: { recogida: '0,08', arrastre: '3,54', entrega: '0,08', salidas: '3,62', recogidas: '3,62', interciudad: '3,70' }
      }
    ]
  },
  {
    service_name: 'Express14:00 Tenerife/Las Palmas',
    page: 12,
    type: 'aereo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Tenerife_Tenerife: { recogida: '2,50', arrastre: '1,21', entrega: '2,50', salidas: '3,71', recogidas: '3,28', interciudad: '5,78' },
        Las_Palmas_Las_Palmas: { recogida: '2,50', arrastre: '1,21', entrega: '2,50', salidas: '3,71', recogidas: '3,28', interciudad: '5,78' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Tenerife_Tenerife: { recogida: '2,66', arrastre: '1,29', entrega: '2,66', salidas: '3,95', recogidas: '3,53', interciudad: '6,19' },
        Las_Palmas_Las_Palmas: { recogida: '2,66', arrastre: '1,29', entrega: '2,66', salidas: '3,95', recogidas: '3,53', interciudad: '6,19' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Tenerife_Tenerife: { recogida: '2,82', arrastre: '1,41', entrega: '2,82', salidas: '4,23', recogidas: '3,81', interciudad: '6,63' },
        Las_Palmas_Las_Palmas: { recogida: '2,82', arrastre: '1,41', entrega: '2,82', salidas: '4,23', recogidas: '3,81', interciudad: '6,63' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Tenerife_Tenerife: { recogida: '3,22', arrastre: '1,56', entrega: '3,22', salidas: '4,78', recogidas: '4,36', interciudad: '7,58' },
        Las_Palmas_Las_Palmas: { recogida: '3,22', arrastre: '1,56', entrega: '3,22', salidas: '4,78', recogidas: '4,36', interciudad: '7,58' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Tenerife_Tenerife: { recogida: '3,62', arrastre: '1,84', entrega: '3,62', salidas: '5,46', recogidas: '5,04', interciudad: '8,66' },
        Las_Palmas_Las_Palmas: { recogida: '3,62', arrastre: '1,84', entrega: '3,62', salidas: '5,46', recogidas: '5,04', interciudad: '8,66' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Tenerife_Tenerife: { recogida: '0,08', arrastre: '0,14', entrega: '0,08', salidas: '0,22', recogidas: '0,22', interciudad: '0,30' },
        Las_Palmas_Las_Palmas: { recogida: '0,08', arrastre: '0,14', entrega: '0,08', salidas: '0,22', recogidas: '0,22', interciudad: '0,30' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Baleares Mayores',
    page: 15,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { recogida: '1,00', arrastre: '2,61', entrega: '1,00', salidas: '3,61', recogidas: '3,61', interciudad: '4,61' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Mayores: { recogida: '1,00', arrastre: '4,15', entrega: '1,00', salidas: '5,15', recogidas: '5,15', interciudad: '6,15' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Mayores: { recogida: '1,10', arrastre: '5,08', entrega: '1,10', salidas: '6,18', recogidas: '6,18', interciudad: '7,28' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Mayores: { recogida: '1,25', arrastre: '7,49', entrega: '1,25', salidas: '8,74', recogidas: '8,74', interciudad: '9,99' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Mayores: { recogida: '1,55', arrastre: '9,76', entrega: '1,55', salidas: '11,31', recogidas: '11,31', interciudad: '12,86' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { recogida: '0,07', arrastre: '0,59', entrega: '0,07', salidas: '0,66', recogidas: '0,66', interciudad: '0,73' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Baleares Menores',
    page: 15,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Menores: { recogida: '1,00', arrastre: '2,97', entrega: '1,00', salidas: '3,97', recogidas: '3,97', interciudad: '4,97' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Menores: { recogida: '1,00', arrastre: '5,64', entrega: '1,00', salidas: '6,64', recogidas: '6,64', interciudad: '7,64' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Menores: { recogida: '1,10', arrastre: '8,14', entrega: '1,10', salidas: '9,24', recogidas: '9,24', interciudad: '10,34' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Menores: { recogida: '1,25', arrastre: '13,25', entrega: '1,25', salidas: '14,50', recogidas: '14,50', interciudad: '15,75' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Menores: { recogida: '1,55', arrastre: '18,22', entrega: '1,55', salidas: '19,77', recogidas: '19,77', interciudad: '21,32' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Menores: { recogida: '0,07', arrastre: '1,12', entrega: '0,07', salidas: '1,19', recogidas: '1,19', interciudad: '1,26' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Canarias Mayores',
    page: 15,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Mayores: { recogida: '1,00', arrastre: '5,93', entrega: '1,00', salidas: '6,93', recogidas: '6,93', interciudad: '7,93' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Canarias_Mayores: { recogida: '1,00', arrastre: '11,11', entrega: '1,00', salidas: '12,11', recogidas: '12,11', interciudad: '13,11' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Canarias_Mayores: { recogida: '1,10', arrastre: '15,82', entrega: '1,10', salidas: '16,92', recogidas: '16,92', interciudad: '18,02' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Canarias_Mayores: { recogida: '1,25', arrastre: '29,07', entrega: '1,25', salidas: '30,32', recogidas: '30,32', interciudad: '31,57' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Canarias_Mayores: { recogida: '1,55', arrastre: '42,92', entrega: '1,55', salidas: '44,47', recogidas: '44,47', interciudad: '46,02' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { recogida: '0,07', arrastre: '3,18', entrega: '0,07', salidas: '3,25', recogidas: '3,25', interciudad: '3,32' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Canarias Menores',
    page: 15,
    type: 'insular',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Canarias_Menores: { recogida: '1,00', arrastre: '6,64', entrega: '1,00', salidas: '7,64', recogidas: '7,64', interciudad: '8,64' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Canarias_Menores: { recogida: '1,00', arrastre: '12,33', entrega: '1,00', salidas: '13,33', recogidas: '13,33', interciudad: '14,33' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Canarias_Menores: { recogida: '1,10', arrastre: '17,53', entrega: '1,10', salidas: '18,63', recogidas: '18,63', interciudad: '19,73' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Canarias_Menores: { recogida: '1,25', arrastre: '32,12', entrega: '1,25', salidas: '33,37', recogidas: '33,37', interciudad: '34,62' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Canarias_Menores: { recogida: '1,55', arrastre: '47,38', entrega: '1,55', salidas: '48,93', recogidas: '48,93', interciudad: '50,48' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Menores: { recogida: '0,07', arrastre: '3,79', entrega: '0,07', salidas: '3,86', recogidas: '3,86', interciudad: '3,93' }
      }
    ]
  },
  // ============================================
  // SERVICIOS PORTUGAL ISLANDS
  // ============================================
  {
    service_name: 'Express19:00 Madeira Mayores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Madeira_Mayores: { salidas: '3,27', recogidas: '3,27', interciudad: '3,27' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Madeira Menores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Madeira_Menores: { salidas: '3,47', recogidas: '3,47', interciudad: '3,47' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Azores Mayores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Azores_Mayores: { salidas: '3,27', recogidas: '3,27', interciudad: '3,27' }
      }
    ]
  },
  {
    service_name: 'Express19:00 Azores Menores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Azores_Menores: { salidas: '3,47', recogidas: '3,47', interciudad: '3,47' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Madeira Mayores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Madeira_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Madeira_Mayores: { salidas: '3,27', recogidas: '3,27', interciudad: '3,27' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Madeira Menores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Madeira_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Madeira_Menores: { salidas: '3,47', recogidas: '3,47', interciudad: '3,47' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Azores Mayores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Azores_Mayores: { salidas: '14,75', recogidas: '14,75', interciudad: '29,50' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Azores_Mayores: { salidas: '3,27', recogidas: '3,27', interciudad: '3,27' }
      }
    ]
  },
  {
    service_name: 'BusinessParcel Azores Menores',
    page: 19,
    type: 'internacional',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Azores_Menores: { salidas: '18,13', recogidas: '18,13', interciudad: '36,26' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Azores_Menores: { salidas: '3,47', recogidas: '3,47', interciudad: '3,47' }
      }
    ]
  },
  // ============================================
  // SERVICIOS MARÍTIMOS - PORTUGAL ISLANDS
  // ============================================
  {
    service_name: 'EconomyParcel Marítimo Madeira Mayores',
    page: 19,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 10,
        label: '0-10kg',
        Madeira_Mayores: { salidas: '46,25' }
      },
      {
        weight_from: 10,
        weight_to: 999,
        label: 'Cada 10kg adicional',
        Madeira_Mayores: { salidas: '8,67' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Madeira Menores',
    page: 19,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 10,
        label: '0-10kg',
        Madeira_Menores: { salidas: '73,25' }
      },
      {
        weight_from: 10,
        weight_to: 999,
        label: 'Cada 10kg adicional',
        Madeira_Menores: { salidas: '12,72' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Azores Mayores',
    page: 19,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 10,
        label: '0-10kg',
        Azores_Mayores: { salidas: '53,00' }
      },
      {
        weight_from: 10,
        weight_to: 999,
        label: 'Cada 10kg adicional',
        Azores_Mayores: { salidas: '9,34' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Azores Menores',
    page: 19,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 10,
        label: '0-10kg',
        Azores_Menores: { salidas: '66,50' }
      },
      {
        weight_from: 10,
        weight_to: 999,
        label: 'Cada 10kg adicional',
        Azores_Menores: { salidas: '13,39' }
      }
    ]
  },
  // ============================================
  // SERVICIOS MARÍTIMOS - BALEARES Y CANARIAS
  // ============================================
  {
    service_name: 'EconomyParcel Marítimo Baleares Mayores',
    page: 16,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Mayores: { arrastre: '2,61', entrega: '1,00', salidas: '3,61' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Mayores: { arrastre: '4,15', entrega: '1,00', salidas: '5,15' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Mayores: { arrastre: '5,08', entrega: '1,10', salidas: '6,18' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Mayores: { arrastre: '7,49', entrega: '1,25', salidas: '8,74' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Mayores: { arrastre: '9,76', entrega: '1,55', salidas: '11,31' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Mayores: { arrastre: '0,59', entrega: '0,07', salidas: '0,66' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Baleares Menores',
    page: 16,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Menores: { arrastre: '2,97', entrega: '1,00', salidas: '3,97' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Menores: { arrastre: '5,64', entrega: '1,00', salidas: '6,64' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Menores: { arrastre: '8,14', entrega: '1,10', salidas: '9,24' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Menores: { arrastre: '13,25', entrega: '1,25', salidas: '14,50' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Menores: { arrastre: '18,22', entrega: '1,55', salidas: '19,77' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Menores: { arrastre: '1,12', entrega: '0,07', salidas: '1,19' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Baleares Interislas',
    page: 16,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 1,
        label: '0-1kg',
        Baleares_Interislas: { arrastre: '3,58', entrega: '1,00', salidas: '4,58' }
      },
      {
        weight_from: 1,
        weight_to: 3,
        label: '1-3kg',
        Baleares_Interislas: { arrastre: '6,74', entrega: '1,00', salidas: '7,74' }
      },
      {
        weight_from: 3,
        weight_to: 5,
        label: '3-5kg',
        Baleares_Interislas: { arrastre: '8,75', entrega: '1,10', salidas: '9,85' }
      },
      {
        weight_from: 5,
        weight_to: 10,
        label: '5-10kg',
        Baleares_Interislas: { arrastre: '13,86', entrega: '1,25', salidas: '15,11' }
      },
      {
        weight_from: 10,
        weight_to: 15,
        label: '10-15kg',
        Baleares_Interislas: { arrastre: '18,83', entrega: '1,55', salidas: '20,38' }
      },
      {
        weight_from: 15,
        weight_to: 999,
        label: 'Kg adicional',
        Baleares_Interislas: { arrastre: '1,12', entrega: '0,07', salidas: '1,19' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Canarias Mayores',
    page: 16,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 5,
        label: '0-5kg',
        Canarias_Mayores: { arrastre: '5,05', entrega: '1,28', salidas: '6,33' }
      },
      {
        weight_from: 5,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Mayores: { arrastre: '0,53', entrega: '0,08', salidas: '0,61' }
      }
    ]
  },
  {
    service_name: 'EconomyParcel Marítimo Canarias Menores',
    page: 16,
    type: 'maritimo',
    weights: [
      {
        weight_from: 0,
        weight_to: 5,
        label: '0-5kg',
        Canarias_Menores: { arrastre: '7,32', entrega: '1,28', salidas: '8,60' }
      },
      {
        weight_from: 5,
        weight_to: 999,
        label: 'Kg adicional',
        Canarias_Menores: { arrastre: '0,88', entrega: '0,08', salidas: '0,96' }
      }
    ]
  }
];

/**
 * Busca un servicio en el mapa
 */
export function getServiceMap(serviceName: string): ServiceMap | undefined {
  return TARIFF_MAP_2025.find(s => s.service_name === serviceName);
}

/**
 * Obtiene todos los servicios mapeados
 */
export function getAllServices(): string[] {
  return TARIFF_MAP_2025.map(s => s.service_name);
}

/**
 * Obtiene el número de página de un servicio
 */
export function getServicePage(serviceName: string): number | undefined {
  const service = getServiceMap(serviceName);
  return service?.page;
}
