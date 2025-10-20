import React from 'react';
import { Plus, Minus, Package, Ruler } from 'lucide-react';
import { PackageData } from '../utils/calculations';
import {
  calculateVolumetricWeight,
  getConversionFactorForService,
  formatWeight,
  formatDimensions,
  formatVolume
} from '../utils/calculations';

interface PackageManagerProps {
  packages: PackageData[];
  onChange: (packages: PackageData[]) => void;
  selectedService?: string;
  onClearPackages: () => void;
}

export default function PackageManager({
  packages,
  onChange,
  selectedService,
  onClearPackages
}: PackageManagerProps) {
  const emitChange = React.useCallback(
    (nextPackages: PackageData[]) => {
      if (typeof onChange !== 'function') {
        return;
      }
      onChange(nextPackages);
    },
    [onChange]
  );

  const addPackage = () => {
    const newPackage: PackageData = {
      id: Date.now().toString(),
      weight: 1.0,
      finalWeight: 1.0,
      quantity: 1,
      dimensions: {
        height: 10,
        width: 10,
        length: 10,
      },
    };
    emitChange([...packages, newPackage]);
  };

  const removePackage = (id: string) => {
    if (packages.length > 1) {
      emitChange(packages.filter(pkg => pkg.id !== id));
    }
  };

  const handlePackageWeightChange = (id: string, weight: number) => {
    emitChange(
      packages.map(pkg => {
        if (pkg.id !== id) return pkg;
        const updatedFinalWeight = pkg.volumetricWeight
          ? Math.max(weight, pkg.volumetricWeight)
          : weight;

        return {
          ...pkg,
          weight,
          finalWeight: updatedFinalWeight
        };
      })
    );
  };

  const updatePackageDimensions = (id: string, dimensions: { height: number; width: number; length: number }) => {
    const conversionFactor = selectedService ? getConversionFactorForService(selectedService) : 167;
    const volumetricWeight = calculateVolumetricWeight(
      dimensions.height,
      dimensions.width,
      dimensions.length,
      conversionFactor
    );

    emitChange(
      packages.map(pkg =>
        pkg.id === id
          ? {
              ...pkg,
              dimensions,
              volumetricWeight,
              finalWeight: Math.max(pkg.weight, volumetricWeight)
            }
          : pkg
      )
    );
  };

  const updatePackageQuantity = (id: string, quantity: number) => {
    const sanitizedQuantity = Math.max(1, Math.round(Number.isFinite(quantity) ? quantity : 1));

    emitChange(
      packages.map(pkg =>
        pkg.id === id
          ? {
              ...pkg,
              quantity: sanitizedQuantity
            }
          : pkg
      )
    );
  };

  const totalPackages = packages.reduce(
    (sum, pkg) => sum + Math.max(1, Math.round(pkg.quantity ?? 1)),
    0
  );
  const totalActualWeight = packages.reduce(
    (sum, pkg) => sum + pkg.weight * Math.max(1, Math.round(pkg.quantity ?? 1)),
    0
  );
  const totalFinalWeight = packages.reduce(
    (sum, pkg) =>
      sum + (pkg.finalWeight || pkg.weight) * Math.max(1, Math.round(pkg.quantity ?? 1)),
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center text-xl font-semibold text-gray-900">
            <Package className="h-5 w-5 mr-2 text-blue-600" />
            Gestión de Bultos
          </div>
          <p className="mt-2 text-sm text-gray-600 md:mt-1 md:ml-7">
            La tabla de costes se actualizará automáticamente al indicar pesos, medidas y ajustes necesarios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={addPackage}
            type="button"
            className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir
          </button>
          {packages.length > 1 && (
            <button
              onClick={onClearPackages}
              type="button"
              className="flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg shadow-sm hover:bg-gray-200 transition-colors"
            >
              Limpiar bultos
            </button>
          )}
        </div>
      </div>

      {packages.length === 1 && (
        <div className="mt-4 mb-4 p-3 bg-blue-50 rounded-lg">
          <label className="block text-sm font-medium text-blue-900 mb-2">Bultos idénticos (atajo rápido)</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={packages[0].quantity ?? 1}
              onChange={(e) => updatePackageQuantity(packages[0].id, Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-blue-700">
              bultos de {packages[0].weight} kg
              {packages[0].dimensions && (
                <span>
                  {' '}
                  ({packages[0].dimensions.height}×{packages[0].dimensions.width}×{packages[0].dimensions.length} cm)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg, index) => {
            const quantity = Math.max(1, Math.round(pkg.quantity ?? 1));

            return (
              <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (packages.length > 1) {
                        removePackage(pkg.id);
                      }
                    }}
                    disabled={packages.length <= 1}
                    className={`text-sm font-medium text-left ${
                      packages.length > 1
                        ? 'text-gray-900 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 rounded'
                        : 'text-gray-900 cursor-default'
                    }`}
                    title={packages.length > 1 ? 'Pulsa para eliminar este bulto' : undefined}
                  >
                    <span className="flex items-center">
                      <span>Bulto {index + 1}</span>
                      {quantity > 1 && (
                        <span className="ml-2 text-xs font-semibold text-blue-600">×{quantity}</span>
                      )}
                      {packages.length > 1 && (
                        <span className="ml-2 text-[11px] font-normal text-red-500">(pulsa para eliminar)</span>
                      )}
                    </span>
                  </button>
                  {packages.length > 1 && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removePackage(pkg.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Eliminar bulto"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Peso real (kg)</label>
                      <input
                        type="number"
                        value={pkg.weight}
                        onChange={(e) => handlePackageWeightChange(pkg.id, Number(e.target.value))}
                        min="0.1"
                        max="1000"
                        step="0.1"
                        className="w-20 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Peso"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={(e) => updatePackageQuantity(pkg.id, Number(e.target.value))}
                        className="w-16 px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Unidades"
                      />
                    </div>

                    <div className="text-xs text-gray-600">
                      <span className="block font-medium text-gray-900">Peso facturado</span>
                      <span
                        className={`text-sm ${
                          pkg.finalWeight && pkg.finalWeight > pkg.weight
                            ? 'text-blue-600 font-semibold'
                            : 'text-gray-900'
                        }`}
                      >
                        {formatWeight(pkg.finalWeight || pkg.weight)}
                      </span>
                      <span className="block mt-0.5">
                        {pkg.finalWeight && pkg.finalWeight > pkg.weight
                          ? 'Se aplica peso volumétrico.'
                          : 'Coincide con el peso real.'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center">
                      <Ruler className="h-4 w-4 mr-1 text-blue-600" />
                      Medidas (cm)
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-gray-600">Alto</span>
                        <input
                          type="number"
                          value={pkg.dimensions?.height || 10}
                          onChange={(e) =>
                            updatePackageDimensions(pkg.id, {
                              height: Number(e.target.value),
                              width: pkg.dimensions?.width || 10,
                              length: pkg.dimensions?.length || 10
                            })
                          }
                          min="1"
                          max="99999"
                          step="0.1"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Alto"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-gray-600">Ancho</span>
                        <input
                          type="number"
                          value={pkg.dimensions?.width || 10}
                          onChange={(e) =>
                            updatePackageDimensions(pkg.id, {
                              height: pkg.dimensions?.height || 10,
                              width: Number(e.target.value),
                              length: pkg.dimensions?.length || 10
                            })
                          }
                          min="1"
                          max="99999"
                          step="0.1"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ancho"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-xs font-medium text-gray-600">Largo</span>
                        <input
                          type="number"
                          value={pkg.dimensions?.length || 10}
                          onChange={(e) =>
                            updatePackageDimensions(pkg.id, {
                              height: pkg.dimensions?.height || 10,
                              width: pkg.dimensions?.width || 10,
                              length: Number(e.target.value)
                            })
                          }
                          min="1"
                          max="99999"
                          step="0.1"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Largo"
                        />
                      </div>
                    </div>
                  </div>

                  {pkg.volumetricWeight && (
                    <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>⚖️ Peso volumétrico: {formatWeight(pkg.volumetricWeight)}</span>
                        {pkg.dimensions && (
                          <>
                            <span>📐 {formatDimensions(pkg.dimensions.height, pkg.dimensions.width, pkg.dimensions.length)}</span>
                            <span>📦 Volumen: {formatVolume(pkg.dimensions.height, pkg.dimensions.width, pkg.dimensions.length)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">
                Total: {totalPackages} bulto{totalPackages > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Peso real:</span>
                <span className="font-medium text-gray-900">{formatWeight(totalActualWeight)}</span>
              </div>
              {totalFinalWeight !== totalActualWeight && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Peso facturado:</span>
                  <span className="font-medium text-blue-600">{formatWeight(totalFinalWeight)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {packages.some(pkg => pkg.weight <= 0) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">⚠️ Algunos bultos tienen peso inválido. El peso debe ser mayor a 0 kg.</p>
          </div>
        )}

        {packages.some(pkg => pkg.weight > 30) && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              ⚠️ Algunos bultos exceden el peso máximo típico (30 kg). Verifica las tarifas disponibles.
            </p>
          </div>
        )}

        {packages.some(pkg => pkg.volumetricWeight && pkg.volumetricWeight > pkg.weight) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Se está aplicando peso volumétrico en algunos bultos. El peso facturado será el mayor entre peso real y volumétrico.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
