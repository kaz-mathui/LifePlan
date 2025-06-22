import Papa from 'papaparse';
import { SimulationInputData } from '../types';

const CSV_HEADERS = [
  'planName', 'currentAge', 'retirementAge', 'lifeExpectancy', 
  'annualIncome', 'salaryIncreaseRate', 'currentSavings',
  'investmentRatio', 'investmentYield', 'severancePay'
];

// ネストされたオブジェクトをフラットなキーに変換
const flattenObject = (obj: any, parentKey = ''): Record<string, any> => {
  return Object.keys(obj).reduce((acc, key) => {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], newKey));
    } else if (key === 'lifeEvents' || key === 'children') {
        acc[newKey] = JSON.stringify(obj[key]); // 配列はJSON文字列として保存
    } else {
      acc[newKey] = obj[key];
    }
    return acc;
  }, {} as Record<string, any>);
};

// フラットなキーからネストされたオブジェクトを再構築
const unflattenObject = (flatData: Record<string, any>): SimulationInputData => {
  const result: any = {};
  for (const key in flatData) {
    const keys = key.split('.');
    keys.reduce((acc, part, index) => {
      if (index === keys.length - 1) {
        let value = flatData[key];
        // 型変換
        if (typeof value === 'string' && value.trim() !== '') {
          if (!isNaN(Number(value))) {
            value = Number(value);
          } else if (value === 'true') {
            value = true;
          } else if (value === 'false') {
            value = false;
          } else if (key.endsWith('lifeEvents') || key.endsWith('children')) {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error(`Error parsing JSON for ${key}:`, e);
              value = [];
            }
          }
        } else if (value === '' || value === null || value === undefined) {
          // 空の値は数値フィールドの場合は0に、その他はデフォルト値に
          if (key.includes('Age') || key.includes('Income') || key.includes('Savings') || 
              key.includes('Ratio') || key.includes('Return') || key.includes('Pay') || 
              key.includes('Expenses') || key.includes('Cost') || key.includes('Price') || 
              key.includes('Amount') || key.includes('Rate') || key.includes('Term') || 
              key.includes('Cycle')) {
            value = 0;
          }
        }
        acc[part] = value;
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, result);
  }
  return result as SimulationInputData;
};

/**
 * 現在のプランデータをCSV形式でエクスポート（ダウンロード）する
 * @param planData - エクスポートするプランデータ
 */
export const exportPlanToCsv = (planData: SimulationInputData) => {
  const dataForCsv = {
    ...planData,
    lifeEvents_json: JSON.stringify(planData.lifeEvents || []), // lifeEventsをJSON文字列に
  };

  // lifeEventsプロパティは不要なので削除
  const sanitizedData: {[key: string]: any} = {...dataForCsv};
  delete sanitizedData.lifeEvents;

  const csv = Papa.unparse({
    fields: CSV_HEADERS,
    data: [sanitizedData],
  });

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${planData.planName || 'life-plan'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * CSVファイルからプランデータをインポートする
 * @param file - ユーザーが選択したCSVファイル
 * @returns - パースおよび型変換されたプランデータ
 */
export const importPlanFromCsv = (file: File): Promise<Partial<SimulationInputData>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\\n').map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length < 2) {
          return reject(new Error('CSVファイルにデータがありません。'));
        }
        const header = rows[0].split(',').map(h => h.trim());
        const values = rows[1].split(',').map(v => v.trim());
        
        const numericFields: (keyof SimulationInputData)[] = [
          'currentAge', 'retirementAge', 'lifeExpectancy', 'currentSavings', 
          'annualIncome', 'salaryIncreaseRate', 'investmentRatio', 'annualReturn',
          'severancePay'
        ];
        
        const parsedData: Partial<SimulationInputData> = {};
        
        header.forEach((h, i) => {
          const key = h as keyof SimulationInputData;
          const value = values[i];

          if (numericFields.includes(key)) {
            (parsedData as any)[key] = value ? Number(value) : 0;
          } else {
            (parsedData as any)[key] = value;
          }
        });

        resolve(parsedData);
      } catch (error: any) {
        reject(new Error(`CSVパースエラー: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました: ' + reader.error));
    };
  });
};

export const exportToCsv = (data: SimulationInputData): string => {
  const flatData = flattenObject(data);
  return Papa.unparse([flatData]);
};

export const importFromCsv = (csvString: string): Promise<SimulationInputData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const flatData = results.data[0] as Record<string, any>;
          const unflattenedData = unflattenObject(flatData);
          resolve(unflattenedData);
        } else {
          reject(new Error('CSVファイルが空か、または無効な形式です。'));
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
}; 
