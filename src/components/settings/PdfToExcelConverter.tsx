import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Loader2, FileSpreadsheet, AlertCircle } from 'lucide-react';

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
  const [rowCount, setRowCount] = useState(0);

  const parseGlsTable = (text: string): ParsedRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: ParsedRow[] = [];

    let currentService = '';
    let currentZone = '';

    for (const line of lines) {
      if (/glass|cristal/i.test(line)) continue;

      if (/express.*08:?30|express.*10:?30|express.*14:?00|express.*19:?00/i.test(line)) {
        currentService = line.match(/express.*\d{2}:\d{2}/i)?.[0] || '';
        continue;
      }

      if (/business.*parcel|economy.*parcel|euro.*business|parcel.*shop/i.test(line)) {
        currentService = line;
        continue;
      }

      if (/provincial|regional|nacional/i.test(line)) {
        const match = line.match(/^(provincial|regional|nacional)/i);
        if (match) {
          currentZone = match[1];
        }
        continue;
      }

      const weightMatch = line.match(/^(0-1|1|1-3|3|3-5|5|5-10|10|10-15|15|\+)\s*kg?/i);
      if (weightMatch && currentService && currentZone) {
        let peso = weightMatch[1];

        if (peso === '1') peso = '0-1';
        else if (peso === '3') peso = '1-3';
        else if (peso === '5') peso = '3-5';
        else if (peso === '10') peso = '5-10';
        else if (peso === '15') peso = '10-15';
        else if (peso === '+') peso = '15-999';

        const numbers = line.match(/(\d+[.,]\d{2})/g);
        if (numbers && numbers.length >= 4) {
          result.push({
            servicio: currentService,
            zona: currentZone,
            peso: peso + 'kg',
            recogida: numbers[0] || '',
            arrastre: numbers[1] || '',
            entrega: numbers[2] || '',
            salidas: numbers[3] || '',
            recogidas: numbers[4] || '',
            interciudad: numbers[5] || ''
          });
        }
      }
    }

    return result;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo PDF válido');
      return;
    }

    setLoading(true);
    setExcelUrl(null);
    setError(null);
    setRowCount(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
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
      const parsedData = parseGlsTable(fullText);

      if (parsedData.length === 0) {
        throw new Error('No se encontraron datos válidos en el PDF. Verifica que sea un PDF de tarifas GLS.');
      }

      const headers = ['Servicio', 'Zona', 'Peso', 'Recogida', 'Arrastre', 'Entrega', 'Salidas', 'Recogidas', 'Interciudad'];
      const rows = [
        headers,
        ...parsedData.map(row => [
          row.servicio,
          row.zona,
          row.peso,
          row.recogida,
          row.arrastre,
          row.entrega,
          row.salidas,
          row.recogidas,
          row.interciudad
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tarifas GLS');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);

      setExcelUrl(url);
      setRowCount(parsedData.length);
    } catch (err) {
      console.error('Error procesando PDF:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al procesar el PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <FileSpreadsheet className="w-6 h-6 text-green-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Convertir PDF a Excel</h3>
          <p className="text-sm text-gray-600">Convierte tu PDF de tarifas GLS a formato Excel</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFile}
            disabled={loading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Procesando PDF...</p>
              <p className="text-xs text-blue-700">Extrayendo texto y generando Excel</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error al procesar PDF</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {excelUrl && (
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Excel generado exitosamente</p>
                <p className="text-xs text-green-700">{rowCount} filas procesadas</p>
              </div>
            </div>
            <a
              href={excelUrl}
              download="tarifas_gls.xlsx"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar Excel
            </a>
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Instrucciones:</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Selecciona tu PDF de tarifas GLS</li>
            <li>El sistema extraerá automáticamente los datos y generará un Excel</li>
            <li>Descarga el Excel con todas las tarifas organizadas</li>
            <li>Abre el archivo en Excel o Google Sheets para revisarlo y editarlo</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
