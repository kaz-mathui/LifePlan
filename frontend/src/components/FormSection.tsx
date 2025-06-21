import React, { useState, ReactNode } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Icon from './Icon';

interface FormSectionProps {
  title: string;
  icon?: ReactNode;
  initialOpen?: boolean;
  children: ReactNode;
  defaultOpen?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon, initialOpen = false, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6 border-b border-slate-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-4 text-left text-xl font-semibold text-slate-800 focus:outline-none"
      >
        <span className="flex items-center">
          {icon && <span className="mr-3 text-sky-600">{icon}</span>}
          {title}
        </span>
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
 