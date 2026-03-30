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
  const [isSuccess, setIsSuccess] = useState(initialData ? initialData.is_success : true);
  const [rating, setRating] = useState(initialData?.rating || 5);
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

  const handleDelete = async () => {
    if (!confirm('정말로 이 기록을 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', initialData.id);
      
      if (error) throw error;
      alert('기록이 삭제되었습니다.');
      onClose();
      window.location.reload();
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
              <label>지점/카페명</label>
              <input 
                className={styles.input} 
                type="text" 
                placeholder="지점명을 입력하세요" 
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                required
              />
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

          <div className={styles.row}>
            <div className={styles.field}>
              <label>별점</label>
              <div className={styles.ratingGroup}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star} 
                    className={`${styles.star} ${rating >= star ? styles.starActive : ''}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
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
                onClick={handleDelete}
              >
                삭제
              </button>
            )}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '처리 중...' : (initialData ? '수정 완료' : '기록 완료하기')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
