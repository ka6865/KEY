'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import styles from '../../page.module.css';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const joinRecord = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // 로그인 안된 경우 카카오 로그인 유도
          alert('친구와 기록을 공유하려면 로그인이 필요합니다.');
          router.push('/');
          return;
        }

        const user = session.user;

        // 1. 해당 기록이 존재하는지 확인
        const { data: record, error: fetchError } = await supabase
          .from('records')
          .select('theme_name')
          .eq('id', recordId)
          .single();

        if (fetchError || !record) {
          throw new Error('존재하지 않는 기록이거나 만료된 링크입니다.');
        }

        // 2. 이미 멤버인지 확인 (본인 포함)
        const { data: existingMember } = await supabase
          .from('record_members')
          .select('id')
          .eq('record_id', recordId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingMember) {
          alert('이미 참여 중인 기록입니다.');
          router.push('/');
          return;
        }

        // 3. 멤버로 추가
        const { error: joinError } = await supabase
          .from('record_members')
          .insert({
            record_id: recordId,
            user_id: user.id
          });

        if (joinError) throw joinError;

        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      } catch (err: any) {
        console.error('Join Error:', err);
        setStatus('error');
        setErrorMsg(err.message || '초대 수락 중 오류가 발생했습니다.');
      }
    };

    if (recordId) {
      joinRecord();
    }
  }, [recordId, router]);

  return (
    <div className={styles.main} style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '3rem', borderRadius: '24px', maxWidth: '400px' }}>
        {status === 'loading' && (
          <>
            <h2 className="gradient-text">초대 확인 중...</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>잠시만 기다려 주세요.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 className="gradient-text">합류 성공!</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>친구의 방탈출 기록이 내 아카이브에도 추가되었습니다.<br />잠시 후 메인 화면으로 이동합니다.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 style={{ color: '#ff4d4d' }}>초대 오류</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '1rem' }}>{errorMsg}</p>
            <button 
              onClick={() => router.push('/')}
              className={styles.navButton}
              style={{ marginTop: '2rem', background: 'var(--accent)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px' }}
            >
              홈으로 가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
