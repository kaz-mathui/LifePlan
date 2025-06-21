import Papa from 'papaparse';
import { SimulationInputData } from '../types';

const CSV_HEADERS = [
  'id', 'planName', 'currentAge', 'retirementAge', 'lifeExpectancy', 
  'currentSavings', 'annualIncome', 'monthlyExpenses', 'investmentRatio', 
  'annualReturn', 'pensionAmountPerYear', 'pensionStartDate', 'severancePay',
  'lifeEvents_json' // ライフイベントはJSON文字列として格納
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
        if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
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
    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          return reject(new Error('CSVの解析に失敗しました: ' + results.errors[0].message));
        }
        if (!results.data || results.data.length === 0) {
          return reject(new Error('CSVにデータが含まれていません。'));
        }

        const importedRow = results.data[0];
        
        try {
          // 数値フィールドをパース
          const numericFields: (keyof SimulationInputData)[] = [
            'currentAge', 'retirementAge', 'lifeExpectancy', 'currentSavings', 
            'annualIncome', 'monthlyExpenses', 'investmentRatio', 'annualReturn',
            'pensionAmountPerYear', 'pensionStartDate', 'severancePay'
          ];
          
          const parsedData: Partial<SimulationInputData> = {};

          // planNameは必須
          if (typeof importedRow.planName === 'string' && importedRow.planName.trim()) {
              parsedData.planName = importedRow.planName;
          } else {
              parsedData.planName = 'インポートされたプラン';
          }

          // 数値フィールドの処理
          numericFields.forEach(field => {
            if (importedRow[field] !== undefined && importedRow[field] !== '') {
              const num = Number(importedRow[field]);
              if (!isNaN(num)) {
                (parsedData as any)[field] = num;
              }
            } else {
              (parsedData as any)[field] = ''; // 空文字は許容
            }
          });

          // lifeEventsをJSONからパース
          if (importedRow.lifeEvents_json) {
            const lifeEvents = JSON.parse(importedRow.lifeEvents_json);
            if (Array.isArray(lifeEvents)) {
              // ここでlifeEventsの各要素の型チェックを厳密に行うことも可能
              parsedData.lifeEvents = lifeEvents;
            }
          } else {
            parsedData.lifeEvents = [];
          }

          // idはインポートしない（新規プランとして扱うため）
          parsedData.id = undefined;

          resolve(parsedData);
        } catch (error: any) {
          reject(new Error('インポートデータのフォーマットが不正です: ' + error.message));
        }
      },
      error: (error: Error) => {
        reject(new Error('ファイルの読み込みに失敗しました: ' + error.message));
      }
    });
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
