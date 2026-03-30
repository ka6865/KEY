'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './community.module.css';
import Link from 'next/link';

interface ThemeGroup {
  theme_name: string;
  cafe_name: string;
  cafe_address: string;
  region: string;
  avg_rating: number;
  avg_difficulty: number;
  avg_fear: number;
  avg_verification: number;
  review_count: number;
  image_url: string;
  reviews: any[];
}

export default function CommunityPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [selectedGroup, setSelectedGroup] = useState<ThemeGroup | null>(null);
  const [user, setUser] = useState<any>(null);

  const regions = ['전체', '서울', '경기', '인천', '강원', '충청', '경상', '전라', '제주'];

  useEffect(() => {
    async function fetchPublicRecords() {
      try {
        const { data, error } = await supabase
          .from('records')
          .select(`
            *,
            profiles (
              nickname,
              profile_img
            )
          `)
          .eq('is_public', true)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching records:', error.message);
          setRecords([]);
        } else {
          setRecords(data || []);
        }
      } catch (err) {
        console.error('Community fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    }

    fetchPublicRecords();
    fetchUser();
  }, []);

  const handleReport = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!confirm('부적절한 내용으로 신고하시겠습니까?')) return;

    try {
      // 1. 중복 신고 확인 및 등록
      const { error: reportError } = await supabase
        .from('reports')
        .insert({ record_id: recordId, user_id: user.id });

      if (reportError) {
        if (reportError.code === '23505') {
          alert('이미 신고한 게시글입니다.');
        } else {
          throw reportError;
        }
        return;
      }

      // 2. 신고 횟수 증가
      const { data: record, error: fetchError } = await supabase
        .from('records')
        .select('reports_count')
        .eq('id', recordId)
        .single();
      
      if (fetchError) throw fetchError;

      const newCount = (record.reports_count || 0) + 1;
      const shouldHide = newCount >= 3;

      const { error: updateError } = await supabase
        .from('records')
        .update({ 
          reports_count: newCount,
          is_hidden: shouldHide
        })
        .eq('id', recordId);

      if (updateError) throw updateError;

      alert(shouldHide ? '누적 신고로 인해 해당 리뷰가 블라인드 처리되었습니다.' : '신고가 접수되었습니다.');
      
      // 목록 가독성을 위해 새로고침 또는 필터링 (간단히 UI 유지)
    } catch (err: any) {
      console.error('Report failed:', err);
      alert('신고 처리 중 오류가 발생했습니다.');
    }
  };

  // 데이터 그룹화 및 집계 로직
  const aggregatedData = useMemo(() => {
    const groups: { [key: string]: ThemeGroup } = {};

    records.forEach(record => {
      const key = `${record.cafe_name}-${record.theme_name}-${record.cafe_address || ''}`;
      
      if (!groups[key]) {
        groups[key] = {
          theme_name: record.theme_name,
          cafe_name: record.cafe_name,
          cafe_address: record.cafe_address || '',
          region: record.region || '미지정',
          avg_rating: 0,
          avg_difficulty: 0,
          avg_fear: 0,
          avg_verification: 0,
          review_count: 0,
          image_url: '',
          reviews: []
        };
      }

      groups[key].avg_rating += record.rating || 0;
      groups[key].avg_difficulty += record.rating_difficulty || 0;
      groups[key].avg_fear += record.rating_fear || 0;
      groups[key].avg_verification += record.verification_level || 1;
      groups[key].review_count += 1;
      groups[key].reviews.push(record);
      
      // 이미지가 있는 리뷰 중 가장 최근 것을 대표 이미지로 사용
      if (record.image_url && !groups[key].image_url) {
        groups[key].image_url = record.image_url;
      }
    });

    return Object.values(groups)
      .map(group => ({
        ...group,
        avg_rating: group.avg_rating / group.review_count,
        avg_difficulty: group.avg_difficulty / group.review_count,
        avg_fear: group.avg_fear / group.review_count,
        avg_verification: group.avg_verification / group.review_count,
      }))
      .filter(group => selectedRegion === '전체' || group.region.includes(selectedRegion))
      // 신뢰 등급 높은 순(인증된 순)으로 정렬
      .sort((a, b) => b.avg_verification - a.avg_verification);
  }, [records, selectedRegion]);

  const renderStars = (rating: number) => {
    const r = Math.round(rating);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  const renderVerificationBadge = (level: number) => {
    if (level >= 2.5) return <span className={`${styles.trustBadge} ${styles.goldBadge}`}>🏆 공식인증</span>;
    if (level >= 1.5) return <span className={`${styles.trustBadge} ${styles.silverBadge}`}>👥 크루인증</span>;
    return null;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/" className="gradient-text" style={{ fontSize: '1rem', fontWeight: 700, textDecoration: 'none' }}>
            ← DASHBOARD
          </Link>
        </div>
        <h1 className="gradient-text">전시관: 테마 아카이브</h1>
        <p>전국 방탈출 테마의 생생한 만족도와 정보를 확인하세요.</p>
      </header>

      <div className={styles.filterSection}>
        <div className={styles.regionFilter}>
          {regions.map(r => (
            <button
              key={r}
              className={`${styles.filterTab} ${selectedRegion === r ? styles.filterTabActive : ''}`}
              onClick={() => setSelectedRegion(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGroup(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalThemeInfo}>
                <span className={styles.regionBadge}>{selectedGroup.region}</span>
                <h2>{selectedGroup.theme_name}</h2>
                <p>📍 {selectedGroup.cafe_name}</p>
              </div>
              <button className={styles.closeButton} onClick={() => setSelectedGroup(null)}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.gallery}>
                <h3>📜 모험가들의 기록 ({selectedGroup.review_count})</h3>
                <div className={styles.reviewList}>
                  {selectedGroup.reviews.map((rev, ridx) => (
                    <div key={ridx} className={styles.detailReviewItem}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewerInfo}>
                          <img 
                            src={rev.profiles?.profile_img || '/avatars/avatar1.png'} 
                            alt="Pro" 
                            className={styles.miniAvatar}
                          />
                          <span className={styles.nickname}>{rev.profiles?.nickname}</span>
                          <span className={styles.date}>{new Date(rev.created_at).toLocaleDateString()}</span>
                        </div>
                        <button className={styles.reportBtn} onClick={(e) => handleReport(rev.id, e)}>🚨 신고</button>
                      </div>
                      
                      {rev.image_url && (
                        <div className={styles.reviewImg}>
                          <img src={rev.image_url} alt="Review" />
                        </div>
                      )}
                      
                      <div className={styles.reviewBody}>
                        <div className={styles.reviewStats}>
                          <span>⭐ {rev.rating}</span>
                          <span>🧩 Lv.{rev.rating_difficulty}</span>
                          <span>👻 Lv.{rev.rating_fear}</span>
                        </div>
                        <p className={styles.memo}>{rev.memo || '별점 정보를 남겼습니다.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>데이터를 분석하는 중...</div>
      ) : aggregatedData.length > 0 ? (
        <div className={styles.grid}>
          {aggregatedData.map((group, idx) => (
            <div key={idx} className={styles.card} onClick={() => setSelectedGroup(group)}>
              {group.image_url && (
                <div className={styles.cardImage}>
                  <img src={group.image_url} alt={group.theme_name} />
                </div>
              )}
              
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div className={styles.themeInfo}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div className={styles.regionBadge}>{group.region}</div>
                      {renderVerificationBadge(group.avg_verification)}
                    </div>
                    <h2>{group.theme_name}</h2>
                    <p>📍 {group.cafe_name}</p>
                  </div>
                  <div className={styles.countBadge}>
                    리뷰 {group.review_count}개
                  </div>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>평균 만족도</span>
                    <span className={styles.statValue} style={{ color: '#ffc107' }}>
                      {renderStars(group.avg_rating)}
                      <span className={styles.num}>({group.avg_rating.toFixed(1)})</span>
                    </span>
                  </div>
                  <div className={styles.statRow}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>평균 난이도</span>
                      <span className={styles.statValue}>🧩 Lv.{group.avg_difficulty.toFixed(1)}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>평균 공포도</span>
                      <span className={styles.statValue}>👻 Lv.{group.avg_fear.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.recentReview}>
                  <span className={styles.reviewLabel}>최근 한줄평</span>
                  <p>"{group.reviews[0].memo || '별점 정보를 남겼습니다.'}"</p>
                  <span className={styles.reviewer}>- {group.reviews[0].profiles?.nickname || '모험가'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🗝️</div>
          <h3>해당 지역에 등록된 테마가 없습니다.</h3>
          <p style={{ marginTop: '0.5rem' }}>첫 번째로 이 지역의 테마를 리뷰해 보세요!</p>
          <Link href="/" className={styles.ctaButton}>
            기록 등록하러 가기
          </Link>
        </div>
      )}
    </div>
  );
}
