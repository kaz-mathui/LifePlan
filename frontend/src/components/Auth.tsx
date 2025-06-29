import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, Auth as FirebaseAuth, signInAnonymously } from 'firebase/auth';
import { FaGoogle, FaUserSecret } from 'react-icons/fa';
import Icon from './Icon';

interface AuthProps {
  auth: FirebaseAuth;
}

// デバイス検出関数
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const Auth: React.FC<AuthProps> = ({ auth }) => {
  // リダイレクト後の結果を処理（スマホ用）
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log('リダイレクト結果を確認中...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('リダイレクトログイン成功:', result.user);
        } else {
          console.log('リダイレクト結果なし');
        }
      } catch (error) {
        console.error('リダイレクトログインエラー:', error);
      }
    };

    handleRedirectResult();
  }, [auth]);

  const handleGoogleLogin = async () => {
    console.log('Googleログインボタンがクリックされました');
    const provider = new GoogleAuthProvider();
    
    // カスタムパラメータを追加
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      if (isMobileDevice()) {
        // スマホではリダイレクト方式
        console.log('スマホ検出: signInWithRedirect実行中...');
        await signInWithRedirect(auth, provider);
        console.log('signInWithRedirect完了 - リダイレクトが開始されました');
      } else {
        // PCではポップアップ方式
        console.log('PC検出: signInWithPopup実行中...');
        await signInWithPopup(auth, provider);
        console.log('signInWithPopup完了');
      }
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
