export interface SimulationInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  annualIncome: number;
  monthlyExpenses: number;
  investmentRatio: number; // (0-100)
  annualReturn: number;    // (%)
  pensionAmountPerYear: number;
  pensionStartDate: number;
  severancePay: number;
  lifeEvents: LifeEvent[];
}

export interface SimulationResult {
  yearsToRetirement: number;
  projectedRetirementSavings: number;
  annualSavingsCurrentPace: number;
  targetRetirementFund?: number;
  message: string;
  suggestion?: string;
  assetData: AssetDataPoint[];
}

export interface LifeEvent {
  id: string;
  age: number;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: 'one-time' | 'annual';
  endAge?: number;
}

export interface AssetDataPoint {
  age: number;
  savings: number;
  income: number;
  expenses: number;
}

/**
 * ライフプランシミュレーション計算を行う
 * @param {SimulationInput} input - 入力データ
 * @returns {SimulationResult} シミュレーション結果
 */
export function calculateSimulation(input: SimulationInput): SimulationResult {
  const {
    currentAge, retirementAge, lifeExpectancy,
    currentSavings, annualIncome, monthlyExpenses,
    investmentRatio, annualReturn,
    pensionAmountPerYear, pensionStartDate, severancePay,
    lifeEvents
  } = input;

  // 入力値のバリデーション
  const errors: string[] = [];
  if (currentAge < 0) errors.push("現在の年齢が不正です。");
  if (retirementAge < 0) errors.push("退職年齢が不正です。");
  if (lifeExpectancy < 0) errors.push("寿命が不正です。");
  if (currentSavings < 0) errors.push("現在の貯蓄額が不正です。");
  if (annualIncome < 0) errors.push("年間収入が不正です。");
  if (monthlyExpenses < 0) errors.push("毎月の支出が不正です。");
  if (investmentRatio < 0 || investmentRatio > 100) errors.push("投資比率が不正です（0-100）。");
  if (annualReturn < -100) errors.push("年間リターンが不正です（-100以上）。"); // マイナスリターンも許容
  if (pensionAmountPerYear < 0) errors.push("年金年額が不正です。");
  if (pensionStartDate < 0) errors.push("年金受給開始年齢が不正です。");
  if (severancePay < 0) errors.push("退職金が不正です。");

  if (currentAge >= retirementAge) errors.push("退職年齢は現在の年齢より大きく設定してください。");
  if (retirementAge > lifeExpectancy) errors.push("退職年齢が寿命を超えています。");
  if (pensionStartDate > lifeExpectancy) errors.push("年金受給開始年齢が寿命を超えています。");
  // retirementAge <= pensionStartDate のバリデーションはフロントエンド側にあるので、ここでは一旦除外 (または必要に応じて追加)
  if (pensionStartDate <= retirementAge && pensionAmountPerYear > 0 && retirementAge !== pensionStartDate) {
    // 年金開始が退職より早いか同時だが、厳密には退職後の年金開始を想定しているため、状況による
    // console.warn("年金受給開始年齢が退職年齢以前に設定されています。");
  }

  // lifeEvents のバリデーション
  if (lifeEvents) {
    lifeEvents.forEach((event, index) => {
      if (!event || typeof event.age !== 'number' || typeof event.amount !== 'number' || !event.type || !event.frequency) {
        errors.push(`ライフイベント ${index + 1} (${event?.description || '不明'}): データ形式が不正です。`);
        return; // このイベントの以降のチェックはスキップ
      }
      if (event.age < currentAge || event.age > lifeExpectancy) {
        errors.push(`ライフイベント ${index + 1} (${event.description}): 発生年齢 ( ${event.age} ) が不正です。現在の年齢 (${currentAge}) から寿命 (${lifeExpectancy}) の範囲で設定してください。`);
      }
      if (event.amount < 0) {
        errors.push(`ライフイベント ${index + 1} (${event.description}): 金額が不正です。`);
      }
      if (event.frequency === 'annual' && event.endAge !== undefined && event.endAge !== null && event.endAge < event.age) {
        errors.push(`ライフイベント ${index + 1} (${event.description}): 終了年齢が発生年齢より前です。`);
      }
    });
  }

  if (errors.length > 0) {
    const errorMessage = errors.join("\n");
    // NODE_ENV が 'test' でない場合のみ console.error を実行
    if (process.env.NODE_ENV !== 'test') {
      console.error("Invalid input for simulation:", errorMessage, input);
    }
    // フロントエンドのBackendSimulationResultのmessageフィールドに合わせる
    // また、エラー時でもassetDataは空配列を返すようにする
    return {
        yearsToRetirement: 0,
        projectedRetirementSavings: 0,
        annualSavingsCurrentPace: 0,
        targetRetirementFund: 0,
        message: `入力エラー: ${errorMessage}`,
        suggestion: "入力値を確認してください。",
        assetData: [] 
    };
  }

  // console.log("Calculating simulation with input:", JSON.stringify(input, null, 2));

  const assetDataResult: AssetDataPoint[] = [];
  let currentYearSavings = currentSavings;
  let totalAccruedIncome = 0;
  let totalAccruedExpenses = 0;

  // 初年度 (currentAge) の初期状態をassetDataに追加
  // この時点では収入・支出はまだ発生していないので0とするか、初年度の活動を見込むか設計による。
  // ここでは初年度の活動後の年末資産を計算するため、ループ開始前に初期貯蓄のみを記録するのは避ける。
  // ループ内で currentAge の年末資産を計算する。

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    let yearlyIncome = 0;
    let yearlyExpenses = monthlyExpenses * 12;

    // ライフイベントによる収入・支出の変動
    if (lifeEvents && lifeEvents.length > 0) {
      lifeEvents.forEach(event => {
        const eventAmount = Number(event.amount); //念のため数値に変換
        if (event.frequency === 'one-time' && event.age === age) {
          if (event.type === 'income') {
            yearlyIncome += eventAmount;
            // console.log(`Age ${age}: Life event (one-time income) - ${event.description}, Amount: ${eventAmount}`);
          } else {
            yearlyExpenses += eventAmount;
            // console.log(`Age ${age}: Life event (one-time expense) - ${event.description}, Amount: ${eventAmount}`);
          }
        } else if (event.frequency === 'annual' && event.age <= age && (event.endAge === undefined || event.endAge === null || event.endAge >= age)) {
          if (event.type === 'income') {
            yearlyIncome += eventAmount;
            // console.log(`Age ${age}: Life event (annual income) - ${event.description}, Amount: ${eventAmount}`);
          } else {
            yearlyExpenses += eventAmount;
            // console.log(`Age ${age}: Life event (annual expense) - ${event.description}, Amount: ${eventAmount}`);
          }
        }
      });
    }

    // 通常の収入（現役時代）
    if (age < retirementAge) {
      yearlyIncome += annualIncome;
    }

    // 退職金（退職年のみ）
    if (age === retirementAge && severancePay > 0) {
      yearlyIncome += severancePay;
      // console.log(`Age ${age}: Severance pay added: ${severancePay}`);
    }

    // 年金収入（年金開始年齢以降）
    if (age >= pensionStartDate && pensionAmountPerYear > 0) {
      yearlyIncome += pensionAmountPerYear;
      // console.log(`Age ${age}: Pension added: ${pensionAmountPerYear}`);
    }

    totalAccruedIncome += yearlyIncome;
    totalAccruedExpenses += yearlyExpenses;

    const netIncomeForYear = yearlyIncome - yearlyExpenses;
    
    // 運用益の計算 (年初の資産に対して)
    let investmentGains = 0;
    if (currentYearSavings > 0) {
      investmentGains = currentYearSavings * (investmentRatio / 100) * (annualReturn / 100);
    }
    
    // 年末の資産 = 年初資産 + 運用益 + 年間純収入
    currentYearSavings = currentYearSavings + investmentGains + netIncomeForYear;

    assetDataResult.push({ 
      age,
      savings: Math.round(currentYearSavings),
      income: Math.round(yearlyIncome),
      expenses: Math.round(yearlyExpenses)
    });
    // console.log(`Age: ${age}, YearlyIncome: ${Math.round(yearlyIncome)}, YearlyExpenses: ${Math.round(yearlyExpenses)}, Net: ${Math.round(netIncomeForYear)}, InvGains: ${Math.round(investmentGains)}, StartSaving: ${Math.round(currentYearSavings - investmentGains - netIncomeForYear)}, EndSaving: ${Math.round(currentYearSavings)}`);
  }

  const yearsToRetirementCalc = Math.max(0, retirementAge - currentAge);
  const finalSavingsCalc = Math.round(currentYearSavings);
  const projectedRetirementSavingsCalc = assetDataResult.find(d => d.age === retirementAge)?.savings || (retirementAge < currentAge ? currentSavings : finalSavingsCalc) ;

  // 年間平均貯蓄ペース (現役時代のみ。投資収益は含めない単純計算)
  const annualSavingsCurrentPaceCalc = (annualIncome - (monthlyExpenses * 12)); 

  // 退職後の必要資金額の目安（簡易計算）
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge);
  const estimatedPostRetirementAnnualExpenses = monthlyExpenses * 12; // これは単純化しすぎ。退職後は生活費が変わる可能性大
  const targetRetirementFundCalc = estimatedPostRetirementAnnualExpenses * yearsInRetirement;

  let messageCalc = `現在の年齢から ${lifeExpectancy}歳までの資産推移を計算しました。
リタイア目標年齢 (${retirementAge}歳) 時点の予測貯蓄額は 約 ${projectedRetirementSavingsCalc.toLocaleString()} 円です。`;
  let suggestionCalc;

  if (finalSavingsCalc < 0) { // この条件は上の currentYearSavings = 0 で発生しないはずだが、念のため
    messageCalc += `
しかし、${lifeExpectancy}歳時点で資産がマイナス (${finalSavingsCalc.toLocaleString()}円) になる予測です。`;
    suggestionCalc = "生活費の見直し、収入源の確保、運用計画の変更などを検討する必要があります。";
  } else {
    messageCalc += `
${lifeExpectancy}歳時点での最終予測貯蓄額は 約 ${finalSavingsCalc.toLocaleString()} 円です。`;
  }

  if (projectedRetirementSavingsCalc < targetRetirementFundCalc && finalSavingsCalc >=0) {
    messageCalc += `
${retirementAge}歳から${lifeExpectancy}歳までの必要生活費総額の目安 (約 ${targetRetirementFundCalc.toLocaleString()}円) に対して、リタイア時の貯蓄では不足する可能性があります。`;
    suggestionCalc = (suggestionCalc ? suggestionCalc + "\n" : "") + "リタイア後の生活費や収入について、より詳細な計画が必要です。";
  }

  if (annualSavingsCurrentPaceCalc < 0 && currentAge < retirementAge) {
    suggestionCalc = (suggestionCalc ? suggestionCalc + "\n" : "") + "現役時代の毎年の収支が赤字のようです。収入を増やすか支出を見直すことをお勧めします。";
  }

  return {
    yearsToRetirement: yearsToRetirementCalc,
    projectedRetirementSavings: projectedRetirementSavingsCalc,
    annualSavingsCurrentPace: annualSavingsCurrentPaceCalc,
    targetRetirementFund: targetRetirementFundCalc,
    message: messageCalc,
    suggestion: suggestionCalc,
    assetData: assetDataResult,
  };
} 
