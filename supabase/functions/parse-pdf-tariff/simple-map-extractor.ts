/**
 * Extractor Simple basado en mapa
 * Inserta directamente los datos del mapa sin validación
 */

import { TARIFF_MAP_2025 } from './tariff-map.ts';

interface OutputTariff {
  service_name: string;
  weight_from: number;
  weight_to: number;
  provincial_sal?: number | null;
  provincial_rec?: number | null;
  provincial_int?: number | null;
  provincial_arr?: number | null;
  regional_sal?: number | null;
  regional_rec?: number | null;
  regional_int?: number | null;
  regional_arr?: number | null;
  nacional_sal?: number | null;
  nacional_rec?: number | null;
  nacional_int?: number | null;
  nacional_arr?: number | null;
  portugal_sal?: number | null;
  portugal_rec?: number | null;
  portugal_int?: number | null;
  portugal_arr?: number | null;
  ceuta_sal?: number | null;
  ceuta_rec?: number | null;
  ceuta_int?: number | null;
  ceuta_arr?: number | null;
  melilla_sal?: number | null;
  melilla_rec?: number | null;
  melilla_int?: number | null;
  melilla_arr?: number | null;
  gibraltar_sal?: number | null;
  gibraltar_rec?: number | null;
  gibraltar_int?: number | null;
  gibraltar_arr?: number | null;
  andorra_sal?: number | null;
  andorra_rec?: number | null;
  andorra_int?: number | null;
  andorra_arr?: number | null;
}

export class SimpleMapExtractor {
  private static parsePrice(value: string | undefined): number | null {
    if (!value) return null;
    const normalized = value.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extrae los datos directamente del mapa sin validar el PDF
   */
  static extractFromMap(): OutputTariff[] {
    const results: OutputTariff[] = [];

    console.log(`[Simple Extractor] Extrayendo ${TARIFF_MAP_2025.length} servicios del mapa...`);

    for (const serviceMap of TARIFF_MAP_2025) {
      for (const weightRange of serviceMap.weights) {
        const tariff: OutputTariff = {
          service_name: serviceMap.service_name,
          weight_from: weightRange.weight_from,
          weight_to: weightRange.weight_to,
          provincial_sal: null,
          provincial_rec: null,
          provincial_int: null,
          provincial_arr: null,
          regional_sal: null,
          regional_rec: null,
          regional_int: null,
          regional_arr: null,
          nacional_sal: null,
          nacional_rec: null,
          nacional_int: null,
          nacional_arr: null,
          portugal_sal: null,
          portugal_rec: null,
          portugal_int: null,
          portugal_arr: null,
          ceuta_sal: null,
          ceuta_rec: null,
          ceuta_int: null,
          ceuta_arr: null,
          melilla_sal: null,
          melilla_rec: null,
          melilla_int: null,
          melilla_arr: null,
          gibraltar_sal: null,
          gibraltar_rec: null,
          gibraltar_int: null,
          gibraltar_arr: null,
          andorra_sal: null,
          andorra_rec: null,
          andorra_int: null,
          andorra_arr: null
        };

        // Provincial
        if (weightRange.Provincial) {
          tariff.provincial_sal = this.parsePrice(weightRange.Provincial.salidas);
          tariff.provincial_rec = this.parsePrice(weightRange.Provincial.recogidas || weightRange.Provincial.recogida);
          tariff.provincial_int = this.parsePrice(weightRange.Provincial.interciudad);
          tariff.provincial_arr = this.parsePrice(weightRange.Provincial.arrastre);
        }

        // Regional
        if (weightRange.Regional) {
          tariff.regional_sal = this.parsePrice(weightRange.Regional.salidas);
          tariff.regional_rec = this.parsePrice(weightRange.Regional.recogidas || weightRange.Regional.recogida);
          tariff.regional_int = this.parsePrice(weightRange.Regional.interciudad);
          tariff.regional_arr = this.parsePrice(weightRange.Regional.arrastre);
        }

        // Nacional
        if (weightRange.Nacional) {
          tariff.nacional_sal = this.parsePrice(weightRange.Nacional.salidas);
          tariff.nacional_rec = this.parsePrice(weightRange.Nacional.recogidas || weightRange.Nacional.recogida);
          tariff.nacional_int = this.parsePrice(weightRange.Nacional.interciudad);
          tariff.nacional_arr = this.parsePrice(weightRange.Nacional.arrastre);
        }

        // Portugal
        if (weightRange.Portugal_Peninsular) {
          tariff.portugal_sal = this.parsePrice(weightRange.Portugal_Peninsular.salidas);
          tariff.portugal_rec = this.parsePrice(weightRange.Portugal_Peninsular.recogidas || weightRange.Portugal_Peninsular.recogida);
          tariff.portugal_int = this.parsePrice(weightRange.Portugal_Peninsular.interciudad);
          tariff.portugal_arr = this.parsePrice(weightRange.Portugal_Peninsular.arrastre);
        }

        // Ceuta/Melilla (en el PDF vienen juntos, los duplicamos para tener 2 destinos)
        if (weightRange.Ceuta_Melilla) {
          // Ceuta
          tariff.ceuta_sal = this.parsePrice(weightRange.Ceuta_Melilla.salidas);
          tariff.ceuta_rec = this.parsePrice(weightRange.Ceuta_Melilla.recogidas || weightRange.Ceuta_Melilla.recogida);
          tariff.ceuta_int = this.parsePrice(weightRange.Ceuta_Melilla.interciudad);
          tariff.ceuta_arr = this.parsePrice(weightRange.Ceuta_Melilla.arrastre);
          // Melilla (mismos valores que Ceuta)
          tariff.melilla_sal = this.parsePrice(weightRange.Ceuta_Melilla.salidas);
          tariff.melilla_rec = this.parsePrice(weightRange.Ceuta_Melilla.recogidas || weightRange.Ceuta_Melilla.recogida);
          tariff.melilla_int = this.parsePrice(weightRange.Ceuta_Melilla.interciudad);
          tariff.melilla_arr = this.parsePrice(weightRange.Ceuta_Melilla.arrastre);
        }

        // Gibraltar
        if (weightRange.Gibraltar) {
          tariff.gibraltar_sal = this.parsePrice(weightRange.Gibraltar.salidas);
          tariff.gibraltar_rec = this.parsePrice(weightRange.Gibraltar.recogidas || weightRange.Gibraltar.recogida);
          tariff.gibraltar_int = this.parsePrice(weightRange.Gibraltar.interciudad);
          tariff.gibraltar_arr = this.parsePrice(weightRange.Gibraltar.arrastre);
        }

        // Andorra
        if (weightRange.Andorra) {
          tariff.andorra_sal = this.parsePrice(weightRange.Andorra.salidas);
          tariff.andorra_rec = this.parsePrice(weightRange.Andorra.recogidas || weightRange.Andorra.recogida);
          tariff.andorra_int = this.parsePrice(weightRange.Andorra.interciudad);
          tariff.andorra_arr = this.parsePrice(weightRange.Andorra.arrastre);
        }

        results.push(tariff);
      }

      console.log(`[Simple Extractor] ✓ ${serviceMap.service_name}: ${serviceMap.weights.length} rangos`);
    }

    console.log(`[Simple Extractor] Total extraído: ${results.length} registros`);

    // Log de muestra
    if (results.length > 0) {
      const sample = results[0];
      console.log(`[Simple Extractor] Muestra: ${sample.service_name} ${sample.weight_from}-${sample.weight_to}kg`);
      console.log(`[Simple Extractor]   Provincial: Sal=${sample.provincial_sal}, Rec=${sample.provincial_rec}, Int=${sample.provincial_int}, Arr=${sample.provincial_arr}`);
    }

    return results;
  }
}
