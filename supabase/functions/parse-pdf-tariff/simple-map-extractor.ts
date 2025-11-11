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
  baleares_mayores_sal?: number | null;
  baleares_mayores_rec?: number | null;
  baleares_mayores_int?: number | null;
  baleares_mayores_arr?: number | null;
  baleares_menores_sal?: number | null;
  baleares_menores_rec?: number | null;
  baleares_menores_int?: number | null;
  baleares_menores_arr?: number | null;
  baleares_interislas_sal?: number | null;
  baleares_interislas_rec?: number | null;
  baleares_interislas_int?: number | null;
  baleares_interislas_arr?: number | null;
  canarias_mayores_sal?: number | null;
  canarias_mayores_rec?: number | null;
  canarias_mayores_int?: number | null;
  canarias_mayores_arr?: number | null;
  canarias_menores_sal?: number | null;
  canarias_menores_rec?: number | null;
  canarias_menores_int?: number | null;
  canarias_menores_arr?: number | null;
  canarias_interislas_sal?: number | null;
  canarias_interislas_rec?: number | null;
  canarias_interislas_int?: number | null;
  canarias_interislas_arr?: number | null;
  tenerife_tenerife_sal?: number | null;
  tenerife_tenerife_rec?: number | null;
  tenerife_tenerife_int?: number | null;
  tenerife_tenerife_arr?: number | null;
  las_palmas_las_palmas_sal?: number | null;
  las_palmas_las_palmas_rec?: number | null;
  las_palmas_las_palmas_int?: number | null;
  las_palmas_las_palmas_arr?: number | null;
  madeira_mayores_sal?: number | null;
  madeira_mayores_rec?: number | null;
  madeira_mayores_int?: number | null;
  madeira_mayores_arr?: number | null;
  madeira_menores_sal?: number | null;
  madeira_menores_rec?: number | null;
  madeira_menores_int?: number | null;
  madeira_menores_arr?: number | null;
  azores_mayores_sal?: number | null;
  azores_mayores_rec?: number | null;
  azores_mayores_int?: number | null;
  azores_mayores_arr?: number | null;
  azores_menores_sal?: number | null;
  azores_menores_rec?: number | null;
  azores_menores_int?: number | null;
  azores_menores_arr?: number | null;
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
      const serviceType = serviceMap.type || 'peninsular';
      console.log(`[Simple Extractor] Procesando ${serviceMap.service_name} (tipo: ${serviceType})`);

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
          andorra_arr: null,
          baleares_mayores_sal: null,
          baleares_mayores_rec: null,
          baleares_mayores_int: null,
          baleares_mayores_arr: null,
          baleares_menores_sal: null,
          baleares_menores_rec: null,
          baleares_menores_int: null,
          baleares_menores_arr: null,
          baleares_interislas_sal: null,
          baleares_interislas_rec: null,
          baleares_interislas_int: null,
          baleares_interislas_arr: null,
          canarias_mayores_sal: null,
          canarias_mayores_rec: null,
          canarias_mayores_int: null,
          canarias_mayores_arr: null,
          canarias_menores_sal: null,
          canarias_menores_rec: null,
          canarias_menores_int: null,
          canarias_menores_arr: null,
          canarias_interislas_sal: null,
          canarias_interislas_rec: null,
          canarias_interislas_int: null,
          canarias_interislas_arr: null,
          tenerife_tenerife_sal: null,
          tenerife_tenerife_rec: null,
          tenerife_tenerife_int: null,
          tenerife_tenerife_arr: null,
          las_palmas_las_palmas_sal: null,
          las_palmas_las_palmas_rec: null,
          las_palmas_las_palmas_int: null,
          las_palmas_las_palmas_arr: null,
          madeira_mayores_sal: null,
          madeira_mayores_rec: null,
          madeira_mayores_int: null,
          madeira_mayores_arr: null,
          madeira_menores_sal: null,
          madeira_menores_rec: null,
          madeira_menores_int: null,
          madeira_menores_arr: null,
          azores_mayores_sal: null,
          azores_mayores_rec: null,
          azores_mayores_int: null,
          azores_mayores_arr: null,
          azores_menores_sal: null,
          azores_menores_rec: null,
          azores_menores_int: null,
          azores_menores_arr: null
        };

        // SOLO extraer rangos peninsulares si el servicio es peninsular o internacional
        const shouldExtractPeninsular = serviceType === 'peninsular' || serviceType === 'internacional';

        // Provincial (solo para servicios peninsulares)
        if (shouldExtractPeninsular && weightRange.Provincial) {
          tariff.provincial_sal = this.parsePrice(weightRange.Provincial.salidas);
          tariff.provincial_rec = this.parsePrice(weightRange.Provincial.recogidas || weightRange.Provincial.recogida);
          tariff.provincial_int = this.parsePrice(weightRange.Provincial.interciudad);
          tariff.provincial_arr = this.parsePrice(weightRange.Provincial.arrastre);
        }

        // Regional (solo para servicios peninsulares)
        if (shouldExtractPeninsular && weightRange.Regional) {
          tariff.regional_sal = this.parsePrice(weightRange.Regional.salidas);
          tariff.regional_rec = this.parsePrice(weightRange.Regional.recogidas || weightRange.Regional.recogida);
          tariff.regional_int = this.parsePrice(weightRange.Regional.interciudad);
          tariff.regional_arr = this.parsePrice(weightRange.Regional.arrastre);
        }

        // Nacional (solo para servicios peninsulares)
        if (shouldExtractPeninsular && weightRange.Nacional) {
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

        // Baleares Mayores
        if (weightRange.Baleares_Mayores) {
          tariff.baleares_mayores_sal = this.parsePrice(weightRange.Baleares_Mayores.salidas);
          tariff.baleares_mayores_rec = this.parsePrice(weightRange.Baleares_Mayores.recogidas || weightRange.Baleares_Mayores.recogida);
          tariff.baleares_mayores_int = this.parsePrice(weightRange.Baleares_Mayores.interciudad);
          tariff.baleares_mayores_arr = this.parsePrice(weightRange.Baleares_Mayores.arrastre);
        }

        // Baleares Menores
        if (weightRange.Baleares_Menores) {
          tariff.baleares_menores_sal = this.parsePrice(weightRange.Baleares_Menores.salidas);
          tariff.baleares_menores_rec = this.parsePrice(weightRange.Baleares_Menores.recogidas || weightRange.Baleares_Menores.recogida);
          tariff.baleares_menores_int = this.parsePrice(weightRange.Baleares_Menores.interciudad);
          tariff.baleares_menores_arr = this.parsePrice(weightRange.Baleares_Menores.arrastre);
        }

        // Baleares Interislas
        if (weightRange.Baleares_Interislas) {
          tariff.baleares_interislas_sal = this.parsePrice(weightRange.Baleares_Interislas.salidas);
          tariff.baleares_interislas_rec = this.parsePrice(weightRange.Baleares_Interislas.recogidas || weightRange.Baleares_Interislas.recogida);
          tariff.baleares_interislas_int = this.parsePrice(weightRange.Baleares_Interislas.interciudad);
          tariff.baleares_interislas_arr = this.parsePrice(weightRange.Baleares_Interislas.arrastre);
        }

        // Canarias Mayores
        if (weightRange.Canarias_Mayores) {
          tariff.canarias_mayores_sal = this.parsePrice(weightRange.Canarias_Mayores.salidas);
          tariff.canarias_mayores_rec = this.parsePrice(weightRange.Canarias_Mayores.recogidas || weightRange.Canarias_Mayores.recogida);
          tariff.canarias_mayores_int = this.parsePrice(weightRange.Canarias_Mayores.interciudad);
          tariff.canarias_mayores_arr = this.parsePrice(weightRange.Canarias_Mayores.arrastre);
        }

        // Canarias Menores
        if (weightRange.Canarias_Menores) {
          tariff.canarias_menores_sal = this.parsePrice(weightRange.Canarias_Menores.salidas);
          tariff.canarias_menores_rec = this.parsePrice(weightRange.Canarias_Menores.recogidas || weightRange.Canarias_Menores.recogida);
          tariff.canarias_menores_int = this.parsePrice(weightRange.Canarias_Menores.interciudad);
          tariff.canarias_menores_arr = this.parsePrice(weightRange.Canarias_Menores.arrastre);
        }

        // Canarias Interislas
        if (weightRange.Canarias_Interislas) {
          tariff.canarias_interislas_sal = this.parsePrice(weightRange.Canarias_Interislas.salidas);
          tariff.canarias_interislas_rec = this.parsePrice(weightRange.Canarias_Interislas.recogidas || weightRange.Canarias_Interislas.recogida);
          tariff.canarias_interislas_int = this.parsePrice(weightRange.Canarias_Interislas.interciudad);
          tariff.canarias_interislas_arr = this.parsePrice(weightRange.Canarias_Interislas.arrastre);
        }

        // Tenerife / Tenerife
        if (weightRange.Tenerife_Tenerife) {
          tariff.tenerife_tenerife_sal = this.parsePrice(weightRange.Tenerife_Tenerife.salidas);
          tariff.tenerife_tenerife_rec = this.parsePrice(weightRange.Tenerife_Tenerife.recogidas || weightRange.Tenerife_Tenerife.recogida);
          tariff.tenerife_tenerife_int = this.parsePrice(weightRange.Tenerife_Tenerife.interciudad);
          tariff.tenerife_tenerife_arr = this.parsePrice(weightRange.Tenerife_Tenerife.arrastre);
        }

        // Las Palmas / Las Palmas
        if (weightRange.Las_Palmas_Las_Palmas) {
          tariff.las_palmas_las_palmas_sal = this.parsePrice(weightRange.Las_Palmas_Las_Palmas.salidas);
          tariff.las_palmas_las_palmas_rec = this.parsePrice(weightRange.Las_Palmas_Las_Palmas.recogidas || weightRange.Las_Palmas_Las_Palmas.recogida);
          tariff.las_palmas_las_palmas_int = this.parsePrice(weightRange.Las_Palmas_Las_Palmas.interciudad);
          tariff.las_palmas_las_palmas_arr = this.parsePrice(weightRange.Las_Palmas_Las_Palmas.arrastre);
        }

        // Madeira Mayores
        if (weightRange.Madeira_Mayores) {
          tariff.madeira_mayores_sal = this.parsePrice(weightRange.Madeira_Mayores.salidas);
          tariff.madeira_mayores_rec = this.parsePrice(weightRange.Madeira_Mayores.recogidas || weightRange.Madeira_Mayores.recogida);
          tariff.madeira_mayores_int = this.parsePrice(weightRange.Madeira_Mayores.interciudad);
          tariff.madeira_mayores_arr = this.parsePrice(weightRange.Madeira_Mayores.arrastre);
        }

        // Madeira Menores
        if (weightRange.Madeira_Menores) {
          tariff.madeira_menores_sal = this.parsePrice(weightRange.Madeira_Menores.salidas);
          tariff.madeira_menores_rec = this.parsePrice(weightRange.Madeira_Menores.recogidas || weightRange.Madeira_Menores.recogida);
          tariff.madeira_menores_int = this.parsePrice(weightRange.Madeira_Menores.interciudad);
          tariff.madeira_menores_arr = this.parsePrice(weightRange.Madeira_Menores.arrastre);
        }

        // Azores Mayores
        if (weightRange.Azores_Mayores) {
          tariff.azores_mayores_sal = this.parsePrice(weightRange.Azores_Mayores.salidas);
          tariff.azores_mayores_rec = this.parsePrice(weightRange.Azores_Mayores.recogidas || weightRange.Azores_Mayores.recogida);
          tariff.azores_mayores_int = this.parsePrice(weightRange.Azores_Mayores.interciudad);
          tariff.azores_mayores_arr = this.parsePrice(weightRange.Azores_Mayores.arrastre);
        }

        // Azores Menores
        if (weightRange.Azores_Menores) {
          tariff.azores_menores_sal = this.parsePrice(weightRange.Azores_Menores.salidas);
          tariff.azores_menores_rec = this.parsePrice(weightRange.Azores_Menores.recogidas || weightRange.Azores_Menores.recogida);
          tariff.azores_menores_int = this.parsePrice(weightRange.Azores_Menores.interciudad);
          tariff.azores_menores_arr = this.parsePrice(weightRange.Azores_Menores.arrastre);
        }

        results.push(tariff);
      }

      console.log(`[Simple Extractor] ✓ ${serviceMap.service_name}: ${serviceMap.weights.length} rangos (tipo: ${serviceType})`);
    }

    console.log(`[Simple Extractor] Total extraído: ${results.length} registros`);

    // Log de muestra por tipo de servicio
    if (results.length > 0) {
      const peninsularSample = results.find(r => r.provincial_sal !== null);
      if (peninsularSample) {
        console.log(`[Simple Extractor] Muestra PENINSULAR: ${peninsularSample.service_name} ${peninsularSample.weight_from}-${peninsularSample.weight_to}kg`);
        console.log(`[Simple Extractor]   Provincial: Sal=${peninsularSample.provincial_sal}, Rec=${peninsularSample.provincial_rec}`);
        console.log(`[Simple Extractor]   Regional: Sal=${peninsularSample.regional_sal}, Rec=${peninsularSample.regional_rec}`);
        console.log(`[Simple Extractor]   Nacional: Sal=${peninsularSample.nacional_sal}, Rec=${peninsularSample.nacional_rec}`);
      }

      const insularSample = results.find(r =>
        r.baleares_mayores_sal !== null ||
        r.canarias_mayores_sal !== null
      );
      if (insularSample) {
        console.log(`[Simple Extractor] Muestra INSULAR: ${insularSample.service_name} ${insularSample.weight_from}-${insularSample.weight_to}kg`);
        console.log(`[Simple Extractor]   ⚠ Provincial: Sal=${insularSample.provincial_sal} (debe ser null)`);
        console.log(`[Simple Extractor]   ⚠ Regional: Sal=${insularSample.regional_sal} (debe ser null)`);
        console.log(`[Simple Extractor]   ⚠ Nacional: Sal=${insularSample.nacional_sal} (debe ser null)`);
        console.log(`[Simple Extractor]   ✓ Baleares Mayores: Sal=${insularSample.baleares_mayores_sal}`);
        console.log(`[Simple Extractor]   ✓ Canarias Mayores: Sal=${insularSample.canarias_mayores_sal}`);
      }
    }

    return results;
  }
}
