import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.js';

// Configurar worker una sola vez
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface ParsedRow {
  servicio: string;
  zona: string;
  peso: string;
  recogida: string;
  arrastre: string;
  entrega: string;
  salidas: string;
  recogidas: string;
  interciudad: string;
}

export function PdfToExcelConverter() {
  const [loading, setLoading] = useState(false);
  const [excelUrl, setExcelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const parseGlsTableFromItems = (textItems: any[]): ParsedRow[] => {
    console.log('📄 Total de elementos de texto:', textItems.length);
    console.log('📄 Primeros 10 elementos:', textItems.slice(0, 10));

    // Agrupar elementos por línea vertical (Y)
    const lineGroups = new Map<number, any[]>();
    const TOLERANCE = 3;

    textItems.forEach(item => {
      const y = Math.round(item.transform[5] / TOLERANCE) * TOLERANCE;
      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)!.push(item);
    });

    // Ordenar cada grupo por X y convertir a texto
    const lines: string[] = [];
    Array.from(lineGroups.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([y, items]) => {
        const sortedItems = items.sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = sortedItems.map(item => item.str).join(' ');
        lines.push(lineText);
      });

    console.log('📄 Líneas extraídas:', lines.slice(0, 20));

    const result: ParsedRow[] = [];
    let currentService = '';
    let currentZone = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || /glass|cristal|seguro|insurance/i.test(trimmed)) continue;

      // Detectar servicio
      const serviceMatch = trimmed.match(/(Business\s*Parcel|Economy\s*Parcel|Euro\s*Business\s*Parcel|EuroBusinessParc|Parcel\s*Shop|Express|Eurobusiness|Courier)/i);
      if (serviceMatch) {
        currentService = serviceMatch[0].trim().replace(/\s+/g, ' ');
        console.log('🚚 Servicio:', currentService);
        continue;
      }

      // Detectar zona
      const zoneMatch = trimmed.match(/\b(PROVINCIAL|REGIONAL|NACIONAL|CEUTA|MELILLA|GIBRALTAR|ANDORRA|PENINSULA|BALEARES)\b/i);
      if (zoneMatch) {
        currentZone = zoneMatch[1].trim();
        console.log('📍 Zona:', currentZone);
        continue;
      }

      // Detectar peso y números
      const weightMatch = trimmed.match(/(\d+(?:-\d+)?)\s*kg/i) || trimmed.match(/\b(0-1|1-3|3-5|5-10|10-15|15\+?|\+15)\b/i);
      if (!weightMatch || !currentService || !currentZone) continue;

      let peso = weightMatch[1];
      if (peso === '1') peso = '0-1';
      else if (peso === '3') peso = '1-3';
      else if (peso === '5') peso = '3-5';
      else if (peso === '10') peso = '5-10';
      else if (peso === '15') peso = '10-15';
      else if (peso === '+' || peso === '+15' || peso === '15+') peso = '15-99';

      const numbers = trimmed.match(/\d+\.\d{2}/g);
      console.log('🔢 Línea con peso:', trimmed, '→ números:', numbers);

      if (numbers && numbers.length >= 6) {
        const row = {
          servicio: currentService,
          zona: currentZone,
          peso: peso + 'kg',
          recogida: numbers[0],
          arrastre: numbers[1],
          entrega: numbers[2],
          salidas: numbers[3],
          recogidas: numbers[4],
          interciudad: numbers[5],
        };
        console.log('✅ Fila:', row);
        result.push(row);
      }
    }

    console.log(`📊 Total filas: ${result.length}`);
    return result;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Selecciona un archivo PDF válido');
      return;
    }

    setLoading(true);
    setError(null);
    setExcelUrl(null);
    setParsedData([]);
    setShowPreview(false);

    try {
      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = getDocument({
        data: arrayBuffer,
      });

      const pdf = await loadingTask.promise;
      const allItems: any[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        allItems.push(...textContent.items);
      }

      const data = parseGlsTableFromItems(allItems);

      if (data.length === 0) {
        throw new Error('No se encontraron tarifas. Usa un PDF de GLS 2025.');
      }

      setParsedData(data);

      const headers = ['Servicio', 'Zona', 'Peso', 'Recogida', 'Arrastre', 'Entrega', 'Salidas', 'Recogidas', 'Interciudad'];
      const rows = [headers, ...data.map(r => Object.values(r))];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = Array(9).fill({ wch: 14 });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tarifas');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setExcelUrl(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <FileSpreadsheet className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">PDF to Excel</h3>
          <p className="text-sm text-gray-600">Sin errores, sin warnings, 100% local</p>
        </div>
      </div>

      <input
        type="file"
        accept=".pdf"
        onChange={handleFile}
        disabled={loading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
      />

      {loading && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <p className="text-sm">Procesando PDF...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {excelUrl && (
        <>
          <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">¡Listo! {parsedData.length} filas</p>
                <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-green-700 underline">
                  {showPreview ? 'Ocultar' : 'Ver'} vista previa
                </button>
              </div>
            </div>
            <a
              href={excelUrl}
              download="tarifas_gls.xlsx"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Descargar
            </a>
          </div>

          {showPreview && (
            <div className="mt-4 max-h-64 overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {['Servicio', 'Zona', 'Peso', 'Rec', 'Arr', 'Ent', 'Sal', 'Recog', 'Int'].map(h => (
                      <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{row.servicio}</td>
                      <td className="px-2 py-1">{row.zona}</td>
                      <td className="px-2 py-1">{row.peso}</td>
                      <td className="px-2 py-1">{row.recogida}</td>
                      <td className="px-2 py-1">{row.arrastre}</td>
                      <td className="px-2 py-1">{row.entrega}</td>
                      <td className="px-2 py-1">{row.salidas}</td>
                      <td className="px-2 py-1">{row.recogidas}</td>
                      <td className="px-2 py-1">{row.interciudad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
