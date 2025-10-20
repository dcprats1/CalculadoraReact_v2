import React, { useMemo, useState } from 'react';
import { TrendingUp, ArrowUpDown, Trophy, AlertTriangle } from 'lucide-react';
import { SimulationResult } from '../utils/calculations';
import { DestinationZone } from '../lib/supabase';
import { formatCurrency, formatPercentage, formatWeight } from '../utils/calculations';

interface ServiceComparisonProps {
  results: Record<string, SimulationResult>;
  destinationZone: DestinationZone;
  marginPercentage: number;
}

type SortField = 'service' | 'cost' | 'price' | 'margin' | 'marginPercentage';
type SortOrder = 'asc' | 'desc';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface SummaryCard {
  title: string;
  value: React.ReactNode;
  Icon: IconComponent;
  iconClassName: string;
  description?: React.ReactNode;
}

const ServiceComparison: React.FC<ServiceComparisonProps> = ({
  results,
  destinationZone,
  marginPercentage
}) => {
  const [sortField, setSortField] = useState<SortField>('marginPercentage');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Convert results to array for sorting
  const serviceData = Object.entries(results).map(([serviceName, result]) => ({
    serviceName,
    totalCost: result.totals.totalCost,
    totalPrice: result.totals.totalPrice,
    totalMargin: result.totals.totalPrice - result.totals.totalCost,
    marginPercentage: result.totals.averageMarginPercentage,
    totalWeight: result.totals.totalWeight,
    totalPackages: result.totals.totalPackages
  }));

  // Sort the data
  const sortedData = [...serviceData].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'service':
        aValue = a.serviceName;
        bValue = b.serviceName;
        break;
      case 'cost':
        aValue = a.totalCost;
        bValue = b.totalCost;
        break;
      case 'price':
        aValue = a.totalPrice;
        bValue = b.totalPrice;
        break;
      case 'margin':
        aValue = a.totalMargin;
        bValue = b.totalMargin;
        break;
      case 'marginPercentage':
        aValue = a.marginPercentage;
        bValue = b.marginPercentage;
        break;
      default:
        aValue = a.marginPercentage;
        bValue = b.marginPercentage;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    const numA = Number(aValue);
    const numB = Number(bValue);
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Find best and worst performers
  const bestMargin = Math.max(...serviceData.map(s => s.marginPercentage));
  const worstMargin = Math.min(...serviceData.map(s => s.marginPercentage));
  const lowestCost = Math.min(...serviceData.map(s => s.totalCost));

  if (serviceData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sin Resultados
        </h3>
        <p className="text-gray-500">
          No se pudieron calcular resultados para los servicios seleccionados.
        </p>
      </div>
    );
  }

  const summaryCards = useMemo<SummaryCard[]>(
    () => [
      {
        title: 'Servicios Comparados',
        value: serviceData.length,
        Icon: TrendingUp,
        iconClassName: 'text-blue-600'
      },
      {
        title: 'Mejor Margen',
        value: (
          <span className="text-green-600">{formatPercentage(bestMargin)}</span>
        ),
        Icon: Trophy,
        iconClassName: 'text-yellow-500'
      },
      {
        title: 'Menor Coste',
        value: (
          <span className="text-green-600">{formatCurrency(lowestCost)}</span>
        ),
        Icon: ArrowUpDown,
        iconClassName: 'text-green-600'
      }
    ],
    [bestMargin, lowestCost, serviceData.length]
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map(({ title, value, Icon, iconClassName, description }) => (
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

      {/* Configuration Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Parámetros de la Comparativa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Zona de Destino</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {destinationZone}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Margen Objetivo</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatPercentage(marginPercentage)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Bultos</p>
            <p className="text-lg font-semibold text-gray-900">
              {serviceData[0]?.totalPackages || 0} bultos 
              ({formatWeight(serviceData[0]?.totalWeight || 0)})
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Comparativa Detallada
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('service')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Servicio</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Coste Total</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Precio Final</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('margin')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Margen (€)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('marginPercentage')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Margen (%)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rendimiento
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((service) => {
                const isBestMargin = service.marginPercentage === bestMargin;
                const isWorstMargin = service.marginPercentage === worstMargin;
                const isLowestCost = service.totalCost === lowestCost;
                const meetsMargionTarget = service.marginPercentage >= marginPercentage;

                return (
                  <tr 
                    key={service.serviceName} 
                    className={`hover:bg-gray-50 transition-colors ${
                      isBestMargin ? 'bg-green-50' : isWorstMargin ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {service.serviceName}
                          </div>
                          {(isBestMargin || isLowestCost) && (
                            <div className="flex space-x-1 mt-1">
                              {isBestMargin && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Mejor Margen
                                </span>
                              )}
                              {isLowestCost && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Menor Coste
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(service.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(service.totalPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(service.totalMargin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        meetsMargionTarget ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(service.marginPercentage)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              meetsMargionTarget ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min((service.marginPercentage / (marginPercentage + 10)) * 100, 100)}%`
                            }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          meetsMargionTarget ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {meetsMargionTarget ? 'Objetivo' : 'Bajo objetivo'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Análisis de Rendimiento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Servicios que Cumplen Objetivo ({formatPercentage(marginPercentage)})
            </h4>
            <div className="space-y-2">
              {sortedData
                .filter(s => s.marginPercentage >= marginPercentage)
                .map(service => (
                  <div key={service.serviceName} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm text-green-900">{service.serviceName}</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPercentage(service.marginPercentage)}
                    </span>
                  </div>
                ))}
              {sortedData.filter(s => s.marginPercentage >= marginPercentage).length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Ningún servicio cumple el objetivo de margen establecido.
                </p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Recomendaciones
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              {bestMargin >= marginPercentage ? (
                <p className="text-green-600">
                  ✅ El servicio <strong>{sortedData[0]?.serviceName}</strong> ofrece el mejor margen 
                  ({formatPercentage(bestMargin)})
                </p>
              ) : (
                <p className="text-red-600">
                  ⚠️ Ningún servicio alcanza el margen objetivo. Considera reducir el margen o buscar otros servicios.
                </p>
              )}
              
              <p>
                💰 Para minimizar costes, usar <strong>
                  {sortedData.find(s => s.totalCost === lowestCost)?.serviceName}
                </strong> ({formatCurrency(lowestCost)})
              </p>
              
              {serviceData.length > 1 && (
                <p>
                  📊 Diferencia máxima de margen: {formatPercentage(bestMargin - worstMargin)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceComparison;