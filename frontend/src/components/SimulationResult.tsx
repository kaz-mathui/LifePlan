import React, { useState } from 'react';
import { BackendSimulationResult, SimulationResult as SimulationResultYear } from '../types';
import FormSection from './FormSection';
import Icon from './Icon';
import { FaInfoCircle } from 'react-icons/fa';
import Modal from './Modal';

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

const DetailRow: React.FC<{label: string; value: number}> = ({ label, value }) => (
    <div className="flex justify-between py-1.5 px-2 rounded hover:bg-slate-100">
        <span className="text-sm text-slate-600">{label}:</span>
        <span className="text-sm font-medium text-slate-800">{Math.round(value / 10000).toLocaleString()} 万円</span>
    </div>
);

const SimulationResult: React.FC<SimulationResultComponentProps> = ({ result }) => {
  const [selectedYear, setSelectedYear] = useState<SimulationResultYear | null>(null);

  if (!result || !result.assetData || result.assetData.length === 0) return null;

  // リタイアまでの年数
  const yearsToRetirement = result.retirementAge - result.currentAge;

  // リタイア時の予測貯蓄額
  const projectedRetirementSavings = result.assetData.find(d => d.age === result.retirementAge)?.savings;
  
  // 現在の年間貯蓄可能額 (シミュレーション初年度の収支)
  const annualSavingsCurrentPace = result.assetData[0].balance;

  // 目標とする老後資金額 (簡易計算: (寿命 - 年金受給開始年齢) * 年金受給中の年間支出の平均)
  const retirementExpenses = result.assetData
    .filter(d => d.age >= result.pensionStartDate && d.age <= result.lifeExpectancy)
    .map(d => d.expense);
  
  const averageRetirementExpense = retirementExpenses.length > 0
    ? retirementExpenses.reduce((a, b) => a + b, 0) / retirementExpenses.length
    : 0;
  
  const targetRetirementFund = averageRetirementExpense * (result.lifeExpectancy - result.pensionStartDate);

  return (
    <>
    <div className="mt-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-semibold text-sky-700 mb-6 border-b pb-2">シミュレーション結果</h2>
        
        {result.advice && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 flex items-start">
            <Icon as={FaInfoCircle} className="w-5 h-5 mr-3 mt-1 text-sky-600 flex-shrink-0" />
            <div>
              <p className="font-semibold">アドバイス:</p>
              <p className="text-sm">{result.advice}</p>
      </div>
        </div>
      )}

        <div className="space-y-3 mb-8">
          <ResultItem label="リタイアまでの年数" value={yearsToRetirement > 0 ? yearsToRetirement : 0} unit="年" />
          <ResultItem label="現在のペースでの年間貯蓄可能額" value={annualSavingsCurrentPace} isCurrency={true} />
          <ResultItem label="目標とする老後資金額(目安)" value={targetRetirementFund > 0 ? targetRetirementFund : 0} isCurrency={true} />
          <ResultItem label="リタイア時の予測貯蓄額" value={projectedRetirementSavings} isCurrency={true} isEmphasized={true} />
        </div>
        
        {result.calculationSummary && (
          <FormSection title="計算過程の概要">
              <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                      {result.calculationSummary}
                  </pre>
              </div>
          </FormSection>
        )}
        
        {result.assetData && result.assetData.length > 0 && (
          <FormSection title="毎年の収支詳細">
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">年</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">年齢</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間収入</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間支出</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間収支</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年末資産</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {result.assetData.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedYear(row)}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{row.year}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{row.age}歳</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right">{Math.round(row.income / 10000).toLocaleString()}万円</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 text-right">{Math.round(row.expense / 10000).toLocaleString()}万円</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${row.balance >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                        {Math.round(row.balance / 10000).toLocaleString()}万円
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-right font-semibold">{Math.round(row.savings / 10000).toLocaleString()}万円</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormSection>
        )}

      </div>
      
      {selectedYear && (
        <Modal 
            isOpen={!!selectedYear} 
            onClose={() => setSelectedYear(null)} 
            title={`${selectedYear.year}年 (${selectedYear.age}歳) の収支詳細`}
        >
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-lg text-green-700 mb-2 border-b pb-1">収入の内訳</h4>
                    <div className="space-y-1">
                        {Object.entries(selectedYear.incomeDetails).map(([key, value]) => (
                            <DetailRow key={key} label={key} value={value} />
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg text-red-700 mb-2 border-b pb-1">支出の内訳</h4>
                    <div className="space-y-1">
                        {Object.entries(selectedYear.expenseDetails).map(([key, value]) => (
                            <DetailRow key={key} label={key} value={value} />
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default SimulationResult; 
