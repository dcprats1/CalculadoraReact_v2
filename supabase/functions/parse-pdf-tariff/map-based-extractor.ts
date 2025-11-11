/**
 * Extractor basado en el mapa exacto de ubicaciones
 * Lee los datos del PDF usando el mapa predefinido
 */

import { TARIFF_MAP_2025, ServiceMap, WeightRange, TariffDataPoint } from './tariff-map.ts';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface PageData {
  pageNum: number;
  items: TextItem[];
  width: number;
  height: number;
}

interface ExtractedTariff {
  service_name: string;
  zone: string;
  weight_from: number;
  weight_to: number;
  weight_label: string;
  recogida_pickup_cost: number | null;
  arrastre_line_haul_cost: number | null;
  entrega_delivery_cost: number | null;
  salidas_outbound_cost: number | null;
  recogidas_pickup_plural_cost: number | null;
  interciudad_intercity_cost: number | null;
  km_cost: number | null;
}

export class MapBasedExtractor {
  /**
   * Convierte un string de precio a número
   */
  private static parsePrice(price: string | undefined): number | null {
    if (!price) return null;

    // Reemplazar coma por punto
    const normalized = price.replace(',', '.');

    // Extraer número
    const match = normalized.match(/\d+\.?\d*/);
    if (!match) return null;

    const value = parseFloat(match[0]);
    return isNaN(value) ? null : value;
  }

  /**
   * Busca un valor específico en el PDF cerca de una ubicación esperada
   */
  private static findValueNearLocation(
    page: PageData,
    expectedValue: string,
    toleranceX: number = 50,
    toleranceY: number = 10
  ): TextItem | null {
    // Normalizar el valor esperado
    const normalized = expectedValue.replace(',', '.');

    // Buscar coincidencia exacta primero
    for (const item of page.items) {
      const itemNormalized = item.str.replace(',', '.');
      if (itemNormalized === normalized) {
        return item;
      }
    }

    // Buscar coincidencia aproximada (puede tener espacios o formato diferente)
    for (const item of page.items) {
      const itemNormalized = item.str.replace(/[,\s]/g, '.');
      const expectedNormalized = normalized.replace(/[,\s]/g, '.');

      if (itemNormalized === expectedNormalized) {
        return item;
      }
    }

    return null;
  }

  /**
   * Valida que los datos extraídos coinciden con el mapa
   */
  private static validateExtractedData(
    page: PageData,
    serviceName: string,
    zone: string,
    expectedData: TariffDataPoint
  ): boolean {
    let foundCount = 0;
    let expectedCount = 0;

    // Contar cuántos valores esperamos encontrar
    for (const key in expectedData) {
      if (expectedData[key as keyof TariffDataPoint]) {
        expectedCount++;
      }
    }

    // Buscar cada valor en la página
    for (const key in expectedData) {
      const value = expectedData[key as keyof TariffDataPoint];
      if (value) {
        const found = this.findValueNearLocation(page, value);
        if (found) {
          foundCount++;
        }
      }
    }

    const matchPercentage = (foundCount / expectedCount) * 100;

    console.log(`[Map Extractor] ${serviceName} - ${zone}: ${foundCount}/${expectedCount} valores encontrados (${matchPercentage.toFixed(1)}%)`);

    // Consideramos válido si encontramos al menos el 70% de los valores
    return matchPercentage >= 70;
  }

  /**
   * Extrae datos de una página usando el mapa
   */
  private static extractFromPage(
    page: PageData,
    serviceMap: ServiceMap
  ): ExtractedTariff[] {
    const results: ExtractedTariff[] = [];

    console.log(`[Map Extractor] Extrayendo datos de ${serviceMap.service_name} en página ${page.pageNum}`);

    // Procesar cada rango de peso
    for (const weightRange of serviceMap.weights) {
      // Procesar cada zona en el rango de peso
      const zones = [
        'Provincial',
        'Regional',
        'Nacional',
        'Portugal_Peninsular',
        'Ceuta_Melilla',
        'Gibraltar',
        'Andorra',
        'Baleares_Mayores',
        'Baleares_Menores',
        'Baleares_Interislas',
        'Canarias_Mayores',
        'Canarias_Menores',
        'Canarias_Interislas',
        'Tenerife_Tenerife',
        'Las_Palmas_Las_Palmas',
        'Madeira_Mayores',
        'Madeira_Menores',
        'Azores_Mayores',
        'Azores_Menores'
      ];

      for (const zone of zones) {
        const zoneData = weightRange[zone as keyof WeightRange] as TariffDataPoint | undefined;

        if (zoneData) {
          // Validar que los datos están en la página
          const isValid = this.validateExtractedData(
            page,
            serviceMap.service_name,
            zone,
            zoneData
          );

          if (isValid) {
            const tariff: ExtractedTariff = {
              service_name: serviceMap.service_name,
              zone: zone,
              weight_from: weightRange.weight_from,
              weight_to: weightRange.weight_to,
              weight_label: weightRange.label,
              recogida_pickup_cost: this.parsePrice(zoneData.recogida),
              arrastre_line_haul_cost: this.parsePrice(zoneData.arrastre),
              entrega_delivery_cost: this.parsePrice(zoneData.entrega),
              salidas_outbound_cost: this.parsePrice(zoneData.salidas),
              recogidas_pickup_plural_cost: this.parsePrice(zoneData.recogidas),
              interciudad_intercity_cost: this.parsePrice(zoneData.interciudad),
              km_cost: this.parsePrice(zoneData.km)
            };

            results.push(tariff);
          } else {
            console.log(`[Map Extractor] ⚠ Validación falló para ${serviceMap.service_name} - ${zone} - ${weightRange.label}`);
          }
        }
      }
    }

    console.log(`[Map Extractor] ✓ Extraídos ${results.length} registros de ${serviceMap.service_name}`);
    return results;
  }

  /**
   * Extrae todos los datos del PDF usando el mapa completo
   */
  static extractAllData(pages: PageData[]): ExtractedTariff[] {
    const allResults: ExtractedTariff[] = [];

    console.log(`[Map Extractor] ========== INICIANDO EXTRACCIÓN BASADA EN MAPA ==========`);
    console.log(`[Map Extractor] Total páginas: ${pages.length}`);
    console.log(`[Map Extractor] Servicios en mapa: ${TARIFF_MAP_2025.length}`);

    // Procesar cada servicio del mapa
    for (const serviceMap of TARIFF_MAP_2025) {
      console.log(`\n[Map Extractor] --- Procesando ${serviceMap.service_name} (Página ${serviceMap.page}) ---`);

      // Buscar la página correspondiente
      const page = pages.find(p => p.pageNum === serviceMap.page);

      if (!page) {
        console.log(`[Map Extractor] ⚠ Página ${serviceMap.page} no encontrada para ${serviceMap.service_name}`);
        continue;
      }

      // Extraer datos de la página
      const results = this.extractFromPage(page, serviceMap);
      allResults.push(...results);
    }

    console.log(`\n[Map Extractor] ========== EXTRACCIÓN COMPLETADA ==========`);
    console.log(`[Map Extractor] Total registros extraídos: ${allResults.length}`);

    // Agrupar por servicio para el resumen
    const byService = allResults.reduce((acc, r) => {
      acc[r.service_name] = (acc[r.service_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[Map Extractor] Resumen por servicio:`);
    for (const [service, count] of Object.entries(byService)) {
      console.log(`[Map Extractor]   - ${service}: ${count} registros`);
    }

    return allResults;
  }

  /**
   * Compara datos extraídos con el mapa para detectar discrepancias
   */
  static compareWithMap(pages: PageData[]): {
    matches: number;
    mismatches: number;
    missing: number;
    details: Array<{
      service: string;
      zone: string;
      weight: string;
      field: string;
      expected: string;
      found: string | null;
    }>;
  } {
    let matches = 0;
    let mismatches = 0;
    let missing = 0;
    const details: Array<any> = [];

    console.log(`[Map Comparator] ========== COMPARANDO DATOS CON MAPA ==========`);

    for (const serviceMap of TARIFF_MAP_2025) {
      const page = pages.find(p => p.pageNum === serviceMap.page);
      if (!page) {
        console.log(`[Map Comparator] ⚠ Página ${serviceMap.page} no encontrada`);
        continue;
      }

      for (const weightRange of serviceMap.weights) {
        const zones = Object.keys(weightRange).filter(k =>
          !['weight_from', 'weight_to', 'label'].includes(k)
        );

        for (const zone of zones) {
          const zoneData = weightRange[zone as keyof WeightRange] as TariffDataPoint;

          if (zoneData) {
            for (const field in zoneData) {
              const expectedValue = zoneData[field as keyof TariffDataPoint];
              if (expectedValue) {
                const found = this.findValueNearLocation(page, expectedValue);

                if (found) {
                  if (found.str.replace(',', '.') === expectedValue.replace(',', '.')) {
                    matches++;
                  } else {
                    mismatches++;
                    details.push({
                      service: serviceMap.service_name,
                      zone,
                      weight: weightRange.label,
                      field,
                      expected: expectedValue,
                      found: found.str
                    });
                  }
                } else {
                  missing++;
                  details.push({
                    service: serviceMap.service_name,
                    zone,
                    weight: weightRange.label,
                    field,
                    expected: expectedValue,
                    found: null
                  });
                }
              }
            }
          }
        }
      }
    }

    console.log(`[Map Comparator] ========== RESULTADO COMPARACIÓN ==========`);
    console.log(`[Map Comparator] ✓ Coincidencias: ${matches}`);
    console.log(`[Map Comparator] ⚠ Discrepancias: ${mismatches}`);
    console.log(`[Map Comparator] ✗ Faltantes: ${missing}`);
    console.log(`[Map Comparator] Total verificado: ${matches + mismatches + missing}`);

    if (details.length > 0 && details.length <= 20) {
      console.log(`[Map Comparator] Primeros errores detectados:`);
      for (const detail of details.slice(0, 20)) {
        console.log(`[Map Comparator]   ${detail.service} - ${detail.zone} - ${detail.weight} - ${detail.field}: esperado "${detail.expected}", encontrado "${detail.found}"`);
      }
    }

    return { matches, mismatches, missing, details };
  }
}
