import React, { useState } from 'react';
import { SimulationResult } from '../types';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { FaMoneyBillWave, FaChartLine } from 'react-icons/fa';
import Icon from './Icon';

interface CashFlowTableProps {
  assetData: SimulationResult[];
}

const formatCurrency = (value: number) => {
    return (value / 10000).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const CashFlowTableRow: React.FC<{ rowData: SimulationResult }> = ({ rowData }) => {
    const [isOpen, setIsOpen] = useState(false);

    const renderDetails = (details: Record<string, number>) => (
        <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            {Object.entries(details).map(([key, value]) => (
                <li key={key} className="flex justify-between">
                    <span>{key}:</span>
                    <span className="font-mono">{formatCurrency(value)}万円</span>
                </li>
            ))}
        </ul>
    );

    return (
        <>
            <tr onClick={() => setIsOpen(!isOpen)} className="cursor-pointer hover:bg-slate-50 border-b border-slate-200">
                <td className="p-3 text-sm text-slate-600">{rowData.year}</td>
                <td className="p-3 text-sm font-semibold text-slate-800">{rowData.age}歳</td>
                <td className="p-3 text-sm text-green-600 font-mono text-right">{formatCurrency(rowData.income)}</td>
                <td className="p-3 text-sm text-red-600 font-mono text-right">{formatCurrency(rowData.expense)}</td>
                <td className={`p-3 text-sm font-mono text-right font-semibold ${rowData.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(rowData.balance)}
                </td>
                <td className="p-3 text-sm text-slate-800 font-bold font-mono text-right">{formatCurrency(rowData.savings)}</td>
                <td className="p-3 text-center">
                    <Icon as={isOpen ? FiChevronUp : FiChevronDown} className="text-slate-500" />
                </td>
            </tr>
            {isOpen && (
                <tr className="bg-slate-50">
                    <td colSpan={7} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-md text-green-700 mb-2">収入内訳</h4>
                                {renderDetails(rowData.incomeDetails)}
                            </div>
                            <div>
                                <h4 className="font-semibold text-md text-red-700 mb-2">支出内訳</h4>
                                {renderDetails(rowData.expenseDetails)}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

const CashFlowTable: React.FC<CashFlowTableProps> = ({ assetData }) => {
    if (!assetData || assetData.length === 0) return null;

    return (
        <div className="p-6 rounded-lg shadow-md bg-white mt-6">
             <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <Icon as={FaMoneyBillWave} className="mr-2 text-sky-600" />
                キャッシュフロー詳細
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-slate-100 text-slate-600 text-left">
                        <tr>
                            <th className="p-3 font-semibold text-sm">年</th>
                            <th className="p-3 font-semibold text-sm">年齢</th>
                            <th className="p-3 font-semibold text-sm text-right">収入合計(万)</th>
                            <th className="p-3 font-semibold text-sm text-right">支出合計(万)</th>
                            <th className="p-3 font-semibold text-sm text-right">年間収支(万)</th>
                            <th className="p-3 font-semibold text-sm text-right">資産残高(万)</th>
                            <th className="p-3 font-semibold text-sm text-center">詳細</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assetData.map(row => <CashFlowTableRow key={row.year} rowData={row} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CashFlowTable; 
