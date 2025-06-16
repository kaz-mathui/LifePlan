import React, { ChangeEvent } from 'react';
import { SimulationInputData } from '../types';
import FormSection from './FormSection';
import { FaCalculator, FaSave, FaFileImport, FaFileExport } from 'react-icons/fa';
import Icon from './Icon';
import { NestedSectionKey } from '../App';
import { toast } from 'react-hot-toast';

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
}

const InputField: React.FC<InputFieldProps> = ({ label, unit, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-slate-700">
            {label}
        </label>
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
  const handleNestedInputChange = (section: NestedSectionKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    onNestedChange(section, name, processedValue);
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit();
    toast.success("シミュレーションを再計算しました！");
  };

  const handleSaveClick = async () => {
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-8">
      <InputField label="プラン名" name="planName" type="text" value={input.planName} onChange={onInputChange} />

      <FormSection title="基本情報" initialOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <InputField label="現在年齢" name="currentAge" type="number" value={input.currentAge} onChange={onInputChange} unit="歳" />
          <InputField label="リタイア年齢" name="retirementAge" type="number" value={input.retirementAge} onChange={onInputChange} unit="歳" />
          <InputField label="想定寿命" name="lifeExpectancy" type="number" value={input.lifeExpectancy} onChange={onInputChange} unit="歳" />
        </div>
      </FormSection>

      <FormSection title="収入・資産">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InputField label="手取り年収" name="annualIncome" type="number" value={input.annualIncome} onChange={onInputChange} unit="万円" />
            <InputField label="昇給率" name="salaryIncreaseRate" type="number" value={input.salaryIncreaseRate} onChange={onInputChange} unit="％" step="0.1" />
            <InputField label="現在資産" name="currentSavings" type="number" value={input.currentSavings} onChange={onInputChange} unit="万円" />
            <InputField label="退職金" name="severancePay" type="number" value={input.severancePay} onChange={onInputChange} unit="万円" />
        </div>
      </FormSection>

      <FormSection title="支出・年金">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InputField label="毎月の生活費" name="monthlyExpenses" type="number" value={input.monthlyExpenses} onChange={onInputChange} unit="万円" />
            <InputField label="年金（年間）" name="pensionAmountPerYear" type="number" value={input.pensionAmountPerYear} onChange={onInputChange} unit="万円" />
            <InputField label="年金開始年齢" name="pensionStartDate" type="number" value={input.pensionStartDate} onChange={onInputChange} unit="歳" />
        </div>
      </FormSection>

      <FormSection title="投資設定">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InputField label="投資割合" name="investmentRatio" type="number" value={input.investmentRatio} onChange={onInputChange} unit="％" />
            <InputField label="想定利回り（年率）" name="annualReturn" type="number" value={input.annualReturn} onChange={onInputChange} unit="％" step="0.1" />
        </div>
      </FormSection>
      
      {/* --- 詳細設定セクション --- */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-xl font-semibold text-sky-700 mb-4">詳細設定（住宅・教育など）</h3>
        <FormSection title="住宅ローン">
          <div className="space-y-4">
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
              <div className="pt-4 mt-4 border-t border-gray-200 grid grid-cols-1 gap-x-6 gap-y-4">
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
          <div className="space-y-4">
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
                  <div key={index} className="p-4 border rounded-md relative">
                    <h4 className="font-semibold mb-2">子供 {index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">誕生年</label>
                        <input
                          type="number"
                          value={child.birthYear}
                          onChange={(e) => onChildrenChange(index, 'birthYear', Number(e.target.value))}
                          className="mt-1 flex-1 block w-full rounded-md border-gray-300 focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                        />
                      </div>
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
                    <button type="button" onClick={() => onRemoveChild(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={onAddChild}
                  className="w-full text-sm py-2 px-4 border border-dashed rounded-md text-sky-600 border-sky-500 hover:bg-sky-50"
                >
                  + 子供を追加する
                </button>
              </div>
            )}
          </div>
        </FormSection>
        <FormSection title="自動車">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="hasCar"
                  name="hasCar"
                  type="checkbox"
                  checked={input.car.hasCar}
                  onChange={(e) => onNestedChange('car', 'hasCar', e.target.checked)}
                  className="focus:ring-sky-500 h-4 w-4 text-sky-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="hasCar" className="font-medium text-gray-700">自動車関連費用を計算に含める</label>
              </div>
            </div>

            {input.car.hasCar && (
              <div className="pt-4 mt-4 border-t border-gray-200 grid grid-cols-1 gap-x-6 gap-y-4">
                <InputField label="車両価格" name="price" type="number" value={input.car.price} onChange={handleNestedInputChange('car')} unit="万円" />
                <InputField label="購入時の頭金" name="downPayment" type="number" value={input.car.downPayment} onChange={handleNestedInputChange('car')} unit="万円" />
                <InputField label="ローン借入額" name="loanAmount" type="number" value={input.car.loanAmount} onChange={handleNestedInputChange('car')} unit="万円" />
                <InputField label="ローン返済期間" name="loanTerm" type="number" value={input.car.loanTerm} onChange={handleNestedInputChange('car')} unit="年" />
                <InputField label="ローン金利（年率）" name="interestRate" type="number" value={input.car.interestRate} onChange={handleNestedInputChange('car')} unit="％" step="0.1" />
                <InputField label="年間維持費" name="maintenanceCost" type="number" value={input.car.maintenanceCost} onChange={handleNestedInputChange('car')} unit="万円" />
                <InputField label="初回購入年齢" name="purchaseAge" type="number" value={input.car.purchaseAge} onChange={handleNestedInputChange('car')} unit="歳" />
                <InputField label="買い替えサイクル" name="replacementCycle" type="number" value={input.car.replacementCycle} onChange={handleNestedInputChange('car')} unit="年" />
              </div>
            )}
          </div>
        </FormSection>
        <FormSection title="老後の備え">
          <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            <InputField label="介護費用の開始年齢" name="nursingCareStartAge" type="number" value={input.senior.nursingCareStartAge} onChange={handleNestedInputChange('senior')} unit="歳" />
            <InputField label="年間介護費用" name="nursingCareAnnualCost" type="number" value={input.senior.nursingCareAnnualCost} onChange={handleNestedInputChange('senior')} unit="万円" />
            <InputField label="葬儀費用（一括）" name="funeralCost" type="number" value={input.senior.funeralCost} onChange={handleNestedInputChange('senior')} unit="万円" />
          </div>
        </FormSection>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200">
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center px-6 py-4 bg-sky-600 text-white text-xl font-bold rounded-lg shadow-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:transform-none">
          <Icon as={FaCalculator} className="mr-3" />
          {loading ? '計算中...' : 'この内容で未来を予測する'}
        </button>
      </div>
      <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
        <button type="button" onClick={handleSaveClick} disabled={loading} className="flex items-center px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 transition duration-150 disabled:opacity-50">
          <Icon as={FaSave} className="mr-2" />
          <span>保存</span>
        </button>
        <label className="flex items-center cursor-pointer px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150">
          <Icon as={FaFileImport} className="mr-2" />
          <span>読込</span>
          <input type="file" accept=".csv" onChange={onImport} className="hidden" />
        </label>
        <button type="button" onClick={onExport} disabled={loading} className="flex items-center px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50">
          <Icon as={FaFileExport} className="mr-2" />
          <span>書出</span>
        </button>
      </div>
    </form>
  );
};

export default InputForm; 
 