import React from 'react';
import { BackendSimulationResult } from '../types';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import Icon from './Icon';

interface ResultHeaderProps {
  result: BackendSimulationResult | null;
}

const ResultHeader: React.FC<ResultHeaderProps> = ({ result }) => {
  if (!result) return null;

  const { advice, calculationSummary } = result;

  const getAdviceCard = () => {
    let icon;
    let colorClass;

    if (advice.includes('枯渇') || advice.includes('下回る')) {
      icon = <Icon as={FaExclamationTriangle} />;
      colorClass = 'bg-red-100 border-red-500 text-red-800';
    } else if (advice.includes('順調')) {
      icon = <Icon as={FaCheckCircle} />;
      colorClass = 'bg-green-100 border-green-500 text-green-800';
    } else {
      icon = <Icon as={FaInfoCircle} />;
      colorClass = 'bg-sky-100 border-sky-500 text-sky-800';
    }

    return (
      <div className={`p-4 rounded-lg border-l-4 ${colorClass} flex items-start`}>
        <div className="text-xl mr-4">{icon}</div>
        <div>
          <h3 className="font-bold">アドバイス</h3>
          <p className="text-sm mt-1">{advice}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {getAdviceCard()}

      {calculationSummary && (
         <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center">
              <Icon as={FaInfoCircle} className="mr-2" />
              主なライフイベント
            </h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              {calculationSummary.split('\\n').map((event: string, index: number) => (
                event && <li key={index}>{event}</li>
              ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default ResultHeader; 
