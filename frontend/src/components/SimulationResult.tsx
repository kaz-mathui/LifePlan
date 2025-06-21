import React, { useState, useMemo } from 'react';
import { BackendSimulationResult, SimulationResult as SimulationResultYear } from '../types';
import FormSection from './FormSection';
import Icon from './Icon';
import { FaInfoCircle, FaChartBar, FaTable, FaChevronLeft, FaChevronRight, FaCalculator } from 'react-icons/fa';
import Modal from './Modal';
import AssetChart from './AssetChart';
import ResultHeader from './ResultHeader';

interface ResultItemProps {
  label: string;
  value: string | number | undefined;
  unit?: string;
  isEmphasized?: boolean;
  isCurrency?: boolean;
  description?: string;
}

const ResultItem: React.FC<ResultItemProps> = ({ label, value, unit = '', isEmphasized = false, isCurrency = false, description }) => {
    const formattedValue = isCurrency && typeof value === 'number'
        ? `${Math.round(value / 10000).toLocaleString()} 万円`
        : (typeof value === 'number' ? value.toLocaleString() : (value || '-'));

    return (
        <div className={`p-4 rounded-lg flex flex-col justify-between h-full ${isEmphasized ? 'bg-sky-100 border-sky-200' : 'bg-slate-50 border-slate-200'} border`}>
            <div>
              <span className="text-sm font-medium text-slate-600">{label}</span>
              {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
            </div>
            <span className={`text-right font-bold mt-2 ${isEmphasized ? 'text-sky-700 text-2xl' : 'text-slate-800 text-xl'}`}>
                {formattedValue} {unit && !isCurrency ? unit : ''}
            </span>
        </div>
    );
};

interface DetailRowProps {
    label: string;
    value: number;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
    <div className="flex justify-between py-2 px-2 rounded hover:bg-slate-100 transition-colors">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-800">{Math.round(value / 10000).toLocaleString()} 万円</span>
    </div>
);

interface SimulationResultProps {
  result: BackendSimulationResult | null;
  loading: boolean;
}

const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center w-full px-4 py-3 font-semibold text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
      isActive
        ? 'bg-sky-600 text-white shadow-md'
        : 'bg-white text-slate-600 hover:bg-sky-50'
    }`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);


const CashFlowTable: React.FC<{
    assetData: SimulationResultYear[];
    onRowClick: (year: SimulationResultYear) => void;
}> = ({ assetData, onRowClick }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(assetData.length / itemsPerPage);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return assetData.slice(startIndex, startIndex + itemsPerPage);
    }, [assetData, currentPage, itemsPerPage]);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full responsive-table">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">年齢</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間収入</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間支出</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年間収支</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">年末資産</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedData.map((row) => (
                      <tr key={row.year} className="hover:bg-slate-50 cursor-pointer" onClick={() => onRowClick(row)}>
                        <td data-label="年齢" className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{row.age}歳 ({row.year})</td>
                        <td data-label="年間収入" className="px-4 py-3 whitespace-nowrap text-sm text-green-600 text-right">{Math.round(row.income / 10000).toLocaleString()}万円</td>
                        <td data-label="年間支出" className="px-4 py-3 whitespace-nowrap text-sm text-red-600 text-right">{Math.round(row.expense / 10000).toLocaleString()}万円</td>
                        <td data-label="年間収支" className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${row.balance >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                          {row.balance >= 0 ? '+' : ''}{Math.round(row.balance / 10000).toLocaleString()}万円
                        </td>
                        <td data-label="年末資産" className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 text-right font-semibold">{Math.round(row.savings / 10000).toLocaleString()}万円</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="flex justify-between items-center text-sm">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center px-3 py-1 border rounded-md bg-white hover:bg-slate-50 disabled:opacity-50">
                        <Icon as={FaChevronLeft} className="mr-1" />
                        前へ
                    </button>
                    <span>{currentPage} / {totalPages} ページ</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center px-3 py-1 border rounded-md bg-white hover:bg-slate-50 disabled:opacity-50">
                        次へ
                        <Icon as={FaChevronRight} className="ml-1" />
                    </button>
                </div>
            )}
        </div>
    );
};

const SimulationResultDisplay: React.FC<SimulationResultProps> = ({ result, loading }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');
  const [selectedYear, setSelectedYear] = useState<SimulationResultYear | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-inner border border-slate-200">
        <Icon as={FaCalculator} className="mx-auto text-sky-500 h-12 w-12" />
        <h2 className="text-2xl font-semibold text-sky-800 mt-4">準備完了</h2>
        <p className="text-slate-600 mt-2">左のフォームに入力すると、シミュレーション結果が自動で表示されます。</p>
      </div>
    );
  }

  const { assetData, retirementAge, lifeExpectancy } = result;
  
  // リタイア時の予測貯蓄額
  const projectedRetirementSavings = assetData.find(d => d.age === retirementAge)?.savings;

  return (
    <div className="bg-slate-50 p-4 sm:p-6 md:p-8 rounded-lg">
      <ResultHeader result={result} />
      
      <div className="mt-8 space-y-6">
        <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">シミュレーションサマリー</h2>
            
            {result.advice && (
              <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 flex items-start">
                <Icon as={FaInfoCircle} className="w-5 h-5 mr-3 mt-0.5 text-sky-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">AIアドバイス</p>
                  <p className="text-sm mt-1">{result.advice}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ResultItem label="リタイア年齢" value={retirementAge} unit="歳" />
              <ResultItem label="寿命" value={lifeExpectancy} unit="歳" />
              <ResultItem label="リタイア時の資産" value={projectedRetirementSavings} isCurrency={true} isEmphasized={true} />
              <ResultItem label="生涯最大の資産額" value={Math.max(...assetData.map(d => d.savings))} isCurrency={true} />
            </div>
        </div>

        <div className="bg-slate-100 p-1.5 rounded-xl grid grid-cols-2 gap-1.5">
           <TabButton
            label="資産推移グラフ"
            icon={<Icon as={FaChartBar} />}
            isActive={activeTab === 'chart'}
            onClick={() => setActiveTab('chart')}
          />
          <TabButton
            label="キャッシュフロー表"
            icon={<Icon as={FaTable} />}
            isActive={activeTab === 'table'}
            onClick={() => setActiveTab('table')}
          />
        </div>

        <div className="p-2 md:p-6 bg-white rounded-xl shadow-lg border border-slate-200 min-h-[400px]">
          {activeTab === 'chart' && (
            <AssetChart assetData={assetData} retirementAge={retirementAge} lifeExpectancy={lifeExpectancy} />
          )}
          {activeTab === 'table' && assetData && assetData.length > 0 && (
            <CashFlowTable assetData={assetData} onRowClick={setSelectedYear} />
          )}
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
      </div>
        
      {selectedYear && (
        <Modal 
            isOpen={!!selectedYear} 
            onClose={() => setSelectedYear(null)} 
            title={`${selectedYear.year}年 (${selectedYear.age}歳) の収支詳細`}
        >
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-lg text-green-700 mb-2 border-b pb-1">収入の内訳</h4>
                    <div className="space-y-1">
                        {Object.entries(selectedYear.incomeDetails).length > 0 ? Object.entries(selectedYear.incomeDetails).map(([key, value]) => (
                            <DetailRow key={key} label={key} value={value} />
                        )) : <p className="text-sm text-slate-500">収入の記録がありません。</p>}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-lg text-red-700 mb-2 border-b pb-1">支出の内訳</h4>
                    <div className="space-y-1">
                        {Object.entries(selectedYear.expenseDetails).length > 0 ? Object.entries(selectedYear.expenseDetails).map(([key, value]) => (
                            <DetailRow key={key} label={key} value={value} />
                        )) : <p className="text-sm text-slate-500">支出の記録がありません。</p>}
                    </div>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default SimulationResultDisplay; 
