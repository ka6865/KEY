'use client';

import { useState, useEffect } from 'react';
import styles from "./page.module.css";
import AddRecordModal from '../components/AddRecordModal';
import KakaoLogin from '../components/KakaoLogin';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

import Link from 'next/link';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    escapes: 0,
    successRate: 0,
    friends: 0
  });

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (authUser: User) => {
    setLoading(true);
    try {
      // 1. 프로필 정보 가져오기 및 초기화
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profileData && !profileError) {
        // 프로필이 없는 경우 초기값으로 생성 (카카오 닉네임 활용)
        const newProfile = {
          id: authUser.id,
          nickname: authUser.user_metadata?.full_name || '방랑자',
          profile_img: authUser.user_metadata?.avatar_url || ''
        };
        const { data: inserted } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        profileData = inserted;
      }
      setProfile(profileData);

      // 2. 최근 기록 가져오기
      const { data: recordData, error: recordError } = await supabase
        .from('records')
        .select(`
          id,
          played_at,
          is_success,
          rating,
          hints_used,
          theme_name,
          cafe_name,
          record_members (
            user_id,
            profiles (
              profile_img,
              nickname
            )
          )
        `)
        .eq('user_id', authUser.id)
        .order('played_at', { ascending: false })
        .limit(6);

      if (recordError) throw recordError;
      setRecords(recordData || []);

      // 3. 통계 계산 (친구 수 포함)
      const { data: allRecordsData, error: allRecordsError } = await supabase
        .from('records')
        .select(`
          is_success,
          record_members (user_id)
        `)
        .eq('user_id', authUser.id);

      if (allRecordsData) {
        const escapes = allRecordsData.filter(r => r.is_success).length;
        const rate = allRecordsData.length > 0 ? Math.round((escapes / allRecordsData.length) * 100) : 0;
        
        // 고유 친구 수 계산
        const allFriends = new Set();
        allRecordsData.forEach(r => {
          r.record_members?.forEach((m: any) => {
            if (m.user_id !== authUser.id) {
              allFriends.add(m.user_id);
            }
          });
        });

        setStats({
          escapes,
          successRate: rate,
          friends: allFriends.size
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className={styles.main} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.logoContainer}>
            <h1 className="gradient-text">THE KEY</h1>
            <p>PREMIUM ESCAPE LOG</p>
          </div>
        </header>

        <section className={styles.landingHero}>
          <h2 className={styles.heroTitle}>
            내 손안의 가장 <br />
            <span className="gradient-text">완벽한 방탈출 아카이브</span>
          </h2>
          <p className={styles.heroSubtitle}>
            기록을 넘어선 경험. 친구와 함께 완성하는 나만의 프리미엄 방탈출 일기장 'The Key'를 지금 시작하세요.
          </p>
          
          <div className={styles.landingLoginBox}>
            <KakaoLogin />
            <p className={styles.loginHint}>3초면 로그인이 완료됩니다.</p>
          </div>
        </section>

        <div className={styles.featureGrid}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>EASY LOG</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>테마 이름과 지점명만으로 쉽고 빠르게 기록을 남기세요.</p>
          </div>
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>SOCIAL JOIN</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>초대 링크 하나로 친구들과 공동 기록을 관리하세요.</p>
          </div>
          <div className="glass" style={{ padding: '2rem', borderRadius: '20px' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>SMART STATS</h3>
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>탈출 횟수와 평균 성공률을 시각적으로 확인하세요.</p>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>© 2026 THE KEY. ALL RIGHTS RESERVED.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <h1 className="gradient-text">THE KEY</h1>
          <p>내 손안의 방탈출 아카이브</p>
        </div>
        <nav className={styles.nav}>
          <div className={styles.userSection}>
            <span className={styles.userEmail}>{profile?.nickname || '방랑자'}</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/profile" className={styles.navButton}>프로필</Link>
            <button className={styles.navButton} onClick={handleLogout}>로그아웃</button>
            <button 
              className={`${styles.navButton} ${styles.primaryButton}`}
              onClick={() => setIsModalOpen(true)}
            >
              <span className={styles.desktopOnly}>새 기록 작성</span>
              <span className={styles.mobileOnly}>+ 기록</span>
            </button>
          </div>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h2 className={styles.heroTitle}>반갑습니다, <span className="gradient-text">{profile?.nickname || '방랑자'}</span>님! <br />오늘의 방탈출은 어떠셨나요?</h2>
          <p className={styles.heroSubtitle}>기록을 통해 중복 플레이를 방지하고 친구들과 추억을 공유하세요.</p>
        </div>
      </section>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass glow-hover`}>
          <span className={styles.statLabel}>내 탈출 횟수</span>
          <span className={styles.statValue}>{stats.escapes}</span>
        </div>
        <div className={`${styles.statCard} glass glow-hover`}>
          <span className={styles.statLabel}>평균 성공률</span>
          <span className={styles.statValue}>{stats.successRate}%</span>
        </div>
        <div className={`${styles.statCard} glass glow-hover`}>
          <span className={styles.statLabel}>함께한 친구</span>
          <span className={styles.statValue}>{stats.friends}</span>
        </div>
      </div>

      <section className={styles.themeListSection}>
        <div className={styles.sectionHeader}>
          <h3>나의 최근 기록</h3>
          <Link href="/records" className={styles.textButton}>전체 보기</Link>
        </div>
        {records.length > 0 ? (
          <div className={styles.themeGrid}>
            {records.map((record) => (
              <div 
                key={record.id} 
                className={`${styles.themeCard} glass glow-hover`}
                onClick={() => handleEditRecord(record)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.themeImagePlaceholder}>
                  <div className={styles.imageOverlay}>
                    <span className={`${styles.badge} ${!record.is_success ? styles.badgeFail : ''}`}>
                      {record.is_success ? 'SUCCESS' : 'FAIL'}
                    </span>
                  </div>
                </div>
                <div className={styles.themeInfo}>
                  <h4 className={styles.themeTitle}>{record.theme_name || '알 수 없는 테마'}</h4>
                  <p className={styles.themeLocation}>{record.cafe_name || '카페 정보 없음'}</p>
                  <div className={styles.themeMeta}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className={styles.facepile}>
                        {record.record_members?.slice(0, 3).map((member: any, idx: number) => (
                          <img 
                            key={idx} 
                            src={member.profiles?.profile_img || 'https://via.placeholder.com/24'} 
                            alt={member.profiles?.nickname} 
                            className={styles.avatar}
                            title={member.profiles?.nickname}
                          />
                        ))}
                        {(record.record_members?.length > 3) && (
                          <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: 'var(--accent)' }}>
                            +{record.record_members.length - 3}
                          </div>
                        )}
                      </div>
                      <span>{new Date(record.played_at).toLocaleDateString()}</span>
                    </div>
                    <span>⭐ {record.rating}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* 자리가 비었을 때 보여주는 placeholder */}
            {records.length < 3 && Array.from({ length: 3 - records.length }).map((_, i) => (
              <div 
                key={`placeholder-${i}`} 
                className={`${styles.placeholderCard} glow-hover`}
                onClick={() => setIsModalOpen(true)}
              >
                <div className={styles.placeholderContent}>
                  <span className={styles.plusIcon}>+</span>
                  <p>다음 탈출 기록 남기기</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>아직 기록이 없습니다. 첫 번째 방탈출 기록을 남겨보세요!</p>
          </div>
        )}
      </section>
      
      <footer className={styles.footer}>
        <p>© 2026 THE KEY. ALL RIGHTS RESERVED.</p>
      </footer>

      {isModalOpen && (
        <AddRecordModal 
          onClose={handleCloseModal} 
          initialData={selectedRecord}
        />
      )}
    </div>
  );
}
