import React, { useRef } from 'react';

interface Props {
  answers: Record<string, any>;
  overall: { answered: number; total: number; percent: number };
}

/**
 * 全186問完了時の証明書(OGP用 canvas画像生成)
 */
const CompletionCertificate: React.FC<Props> = ({ answers, overall }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = 1200, H = 630;
    cv.width = W; cv.height = H;

    // 背景グラデ
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(1, '#2563eb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // タイトル
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('🎉 LifePlan v2 完成', W / 2, 180);

    // サブ
    ctx.font = '28px -apple-system, sans-serif';
    ctx.globalAlpha = 0.85;
    ctx.fillText('全186問に向き合い、未来の精密予測ダッシュボードが完成', W / 2, 240);
    ctx.globalAlpha = 1;

    // 数字
    ctx.font = 'bold 180px -apple-system, sans-serif';
    ctx.fillText(`${overall.answered}/${overall.total}`, W / 2, 430);

    // フッタ
    ctx.font = '20px -apple-system, sans-serif';
    ctx.globalAlpha = 0.7;
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 完成`;
    ctx.fillText(dateStr, W / 2, 530);
    ctx.fillText('— あなたの人生の精密予測 —', W / 2, 570);
    ctx.globalAlpha = 1;
  }, [overall]);

  const handleDownload = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const url = cv.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeplan-v2-certificate-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-gray-900 mb-1">🏆 完成証明書</div>
      <div className="text-xs text-gray-500 mb-3">全186問達成おめでとうございます!SNS用画像を生成できます。</div>
      <canvas ref={canvasRef} className="w-full rounded-xl border border-gray-200" />
      <button onClick={handleDownload} className="w-full mt-3 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">
        📥 画像をダウンロード
      </button>
    </div>
  );
};

export default CompletionCertificate;
