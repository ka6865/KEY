'use client';

import React, { useState, useEffect } from 'react';
import styles from './AddRecordModal.module.css';
import { supabase } from '../lib/supabase';

interface Theme {
  id: string;
  name: string;
  cafe_name: string;
}

interface AddRecordModalProps {
  onClose: () => void;
  initialData?: any;
}

export default function AddRecordModal({ onClose, initialData }: AddRecordModalProps) {
  const [themeName, setThemeName] = useState(initialData?.theme_name || '');
  const [cafeName, setCafeName] = useState(initialData?.cafe_name || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSuccess, setIsSuccess] = useState(initialData ? initialData.is_success : true);
  
  // 검색 디바운스
  useEffect(() => {
    // 1. 값이 비어있거나, 초기값과 동일하면 검색하지 않음 (초기 로딩 시 팝업 방지)
    if (!cafeName.trim() || cafeName === initialData?.cafe_name) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(cafeName)}`);
        const data = await res.json();
        if (data.items) {
          // HTML 태그 제거 (네이버 검색 결과에는 <b> 등이 포함됨)
          const cleanItems = data.items.map((item: any) => ({
            ...item,
            title: item.title.replace(/<[^>]*>?/gm, ''),
            address: item.address
          }));
          setSearchResults(cleanItems);
          setShowResults(true);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cafeName, initialData]);

  const selectCafe = (title: string) => {
    setCafeName(title);
    setShowResults(false);
  };
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [ratingMechanisms, setRatingMechanisms] = useState(initialData?.rating_mechanisms || 0);
  const [ratingFear, setRatingFear] = useState(initialData?.rating_fear || 0);
  const [ratingDifficulty, setRatingDifficulty] = useState(initialData?.rating_difficulty || 0);
  const [hints, setHints] = useState(initialData?.hints_used || 0);
  const [date, setDate] = useState(initialData?.played_at || new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const inviteLink = initialData ? `${window.location.origin}/invite/${initialData.id}` : '';

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('초대 링크가 복사되었습니다!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeName.trim()) {
      alert('테마 이름을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      const recordData = {
        theme_name: themeName.trim(),
        cafe_name: cafeName.trim(),
        is_success: isSuccess,
        rating,
        rating_mechanisms: ratingMechanisms,
        rating_fear: ratingFear,
        rating_difficulty: ratingDifficulty,
        hints_used: hints,
        played_at: date,
      };

      if (initialData) {
        // 수정 모드
        const { error } = await supabase
          .from('records')
          .update(recordData)
          .eq('id', initialData.id);
        if (error) throw error;
        alert('기록이 수정되었습니다.');
      } else {
        // 생성 모드
        const { error } = await supabase
          .from('records')
          .insert({ ...recordData, user_id: user.id });
        if (error) throw error;
        alert('탈출 기록이 성공적으로 저장되었습니다!');
      }

      onClose();
      window.location.reload(); 
    } catch (err: any) {
      alert(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const isOwner = currentUser?.id === initialData?.user_id;

  const handleLeave = async () => {
    if (!confirm('이 기록에서 정말로 나가시겠습니까?\n내 목록에서만 삭제되며 다른 친구들에겐 유지됩니다.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('record_members')
        .delete()
        .eq('record_id', initialData.id)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      alert('기록에서 나갔습니다.');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 기록을 삭제하시겠습니까?\n모든 참여자의 목록에서 완전히 사라집니다.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', initialData.id);
      
      if (error) throw error;
      alert('기록이 완전히 삭제되었습니다.');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number, onChange: (v: number) => void, label: string }) => (
    <div className={styles.ratingField}>
      <label>{label}</label>
      <div className={styles.ratingGroup}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span 
            key={star} 
            className={`${styles.star} ${value >= star ? styles.starActive : ''}`}
            onClick={() => onChange(star)}
          >
            ★
          </span>
        ))}
        <span className={styles.ratingValue}>{value}점</span>
      </div>
    </div>
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className="gradient-text">{initialData ? '기록 상세보기' : '새로운 탈출 기록'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>방탈출 테마 이름</label>
              <input 
                className={styles.input} 
                type="text" 
                placeholder="테마명을 입력하세요" 
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                autoFocus 
                required
              />
            </div>
            <div className={styles.field}>
              <label>지점/카페명 (검색 가능)</label>
              <div className={styles.searchContainer}>
                <input 
                  className={styles.input} 
                  type="text" 
                  placeholder="예: 강남 키이스케이프" 
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  onFocus={() => setShowResults(searchResults.length > 0)}
                  required
                />
                
                {showResults && searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={styles.searchItem}
                        onClick={() => selectCafe(item.title)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.address}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>성공 여부</label>
              <div className={styles.toggleGroup}>
                <button 
                  type="button" 
                  className={`${styles.toggle} ${isSuccess ? styles.toggleActive : ''}`}
                  onClick={() => setIsSuccess(true)}
                >
                  SUCCESS
                </button>
                <button 
                  type="button" 
                  className={`${styles.toggle} ${!isSuccess ? styles.toggleActive : ''}`}
                  onClick={() => setIsSuccess(false)}
                >
                  FAIL
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label>기록 날짜</label>
              <input 
                className={styles.input} 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.ratingSection}>
            <StarRating label="🧱 장치/연출" value={ratingMechanisms} onChange={setRatingMechanisms} />
            <StarRating label="👻 공포도" value={ratingFear} onChange={setRatingFear} />
            <StarRating label="🧠 난이도" value={ratingDifficulty} onChange={setRatingDifficulty} />
            <StarRating label="🏆 총평" value={rating} onChange={setRating} />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>사용 힌트 수</label>
              <input 
                className={styles.input} 
                type="number" 
                min="0"
                value={hints}
                onChange={(e) => setHints(Number(e.target.value))}
              />
            </div>
          </div>

          {initialData && (
            <div className={styles.inviteSection}>
              <h3 className={styles.inviteHeader}>친구 초대하기</h3>
              <p className={styles.inviteDesc}>이 기록을 공유하여 친구의 아카이브에도 남기세요.</p>
              <div className={styles.inviteLinkBox}>
                <input readOnly className={styles.copyInput} value={inviteLink} />
                <button type="button" className={styles.copyButton} onClick={handleCopyInvite}>복사</button>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            {initialData && (
              <button 
                type="button" 
                className={styles.deleteButton}
                onClick={isOwner ? handleDelete : handleLeave}
              >
                {isOwner ? '전체 기록 삭제' : '이 기록에서 나가기'}
              </button>
            )}
            
            {(!initialData || isOwner) ? (
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? '처리 중...' : (initialData ? '수정 완료' : '기록 완료하기')}
              </button>
            ) : (
              <button 
                type="button" 
                className={styles.submitButton}
                onClick={onClose}
              >
                닫기
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
