'use client';

import React, { useState, useEffect } from 'react';
import styles from './AddRecordModal.module.css';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/image-utils';

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
  const [isPublic, setIsPublic] = useState(initialData ? (initialData.is_public ?? true) : true);
  const [selectedAddress, setSelectedAddress] = useState(initialData ? initialData.cafe_address : '');
  const [selectedMapX, setSelectedMapX] = useState(initialData ? initialData.mapx : '');
  const [selectedMapY, setSelectedMapY] = useState(initialData ? initialData.mapy : '');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [verificationLevel, setVerificationLevel] = useState(initialData?.verification_level || 1);
  const [isGpsVerified, setIsGpsVerified] = useState(false);
  
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

  const selectCafe = (title: string, address: string, mapx: string, mapy: string) => {
    setCafeName(title);
    setSelectedAddress(address);
    setSelectedMapX(mapx);
    setSelectedMapY(mapy);
    setSearchResults([]);
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. 이미지 리사이징 (최적화)
      const compressedBlob = await compressImage(file);
      const fileName = `${Date.now()}-${file.name}`;
      
      // 2. Supabase Storage 업로드
      const { data, error } = await supabase.storage
        .from('review-images')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg'
        });

      if (error) throw error;

      // 3. 공개 URL 획득
      const { data: { publicUrl } } = supabase.storage
        .from('review-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      setVerificationLevel(3); // 사진 인증 성공 시 레벨 3 (골드)
      alert('인증 사진이 정상적으로 업로드되었습니다!');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert('사진 업로드에 실패했습니다. 버킷 설정을 확인해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handleGpsVerify = () => {
    if (!selectedMapX || !selectedMapY) {
      alert('먼저 지점을 검색하고 선택해 주세요.');
      return;
    }

    if (!navigator.geolocation) {
      alert('브라우저가 현재 위치 기능을 지원하지 않습니다.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        
        // Naver mapx/mapy (KATECH) -> WGS84 (Lat/Lng) 근사 변환 
        // 127xxxx, 37xxxx 형태로 들어오므로 10,000,000으로 나누어 비교 (단순 비교 방식)
        const targetLng = Number(selectedMapX) / 10000000;
        const targetLat = Number(selectedMapY) / 10000000;
        
        // 정밀 변환이 아니므로 임시로 0.005(약 500m) 오차 범위 허용
        const diffLat = Math.abs(latitude - targetLat);
        const diffLng = Math.abs(longitude - targetLng);

        if (diffLat < 0.005 && diffLng < 0.005) {
          setIsGpsVerified(true);
          setVerificationLevel(3); // GPS 인증 성공도 골드 레벨
          alert('위치 인증에 성공했습니다! 골드 배지가 활성화되었습니다. 📍');
        } else {
          alert(`현재 위치가 매장(약 ${targetLat.toFixed(2)}, ${targetLng.toFixed(2)})과 너무 멉니다.\n방문 중일 때만 위치 인증이 가능합니다.`);
        }
        setLocationLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('위치 정보를 가져오지 못했습니다. 권한 설정을 확인해 주세요.');
        setLocationLoading(false);
      }
    );
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
        is_public: isPublic,
        cafe_address: selectedAddress,
        region: selectedAddress ? (selectedAddress.split(' ')[0]) : '미지정',
        memo: memo.trim(),
        image_url: imageUrl,
        verification_level: verificationLevel,
        mapx: selectedMapX,
        mapy: selectedMapY,
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
        const { data: newRecord, error } = await supabase
          .from('records')
          .insert({ ...recordData, user_id: user.id })
          .select()
          .single();
          
        if (error) throw error;

        // 생성 직후 나 자신을 멤버 목록에 자동으로 추가 (대시보드 표시를 위해 필수)
        const { error: memberError } = await supabase
          .from('record_members')
          .insert({ record_id: newRecord.id, user_id: user.id });

        if (memberError) throw memberError;

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
            onClick={() => onChange(value === star ? 0 : star)}
          >
            ★
          </span>
        ))}
        <span className={styles.ratingValue}>{value === 0 ? '없음' : `${value}점`}</span>
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
                      >
                      <div className={styles.searchItemInfo} onClick={() => selectCafe(item.title, item.address, item.mapx, item.mapy)}>
                        <div className={styles.searchItemName}>{item.title}</div>
                        <div className={styles.searchItemAddr}>{item.address}</div>
                      </div>
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
            <StarRating label="🏆 만족도" value={rating} onChange={setRating} />
          </div>

          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label>📸 인증 사진 첨부 (선택)</label>
            <div className={styles.uploadBox}>
              {imageUrl ? (
                <div className={styles.previewContainer}>
                  <img src={imageUrl} alt="Review" className={styles.previewImage} />
                  <button type="button" className={styles.removeImage} onClick={() => { setImageUrl(''); setVerificationLevel(1); }}>삭제</button>
                </div>
              ) : (
                <label className={styles.uploadLabel}>
                  {uploading ? '업로드 중...' : '📷 사진 올리고 골드 배지 받기'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                    hidden 
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
            <p className={styles.tip}>사진을 등록하면 전시관에서 '인증된 리뷰' 표시가 붙습니다.</p>
          </div>

          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label>📍 현재 위치 인증 (선택)</label>
            <button 
              type="button" 
              className={`${styles.locationButton} ${isGpsVerified ? styles.verified : ''}`}
              onClick={handleGpsVerify}
              disabled={locationLoading || isGpsVerified || !selectedAddress}
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                border: '1px solid hsla(0, 0%, 100%, 0.1)',
                background: isGpsVerified ? 'hsla(145, 100%, 50%, 0.1)' : 'hsla(0, 0%, 100%, 0.05)',
                color: isGpsVerified ? '#4ade80' : 'white',
                fontWeight: 600,
                cursor: selectedAddress ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {locationLoading ? '위치 확인 중...' : isGpsVerified ? '✅ 위치 인증 완료' : '매장 방문 중인가요? 인증하기'}
            </button>
            <p className={styles.tip}>현장에서 인증하면 전시관 상세 정보에 '위치 인증됨' 표시가 붙습니다.</p>
          </div>

          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label>💬 한줄평 (리뷰)</label>
            <textarea 
              className={styles.input} 
              style={{ minHeight: '80px', resize: 'none' }}
              placeholder="테마에 대한 생생한 후기를 남겨주세요." 
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>💬 리뷰 공개 설정</label>
              <div 
                className={`${styles.toggle} ${isPublic ? styles.toggleActive : ''}`}
                onClick={() => setIsPublic(!isPublic)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isPublic ? '🌐 전체 공개 (커뮤니티 노출)' : '🔒 나만 보기 (비공개)'}
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>
                전체 공개 시 다른 사용자들이 커뮤니티에서 이 리뷰를 볼 수 있습니다.
              </p>
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
                onClick={isOwner ? handleDelete : handleLeave}
              >
                {isOwner ? '전체 기록 삭제' : '이 기록에서 나가기'}
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
