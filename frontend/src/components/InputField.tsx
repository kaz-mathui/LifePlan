import React from 'react';
import { FormSectionKey } from './FormSection';

export const InputField: React.FC<{
  label: string;
  name: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onBlur?: () => void;
  type?: string;
  unit?: string;
  min?: number;
}> = ({ label, name, value, onChange, onBlur, type = "number", unit, min=0 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="flex items-center">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={(e) => {
          if (type === 'number' && e.target.value === '') {
            onChange({ ...e, target: { ...e.target, value: '0' } });
          }
          onBlur?.();
        }}
        min={min}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
      />
      {unit && <span className="ml-2 text-slate-500">{unit}</span>}
    </div>
  </div>
);

export const NestedInputField: React.FC<{
    label: string;
    section: 'housing' | 'education' | 'car' | 'senior';
    field: string;
    value: number | string;
    onChange: (section: 'housing' | 'education' | 'car' | 'senior', field: string, value: any) => void;
    type?: string;
    unit?: string;
    min?: number;
  }> = ({ label, section, field, value, onChange, type = "number", unit, min = 0 }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type={type}
          name={field}
          value={value}
          onChange={(e) => onChange(section, field, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          onBlur={(e) => {
            if (type === 'number' && e.target.value === '') {
              onChange(section, field, 0);
            }
          }}
          min={min}
          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
        />
        {unit && <span className="ml-2 text-slate-500">{unit}</span>}
      </div>
    </div>
  );

  export const Toggle: React.FC<{
    label: string;
    section: 'housing' | 'education' | 'car' | 'senior';
    field: string;
    checked: boolean;
    onChange: (section: 'housing' | 'education' | 'car' | 'senior', field: string, value: boolean) => void;
  }> = ({ label, section, field, checked, onChange }) => (
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(section, field, e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-sky-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
      </label>
    </div>
  ); 
