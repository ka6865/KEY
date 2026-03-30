'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './profile.module.css';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setNickname(data.nickname || '');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim(), updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      alert('닉네임이 성공적으로 변경되었습니다!');
      router.push('/');
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center' }}>
        <p className="gradient-text">프로필 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.profileCard} glass`}>
        <h1 className="gradient-text">내 프로필 설정</h1>
        
        <div className={styles.avatarSection}>
          <img 
            src={profile?.profile_img || 'https://via.placeholder.com/120'} 
            alt="Profile avatar" 
            className={styles.largeAvatar}
          />
        </div>

        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.field}>
            <label>계정 메일</label>
            <input 
              readOnly 
              className={styles.input} 
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
              value={profile?.id ? '(카카오 계정 연동됨)' : ''}
            />
          </div>

          <div className={styles.field}>
            <label>닉네임</label>
            <input 
              className={styles.input} 
              type="text" 
              placeholder="변경할 닉네임을 입력하세요" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.saveButton}
            disabled={saving || !nickname.trim()}
          >
            {saving ? '저장 중...' : '닉네임 변경하기'}
          </button>

          <Link href="/" className={styles.backButton}>
            메인으로 돌아가기
          </Link>
        </form>
      </div>
    </div>
  );
}
