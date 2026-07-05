import React from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, Auth as FirebaseAuth, signInAnonymously } from 'firebase/auth';
import { FaGoogle, FaUserSecret } from 'react-icons/fa';
import Icon from './Icon';

interface AuthProps {
  auth: FirebaseAuth;
}

const Auth: React.FC<AuthProps> = ({ auth }) => {
  const handleGoogleLogin = async () => {
    console.log('Googleログインボタンがクリックされました');
    const provider = new GoogleAuthProvider();
    
    // カスタムパラメータを追加
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      // デバイスを問わずポップアップ方式に統一
      console.log('PC/SP共通: signInWithPopup実行中...');
      await signInWithPopup(auth, provider);
      console.log('signInWithPopup完了');
    } catch (error) {
      console.error("Googleログインエラー:", error);
    }
  };

  const handleAnonymousLogin = async () => {
    console.log('匿名ログインボタンがクリックされました');
    try {
      await signInAnonymously(auth);
      console.log('匿名ログイン成功');
    } catch (error) {
      console.error("匿名ログインエラー:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl max-w-sm mx-auto mt-10">
      {/* ブランド + 価値訴求(初見で「何のアプリか」が分かるように) */}
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
        LifePlan <span className="text-blue-600">v2</span>
      </h1>
      <p className="mt-2 text-sm text-gray-600 text-center leading-relaxed">
        老後のお金の不安に、<b>判定と処方箋</b>を。<br />
        12問・3分であなたの未来を診断します。
      </p>
      <div className="w-full space-y-3 mt-6">
        <button
          onClick={handleAnonymousLogin}
          className="flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] transition-transform"
        >
          <Icon as={FaUserSecret} className="mr-3" />
          登録なしで今すぐ診断する
        </button>
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] transition-transform"
        >
          <Icon as={FaGoogle} className="mr-3 text-red-500" />
          Googleでログイン
        </button>
      </div>
      <p className="mt-4 text-[11px] text-gray-400 text-center leading-relaxed">
        無料・登録不要で全ての診断が使えます。<br />
        保険や投資信託の勧誘は一切ありません。
      </p>
    </div>
  );
};

export default Auth; 
