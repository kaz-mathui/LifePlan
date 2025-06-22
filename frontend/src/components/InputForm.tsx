import React, { useState } from 'react';
import { SimulationInputData, Child } from '../types';
import FormSection, { FormSectionKey } from './FormSection';
import { InputField, NestedInputField, Toggle } from './InputField';
import { FaUser, FaBriefcase, FaPiggyBank, FaHome, FaCar, FaChild, FaUsers, FaPlus, FaTrash } from 'react-icons/fa';
import { EDUCATION_COST } from '../constants';
import Icon from './Icon';

interface InputFormProps {
  inputData: SimulationInputData;
  onInputChange: (name: string, value: any) => void;
}

const InputForm: React.FC<InputFormProps> = ({ inputData, onInputChange }) => {
  const [openSections, setOpenSections] = useState<Set<FormSectionKey>>(new Set(['basic']));

  // For top-level properties (e.g., currentAge)
  const handleDirectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | number = value;
    if (type === 'number') {
      finalValue = value === '' ? '' : (value.includes('.') ? parseFloat(value) : parseInt(value, 10));
    }
    onInputChange(name, finalValue);
  };

  // For nested properties (e.g., housing.propertyValue)
  const handleNestedChange = (section: keyof SimulationInputData, field: string, value: any) => {
    onInputChange(`${section}.${field}`, value);
  };

  const handleChildChange = (index: number, field: keyof Child, value: any) => {
    const updatedChildren = [...(inputData.education.children || [])];
    let finalValue = value;
    if (field === 'birthYear' || field === 'customAmount') {
      if (typeof value === 'string' && value !== '') {
        finalValue = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
      } else if (value === '') {
        finalValue = ''; // 空文字列を許可
      }
    } else {
      finalValue = value;
    }
    const child = { ...updatedChildren[index], [field]: finalValue };
    updatedChildren[index] = child;
    onInputChange('education.children', updatedChildren);
  };

  const handleChildBlur = (index: number, field: keyof Child) => {
    const updatedChildren = [...(inputData.education.children || [])];
    const child = updatedChildren[index];
    if ((field === 'birthYear' || field === 'customAmount') && 
        (child[field] === '' || child[field] === null || child[field] === undefined)) {
      const updatedChild = { ...child, [field]: 0 };
      updatedChildren[index] = updatedChild;
      onInputChange('education.children', updatedChildren);
    }
  };

  const addChild = () => {
    const newChild: Child = { 
      birthYear: inputData.currentAge || 30, // 親が子供を産んだ時の年齢
      plan: "public",
      customAmount: 0
    };
    const updatedChildren = [...(inputData.education.children || []), newChild];
    onInputChange('education.children', updatedChildren);
  };

  const removeChild = (index: number) => {
    const updatedChildren = [...(inputData.education.children || [])];
    updatedChildren.splice(index, 1);
    onInputChange('education.children', updatedChildren);
  };

  const toggleSection = (sectionKey: FormSectionKey) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(sectionKey)) {
      newOpenSections.delete(sectionKey);
    } else {
      newOpenSections.add(sectionKey);
    }
    setOpenSections(newOpenSections);
  };

  const isSectionOpen = (sectionKey: FormSectionKey) => openSections.has(sectionKey);

  return (
    <div className="space-y-4">
      {/* Basic Section */}
      <FormSection title="基本情報" sectionKey="basic" openSection={isSectionOpen('basic') ? 'basic' : null} setOpenSection={() => toggleSection('basic')}>
        <InputField label="現在の年齢" name="currentAge" value={inputData.currentAge} onChange={handleDirectChange} type="number" unit="歳" />
        <InputField label="退職年齢" name="retirementAge" value={inputData.retirementAge} onChange={handleDirectChange} type="number" unit="歳" />
        <InputField label="平均寿命" name="lifeExpectancy" value={inputData.lifeExpectancy} onChange={handleDirectChange} type="number" unit="歳" />
      </FormSection>

      {/* Income Section */}
      <FormSection title="収入" sectionKey="income" openSection={isSectionOpen('income') ? 'income' : null} setOpenSection={() => toggleSection('income')}>
        <InputField label="現在の年収" name="annualIncome" value={inputData.annualIncome} onChange={handleDirectChange} type="number" unit="万円" />
        <InputField label="年収の昇給率" name="salaryIncreaseRate" value={inputData.salaryIncreaseRate} onChange={handleDirectChange} type="number" unit="%" />
        <InputField label="退職金" name="severancePay" value={inputData.severancePay} onChange={handleDirectChange} type="number" unit="万円" />
        <InputField label="年金受給額（年）" name="pensionAmountPerYear" value={inputData.pensionAmountPerYear} onChange={handleDirectChange} type="number" unit="万円" />
        <InputField label="年金受給開始年齢" name="pensionStartDate" value={inputData.pensionStartDate} onChange={handleDirectChange} type="number" unit="歳" />
      </FormSection>

      {/* Assets/Investments Section */}
      <FormSection title="資産・運用" sectionKey="savings" openSection={isSectionOpen('savings') ? 'savings' : null} setOpenSection={() => toggleSection('savings')}>
        <InputField label="現在の貯蓄額" name="currentSavings" value={inputData.currentSavings} onChange={handleDirectChange} type="number" unit="万円" />
        <InputField label="投資比率" name="investmentRatio" value={inputData.investmentRatio} onChange={handleDirectChange} type="number" unit="%" />
        <InputField label="年間リターン（利回り）" name="annualReturn" value={inputData.annualReturn} onChange={handleDirectChange} type="number" unit="%" />
      </FormSection>

      {/* Expenses Section */}
      <FormSection title="生活費" sectionKey="basic" openSection={isSectionOpen('basic') ? 'basic' : null} setOpenSection={() => toggleSection('basic')}>
        <InputField label="毎月の生活費" name="monthlyExpenses" value={inputData.monthlyExpenses} onChange={handleDirectChange} type="number" unit="万円" />
      </FormSection>

      {/* Housing Section */}
      <FormSection title="住宅" sectionKey="housing" openSection={isSectionOpen('housing') ? 'housing' : null} setOpenSection={() => toggleSection('housing')}>
        <Toggle label="住宅ローンあり" section="housing" field="hasLoan" checked={inputData.housing.hasLoan} onChange={handleNestedChange} />
        {inputData.housing.hasLoan && (
          <div className="pl-4 border-l-2 border-gray-300 mt-4">
            <NestedInputField label="物件価格" section="housing" field="propertyValue" value={inputData.housing.propertyValue} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="頭金" section="housing" field="downPayment" value={inputData.housing.downPayment} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="ローン金利" section="housing" field="interestRate" value={inputData.housing.interestRate} onChange={handleNestedChange} unit="%" />
            <NestedInputField label="ローン期間" section="housing" field="loanTerm" value={inputData.housing.loanTerm} onChange={handleNestedChange} unit="年" />
            <NestedInputField label="ローン開始年齢" section="housing" field="startAge" value={inputData.housing.startAge} onChange={handleNestedChange} unit="歳" />
            <NestedInputField label="固定資産税率" section="housing" field="propertyTaxRate" value={inputData.housing.propertyTaxRate} onChange={handleNestedChange} unit="%" />
          </div>
        )}
      </FormSection>

      {/* Education Section */}
      <FormSection title="教育" sectionKey="children" openSection={isSectionOpen('children') ? 'children' : null} setOpenSection={() => toggleSection('children')}>
        <Toggle label="子供あり" section="education" field="hasChildren" checked={inputData.education.hasChildren} onChange={handleNestedChange} />
        {inputData.education.hasChildren && (
          <div className="pl-4 border-l-2 border-gray-300 mt-4">
            <NestedInputField label="子供の生活費（1人あたり年額）" section="education" field="childLivingCost" value={inputData.education.childLivingCost} onChange={handleNestedChange} unit="万円" />
            {inputData.education.children.map((child, index) => (
              <div key={index} className="p-3 my-2 border border-gray-300 rounded-md">
                <h4 className="font-semibold mb-2 text-gray-700">子供 {index + 1}</h4>
                <InputField 
                  label="親の年齢（子供誕生時）" 
                  name={`birthYear-${index}`} 
                  value={child.birthYear} 
                  onChange={(e) => handleChildChange(index, 'birthYear', e.target.value)} 
                  onBlur={() => handleChildBlur(index, 'birthYear')}
                  type="number" 
                  unit="歳"
                />
                <select
                  value={child.plan}
                  onChange={(e) => handleChildChange(index, 'plan', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="public">国公立</option>
                  <option value="private_liberal">私立文系</option>
                  <option value="private_science">私立理系</option>
                  <option value="custom">カスタム</option>
                </select>
                {child.plan === 'custom' && (
                  <InputField 
                    label="年間教育費（カスタム）" 
                    name={`customAmount-${index}`} 
                    value={child.customAmount || ''} 
                    onChange={(e) => handleChildChange(index, 'customAmount', e.target.value)} 
                    type="number" 
                    unit="万円" 
                  />
                )}
                <button onClick={() => removeChild(index)} className="text-red-500 hover:text-red-700 mt-2"><Icon as={FaTrash} /></button>
              </div>
            ))}
            <button onClick={addChild} className="flex items-center gap-2 text-green-500 hover:text-green-700 mt-2"><Icon as={FaPlus} className="mr-1" /> 新しい子供を追加</button>
          </div>
        )}
      </FormSection>

      {/* Car Section */}
      <FormSection title="自動車" sectionKey="car" openSection={isSectionOpen('car') ? 'car' : null} setOpenSection={() => toggleSection('car')}>
        <Toggle label="自動車あり" section="car" field="hasCar" checked={inputData.car.hasCar} onChange={handleNestedChange} />
        {inputData.car.hasCar && (
          <div className="pl-4 border-l-2 border-gray-300 mt-4">
            <NestedInputField label="車両価格" section="car" field="price" value={inputData.car.price} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="頭金" section="car" field="downPayment" value={inputData.car.downPayment} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="ローン金利" section="car" field="interestRate" value={inputData.car.interestRate} onChange={handleNestedChange} unit="%" />
            <NestedInputField label="ローン期間" section="car" field="loanTerm" value={inputData.car.loanTerm} onChange={handleNestedChange} unit="年" />
            <NestedInputField label="年間維持費" section="car" field="maintenanceCost" value={inputData.car.maintenanceCost} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="購入年齢" section="car" field="purchaseAge" value={inputData.car.purchaseAge} onChange={handleNestedChange} unit="歳" />
            <NestedInputField label="買い替え周期" section="car" field="replacementCycle" value={inputData.car.replacementCycle} onChange={handleNestedChange} unit="年" />
          </div>
        )}
      </FormSection>

      {/* Senior Section */}
      <FormSection title="老後" sectionKey="senior" openSection={isSectionOpen('senior') ? 'senior' : null} setOpenSection={() => toggleSection('senior')}>
        <Toggle label="老後の追加費用を考慮" section="senior" field="enabled" checked={inputData.senior.enabled} onChange={handleNestedChange} />
        {inputData.senior.enabled && (
          <div className="pl-4 border-l-2 border-gray-300 mt-4">
            <NestedInputField label="追加費用開始年齢" section="senior" field="startAge" value={inputData.senior.startAge} onChange={handleNestedChange} unit="歳" />
            <NestedInputField label="老後の月間生活費" section="senior" field="monthlyExpense" value={inputData.senior.monthlyExpense} onChange={handleNestedChange} unit="万円" />
            <NestedInputField label="年間介護費用" section="senior" field="careCost" value={inputData.senior.careCost} onChange={handleNestedChange} unit="万円" />
          </div>
        )}
      </FormSection>
    </div>
  );
};

export default InputForm; 
 