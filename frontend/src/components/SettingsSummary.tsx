import React from 'react';
import { SimulationInputData } from '../types';
import { EDUCATION_COST } from '../constants';
import Icon from './Icon';
import { FaInfoCircle } from 'react-icons/fa';

interface SettingsSummaryProps {
  inputData: SimulationInputData;
}

const SummaryItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-sm text-gray-700 p-2 bg-blue-50 rounded-md">
    {children}
  </li>
);

const SettingsSummary: React.FC<SettingsSummaryProps> = ({ inputData }) => {
  const summaries: React.ReactNode[] = [];

  // Housing Summary
  if (inputData.housing.hasLoan) {
    const { startAge, loanTerm, loanAmount, interestRate } = inputData.housing;
    summaries.push(
      <SummaryItem key="housing">
        <strong>住宅:</strong> {startAge}歳から{loanTerm}年間、約{loanAmount}万円のローン（金利{interestRate}%）を返済します。
      </SummaryItem>
    );
  }

  // Education Summary
  if (inputData.education.hasChildren && inputData.education.children.length > 0) {
    inputData.education.children.forEach((child, index) => {
      if (!child.birthYear) return;
      const birthAge = Number(child.birthYear);
      
      summaries.push(
        <SummaryItem key={`child-${index}-living`}>
            <strong>子供{index + 1}:</strong> {birthAge + 22}歳まで、年間{inputData.education.childLivingCost}万円の生活費がかかります。
        </SummaryItem>
      );

      if (child.plan === 'custom' && child.customAmount) {
         summaries.push(
            <SummaryItem key={`child-${index}-custom`}>
                <strong>子供{index + 1}:</strong> 年間{child.customAmount}万円のカスタム教育費が設定されています。
            </SummaryItem>
         );
      } else if (child.plan !== 'custom') {
        const universityCost = EDUCATION_COST.university[child.plan as keyof typeof EDUCATION_COST.university];
        summaries.push(
            <SummaryItem key={`child-${index}-edu`}>
              <strong>子供{index + 1}:</strong>
              公立の小・中・高を経て、{child.plan === 'public' ? '国公立大学' : child.plan === 'private_liberal' ? '私立文系大学' : '私立理系大学'}に進学した場合、大学の学費は年間約{universityCost}万円かかります。
            </SummaryItem>
        );
      }
    });
  }
  
  // Car Summary
  if (inputData.car.hasCar) {
    const { purchaseAge, maintenanceCost, replacementCycle } = inputData.car;
     summaries.push(
        <SummaryItem key="car">
            <strong>自動車:</strong> {purchaseAge}歳で購入し、{replacementCycle}年ごとに買い替えます。年間維持費として{maintenanceCost}万円がかかります。
        </SummaryItem>
     );
  }
  
  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg mt-6">
      <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
        <Icon as={FaInfoCircle} className="mr-2" />
        設定内容のサマリー
      </h3>
      <ul className="space-y-2">
        {summaries}
      </ul>
    </div>
  );
};

export default SettingsSummary; 
