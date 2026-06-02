/**
 * MoneyForward CSV インポート
 *
 * 対応CSV:
 *  - 「収入・支出詳細」(月次取引明細)
 *  - 「資産推移月次」(残高推移)
 *
 * 取り込み先のキー:
 *  - 預金 → ad_total
 *  - 投資 → ai_total
 *  - 月次支出 → ef_total_monthly
 */
import React, { useState } from 'react';
import Papa from 'papaparse';

interface MFImportProps {
  onApply: (updates: Record<string, any>) => void;
}

interface ParsedSummary {
  cashTotal?: number;     // 預金合計
  investTotal?: number;   // 投資合計
  monthlyExpenseAvg?: number; // 月次支出平均
  monthlyIncomeAvg?: number;
  rowCount: number;
  detectedType: 'assets' | 'transactions' | 'unknown';
}

const MFImport: React.FC<MFImportProps> = ({ onApply }) => {
  const [parsed, setParsed] = useState<ParsedSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    setParsed(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'shift-jis',
      complete: (results) => {
        const rows = results.data as any[];
        if (!rows.length) { setError('CSVが空でした'); return; }

        // MF「収入・支出詳細」: 「日付」「内容」「金額(円)」「保有金融機関」「大項目」「中項目」 etc
        // MF「資産推移月次」: 「日付」「現金」「預金」「投資信託」「株式」「保険」 etc
        const firstKeys = Object.keys(rows[0] || {});
        const isAssetCsv = firstKeys.some(k => k.includes('現金') || k.includes('預金') || k.includes('投資信託'));
        const isTransCsv = firstKeys.some(k => k.includes('金額') || k.includes('内容')) && firstKeys.some(k => k.includes('日付'));

        const summary: ParsedSummary = { rowCount: rows.length, detectedType: 'unknown' };

        if (isAssetCsv) {
          summary.detectedType = 'assets';
          // 最新月の値を取得
          const sorted = [...rows].sort((a, b) => {
            const da = (a['日付'] || a['年月'] || '').toString();
            const db = (b['日付'] || b['年月'] || '').toString();
            return db.localeCompare(da);
          });
          const latest = sorted[0] || {};
          const num = (s: any) => {
            if (s == null) return 0;
            const n = parseFloat(String(s).replace(/[^\d.-]/g, ''));
            return isNaN(n) ? 0 : n;
          };
          // 円 → 万円
          const cash = (num(latest['現金']) + num(latest['預金']) + num(latest['普通預金']) + num(latest['定期預金'])) / 10000;
          const invest = (num(latest['投資信託']) + num(latest['株式']) + num(latest['債券']) + num(latest['投資'])) / 10000;
          if (cash > 0) summary.cashTotal = Math.round(cash);
          if (invest > 0) summary.investTotal = Math.round(invest);
        } else if (isTransCsv) {
          summary.detectedType = 'transactions';
          // 月別合計→平均
          const monthMap = new Map<string, { income: number; expense: number }>();
          rows.forEach(r => {
            const date = (r['日付'] || '').toString();
            const monthKey = date.substring(0, 7); // YYYY-MM
            const amountStr = (r['金額(円)'] || r['金額'] || '0').toString().replace(/[^\d.-]/g, '');
            const amount = parseFloat(amountStr) || 0;
            const cat = (r['大項目'] || '').toString();
            // 振替・収入カテゴリは「収入」、それ以外は「支出」
            if (!monthMap.has(monthKey)) monthMap.set(monthKey, { income: 0, expense: 0 });
            const m = monthMap.get(monthKey)!;
            if (amount > 0) m.income += amount;
            else m.expense += Math.abs(amount);
          });
          const months = [...monthMap.values()];
          if (months.length > 0) {
            const avgExp = months.reduce((s, m) => s + m.expense, 0) / months.length / 10000;
            const avgInc = months.reduce((s, m) => s + m.income, 0) / months.length / 10000;
            summary.monthlyExpenseAvg = Math.round(avgExp * 10) / 10;
            summary.monthlyIncomeAvg = Math.round(avgInc * 10) / 10;
          }
        }

        if (summary.detectedType === 'unknown') {
          setError('MoneyForwardのCSV形式と認識できませんでした。「収入・支出詳細」or「資産推移月次」を選んでください。');
          return;
        }
        setParsed(summary);
      },
      error: (err) => {
        setError('CSV読み込みエラー: ' + err.message);
      },
    });
  };

  const applyToAnswers = () => {
    if (!parsed) return;
    const updates: Record<string, any> = {};
    if (parsed.cashTotal) updates.ad_total = parsed.cashTotal;
    if (parsed.investTotal) updates.ai_total = parsed.investTotal;
    if (parsed.monthlyExpenseAvg) updates.ef_total_monthly = parsed.monthlyExpenseAvg;
    onApply(updates);
    setParsed(null);
    alert(`${Object.keys(updates).length}項目を反映しました`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-gray-900 mb-1">📥 MoneyForward から取り込み</div>
      <div className="text-xs text-gray-500 mb-3 leading-relaxed">
        MFの「資産推移月次」または「収入・支出詳細」CSVを読み込んで、預金・投資・月次支出を自動入力します。
      </div>

      <label className="block">
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="hidden"
        />
        <div className="w-full py-3 px-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl text-center text-sm font-bold text-blue-700 cursor-pointer hover:bg-blue-100">
          CSVファイルを選択
        </div>
      </label>

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>
      )}

      {parsed && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold text-gray-700">
            検出結果 ({parsed.detectedType === 'assets' ? '資産推移' : '取引明細'} / {parsed.rowCount}行)
          </div>
          {parsed.cashTotal != null && (
            <div className="flex justify-between text-xs py-2 border-b border-gray-100">
              <span className="text-gray-600">預金合計</span>
              <span className="font-bold">¥{parsed.cashTotal.toLocaleString()}万</span>
            </div>
          )}
          {parsed.investTotal != null && (
            <div className="flex justify-between text-xs py-2 border-b border-gray-100">
              <span className="text-gray-600">投資合計</span>
              <span className="font-bold">¥{parsed.investTotal.toLocaleString()}万</span>
            </div>
          )}
          {parsed.monthlyExpenseAvg != null && (
            <div className="flex justify-between text-xs py-2 border-b border-gray-100">
              <span className="text-gray-600">月次支出平均</span>
              <span className="font-bold">¥{parsed.monthlyExpenseAvg.toLocaleString()}万/月</span>
            </div>
          )}
          {parsed.monthlyIncomeAvg != null && (
            <div className="flex justify-between text-xs py-2 border-b border-gray-100">
              <span className="text-gray-600">月次収入平均(参考)</span>
              <span className="font-bold">¥{parsed.monthlyIncomeAvg.toLocaleString()}万/月</span>
            </div>
          )}
          <button onClick={applyToAnswers} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm mt-2">
            これらを入力に反映する
          </button>
        </div>
      )}
    </div>
  );
};

export default MFImport;
