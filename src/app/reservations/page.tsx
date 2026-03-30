'use client';

import React, { useState, useEffect } from 'react';
import styles from '../page.module.css';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import AddReservationModal from '../../components/AddReservationModal';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id)
        .order('reserved_at', { ascending: true });

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDDay = (dateStr: string) => {
    const reserved = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((reserved - now) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'D-DAY';
    if (diff < 0) return `완료됨 (D${diff})`;
    return `D-${diff}`;
  };

  if (loading) {
    return <div className={styles.main}><p className="gradient-text" style={{ padding: '4rem', textAlign: 'center' }}>일정을 불러오는 중...</p></div>;
  }

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 className="gradient-text">THE KEY</h1>
          </Link>
          <p>내 손안의 예약 일정 관리</p>
        </div>
        <button 
          className={`${styles.navButton} ${styles.primaryButton}`}
          onClick={() => {
            setSelectedRes(null);
            setIsModalOpen(true);
          }}
        >
          + 일정 등록
        </button>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>다가올 모험 <span style={{ opacity: 0.5 }}>({reservations.filter(r => new Date(r.reserved_at) > new Date()).length})</span></h2>
        
        {reservations.length > 0 ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {reservations.map((res) => {
              const isPast = new Date(res.reserved_at) < new Date();
              return (
                <div 
                  key={res.id} 
                  className="glass glow-hover" 
                  style={{ 
                    padding: '2rem', 
                    borderRadius: '24px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    opacity: isPast ? 0.5 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedRes(res);
                    setIsModalOpen(true);
                  }}
                >
                  <div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: isPast ? 'transparent' : 'var(--accent)', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '50px',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      display: 'inline-block'
                    }}>
                      {getDDay(res.reserved_at)}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{res.theme_name}</h3>
                    <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>📍 {res.cafe_name}</p>
                    <p style={{ opacity: 0.5, fontSize: '0.75rem', marginTop: '0.5rem' }}>📅 {new Date(res.reserved_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{res.member_count}인</span>
                    <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>예정 모험가</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass" style={{ padding: '6rem 2rem', textAlign: 'center', borderRadius: '32px', border: '1px dashed hsla(0,0%,100%,0.1)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📅</div>
            <h3>아직 예정된 모험이 없습니다.</h3>
            <p style={{ opacity: 0.5, marginTop: '1rem', marginBottom: '2rem' }}>미리 일정을 등록하고 기록을 준비하세요.</p>
            <button 
              className={`${styles.navButton} ${styles.primaryButton}`}
              onClick={() => setIsModalOpen(true)}
              style={{ margin: '0 auto' }}
            >
              지금 예약 일정 등록하기
            </button>
          </div>
        )}
      </section>

      {isModalOpen && (
        <AddReservationModal 
          onClose={() => setIsModalOpen(false)}
          initialData={selectedRes}
        />
      )}
    </div>
  );
}
