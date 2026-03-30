'use client';

import React from 'react';
import { supabase } from '../lib/supabase';
import styles from './KakaoLogin.module.css';

export default function KakaoLogin() {
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Kakao login error:', err);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={`${styles.container} glass`}>
      <h2 className={styles.title}>Welcome to <span className="gradient-text">THE KEY</span></h2>
      <p className={styles.subtitle}>계속하시려면 카카오톡으로 간편하게 로그인하세요.</p>
      
      <button className={styles.kakaoButton} onClick={handleLogin}>
        <svg className={styles.kakaoIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 3.165-9 7.07 0 2.507 1.64 4.708 4.123 5.92-.187.67-.67 2.41-.767 2.76-.117.435.158.428.33.315.138-.09 2.21-1.498 3.09-2.096.398.064.808.096 1.224.096 4.97 0 9-3.165 9-7.07S16.97 3 12 3z"/>
        </svg>
        카카오 계정으로 로그인
      </button>
    </div>
  );
}
