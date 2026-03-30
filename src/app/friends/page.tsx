'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';
import Link from 'next/link';

export default function FriendsStatsPage() {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<any[]>([]);
  const [bestPartner, setBestPartner] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
        return;
      }
      setUser(session.user);

      // 1. 내가 참여한 모든 기록의 ID 가져오기
      const { data: membershipData } = await supabase
        .from('record_members')
        .select('record_id')
        .eq('user_id', session.user.id);

      const recordIds = membershipData?.map(m => m.record_id) || [];
      
      if (recordIds.length === 0) {
        setLoading(false);
        return;
      }

      // 2. 해당 기록들의 상세 정보와 모든 멤버 가져오기
      const { data: recordData } = await supabase
        .from('records')
        .select(`
          *,
          record_members (
            user_id,
            profiles (
              profile_img,
              nickname
            )
          )
        `)
        .in('id', recordIds);

      if (recordData) {
        // 3. 친구별 데이터 집계
        const friendMap: Record<string, any> = {};
        
        recordData.forEach(record => {
          record.record_members.forEach((member: any) => {
            if (member.user_id === session.user.id) return;
            
            const fId = member.user_id;
            if (!friendMap[fId]) {
              friendMap[fId] = {
                id: fId,
                profile: member.profiles,
                total: 0,
                success: 0,
                records: []
              };
            }
            
            friendMap[fId].total += 1;
            if (record.is_success) friendMap[fId].success += 1;
            friendMap[fId].records.push(record);
          });
        });

        const friendList = Object.values(friendMap).map(f => ({
          ...f,
          successRate: Math.round((f.success / f.total) * 100)
        }));

        // 4. 베스트 파트너 선정 (많이 하고 성공률 높은 순)
        const sorted = [...friendList].sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return b.successRate - a.successRate;
        });

        setFriends(sorted);
        if (sorted.length > 0) {
          setBestPartner(sorted[0]);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>크루 분석 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/" className={styles.backButton}>← 대시보드</Link>
          <h1 className="gradient-text">나의 크루 분석</h1>
        </div>
      </header>

      {friends.length > 0 ? (
        <>
          {/* 베스트 파트너 섹션 */}
          {bestPartner && (
            <section className={styles.bestPartnerSection}>
              <div className={`${styles.bestPartnerCard} glow`}>
                  <img 
                    src={bestPartner.profile?.profile_img || '/default-avatar.png'} 
                    className={styles.bestPartnerAvatar} 
                  />
                <div className={styles.bestPartnerInfo}>
                  <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.875rem' }}>BEST PARTNER</p>
                  <h2>{bestPartner.profile?.nickname}</h2>
                  <div className={styles.bestPartnerStats}>
                    <div className={styles.statItem}>
                      <label>함께한 횟수</label>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{bestPartner.total}회</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>공동 성공률</label>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{bestPartner.successRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 크루 전체 리스트 */}
          <section>
            <h3 style={{ marginBottom: '1.5rem', opacity: 0.8 }}>나의 방탈출 크루원 ({friends.length})</h3>
            <div className={styles.crewGrid}>
              {friends.map(friend => (
                <div 
                  key={friend.id} 
                  className={`${styles.friendCard} glass ${selectedFriend?.id === friend.id ? styles.friendCardActive : ''}`}
                  onClick={() => setSelectedFriend(friend)}
                >
                  <img src={friend.profile?.profile_img || '/default-avatar.png'} className={styles.friendAvatar} />
                  <div className={styles.friendInfo}>
                    <span className={styles.friendName}>{friend.profile?.nickname}</span>
                    <span className={styles.friendMeta}>{friend.total}번의 추억</span>
                  </div>
                  <div className={styles.successRate}>
                    {friend.successRate}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 함께한 기록 상세보기 (선택 시 노출) */}
          {selectedFriend && (
            <section className={styles.sharedRecordsSection}>
              <h3 style={{ marginBottom: '1.5rem' }}>
                <span className="gradient-text">{selectedFriend.profile?.nickname}</span>님과 함께한 기록
              </h3>
              <div className={styles.recordList}>
                {selectedFriend.records.map((record: any) => (
                  <div key={record.id} className={`${styles.recordItem} glass glow-hover`}>
                    <div>
                      <h4 style={{ fontSize: '1.125rem' }}>{record.theme_name}</h4>
                      <p style={{ fontSize: '0.875rem', opacity: 0.5 }}>{record.cafe_name} • {new Date(record.played_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`${record.is_success ? 'gradient-text' : ''}`} style={{ fontWeight: 800 }}>
                      {record.is_success ? 'SUCCESS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="glass" style={{ padding: '6rem 2rem', textAlign: 'center', borderRadius: '32px', border: '1px dashed hsla(0,0%,100%,0.1)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🤝</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>혼자보다는 함께!</h3>
          <p style={{ opacity: 0.5, maxWidth: '400px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
            기록 상세보기에서 **[친구 초대하기]** 링크를 복사해 공유해 보세요.<br /> 
            친구가 링크를 통해 합류하면 이곳에서 함께한 통계를 확인할 수 있습니다.
          </p>
          <Link href="/" className={`${styles.backButton}`} style={{ display: 'inline-block' }}>
            기록 만들러 가기
          </Link>
        </div>
      )}
    </div>
  );
}
