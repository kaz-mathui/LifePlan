import React, { useState, useMemo } from 'react';
import { BackendSimulationResult, SimulationResult as ResultItem } from '../types';
import { FaChartBar, FaTable, FaChevronLeft, FaChevronRight, FaInfoCircle, FaChartLine, FaExclamationTriangle, FaCheckCircle, FaCalendarAlt, FaChevronDown } from 'react-icons/fa';
import Modal from './Modal';
import AssetChart from './AssetChart';
import Icon from './Icon';

interface SimulationResultProps {
  result: BackendSimulationResult;
  loading: boolean;
  retirementAge: number;
}

interface SummaryItem {
  age: number;
  event: string;
  description: string;
  type: 'retirement' | 'peak' | 'warning' | 'final' | 'event';
}

const DetailRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-sm font-semibold text-slate-800">{Math.ceil(value).toLocaleString()} 円</span>
  </div>
);

const CashFlowTable: React.FC<{ 
  assetData: ResultItem[]; 
  onRowClick: (data: ResultItem) => void;
}> = ({ assetData, onRowClick }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(assetData.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = assetData.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">年齢</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">収入</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">支出</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">収支</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">資産</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {currentData.map((row, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-sky-50 cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800">{row.age}歳</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 text-right">{Math.round(row.income / 10000).toLocaleString()}万円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-700 text-right">{Math.round(row.expense / 10000).toLocaleString()}万円</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium text-right ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.balance >= 0 ? '+' : ''}{Math.round(row.balance / 10000).toLocaleString()}万円
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-slate-900 text-right">{Math.round(row.savings / 10000).toLocaleString()}万円</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="flex items-center px-3 py-1 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <Icon as={FaChevronLeft} className="mr-1" />
            前へ
          </button>
          <span className="text-sm text-slate-600">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="flex items-center px-3 py-1 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            次へ
            <Icon as={FaChevronRight} className="ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

// アコーディオンコンポーネント
const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-md">
      <button
        className="w-full flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="font-semibold text-slate-700">{title}</h4>
        <Icon as={FaChevronDown} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-3 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const SimulationResult: React.FC<SimulationResultProps> = ({ result, loading, retirementAge }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');
  const [selectedYearData, setSelectedYearData] = useState<ResultItem | null>(null);

  const { assetData, calculationSummary } = result || {};

  const lifeSummary = useMemo((): SummaryItem[] => {
    const summary: SummaryItem[] = [];
    
    if (!assetData || assetData.length === 0) return summary;

    const retirementData = assetData.find(data => data.age === retirementAge);
    if (retirementData) {
      summary.push({ age: retirementAge, event: '退職', description: `退職時の資産: ${Math.round(retirementData.savings / 10000).toLocaleString()}万円`, type: 'retirement' });
    }

    const maxAssetData = assetData.reduce((max, current) => current.savings > max.savings ? current : max);
    if (maxAssetData && maxAssetData.age !== retirementAge) {
      summary.push({ age: maxAssetData.age, event: '資産ピーク', description: `最大資産: ${Math.round(maxAssetData.savings / 10000).toLocaleString()}万円`, type: 'peak' });
    }

    const negativeAssetData = assetData.find(data => data.savings < 0);
    if (negativeAssetData) {
      summary.push({ age: negativeAssetData.age, event: '資産不足', description: `資産がマイナスになりました。プランの見直しが必要です。`, type: 'warning' });
    }

    const finalData = assetData[assetData.length - 1];
    if (finalData) {
      summary.push({ age: finalData.age, event: '最終資産', description: `最終資産: ${Math.round(finalData.savings / 10000).toLocaleString()}万円`, type: 'final' });
    }

    const lifeSummaryFromBackend = (calculationSummary || '')
      .split('\n')
      .filter((line: string) => line.trim() !== '')
      .map((line: string): SummaryItem | null => {
          const match = line.match(/(\d+)歳: (.*)/);
          if (match) {
              return { age: parseInt(match[1], 10), event: match[2], description: match[2], type: 'event' };
          }
          return null;
      })
      .filter((item): item is SummaryItem => item !== null);

    return [...summary, ...lifeSummaryFromBackend].sort((a, b) => a.age - b.age);
  }, [assetData, calculationSummary, retirementAge]);

  const groupedSummary = useMemo(() => {
    return lifeSummary.reduce((acc, item) => {
      const decade = Math.floor(item.age / 10) * 10;
      if (!acc[decade]) {
        acc[decade] = [];
      }
      acc[decade].push(item);
      return acc;
    }, {} as Record<number, SummaryItem[]>);
  }, [lifeSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  const getEventIcon = (type: SummaryItem['type']) => {
    switch (type) {
      case 'retirement': return <Icon as={FaInfoCircle} className="text-blue-500" />;
      case 'peak': return <Icon as={FaChartLine} className="text-green-500" />;
      case 'warning': return <Icon as={FaExclamationTriangle} className="text-red-500" />;
      case 'final': return <Icon as={FaCheckCircle} className="text-purple-500" />;
      case 'event': return <Icon as={FaCalendarAlt} className="text-gray-500" />;
      default: return <Icon as={FaInfoCircle} className="text-gray-500" />;
    }
  };

  const tabs = [
    { id: 'chart' as const, label: 'グラフ', icon: FaChartBar },
    { id: 'table' as const, label: 'テーブル', icon: FaTable },
  ];

  return (
    <div className="space-y-6">
      {/* 資産推移グラフ・テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-4">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
            {tabs.map((tab) => (
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
      
      {/* シミュレーション概要 */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
          <Icon as={FaInfoCircle} className="mr-2" />
          ライフイベント・サマリー
        </h3>
        {Object.entries(groupedSummary).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(groupedSummary).map(([decade, items]) => (
              <Accordion key={decade} title={`${decade}代のライフイベント`}>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-white rounded-md">
                       <div className="flex-shrink-0 mt-1">{getEventIcon(item.type)}</div>
                       <div className="flex-1">
                         <p className="font-semibold text-slate-800">{item.age}歳</p>
                         <p className="text-sm text-slate-600">{item.event}</p>
                       </div>
                     </div>
                  ))}
                </div>
              </Accordion>
            ))}
          </div>
        ) : (
          <p className="text-slate-600">シミュレーション概要を生成中...</p>
        )}
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

export default SimulationResult;
