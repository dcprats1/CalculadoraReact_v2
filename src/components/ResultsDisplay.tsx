import React, { useMemo } from 'react';
import { TrendingUp, Package, Euro, Percent } from 'lucide-react';
import { SimulationResult } from '../utils/calculations';
import { DestinationZone } from '../lib/supabase';
import { formatCurrency, formatPercentage, formatWeight, formatDimensions } from '../utils/calculations';

interface ResultsDisplayProps {
  result: SimulationResult;
  serviceName: string;
  destinationZone: DestinationZone;
  marginPercentage: number;
}

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SummaryCard {
  title: string;
  value: React.ReactNode;
  Icon: IconComponent;
  iconClassName: string;
  description?: React.ReactNode;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  serviceName,
  destinationZone,
  marginPercentage
}) => {
  const { packages, results, totals } = result;

  const summaryCards = useMemo<SummaryCard[]>(
    () => [
      {
        title: 'Coste Total',
        value: formatCurrency(totals.totalCost),
        Icon: Euro,
        iconClassName: 'text-red-500'
      },
      {
        title: 'Precio Final',
        value: formatCurrency(totals.totalPrice),
        Icon: TrendingUp,
        iconClassName: 'text-green-600'
      },
      {
        title: 'Margen Total',
        value: formatCurrency(totals.totalPrice - totals.totalCost),
        Icon: Percent,
        iconClassName: 'text-blue-600'
      },
      {
        title: 'Bultos',
        value: totals.totalPackages,
        description: <p className="text-sm text-gray-500">{formatWeight(totals.totalWeight)}</p>,
        Icon: Package,
        iconClassName: 'text-purple-600'
      }
    ],
    [totals.totalCost, totals.totalPrice, totals.totalWeight, totals.totalPackages]
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ title, value, description, Icon, iconClassName }) => (
          <div key={title} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {description}
              </div>
              <Icon className={`h-8 w-8 ${iconClassName}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Service Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detalles del Servicio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Servicio</p>
            <p className="text-lg font-semibold text-gray-900">{serviceName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Zona de Destino</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {destinationZone}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Margen Aplicado</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPercentage(marginPercentage)}
            </p>
          </div>
        </div>
      </div>

      {/* Package Details */}
      {packages.length > 1 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detalle por Bulto
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bulto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Peso Final
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coste
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Final
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg, index) => {
                  const result = results[index];
                  return (
                    <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatWeight(pkg.weight)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <span className={`font-medium ${
                            result.volumetricWeight && result.volumetricWeight > result.actualWeight 
                              ? 'text-blue-600' 
                              : 'text-gray-900'
                          }`}>
                            {formatWeight(result.finalWeight)}
                          </span>
                          {result.volumetricWeight && result.volumetricWeight > result.actualWeight && (
                            <div className="text-xs text-blue-600">
                              Vol: {formatWeight(result.volumetricWeight)}
                            </div>
                          )}
                          {pkg.dimensions && (
                            <div className="text-xs text-gray-500">
                              {formatDimensions(pkg.dimensions.height, pkg.dimensions.width, pkg.dimensions.length)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(result.cost)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(result.price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatCurrency(result.margin)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatPercentage(result.marginPercentage)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    {formatWeight(totals.totalWeight)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    {formatWeight(totals.totalWeight)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    {formatCurrency(totals.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">
                    {formatCurrency(totals.totalPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                    {formatCurrency(totals.totalPrice - totals.totalCost)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600">
                    {formatPercentage(totals.averageMarginPercentage)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Profitability Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análisis de Rentabilidad
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Margen Real Obtenido</span>
              <span className={`text-sm font-medium ${
                totals.averageMarginPercentage >= marginPercentage 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {formatPercentage(totals.averageMarginPercentage)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  totals.averageMarginPercentage >= marginPercentage
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min((totals.averageMarginPercentage / (marginPercentage + 10)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Beneficio por kg:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency((totals.totalPrice - totals.totalCost) / totals.totalWeight)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Beneficio por bulto:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency((totals.totalPrice - totals.totalCost) / totals.totalPackages)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;