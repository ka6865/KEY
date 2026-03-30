'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import styles from '../../page.module.css';
import KakaoLogin from '../../../components/KakaoLogin';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;
  
  const [record, setRecord] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  useEffect(() => {
    const checkAuthAndData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (recordId) {
        fetchRecordData(session?.user?.id);
      }
    };

    checkAuthAndData();
  }, [recordId]);

  const fetchRecordData = async (currentUserId?: string) => {
    try {
      // 1. 먼저 기록 상세 정보만 가져오기 (조인 없이 개별 호출로 안정성 확보)
      const { data: recordData, error: recordError } = await supabase
        .from('records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (recordError || !recordData) {
        throw new Error('존재하지 않는 기록이거나 만료된 링크입니다.');
      }

      setRecord(recordData);

      // 2. 기록 정보를 바탕으로 작성자 프로필 따로 가져오기
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, profile_img')
        .eq('id', recordData.user_id)
        .single();

      if (profileData) {
        setInviter(profileData);
      }

      // 3. 현재 로그인 중이라면 이미 멤버인지 확인
      if (currentUserId) {
        const { data: existingMember } = await supabase
          .from('record_members')
          .select('id')
          .eq('record_id', recordId)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (existingMember) {
          setIsAlreadyMember(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setJoining(true);
    try {
      const { error: joinError } = await supabase
        .from('record_members')
        .insert({
          record_id: recordId,
          user_id: user.id
        });

      if (joinError) throw joinError;

      // 크루 합류 시 신뢰 등급 업그레이드 (이미 사진/GPS 인증인 3단계가 아니라면 2단계로)
      if (record && record.verification_level < 2) {
        await supabase
          .from('records')
          .update({ verification_level: 2 })
          .eq('id', recordId);
      }

      // 성공 시 대시보드로 이동
      router.push('/');
    } catch (err: any) {
      alert(err.message || '참여 중 오류가 발생했습니다.');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.main} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>초대장 확인 중...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={styles.main} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass" style={{ padding: '3rem', borderRadius: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#ff4d4d', marginBottom: '1rem' }}>초대 오류</h2>
          <p style={{ opacity: 0.7 }}>{errorMsg}</p>
          <button onClick={() => router.push('/')} className={styles.navButton} style={{ marginTop: '2rem', margin: '0 auto' }}>홈으로 가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main} style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div className="glass" style={{ padding: '3rem', borderRadius: '32px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <img 
            src={inviter?.profile_img || '/default-avatar.png'} 
            className={styles.avatar} 
            style={{ width: '64px', height: '64px', margin: '0 auto 1rem' }}
          />
          <h2 className="gradient-text">{inviter?.nickname || '친구'}님이</h2>
          <p style={{ fontSize: '1.25rem', fontWeight: 500 }}>방탈출 크루로 초대했습니다!</p>
        </div>

        <div className="glass" style={{ background: 'hsla(0, 0%, 100%, 0.05)', padding: '2rem', borderRadius: '20px', marginBottom: '2.5rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span className={styles.badge} style={{ background: record.is_success ? 'var(--accent)' : '#ff4d4d' }}>
              {record.is_success ? 'SUCCESS' : 'FAIL'}
            </span>
            <span style={{ fontSize: '0.875rem', opacity: 0.5 }}>{new Date(record.played_at).toLocaleDateString()}</span>
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{record.theme_name}</h3>
          <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{record.cafe_name}</p>
        </div>

        {!user ? (
          <div>
            <p style={{ marginBottom: '1.5rem', opacity: 0.7, fontSize: '0.875rem' }}>기록에 합류하려면 카카오 로그인이 필요합니다.</p>
            <KakaoLogin />
          </div>
        ) : isAlreadyMember ? (
          <div>
            <p style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>이미 참여 중인 기록입니다.</p>
            <button onClick={() => router.push('/')} className={`${styles.navButton} ${styles.primaryButton}`} style={{ width: '100%', justifyContent: 'center' }}>
              나의 대시보드 보기
            </button>
          </div>
        ) : (
          <button 
            onClick={handleJoin} 
            disabled={joining}
            className={`${styles.navButton} ${styles.primaryButton}`}
            style={{ width: '100%', height: '3.5rem', fontSize: '1.125rem', justifyContent: 'center' }}
          >
            {joining ? '합류 중...' : '기록에 합류하기'}
          </button>
        )}
      </div>
    </div>
  );
}
