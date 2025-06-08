import React from 'react';
import { BackendSimulationResult } from '../types';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import Icon from './Icon';

interface ResultHeaderProps {
  result: BackendSimulationResult;
}

const ResultHeader: React.FC<ResultHeaderProps> = ({ result }) => {
  const { advice, calculationSummary, finalSavings } = result;

  const getAdviceCard = () => {
    let icon;
    let title;
    let bgColor;

    if (finalSavings <= 0) {
      icon = <Icon as={FaExclamationTriangle} className="text-red-500 text-4xl" />;
      title = "改善が必要です";
      bgColor = "bg-red-50";
    } else {
      icon = <Icon as={FaCheckCircle} className="text-green-500 text-4xl" />;
      title = "良好な計画です";
      bgColor = "bg-green-50";
    }

    return (
      <div className={`p-6 rounded-lg shadow-md ${bgColor} flex items-center space-x-4`}>
        {icon}
        <div>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <p className="text-slate-600 mt-1">{advice}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {getAdviceCard()}
      <div className="p-6 rounded-lg shadow-md bg-sky-50">
        <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center">
            <Icon as={FaInfoCircle} className="mr-2 text-sky-600" />
            シミュレーションの要点
        </h3>
        <ul className="list-disc list-inside space-y-2 text-slate-700">
          {calculationSummary && calculationSummary.split('\n').map((line, index) => (
            line.length > 1 && <li key={index}>{line.replace('-', '').trim()}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResultHeader; 
