import { calculateSimulation, SimulationInput, LifeEvent, AssetDataPoint } from '../simulationService';

describe('calculateSimulation', () => {
  // 基本的な入力データ（テストケースごとに変更・拡張する）
  const базовыйВвод: SimulationInput = {
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 95,
    currentSavings: 1000000, // 100万円
    annualIncome: 5000000,   // 500万円
    monthlyExpenses: 200000, // 20万円 (年間240万円)
    investmentRatio: 50,     // 50%
    annualReturn: 3,         // 3%
    pensionAmountPerYear: 1500000, // 150万円
    pensionStartDate: 65,
    severancePay: 10000000, // 1000万円
    lifeEvents: [],
  };

  test('должен возвращать результат для действительного ввода без ошибок', () => {
    const результат = calculateSimulation(базовыйВвод);
    expect(результат).toBeDefined();
    expect(результат.message).not.toContain('入力エラー');
    expect(результат.message).not.toContain('不正です');
    expect(результат.assetData.length).toBe(базовыйВвод.lifeExpectancy - базовыйВвод.currentAge + 1);
  });

  test('должен возвращать сообщение об ошибке, если текущий возраст больше возраста выхода на пенсию', () => {
    const недействительныйВвод = { ...базовыйВвод, currentAge: 70, retirementAge: 65 };
    const результат = calculateSimulation(недействительныйВвод);
    expect(результат.message).toContain('退職年齢は現在の年齢より大きく設定してください');
    expect(результат.assetData.length).toBe(0); // エラー時は assetData が空のはず
  });

  test('должен правильно рассчитать активы на конец первого года без событий', () => {
    const ввод = { ...базовыйВвод, lifeEvents: [] }; // ライフイベントなしを明示
    const результат = calculateSimulation(ввод);
    const первыйГодДанные = результат.assetData.find(d => d.age === ввод.currentAge);

    // 年間収入: 500万
    // 年間支出: 20万 * 12 = 240万
    // 年間純収入: 500 - 240 = 260万
    // 年初資産: 100万
    // 運用益: 100万 * 50% * 3% = 1.5万
    // 年末資産 = 100万 + 1.5万 + 260万 = 361.5万
    const ожидаемыйОстатокПервогоГода = Math.round(1000000 + (1000000 * 0.50 * 0.03) + (5000000 - 200000 * 12));
    
    expect(первыйГодДанные).toBeDefined();
    expect(первыйГодДанные?.savings).toBe(ожидаемыйОстатокПервогоГода);
    expect(первыйГодДанные?.income).toBe(ввод.annualIncome);
    expect(первыйГодДанные?.expenses).toBe(ввод.monthlyExpenses * 12);
  });

  test('должен учитывать единовременное событие расходов', () => {
    const событиеРасходов: LifeEvent = {
      id: 'e1',
      age: 35,
      description: 'Крупная покупка',
      type: 'expense',
      amount: 500000, // 50万円の支出
      frequency: 'one-time'
    };
    const ввод = { ...базовыйВвод, lifeEvents: [событиеРасходов] };
    const результат = calculateSimulation(ввод);
    const данныеГодаСобытия = результат.assetData.find(d => d.age === событиеРасходов.age);
    const данныеПредыдущегоГода = результат.assetData.find(d => d.age === событиеРасходов.age - 1);

    expect(данныеГодаСобытия).toBeDefined();
    expect(данныеПредыдущегоГода).toBeDefined();
    
    // 年間収入（35歳）: 500万
    // 通常年間支出（35歳）: 240万
    // イベント支出: 50万
    // 合計年間支出（35歳）: 240万 + 50万 = 290万
    expect(данныеГодаСобытия?.income).toBe(ввод.annualIncome);
    expect(данныеГодаСобытия?.expenses).toBe((ввод.monthlyExpenses * 12) + событиеРасходов.amount);

    // 前年末の資産から計算して、イベント支出が反映されているか簡易的に確認
    // (正確な期待値計算は複雑なので、ここでは支出額が増えていることなどで代替)
    if (данныеПредыдущегоГода && данныеГодаСобытия) {
        const предыдущийОстаток = данныеПредыдущегоГода.savings;
        const доходГодаСобытия = ввод.annualIncome;
        const расходыГодаСобытия = (ввод.monthlyExpenses * 12) + событиеРасходов.amount;
        const чистыйДоходГодаСобытия = доходГодаСобытия - расходыГодаСобытия;
        let приростИнвестицийГодаСобытия = 0;
        if (предыдущийОстаток > 0) {
            приростИнвестицийГодаСобытия = предыдущийОстаток * (ввод.investmentRatio / 100) * (ввод.annualReturn / 100);
        }
        const ожидаемыйОстатокГодаСобытия = Math.round(предыдущийОстаток + приростИнвестицийГодаСобытия + чистыйДоходГодаСобытия);
        expect(данныеГодаСобытия.savings).toBe(ожидаемыйОстатокГодаСобытия);
    }
  });

  // TODO: さらに多くのテストケースを追加
  // - 年次イベント（収入・支出）
  // - 退職金の正しい計上
  // - 年金の正しい計上
  // - 資産がマイナスになるケース（運用益の計算が正しいか）
  // - 境界値テスト（例: currentAge === retirementAge - 1 など）
  // - lifeEvents の endAge のテスト
}); 
