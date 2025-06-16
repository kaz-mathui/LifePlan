import React, { ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { SimulationInputData } from '../types';
import FormSection from './FormSection';
import { FaSave, FaFileImport, FaFileExport, FaTrash, FaPlus, FaAngleDown } from 'react-icons/fa';
import Icon from './Icon';
import { NestedSectionKey } from '../App';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';

interface InputFormProps {
  input: SimulationInputData;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onNestedChange: (section: NestedSectionKey, field: string, value: any) => void;
  onChildrenChange: (index: number, field: string, value: any) => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onSubmit: () => void;
  onSave: () => void;
  loading: boolean;
  onExport: () => void;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
}

export { FormSection };

interface InputFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  label: string;
  unit?: string;
  description?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, unit, description, ...props }) => (
    <div className="w-full">
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-700">
            {label}
        </label>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        <div className="mt-1 flex rounded-lg shadow-sm">
            <input
                {...props}
                className={`block w-full flex-1 min-w-0 border border-slate-300 px-3 py-2 focus:border-sky-500 focus:ring-sky-500 sm:text-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 ${
                    unit ? 'rounded-none rounded-l-lg' : 'rounded-lg'
                }`}
            />
            {unit && (
                <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-slate-500 sm:text-sm">
                    {unit}
                </span>
            )}
        </div>
    </div>
);

const InputForm: React.FC<InputFormProps> = ({ input, onInputChange, onNestedChange, onChildrenChange, onAddChild, onRemoveChild, onSubmit, onSave, loading, onExport, onImport }) => {
  const debouncedSubmit = useMemo(() => debounce(onSubmit, 500), [onSubmit]);

  useEffect(() => {
    debouncedSubmit();
  }, [input, debouncedSubmit]);

  const handleNestedInputChange = (section: NestedSectionKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onNestedChange(section, name, processedValue);
  };
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
    toast.success("シミュレーションを再計算しました！");
  };

  const handleSaveClick = async () => {
    onSave();
  };
  
  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => {
      importInputRef.current?.click();
  }

  return (
    // `onSubmit`は手動での再計算用に残しておく
    <form onSubmit={handleFormSubmit} className="space-y-6 pb-24"> 
      <FormSection title="基本情報" initialOpen={true}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-4">
          <InputField label="現在年齢" name="currentAge" type="number" value={input.currentAge} onChange={onInputChange} unit="歳" />
          <InputField label="リタイア年齢" name="retirementAge" type="number" value={input.retirementAge} onChange={onInputChange} unit="歳" />
          <InputField label="想定寿命" name="lifeExpectancy" type="number" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" />
        </div>
      </FormSection>

      <FormSection title="収入・資産" initialOpen={true}>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-4">
            <InputField label="手取り年収" name="annualIncome" type="number" value={input.annualIncome} onChange={onInputChange} unit="万円" />
            <InputField label="昇給率" name="salaryIncreaseRate" type="number" value={input.salaryIncreaseRate} onChange={onInputChange} unit="％" step="0.1" />
            <InputField label="現在資産" name="currentSavings" type="number" value={input.currentSavings} onChange={onInputChange} unit="万円" />
            <InputField label="退職金" name="severancePay" type="number" value={input.severancePay} onChange={onInputChange} unit="万円" />
        </div>
      </FormSection>

      <FormSection title="支出・年金" initialOpen={true}>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-4">
            <InputField label="毎月の生活費" name="monthlyExpenses" type="number" value={input.monthlyExpenses} onChange={onInputChange} unit="万円" />
            <InputField label="年金（年間）" name="pensionAmountPerYear" type="number" value={input.pensionAmountPerYear} onChange={onInputChange} unit="万円" />
            <InputField label="年金開始年齢" name="pensionStartDate" type="number" value={input.pensionStartDate} onChange={onInputChange} unit="歳" />
        </div>
      </FormSection>

      <FormSection title="投資設定">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-4">
            <InputField label="投資割合" name="investmentRatio" type="number" value={input.investmentRatio} onChange={onInputChange} unit="％" description="資産のうち投資に回す割合" />
            <InputField label="想定利回り（年率）" name="annualReturn" type="number" value={input.annualReturn} onChange={onInputChange} unit="％" step="0.1" description="投資の平均的なリターン" />
        </div>
      </FormSection>
      
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center">
          <Icon as={FaAngleDown} className="mr-2" />
          詳細設定（任意）
        </h3>
        <p className="text-sm text-slate-500 mb-4">住宅、教育、車などの大きな支出をより詳細にシミュレーションに反映できます。</p>
        
        <div className="space-y-4">
          <FormSection title="住宅ローン">
            <div className="space-y-4 p-4 bg-slate-50 rounded-b-lg">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="hasLoan"
                    name="hasLoan"
                    type="checkbox"
                    checked={input.housing.hasLoan}
                    onChange={(e) => onNestedChange('housing', 'hasLoan', e.target.checked)}
                    className="focus:ring-sky-500 h-4 w-4 text-sky-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hasLoan" className="font-medium text-gray-700">住宅ローンを計算に含める</label>
                </div>
              </div>

              {input.housing.hasLoan && (
                <div className="pt-4 mt-4 border-t border-gray-200 grid grid-cols-2 gap-x-4 gap-y-4">
                  <InputField label="物件価格" name="propertyValue" type="number" value={input.housing.propertyValue} onChange={handleNestedInputChange('housing')} unit="万円" />
                  <InputField label="頭金" name="downPayment" type="number" value={input.housing.downPayment} onChange={handleNestedInputChange('housing')} unit="万円" />
                  <InputField label="ローン借入額" name="loanAmount" type="number" value={input.housing.loanAmount} onChange={handleNestedInputChange('housing')} unit="万円" />
                  <InputField label="ローン開始年齢" name="startAge" type="number" value={input.housing.startAge} onChange={handleNestedInputChange('housing')} unit="歳" />
                  <InputField label="返済期間" name="loanTerm" type="number" value={input.housing.loanTerm} onChange={handleNestedInputChange('housing')} unit="年" />
                  <InputField label="金利（年率）" name="interestRate" type="number" value={input.housing.interestRate} onChange={handleNestedInputChange('housing')} unit="％" step="0.01" />
                  <InputField label="固定資産税率" name="propertyTaxRate" type="number" value={input.housing.propertyTaxRate} onChange={handleNestedInputChange('housing')} unit="％" step="0.01" />
                </div>
              )}
            </div>
          </FormSection>
          <FormSection title="教育費">
            <div className="space-y-4 p-4 bg-slate-50 rounded-b-lg">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="hasChildren"
                    name="hasChildren"
                    type="checkbox"
                    checked={input.education.hasChildren}
                    onChange={(e) => onNestedChange('education', 'hasChildren', e.target.checked)}
                    className="focus:ring-sky-500 h-4 w-4 text-sky-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hasChildren" className="font-medium text-gray-700">子供の教育費を計算に含める</label>
                </div>
              </div>

              {input.education.hasChildren && (
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-4">
                  {input.education.children.map((child, index) => (
                    <div key={index} className="p-4 border rounded-md relative bg-white shadow-sm">
                      <h4 className="font-semibold mb-3 text-slate-700">子供 {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InputField label="誕生年" type="number" value={child.birthYear} onChange={(e) => onChildrenChange(index, 'birthYear', Number(e.target.value))} />
                          <div>
                              <label className="block text-sm font-medium text-gray-700">進学プラン</label>
                              <select
                                value={child.plan}
                                onChange={(e) => onChildrenChange(index, 'plan', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
                              >
                                <option value="public">すべて国公立</option>
                                <option value="private_liberal">大学のみ私立文系</option>
                                <option value="private_science">大学のみ私立理系</option>
                              </select>
                          </div>
                      </div>
                      <button type="button" onClick={() => onRemoveChild(index)} className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                        <Icon as={FaTrash} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={onAddChild}
                    className="w-full flex items-center justify-center text-sm py-2 px-4 border border-dashed rounded-md text-sky-600 border-sky-500 hover:bg-sky-50"
                  >
                    <Icon as={FaPlus} className="mr-2" />
                    子供を追加する
                  </button>
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </div>
      
      {/* --- フローティングアクションバー --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-200 p-4 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm font-medium text-slate-700">
                {loading ? "再計算中..." : "自動計算 ON"}
            </div>
            <div className="flex items-center space-x-2">
                <button type="button" onClick={handleSaveClick} disabled={loading} className="flex items-center px-3 py-2 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50">
                    <Icon as={FaSave} className="mr-1.5" />
                    <span className="hidden sm:inline">保存</span>
                </button>
                <input type="file" accept=".json" onChange={onImport} className="hidden" ref={importInputRef} />
                <button type="button" onClick={handleImportClick} disabled={loading} className="flex items-center px-3 py-2 bg-white text-slate-700 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50">
                    <Icon as={FaFileImport} className="mr-1.5" />
                    <span className="hidden sm:inline">読込</span>
                </button>
                <button type="button" onClick={onExport} disabled={loading} className="flex items-center px-3 py-2 bg-white text-slate-700 border border-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50">
                    <Icon as={FaFileExport} className="mr-1.5" />
                    <span className="hidden sm:inline">書出</span>
                </button>
            </div>
        </div>
      </div>
    </form>
  );
};

export default InputForm; 
 