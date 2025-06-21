import React, { useState, useMemo } from 'react';
import { BackendSimulationResult, SimulationResult as SimulationResultYear } from '../types';
import FormSection from './FormSection';
import Icon from './Icon';
import { FaChartBar, FaTable, FaChevronLeft, FaChevronRight, FaCalculator } from 'react-icons/fa';
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
    <div className="flex justify-between text-sm py-1 border-b border-slate-200">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value.toLocaleString()} 円</span>
    </div>
);

interface SimulationResultProps {
  result: BackendSimulationResult | null;
  loading: boolean;
  retirementAge: number;
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

const SimulationResultDisplay: React.FC<SimulationResultProps> = ({ result, loading, retirementAge }) => {
  const [selectedYearData, setSelectedYearData] = useState<SimulationResultYear | null>(null);
  const [activeTab, setActiveTab] = useState('chart');

  const tabItems = [
    { id: 'chart', label: 'グラフ', icon: FaChartBar },
    { id: 'table', label: 'キャッシュフロー表', icon: FaTable },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (!result || !result.assetData || result.assetData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <p className="text-slate-600">入力フォームに情報を入力して、「シミュレーション実行」ボタンを押してください。</p>
      </div>
    );
  }

  const { assetData } = result;

  return (
    <div className="space-y-6">
      <ResultHeader result={result} />
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <div className="bg-slate-100 rounded-lg p-1 flex space-x-1">
            {tabItems.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-1 text-center text-sm font-semibold rounded-md transition-colors duration-200 ${
                  activeTab === tab.id ? 'bg-white text-sky-600 shadow' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon as={tab.icon} className="inline-block sm:mr-2 mb-0.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {activeTab === 'chart' && (
            <AssetChart assetData={assetData} retirementAge={retirementAge} />
          )}
          {activeTab === 'table' && assetData && assetData.length > 0 && (
            <CashFlowTable assetData={assetData} onRowClick={setSelectedYearData} />
          )}
        </div>
      </div>
       {selectedYearData && (
         <Modal 
             isOpen={!!selectedYearData} 
             onClose={() => setSelectedYearData(null)} 
             title={`${selectedYearData.year}年 (${selectedYearData.age}歳) の収支詳細`}
         >
             <div className="space-y-4">
                 <div>
                     <h4 className="font-semibold text-lg text-green-700 mb-2 border-b pb-1">収入の内訳</h4>
                     <div className="space-y-1">
                         {Object.entries(selectedYearData.incomeDetails).length > 0 ? Object.entries(selectedYearData.incomeDetails).map(([key, value]) => (
                             <DetailRow key={key} label={key} value={value as number} />
                         )) : <p className="text-sm text-slate-500">収入の記録がありません。</p>}
                     </div>
                 </div>
                 <div>
                     <h4 className="font-semibold text-lg text-red-700 mb-2 border-b pb-1">支出の内訳</h4>
                     <div className="space-y-1">
                         {Object.entries(selectedYearData.expenseDetails).length > 0 ? Object.entries(selectedYearData.expenseDetails).map(([key, value]) => (
                             <DetailRow key={key} label={key} value={value as number} />
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
