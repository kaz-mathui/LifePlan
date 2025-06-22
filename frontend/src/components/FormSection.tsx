import React, { ReactNode } from 'react';

export type FormSectionKey = 'basic' | 'income' | 'savings' | 'housing' | 'children' | 'car' | 'senior' | 'life-event';

interface FormSectionProps {
  title: string;
  sectionKey: FormSectionKey;
  openSection: FormSectionKey | null;
  setOpenSection: (key: FormSectionKey | null) => void;
  children: ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, sectionKey, openSection, setOpenSection, children }) => {
  const isOpen = openSection === sectionKey;

  const toggleOpen = () => {
    setOpenSection(isOpen ? null : sectionKey);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden mb-4">
      <button
        onClick={toggleOpen}
        className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <div className="flex items-center justify-between w-full">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

export default FormSection; 
 