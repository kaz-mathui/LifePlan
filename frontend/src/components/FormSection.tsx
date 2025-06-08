import React, { useState, ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Icon from './Icon';

interface FormSectionProps {
  title: string;
  initialOpen?: boolean;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, initialOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="mb-6 border-b border-slate-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 text-left text-xl font-semibold text-slate-800 focus:outline-none"
      >
        <span>{title}</span>
        {isOpen ? <Icon as={FiChevronUp} className="w-6 h-6 text-sky-600" /> : <Icon as={FiChevronDown} className="w-6 h-6 text-slate-500" />}
      </button>
      {isOpen && (
        <div className="pt-2 pb-6 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

export default FormSection; 
 