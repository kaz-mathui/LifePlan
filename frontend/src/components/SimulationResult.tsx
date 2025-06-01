import React from 'react';

// backend/src/services/simulationService.ts からの型定義と一致させることを想定
interface BackendSimulationResult {
  yearsToRetirement: number;
  projectedRetirementSavings: number;
  annualSavingsCurrentPace: number;
  targetRetirementFund?: number;
  message: string;
  suggestion?: string;
}

interface ResultItemProps {
  label: string;
  value: string | number | undefined;
  unit?: string;
  isEmphasized?: boolean;
  isCurrency?: boolean;
}

const ResultItem: React.FC<ResultItemProps> = ({ label, value, unit = '', isEmphasized = false, isCurrency = false }) => {
    const formattedValue = isCurrency && typeof value === 'number'
        ? `${Math.round(value / 10000).toLocaleString()} 万円`
        : (typeof value === 'number' ? value.toLocaleString() : (value || '-')); // undefinedの場合はハイフン表示

    return (
        <div className={`py-3 px-4 ${isEmphasized ? 'bg-sky-50' : 'bg-slate-50'} rounded-lg flex justify-between items-center`}>
            <span className="text-sm font-medium text-slate-700">{label}:</span>
            <span className={`text-right font-semibold ${isEmphasized ? 'text-sky-700 text-lg' : 'text-slate-800'}`}>
                {formattedValue} {unit && !isCurrency ? unit : ''}
            </span>
        </div>
    );
};

interface SimulationResultComponentProps {
  result: BackendSimulationResult | null;
}

const SimulationResult: React.FC<SimulationResultComponentProps> = ({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 border-b pb-2">シミュレーション結果</h2>
      <div className="space-y-3">
        <ResultItem label="リタイアまでの年数" value={result.yearsToRetirement} unit="年" />
        <ResultItem label="現在のペースでの年間貯蓄可能額" value={result.annualSavingsCurrentPace} isCurrency={true} />
        <ResultItem label="目標とする老後資金額(目安)" value={result.targetRetirementFund} isCurrency={true} />
        <ResultItem label="リタイア時の予測貯蓄額" value={result.projectedRetirementSavings} isCurrency={true} isEmphasized={true} />
      </div>

      {result.message && (
        <div className="mt-6 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sky-800">
          <p className="font-medium">アドバイス:</p>
          <p className="text-sm whitespace-pre-line">{result.message}</p>
        </div>
      )}

      {result.suggestion && (
         <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <p className="font-medium">支出見直し提案:</p>
          <p className="text-sm whitespace-pre-line">{result.suggestion}</p>
        </div>
      )}
    </div>
  );
};

export default SimulationResult; 
