'use client';

import React, { useState, useEffect } from 'react';
import styles from './AddRecordModal.module.css'; // 기록 모달과 스타일 공유
import { supabase } from '../lib/supabase';

interface AddReservationModalProps {
  onClose: () => void;
  initialData?: any;
}

export default function AddReservationModal({ onClose, initialData }: AddReservationModalProps) {
  const [themeName, setThemeName] = useState(initialData?.theme_name || '');
  const [cafeName, setCafeName] = useState(initialData?.cafe_name || '');
  const [reservedAt, setReservedAt] = useState(initialData?.reserved_at ? initialData.reserved_at.substring(0, 16) : '');
  const [memberCount, setMemberCount] = useState(initialData?.member_count || 2);
  const [memo, setMemo] = useState(initialData?.memo || '');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // 검색 디바운스 (기존 로직 동일)
  useEffect(() => {
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
    setSearchResults([]);
    setShowResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const reservationData = {
        user_id: user.id,
        theme_name: themeName,
        cafe_name: cafeName,
        reserved_at: new Date(reservedAt).toISOString(),
        member_count: Number(memberCount),
        memo: memo,
      };

      if (initialData) {
        // 수정 모드
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', initialData.id);
        if (error) throw error;
        alert('예약 일정이 수정되었습니다.');
      } else {
        // 생성 모드
        const { error } = await supabase
          .from('reservations')
          .insert(reservationData);
        if (error) throw error;
        alert('예약 일정이 성공적으로 등록되었습니다!');
      }

      onClose();
      window.location.reload(); // 간단한 갱신
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 예약을 삭제하시겠습니까?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', initialData.id);
      if (error) throw error;
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: '500px' }}>
        <header className={styles.header}>
          <h2 className="gradient-text">{initialData ? '예약 수정' : '새로운 예약 등록'}</h2>
          <button className={styles.closeButton} onClick={onClose}>&times;</button>
        </header>

        <form className={styles.form} onClick={() => setShowResults(false)} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>방탈출 카페/지점</label>
            <div className={styles.searchContainer} onClick={(e) => e.stopPropagation()}>
              <input 
                className={styles.input} 
                type="text" 
                placeholder="카페명을 검색하거나 입력하세요" 
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                required
              />
              {showResults && searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={styles.searchItem}
                    >
                      <div className={styles.searchItemInfo} onClick={() => selectCafe(item.title)}>
                        <div className={styles.searchItemName}>{item.title}</div>
                        <div className={styles.searchItemAddr}>{item.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label>테마 이름</label>
            <input 
              className={styles.input} 
              type="text" 
              placeholder="예정된 테마명을 입력하세요" 
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field} style={{ flex: 2 }}>
              <label>📅 예약 날짜 및 시간</label>
              <div className={styles.datetimeContainer}>
                <input 
                  className={styles.input} 
                  type="datetime-local" 
                  value={reservedAt}
                  onChange={(e) => setReservedAt(e.target.value)}
                  style={{ fontSize: '1rem', padding: '0.8rem' }}
                  required
                />
              </div>
            </div>
            <div className={styles.field} style={{ flex: 1 }}>
              <label>👥 인원</label>
              <input 
                className={styles.input} 
                type="number" 
                min="1" 
                max="10"
                value={memberCount}
                onChange={(e) => setMemberCount(parseInt(e.target.value))}
                style={{ fontSize: '1rem', padding: '0.8rem', textAlign: 'center' }}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>전략 및 메모 (비공개)</label>
            <textarea 
              className={styles.input} 
              style={{ minHeight: '80px', resize: 'none' }}
              placeholder="탈출 전략이나 메모를 남겨주세요." 
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className={styles.actions} style={{ marginTop: '2rem' }}>
            {initialData && (
              <button 
                type="button" 
                className={styles.deleteButton}
                onClick={handleDelete}
                disabled={loading}
              >
                삭제
              </button>
            )}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '저장 중...' : (initialData ? '수정 완료' : '예약 일정 등록')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
