'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './records.module.css';
import Link from 'next/link';
import AddRecordModal from '../../components/AddRecordModal';

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'fail'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'rating-desc'>('date-desc');
  
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('records')
        .select(`
          *,
          record_members!inner (
            user_id,
            profiles (
              profile_img,
              nickname
            )
          )
        `)
        .eq('record_members.user_id', session.user.id);

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records
    .filter(r => {
      const matchesSearch = 
        r.theme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cafe_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'success' && r.is_success) ||
        (filterStatus === 'fail' && !r.is_success);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
      if (sortBy === 'date-asc') return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
      if (sortBy === 'rating-desc') return b.rating - a.rating;
      return 0;
    });

  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    fetchRecords();
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center' }}>
        <p className="gradient-text">기록 목록 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className="gradient-text">전체 탈출 기록</h1>
          <p>지금까지의 모든 방탈출 여정을 한눈에 확인하세요.</p>
        </div>
        <Link href="/" className={styles.backButton}>← 대시보드로</Link>
      </header>

      <div className={styles.controls}>
        <input 
          type="text" 
          placeholder="테마명이나 카페명으로 검색..." 
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className={styles.filterGroup}>
          <select 
            className={styles.select}
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
          >
            <option value="all">전체 결과</option>
            <option value="success">SUCCESS</option>
            <option value="fail">FAIL</option>
          </select>
          <select 
            className={styles.select}
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
          >
            <option value="date-desc">최신순</option>
            <option value="date-asc">오래된순</option>
            <option value="rating-desc">평점 높은순</option>
          </select>
        </div>
      </div>

      <div className={styles.recordList}>
        <div className={styles.recordItem} style={{ fontWeight: 700, opacity: 0.7, borderBottom: '2px solid hsla(0, 0%, 100%, 0.1)', cursor: 'default' }}>
          <span className={styles.date}>날짜</span>
          <span className={styles.themeName}>테마 / 지점</span>
          <span className={styles.badge} style={{ border: 'none', background: 'transparent' }}>결과</span>
          <span className={styles.rating} style={{ color: 'white' }}>평점</span>
          <span className={styles.facepile} style={{ color: 'white', justifyContent: 'center' }}>크루</span>
        </div>

        {filteredRecords.length > 0 ? (
          filteredRecords.map((record) => (
            <div 
              key={record.id} 
              className={`${styles.recordItem} glass`}
              onClick={() => handleEditRecord(record)}
            >
              <span className={styles.date}>{new Date(record.played_at).toLocaleDateString()}</span>
              <div className={styles.themeInfo}>
                <span className={styles.themeName}>{record.theme_name}</span>
                <span className={styles.cafeName}>{record.cafe_name}</span>
              </div>
              <span className={`${styles.badge} ${record.is_success ? styles.badgeSuccess : styles.badgeFail}`}>
                {record.is_success ? 'SUCCESS' : 'FAIL'}
              </span>
              <span className={styles.rating}>⭐ {record.rating}</span>
              <div className={styles.facepile}>
                {record.record_members?.slice(0, 3).map((m: any, i: number) => (
                  <img 
                    key={i} 
                    src={m.profiles?.profile_img || 'https://via.placeholder.com/28'} 
                    className={styles.avatar}
                    title={m.profiles?.nickname}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
            <p>아직 기록이 없습니다.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddRecordModal 
          onClose={handleCloseModal} 
          initialData={selectedRecord}
        />
      )}
    </div>
  );
}
