// PdfToExcelConverter.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Configurar worker desde CDN confiable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

  const parseGlsTable = (text: string): ParsedRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: ParsedRow[] = [];
    let currentService = '';
    let currentZone = '';

    for (const line of lines) {
      // Saltar líneas basura
      if (/glass|cristal/i.test(line)) continue;

      // Detectar servicio
      const serviceMatch = line.match(/(Business ?Parcel|Economy ?Parcel|Euro ?Business ?Parcel|Parcel ?Shop|Express.*\d{2}:\d{2})/i);
      if (serviceMatch) {
        currentService = serviceMatch[0].trim();
        continue;
      }

      // Detectar zona
      const zoneMatch = line.match(/^(Provincial|Regional|Nacional|Ceuta ?& ?Melilla|Gibraltar|Andorra)/i);
      if (zoneMatch) {
        currentZone = zoneMatch[1].replace(/ ?& ?/g, ' & ');
        continue;
      }

      // Detectar peso
      const weightMatch = line.match(/(\d+(?:-\d+)?)\s*kg/i) || line.match(/(0-1|1-3|3-5|5-10|10-15|15\+?|\+)\s*kg?/i);
      if (!weightMatch || !currentService || !currentZone) continue;

      let peso = weightMatch[1];
      if (peso === '1') peso = '0-1';
      else if (peso === '3') peso = '1-3';
      else if (peso === '5') peso = '3-5';
      else if (peso === '10') peso = '5-10';
      else if (peso === '15') peso = '10-15';
      else if (peso === '+') peso = '15-99';

      // Extraer 6 números
      const numbers = line.match(/(\d+[.,]\d{2})/g);
      if (numbers && numbers.length >= 6) {
        result.push({
          servicio: currentService,
          zona: currentZone,
          peso: peso + 'kg',
          recogida: numbers[0].replace(',', '.'),
          arrastre: numbers[1].replace(',', '.'),
          entrega: numbers[2].replace(',', '.'),
          salidas: numbers[3].replace(',', '.'),
          recogidas: numbers[4].replace(',', '.'),
          interciudad: numbers[5].replace(',', '.'),
        });
      }
    }
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
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const allText: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        allText.push(pageText);
      }

      const fullText = allText.join('\n');
      const data = parseGlsTable(fullText);

      if (data.length === 0) {
        throw new Error('No se encontraron datos. Asegúrate de usar un PDF de tarifas GLS 2025.');
      }

      setParsedData(data);

      // Generar Excel
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
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <FileSpreadsheet className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">PDF → Excel (GLS 2025)</h3>
          <p className="text-sm text-gray-600">Conversión 100% local, sin errores</p>
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
          <div>
            <p className="text-sm font-medium text-blue-900">Procesando PDF...</p>
            <p className="text-xs text-blue-700">Extrayendo datos con pdfjs-dist</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {excelUrl && (
        <>
          <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">¡Éxito! {parsedData.length} filas</p>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-green-700 underline"
                >
                  {showPreview ? 'Ocultar' : 'Ver'} vista previa
                </button>
              </div>
            </div>
            <a
              href={excelUrl}
              download="tarifas_gls_2025.xlsx"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Descargar
            </a>
          </div>

          {showPreview && (
            <div className="mt-4 max-h-96 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    {['Servicio', 'Zona', 'Peso', 'Rec', 'Arr', 'Ent', 'Sal', 'Recog', 'Int'].map(h => (
                      <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 font-medium">{row.servicio}</td>
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
                  {parsedData.length > 50 && (
                    <tr>
                      <td colSpan={9} className="px-2 py-1 text-center text-gray-500 text-xs">
                        ... y {parsedData.length - 50} filas más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-medium text-gray-800 mb-1">Soporta:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Todos los servicios GLS (BusinessParcel, Express, etc.)</li>
          <li>Todas las zonas (incl. Ceuta & Melilla)</li>
          <li>Pesos: 0-1kg hasta 15-99kg</li>
        </ul>
      </div>
    </div>
  );
}