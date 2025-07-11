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
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl max-w-sm mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">ログイン</h2>
      <div className="w-full space-y-4">
        <button
        onClick={handleGoogleLogin}
        className="flex items-center justify-center w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
        <Icon as={FaGoogle} className="mr-3" />
          Googleでログイン
        </button>
        <button
          onClick={handleAnonymousLogin}
          className="flex items-center justify-center w-full px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
        >
          <Icon as={FaUserSecret} className="mr-3" />
          匿名で利用する
        </button>
      </div>
    </div>
  );
};

export default Auth; 
