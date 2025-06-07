import Papa from 'papaparse';
import { SimulationInputData } from '../types';

const CSV_HEADERS = [
  'id', 'planName', 'currentAge', 'retirementAge', 'lifeExpectancy', 
  'currentSavings', 'annualIncome', 'monthlyExpenses', 'investmentRatio', 
  'annualReturn', 'pensionAmountPerYear', 'pensionStartDate', 'severancePay',
  'lifeEvents_json' // ライフイベントはJSON文字列として格納
];

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
