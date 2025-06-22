import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import Icon from './Icon';

export type FormSectionKey = 'basic' | 'income' | 'savings' | 'housing' | 'children' | 'car' | 'senior';

interface FormSectionProps {
  title: string;
  sectionKey: FormSectionKey;
  children: React.ReactNode;
  openSection: FormSectionKey | null;
  setOpenSection: (section: FormSectionKey | null) => void;
}

const FormSection: React.FC<FormSectionProps> = ({ 
  title, 
  sectionKey, 
  children, 
  openSection, 
  setOpenSection 
}) => {
  const isOpen = openSection === sectionKey;

  const toggleSection = () => {
    setOpenSection(isOpen ? null : sectionKey);
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white shadow-lg overflow-hidden mb-4">
      <button
        onClick={toggleSection}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between"
      >
        <span className="font-semibold text-gray-800">{title}</span>
        {isOpen ? (
          <Icon as={FaChevronDown} className="text-gray-600 w-4 h-4" />
        ) : (
          <Icon as={FaChevronRight} className="text-gray-600 w-4 h-4" />
        )}
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
 