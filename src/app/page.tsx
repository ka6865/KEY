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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({
    escapes: 0,
    successRate: 0,
    friends: 0
  });
  const [nextReservation, setNextReservation] = useState<any>(null);

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

  useEffect(() => {
    setMounted(true);
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
        const newProfile = {
          id: authUser.id,
          nickname: authUser.user_metadata?.full_name || '방랑자',
          profile_img: authUser.user_metadata?.avatar_url || '',
          kakao_profile_img: authUser.user_metadata?.avatar_url || '',
          current_avatar_type: 'kakao'
        };
        const { data: inserted } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        profileData = inserted;
      }
      setProfile(profileData);

      // 2. 내가 참여한 모든 기록의 ID 먼저 가져오기
      const { data: membershipData, error: membershipError } = await supabase
        .from('record_members')
        .select('record_id')
        .eq('user_id', authUser.id);

      if (membershipError) throw membershipError;

      const recordIds = membershipData?.map(m => m.record_id) || [];
      
      if (recordIds.length === 0) {
        setRecords([]);
        setStats({ escapes: 0, successRate: 0, friends: 0 });
        setLoading(false);
        return;
      }

      // 3. 해당 ID들을 가진 전체 기록 정보(모든 멤버 포함) 가져오기
      const { data: recordData, error: recordError } = await supabase
        .from('records')
        .select(`
          id,
          user_id,
          played_at,
          is_success,
          rating,
          hints_used,
          theme_name,
          cafe_name,
          rating_mechanisms,
          rating_fear,
          rating_difficulty,
          record_members (
            user_id,
            profiles (
              profile_img,
              nickname
            )
          )
        `)
        .in('id', recordIds)
        .order('played_at', { ascending: false });

      if (recordError) throw recordError;

      // 최근 기록 6개 설정
      setRecords(recordData.slice(0, 6) || []);

      // 4. 통계 계산 (참여한 모든 기록 기반)
      const escapes = recordData.filter(r => r.is_success).length;
      const rate = recordData.length > 0 ? Math.round((escapes / recordData.length) * 100) : 0;
      
      // 고유 친구 수 계산
      const allFriends = new Set();
      recordData.forEach(r => {
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

      // 5. 가장 가까운 예약 정보 가져오기
      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', authUser.id)
        .gte('reserved_at', new Date().toISOString())
        .order('reserved_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      setNextReservation(resData);
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

  const handleUpdateAvatar = async (type: string, url: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          profile_img: url,
          current_avatar_type: type
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, profile_img: url, current_avatar_type: type });
      alert('프로필 이미지가 변경되었습니다.');
    } catch (err) {
      console.error('Profile update failed:', err);
    }
  };

  const handleSyncKakao = async () => {
    if (!user || !profile) return;
    
    const kakaoImg = user.user_metadata?.avatar_url;
    if (!kakaoImg) {
      alert('카카오 프로필 정보를 가져올 수 없습니다. 동의 설정을 확인해 주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          profile_img: kakaoImg,
          kakao_profile_img: kakaoImg,
          current_avatar_type: 'kakao'
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile({ ...profile, profile_img: kakaoImg, kakao_profile_img: kakaoImg, current_avatar_type: 'kakao' });
      alert('카카오 프로필과 동기화되었습니다.');
    } catch (err) {
      console.error('Kakao sync failed:', err);
    }
  };

  if (!mounted || loading) {
    return (
      <div className={styles.main}>
        <div className={styles.header} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
          <div className="skeleton" style={{ width: '120px', height: '32px' }}></div>
          <div className="skeleton" style={{ width: '200px', height: '40px' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
          <div className="skeleton" style={{ height: '120px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '120px', borderRadius: '16px' }}></div>
          <div className="skeleton" style={{ height: '120px', borderRadius: '16px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '100%', height: '400px', marginTop: '3rem', borderRadius: '24px' }}></div>
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
          <div className={styles.userSection} onClick={() => setIsProfileModalOpen(true)} style={{ cursor: 'pointer' }}>
            <div className={styles.profileImageWrapper}>
              <img 
                src={profile?.profile_img || '/avatars/avatar1.png'} 
                alt="Profile" 
                className={styles.profileAvatar}
              />
            </div>
            <span className={styles.userNickname}>{profile?.nickname || '방랑자'}</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/community" className={styles.navButton} style={{ color: 'var(--accent)', fontWeight: 700 }}>전시관</Link>
            <Link href="/reservations" className={styles.navButton}>일정</Link>
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

      {nextReservation && (
        <section style={{ marginBottom: '2rem' }}>
          <div className="glass glow-hover" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid hsla(var(--accent-hsl), 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ 
                background: 'var(--accent)', 
                color: 'white', 
                padding: '0.75rem 1.25rem', 
                borderRadius: '16px', 
                fontWeight: 900,
                fontSize: '1.25rem'
              }}>
                D-{Math.ceil((new Date(nextReservation.reserved_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>차례를 기다리는 모험</p>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{nextReservation.theme_name}</h4>
                <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>📍 {nextReservation.cafe_name}</p>
              </div>
            </div>
            <Link href="/reservations" className={styles.textButton}>상세 일정</Link>
          </div>
        </section>
      )}

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass glow-hover`}>
          <span className={styles.statLabel}>내 탈출 횟수</span>
          <span className={styles.statValue}>{stats.escapes}</span>
        </div>
        <div className={`${styles.statCard} glass glow-hover`}>
          <span className={styles.statLabel}>평균 성공률</span>
          <span className={styles.statValue}>{stats.successRate}%</span>
        </div>
        <Link href="/friends" className={`${styles.statCard} glass glow-hover`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className={styles.statLabel}>함께한 친구</span>
          <span className={styles.statValue}>{stats.friends}</span>
        </Link>
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
                            src={member.profiles?.profile_img || '/default-avatar.png'} 
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
          <div className={styles.emptyState} style={{ padding: '5rem 2rem', border: '1px dashed hsla(0, 0%, 100%, 0.1)', borderRadius: '32px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🗝️</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>아직 열리지 않은 이야기</h3>
            <p style={{ opacity: 0.5, marginBottom: '2rem', maxWidth: '300px', margin: '0 auto 2rem' }}>
              첫 번째 방탈출 기록을 남겨보세요. <br />여러분의 모험이 기록의 시작입니다.
            </p>
            <button 
              className={`${styles.navButton} ${styles.primaryButton}`}
              onClick={() => setIsModalOpen(true)}
              style={{ margin: '0 auto' }}
            >
              지금 첫 기록 남기기
            </button>
          </div>
        )}
      </section>
      
      <section className={styles.usageSection}>
        <div className={styles.sectionHeader}>
          <h3 className="gradient-text">MOBILE WEB APP GUIDE</h3>
          <p>THE KEY를 스마트폰 홈 화면에 추가하고 앱처럼 사용하세요.</p>
        </div>
        
        <div className={styles.guideGrid}>
          <div className={`${styles.guideCard} glass`}>
            <div className={styles.deviceIcon}>🍏</div>
            <h4>iPhone (Safari)</h4>
            <ol>
              <li>Safari 하단 중앙의 <strong>[공유]</strong> 버튼 클릭</li>
              <li>메뉴를 내려 <strong>[홈 화면에 추가]</strong> 선택</li>
              <li>우측 상단 <strong>[추가]</strong> 버튼 클릭</li>
            </ol>
          </div>
          
          <div className={`${styles.guideCard} glass`}>
            <div className={styles.deviceIcon}>🤖</div>
            <h4>Android (Chrome)</h4>
            <ol>
              <li>Chrome 우측 상단 <strong>[점 3개]</strong> 메뉴 클릭</li>
              <li><strong>[앱 설치]</strong> 또는 <strong>[홈 화면에 추가]</strong> 클릭</li>
              <li>팝업창에서 <strong>[설치]</strong> 버튼 클릭</li>
            </ol>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}>
              <h2 className="gradient-text">THE KEY</h2>
              <p>PREMIUM ESCAPE ROOM ARCHIVE</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.linkGroup}>
                <h5>SERVICE</h5>
                <Link href="/community">전시관</Link>
                <Link href="/reservations">예약 관리</Link>
              </div>
              <div className={styles.linkGroup}>
                <h5>SUPPORT</h5>
                <a href="mailto:ka6865@gmail.com">문의하기</a>
                <span>이용약관</span>
                <span>개인정보처리방침</span>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 THE KEY. ALL RIGHTS RESERVED.</p>
            <div className={styles.socialIcons}>
              {/* SNS 인장 등 추가 가능 */}
            </div>
          </div>
        </div>
      </footer>

      {isProfileModalOpen && (
        <div className={styles.profileOverlay} onClick={() => setIsProfileModalOpen(false)}>
          <div className={styles.profileModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.profileModalHeader}>
              <h2 className="gradient-text">프로필 설정</h2>
              <button className={styles.closeButton} onClick={() => setIsProfileModalOpen(false)}>&times;</button>
            </div>

            <div className={styles.avatarSection}>
              <label>탐험가 아바타 선택</label>
              <div className={styles.avatarGrid}>
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const url = `/avatars/avatar${num}.png`;
                  return (
                    <div 
                      key={num} 
                      className={`${styles.avatarItem} ${profile?.current_avatar_type === `avatar${num}` ? styles.activeAvatar : ''}`}
                      onClick={() => handleUpdateAvatar(`avatar${num}`, url)}
                    >
                      <img src={url} alt={`Avatar ${num}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.kakaoSyncSection}>
              <label>카카오 연동</label>
              <button className={styles.syncButton} onClick={handleSyncKakao}>
                💬 카카오 프로필로 되돌리기 / 재동의
              </button>
              <p className={styles.syncHint}>처음 로그인 시 프로필 사진 동의를 안 하셨다면, 이 버튼을 통해 다시 연결할 수 있습니다.</p>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddRecordModal 
          onClose={handleCloseModal} 
          initialData={selectedRecord}
        />
      )}
    </div>
  );
}
