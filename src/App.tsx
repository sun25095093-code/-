import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Award, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Check, 
  CalendarDays,
  Smile,
  RefreshCw,
  Flame,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';

// === TYPES ===
interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  startPage: number;
  endPage: number;
  createdAt: number;
  review2Date?: string; // Calculated D+4 review date
  review3Date?: string; // Calculated D+7 review date
  review4Date?: string; // Calculated D+15 review date
  completedReviews: {
    review2: boolean; // 4일 후 복습 완료 여부
    review3: boolean; // 7일 후 복습 완료 여부
    review4: boolean; // 15일 후 복습 완료 여부
  };
}

interface LuckMessage {
  text: string;
  character: string;
}

// === LUCKY MESSAGES DATA ===
const LUCKY_MESSAGES: LuckMessage[] = [
  { text: "오늘 공부를 완벽하게 해내셨군요! 머릿속 지식이 무럭무럭 자라는 중이에요! 🐸💚", character: "🐸 아기 개구리 요정" },
  { text: "포기하지 않고 끝까지 마친 당신이 진정한 챔피언! 시원하고 싱그러운 달콤함을 선물하세요. 🍦🏆", character: "🐸 초록 청개구리 코치" },
  { text: "오늘 입력한 페이지들이 미래의 당신을 반짝반짝 빛나게 해줄 소중한 자산이 될 거예요! 💎✨", character: "🐸 행운의 연잎 요정" },
  { text: "뇌가 무럭무럭 자라는 소리가 들려요! 오늘 밤 푹 자면 지식이 장기기억으로 쏙 저장됩니다. 🧠🌙", character: "🦉 지혜로운 부엉이 교수" },
  { text: "대단해요! 오늘의 성취는 내일의 큰 도약이 될 거예요. 가볍게 기지개 켜고 기분 좋게 쉬어봐요! 🌿🙆‍♂️", character: "🐾 귀여운 개구리 친구" },
  { text: "크으, 집중력 대단하십니다! 럭키 코인 한 개를 획득하셨습니다. 내일도 행운이 가득할 거예요! 🪙🍀", character: "🐸 영리한 개구리 가이드" }
];

// === DATE HELPER FUNCTIONS (일요일 제외 주기 계산) ===
function getTodayDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek}요일)`;
}

// 일요일(0)을 제외하고 N일 후의 날짜 계산
function calculateFutureDateExcludingSundays(dateStr: string, daysToAdd: number): string {
  const date = new Date(dateStr);
  let daysAdded = 0;
  while (daysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0) { // 0 is Sunday
      daysAdded++;
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 일요일(0)을 제외하고 N일 전의 날짜 계산
function calculatePastDateExcludingSundays(dateStr: string, daysToSubtract: number): string {
  const date = new Date(dateStr);
  let daysSubtracted = 0;
  while (daysSubtracted < daysToSubtract) {
    date.setDate(date.getDate() - 1);
    if (date.getDay() !== 0) { // 0 is Sunday
      daysSubtracted++;
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getKoreanDayOfWeek(dateStr: string): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// === SUPABASE BACKGROUND INITIALIZATION ===
const SB_URL = 
  (typeof process !== 'undefined' ? (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) : '') || 
  ((import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_URL as string) : '') || 
  '';

const SB_KEY = 
  (typeof process !== 'undefined' ? (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) : '') || 
  ((import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_ANON_KEY as string) : '') || 
  '';

let supabaseClient: any = null;
if (SB_URL && SB_KEY) {
  try {
    supabaseClient = createClient(SB_URL, SB_KEY);
    console.log("Supabase Client initialized successfully!");
  } catch (err) {
    console.error("Supabase Client init failed:", err);
  }
}

export default function App() {
  // === STATES ===
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Adjust selected date by +/- number of days
  const adjustSelectedDate = (days: number) => {
    const current = new Date(selectedDate);
    if (!isNaN(current.getTime())) {
      current.setDate(current.getDate() + days);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    }
  };
  
  // Input fields
  const [subject, setSubject] = useState<string>('수1(1권)'); // Default '수1(1권)'
  const [startPage, setStartPage] = useState<string>('');
  const [endPage, setEndPage] = useState<string>('');

  // Modals & UI States
  const [showLuckyModal, setShowLuckyModal] = useState<boolean>(false);
  const [currentLuckyMessage, setCurrentLuckyMessage] = useState<LuckMessage>(LUCKY_MESSAGES[0]);
  const [lastSavedSession, setLastSavedSession] = useState<StudySession | null>(null);

  // Calendar view states
  const [currentCalendarYear, setCurrentCalendarYear] = useState<number>(new Date().getFullYear());
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [supabaseRawError, setSupabaseRawError] = useState<string | null>(null);

  // Date Picker ref & custom overlays
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // === INITIALIZATION FROM LOCAL STORAGE OR SUPABASE ===
  useEffect(() => {
    const stored = localStorage.getItem('spaced_study_sessions');
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored sessions:", e);
      }
    }

    if (supabaseClient) {
      fetchFromSupabase();
    }
  }, []);

  const fetchFromSupabase = async () => {
    if (!supabaseClient) return;
    setIsSyncing(true);
    setSupabaseError(null);
    setSupabaseRawError(null);
    try {
      const { data, error } = await supabaseClient
        .from('spaced_study_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn("Supabase load warning (using LocalStorage fallback):", error.message || error);
        setSupabaseRawError(error.message || String(error));
        // If it's a structural or credential issue, capture it gracefully
        if (error.code?.startsWith('42') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setSupabaseError('missing_table');
        } else if (error.message?.includes('JWT') || error.message?.includes('apiKey') || error.message?.includes('invalid')) {
          setSupabaseError('credentials');
        } else {
          setSupabaseError('general');
        }
      } else if (data) {
        const formatted: StudySession[] = data.map((item: any) => ({
          id: item.id,
          date: item.date,
          subject: item.subject,
          startPage: item.start_page,
          endPage: item.end_page,
          createdAt: item.created_at || Date.now(),
          review2Date: item.review2_date || calculateFutureDateExcludingSundays(item.date, 4),
          review3Date: item.review3_date || calculateFutureDateExcludingSundays(item.date, 7),
          review4Date: item.review4_date || calculateFutureDateExcludingSundays(item.date, 15),
          completedReviews: {
            review2: !!item.completed_review2,
            review3: !!item.completed_review3,
            review4: !!item.completed_review4
          }
        }));
        setSessions(formatted);
        localStorage.setItem('spaced_study_sessions', JSON.stringify(formatted));
        setSupabaseError(null);
        setSupabaseRawError(null);
      }
    } catch (err: any) {
      console.warn("Supabase catch load warning:", err?.message || err);
      setSupabaseRawError(err?.message || String(err));
      setSupabaseError('general');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Sessions & Auto-Sync
  const saveSessionsAndSync = async (updatedSessions: StudySession[], deletedId?: string) => {
    setSessions(updatedSessions);
    localStorage.setItem('spaced_study_sessions', JSON.stringify(updatedSessions));

    if (supabaseClient) {
      setIsSyncing(true);
      setSupabaseError(null);
      setSupabaseRawError(null);
      try {
        // If it's a delete, remove from Supabase
        if (deletedId) {
          const { error: delError } = await supabaseClient
            .from('spaced_study_sessions')
            .delete()
            .eq('id', deletedId);
          if (delError) {
            console.warn("Supabase delete warning:", delError.message);
            setSupabaseRawError(delError.message);
          }
        }

        // Upsert all current sessions to Supabase
        const mapped = updatedSessions.map(s => ({
          id: s.id,
          date: s.date,
          subject: s.subject,
          start_page: s.startPage,
          end_page: s.endPage,
          created_at: s.createdAt,
          completed_review2: s.completedReviews.review2,
          completed_review3: s.completedReviews.review3,
          completed_review4: s.completedReviews.review4,
          review2_date: s.review2Date || calculateFutureDateExcludingSundays(s.date, 4),
          review3_date: s.review3Date || calculateFutureDateExcludingSundays(s.date, 7),
          review4_date: s.review4Date || calculateFutureDateExcludingSundays(s.date, 15)
        }));

        if (mapped.length > 0) {
          // 1차 시도: 전체 컬럼 upsert
          let { error } = await supabaseClient
              .from('spaced_study_sessions')
              .upsert(mapped);
          
          // [Schema Self-Healing Fallback]
          // 만약 특정 컬럼이 없어서(42703: undefined_column 등) 에러가 발생한 경우, 
          // 에이징 날짜 컬럼(review2_date 등)을 제외하고 필수 코어 컬럼으로만 2차 시도
          if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
            console.warn("Schema mismatch detected. Retrying upsert with core columns only...");
            const minimalMapped = mapped.map(({ review2_date, review3_date, review4_date, ...rest }) => rest);
            const { error: retryError } = await supabaseClient
              .from('spaced_study_sessions')
              .upsert(minimalMapped);
            error = retryError;
          }

          if (error) {
            console.warn("Supabase upsert warning:", error.message || error);
            setSupabaseRawError(error.message || String(error));
            if (error.code?.startsWith('42') || error.message?.includes('relation') || error.message?.includes('does not exist')) {
              setSupabaseError('missing_table');
            } else if (error.message?.includes('JWT') || error.message?.includes('apiKey') || error.message?.includes('invalid')) {
              setSupabaseError('credentials');
            } else {
              setSupabaseError('general');
            }
          } else {
            setSupabaseError(null);
            setSupabaseRawError(null);
          }
        } else {
          setSupabaseError(null);
          setSupabaseRawError(null);
        }
      } catch (err: any) {
        console.warn("Supabase sync catch warning:", err?.message || err);
        setSupabaseRawError(err?.message || String(err));
        setSupabaseError('general');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // === LOGIC: REVIEWS MATCHING SELECTED DATE (일요일 제외) ===
  // 2차 학습 대상: s.review2Date가 selectedDate와 일치하는 것 (없다면 하위 호환 계산)
  const reviews2 = sessions.filter(s => {
    const r2 = s.review2Date || calculateFutureDateExcludingSundays(s.date, 4);
    return r2 === selectedDate;
  });

  // 3차 학습 대상: s.review3Date가 selectedDate와 일치하는 것 (없다면 하위 호환 계산)
  const reviews3 = sessions.filter(s => {
    const r3 = s.review3Date || calculateFutureDateExcludingSundays(s.date, 7);
    return r3 === selectedDate;
  });

  // 4차 학습 대상: s.review4Date가 selectedDate와 일치하는 것 (없다면 하위 호환 계산)
  const reviews4 = sessions.filter(s => {
    const r4 = s.review4Date || calculateFutureDateExcludingSundays(s.date, 15);
    return r4 === selectedDate;
  });

  const hasAnyReviews = reviews2.length > 0 || reviews3.length > 0 || reviews4.length > 0;

  // === MASCOT & STUDY STATS COMPUTATION ===
  const totalPagesStudied = sessions.reduce((acc, s) => acc + (s.endPage - s.startPage + 1), 0);
  
  let totalOpportunities = 0;
  let completedCount = 0;
  sessions.forEach(s => {
    totalOpportunities += 3;
    if (s.completedReviews.review2) completedCount++;
    if (s.completedReviews.review3) completedCount++;
    if (s.completedReviews.review4) completedCount++;
  });
  const reviewCompletionRate = totalOpportunities > 0 
    ? Math.round((completedCount / totalOpportunities) * 100) 
    : 0;

  // Streak days calculation
  const uniqueDatesSorted = Array.from(new Set<string>(sessions.map(s => s.date))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  let streak = 0;
  if (uniqueDatesSorted.length > 0) {
    let checkDate = new Date();
    // Normalize to Midnight
    checkDate.setHours(0,0,0,0);
    
    // Check if streak is active (today or yesterday)
    const latestSessionDate = new Date(uniqueDatesSorted[0]);
    latestSessionDate.setHours(0,0,0,0);
    
    const diffTime = checkDate.getTime() - latestSessionDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays <= 1) {
      streak = 1;
      for (let i = 0; i < uniqueDatesSorted.length - 1; i++) {
        const d1 = new Date(uniqueDatesSorted[i]);
        d1.setHours(0,0,0,0);
        const d2 = new Date(uniqueDatesSorted[i+1]);
        d2.setHours(0,0,0,0);
        
        // Find day difference excluding Sundays is complicated, let's do a simple day difference first
        const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1 || (diff === 2 && d1.getDay() === 1)) { // 1 day diff, or 2 days diff if d1 is Monday (skipping Sunday)
          streak++;
        } else if (diff > 1) {
          break;
        }
      }
    }
  }

  // === HANDLERS ===
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const startNum = parseInt(startPage);
    const endNum = parseInt(endPage);

    if (isNaN(startNum) || isNaN(endNum) || startNum <= 0 || endNum <= 0) {
      setFormError("올바른 페이지 번호를 입력해주세요!");
      return;
    }

    if (startNum > endNum) {
      setFormError("시작 페이지는 끝 페이지보다 작거나 같아야 합니다.");
      return;
    }

    // Calculate dates
    const r2 = calculateFutureDateExcludingSundays(selectedDate, 4);
    const r3 = calculateFutureDateExcludingSundays(selectedDate, 7);
    const r4 = calculateFutureDateExcludingSundays(selectedDate, 15);

    // Create session
    const newSession: StudySession = {
      id: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      date: selectedDate,
      subject: subject, // '수1', '수2', '확통'
      startPage: startNum,
      endPage: endNum,
      createdAt: Date.now(),
      review2Date: r2,
      review3Date: r3,
      review4Date: r4,
      completedReviews: {
        review2: false,
        review3: false,
        review4: false
      }
    };

    const updated = [newSession, ...sessions];
    saveSessionsAndSync(updated);

    // Set modal info
    const randomMsg = LUCKY_MESSAGES[Math.floor(Math.random() * LUCKY_MESSAGES.length)];
    setCurrentLuckyMessage(randomMsg);
    setLastSavedSession(newSession);
    setShowLuckyModal(true);

    // Clear inputs except subject and date
    setStartPage('');
    setEndPage('');
  };

  const handleDeleteSession = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteSession = () => {
    if (deleteTargetId) {
      const updated = sessions.filter(s => s.id !== deleteTargetId);
      saveSessionsAndSync(updated, deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleToggleReviewComplete = (sessionId: string, stage: 'review2' | 'review3' | 'review4') => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          completedReviews: {
            ...s.completedReviews,
            [stage]: !s.completedReviews[stage]
          }
        };
      }
      return s;
    });
    saveSessionsAndSync(updated);
  };

  // === CALENDAR BUILDING ===
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentCalendarMonth === 0) {
      setCurrentCalendarMonth(11);
      setCurrentCalendarYear(prev => prev - 1);
    } else {
      setCurrentCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalendarMonth === 11) {
      setCurrentCalendarMonth(0);
      setCurrentCalendarYear(prev => prev + 1);
    } else {
      setCurrentCalendarMonth(prev => prev + 1);
    }
  };

  const calendarDaysCount = daysInMonth(currentCalendarYear, currentCalendarMonth);
  const startOffset = firstDayIndex(currentCalendarYear, currentCalendarMonth);
  const calendarCells: (string | null)[] = [];

  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= calendarDaysCount; d++) {
    const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push(dateStr);
  }

  // Find if a date has any registered sessions
  const getSessionsForDate = (dateStr: string) => {
    return sessions.filter(s => s.date === dateStr);
  };

  // Get total remaining review count for selected day
  const remainingReviewsCount = 
    reviews2.filter(s => !s.completedReviews.review2).length +
    reviews3.filter(s => !s.completedReviews.review3).length +
    reviews4.filter(s => !s.completedReviews.review4).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative overflow-x-hidden pb-24">
      {/* Decorative Top-Right Soft Aura Gradient - Frog Green inspired */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-green-100/60 via-transparent to-transparent opacity-70 pointer-events-none"></div>
      
      {/* HEADER SECTION */}
      <header className="relative z-10 px-6 sm:px-10 lg:px-16 pt-10 pb-6 flex justify-between items-end max-w-7xl mx-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Study Automation System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            복습 자동화 <span className="text-green-600">개굴개굴 🐸</span>
          </h1>
        </div>
      </header>

      {/* MAIN CONTAINER (2-Column Grid beautifully balanced for tablet & desktop) */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
        
        {/* LEFT COLUMN: Study entry & Calendar progress */}
        <section className="flex flex-col space-y-6 md:col-span-6">
          
          {/* STUDY INPUT CARD */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:p-8 flex flex-col relative overflow-hidden" id="study-input-form-wrapper">
            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">오늘 공부할 최초 진도 등록</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Elegant native browser-supported date picker wrapper */}
              <div className="flex flex-col space-y-1.5 relative">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block">
                  최초 학습일 날짜 선택
                </label>
                <div 
                  onClick={() => {
                    try {
                      if (dateInputRef.current) {
                        if (typeof dateInputRef.current.showPicker === 'function') {
                          dateInputRef.current.showPicker();
                        } else {
                          dateInputRef.current.click();
                        }
                      }
                    } catch (e) {
                      dateInputRef.current?.click();
                    }
                  }}
                  className="relative flex items-center bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-100 rounded-2xl p-4.5 lg:p-5 transition-all duration-300 cursor-pointer select-none"
                >
                  <span className="text-xl mr-3">📅</span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-800 pr-[140px] truncate">
                    {selectedDate ? `${selectedDate.split('-')[0]}년 ${selectedDate.split('-')[1]}월 ${selectedDate.split('-')[2]}일` : '날짜 선택'}
                  </span>
                  
                  {/* Invisible native input covering the container to display native default browser/forms date picker */}
                  <input 
                    ref={dateInputRef}
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    style={{ colorScheme: 'light' }}
                  />

                  {/* Absolute controls grouped nicely on the right side of the input field */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-30">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSelectedDate(-1);
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-sm"
                      title="1일 빼기"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustSelectedDate(1);
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-sm mr-1"
                      title="1일 더하기"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(getTodayDateString());
                      }}
                      className="text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm bg-green-500 hover:bg-green-600 text-white"
                    >
                      오늘
                    </button>
                  </div>
                </div>
              </div>

              {/* Subject Tag Choices (6가지) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 block">
                  공부할 과목 선택
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {['수1(1권)', '수1(2권)', '수2(3권)', '수2(4권)', '확통(5권)', '확통(6권)'].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubject(sub)}
                      className={`py-3 sm:py-3.5 rounded-2xl font-bold text-sm border-2 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.97] ${
                        subject === sub
                          ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-100'
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-sm">📚</span>
                      <span className="text-sm sm:text-base">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Range inputs with large stylish presentation */}
              <div className="bg-slate-50/80 border-2 border-slate-100 rounded-2xl p-4 lg:p-5">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-2.5">
                  공부한 페이지 범위
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative group">
                    <input 
                      type="number" 
                      min="1"
                      placeholder=""
                      value={startPage}
                      onChange={(e) => {
                        setStartPage(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 lg:py-3.5 text-lg lg:text-xl font-extrabold text-center text-slate-800 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>
                  <span className="text-slate-400 font-bold text-base">~</span>
                  <div className="flex-1 relative group">
                    <input 
                      type="number" 
                      min="1"
                      placeholder=""
                      value={endPage}
                      onChange={(e) => {
                        setEndPage(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 lg:py-3.5 text-lg lg:text-xl font-extrabold text-center text-green-600 outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>
                </div>

                {startPage && endPage && parseInt(startPage) <= parseInt(endPage) && (
                  <div className="mt-2.5 flex items-center gap-1 text-xs text-green-600 font-bold pl-1">
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>오늘 총 {parseInt(endPage) - parseInt(startPage) + 1}페이지를 정복하셨네요!</span>
                  </div>
                )}
              </div>

              {/* Form validation error without browser block */}
              {formError && (
                <div className="text-rose-500 font-bold text-xs bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl flex items-center gap-1.5 animate-pulse">
                  <span>⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Shrunken complete button */}
              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white h-14 lg:h-15 rounded-2xl text-base lg:text-lg font-black shadow-lg shadow-green-100/60 flex items-center justify-center gap-2 active:scale-[0.97] transition-all cursor-pointer"
                id="submit-study-complete-btn"
              >
                <span>오늘의 학습진도 등록하기</span>
              </button>
            </form>
          </div>

          {/* CALENDAR PROGRESS STAMP MAP */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-800 tracking-tight">학습 기록 현황 달력</h3>
                  <p className="text-slate-400 text-[11px] sm:text-xs mt-0.5">날짜를 선택해 복습 임무를 탐색하세요.</p>
                </div>
              </div>

              {/* Calendar controls */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition text-slate-600 cursor-pointer active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 min-w-[80px] text-center font-display">
                  {currentCalendarYear}.{String(currentCalendarMonth + 1).padStart(2, '0')}
                </span>
                <button 
                  onClick={handleNextMonth}
                  className="p-2.5 hover:bg-white hover:shadow-sm rounded-lg transition text-slate-600 cursor-pointer active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase mb-3">
              <div className="text-red-400 py-1">일</div>
              <div className="py-1">월</div>
              <div className="py-1">화</div>
              <div className="py-1">수</div>
              <div className="py-1">목</div>
              <div className="py-1">금</div>
              <div className="text-green-500 py-1">토</div>
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7 gap-2 lg:gap-2.5">
              {calendarCells.map((cellValue, idx) => {
                if (cellValue === null) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/10 rounded-xl" />;
                }

                const dayNum = parseInt(cellValue.split('-')[2]);
                const isSelected = cellValue === selectedDate;
                const dailySessions = getSessionsForDate(cellValue);
                const hasSessions = dailySessions.length > 0;

                const hasR2 = sessions.some(s => (s.review2Date || calculateFutureDateExcludingSundays(s.date, 4)) === cellValue);
                const hasR3 = sessions.some(s => (s.review3Date || calculateFutureDateExcludingSundays(s.date, 7)) === cellValue);
                const hasR4 = sessions.some(s => (s.review4Date || calculateFutureDateExcludingSundays(s.date, 15)) === cellValue);

                return (
                  <button
                    key={`day-${cellValue}`}
                    type="button"
                    onClick={() => setSelectedDate(cellValue)}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2 lg:p-2.5 transition-all border relative cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-green-500 border-green-500 text-white font-bold shadow-md shadow-green-100'
                        : hasSessions
                        ? 'bg-green-50 border-green-100 text-green-800 font-extrabold hover:bg-green-100'
                        : 'bg-white hover:bg-slate-50/60 border-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="text-xs sm:text-sm self-start font-display leading-none">{dayNum}</span>
                    
                    {/* Stamp Indicator with Review Stage Dots */}
                    {(hasSessions || hasR2 || hasR3 || hasR4) && (
                      <div className="flex gap-1 justify-center w-full mt-auto">
                        {hasSessions && (
                          <span 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`}
                            title={`최초 학습: ${dailySessions.map(s => s.subject).join(', ')}`}
                          />
                        )}
                        {hasR2 && (
                          <span 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/90' : 'bg-green-500'}`}
                            title="2차 복습 (D+4)"
                          />
                        )}
                        {hasR3 && (
                          <span 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/90' : 'bg-amber-500'}`}
                            title="3차 복습 (D+7)"
                          />
                        )}
                        {hasR4 && (
                          <span 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/90' : 'bg-rose-500'}`}
                            title="4차 복습 (D+15)"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-5 pt-4 border-t border-slate-100 text-[10px] sm:text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>선택일</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-100 border border-green-200" />
                <span>진도 등록됨</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>최초</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>2차</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>3차</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>4차</span>
              </div>
            </div>
          </div>

        </section>

        {/* RIGHT COLUMN: Today's review missions & Mascot summary card */}
        <section className="flex flex-col space-y-6 md:col-span-6">
          
          {/* TODAY'S REVIEWS MISSON LIST */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:p-8 flex flex-col">
            
            {/* Mission Section Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest">오늘의 복습 미션</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">{formatDateWithDay(selectedDate)}</p>
              </div>
              <span className="text-[11px] sm:text-xs font-black text-green-700 bg-green-50/80 px-3 py-1.5 rounded-full uppercase tracking-wider border border-green-100/60">
                {remainingReviewsCount}개 남음
              </span>
            </div>

            <div className="space-y-5">
              
              {/* === 1. 최초 학습 범위 (선택된 날짜 기준) === */}
              <div className="bg-slate-50/50 rounded-2xl p-4.5 border border-slate-100">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] sm:text-xs font-black text-green-600 uppercase tracking-wider">당일 최초 신규 진도</span>
                </div>
                
                {sessions.filter(s => s.date === selectedDate).length > 0 ? (
                  <div className="space-y-2.5">
                    {sessions.filter(s => s.date === selectedDate).map(s => (
                      <div key={s.id} className="bg-white rounded-xl p-3 lg:p-3.5 border border-slate-100 flex items-start justify-between gap-3 shadow-sm">
                        <div>
                          <p className="text-sm sm:text-base font-black text-slate-800">{s.subject}</p>
                          <p className="text-xs sm:text-sm font-mono font-bold text-slate-500 mt-1">
                            범위: <span className="text-green-600 font-extrabold">{s.startPage}p ~ {s.endPage}p</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/80 p-4 rounded-xl border border-slate-100 text-center text-xs text-slate-400 font-bold leading-relaxed">
                    📖 아직 등록된 최초 공부가 없습니다.<br />
                    좌측에서 공부 진도를 등록해보세요!
                  </div>
                )}
              </div>

              {/* === 2. SECOND REVIEW (2차 복습: D+4, 일요일 제외) === */}
              {reviews2.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs font-black text-green-600 uppercase tracking-wider">2차 복습 (4일 전 진도)</span>
                    <span className="text-[9px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-lg border border-green-100/40">D-4 Target</span>
                  </div>

                  {reviews2.map(s => (
                    <div 
                      key={s.id} 
                      className="group bg-white p-4 lg:p-4.5 rounded-2xl shadow-sm border border-slate-100/80 flex items-center hover:shadow-md transition-all relative"
                    >
                      <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600 mr-3.5 font-display font-black text-base shrink-0">
                        2
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-extrabold text-slate-800 truncate block">{s.subject}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-xs font-bold text-slate-400 shrink-0">{s.date.substring(5)}</span>
                        </div>
                        <p className="text-sm sm:text-base font-black text-slate-700 font-mono">{s.startPage} ~ {s.endPage}p</p>
                      </div>

                      {/* Complete toggle checkbox */}
                      <button
                        onClick={() => handleToggleReviewComplete(s.id, 'review2')}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 ${
                          s.completedReviews.review2
                            ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200'
                            : 'border-slate-200 text-slate-300 hover:border-green-500 hover:bg-green-50/30'
                        }`}
                      >
                        {s.completedReviews.review2 ? (
                          <Check className="w-5 h-5 stroke-[3px]" />
                        ) : (
                          <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* === 3. THIRD REVIEW (3차 복습: D+7, 일요일 제외) === */}
              {reviews3.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs font-black text-amber-600 uppercase tracking-wider">3차 복습 (7일 전 진도)</span>
                    <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100/40">D-7 Target</span>
                  </div>

                  {reviews3.map(s => (
                    <div 
                      key={s.id} 
                      className="group bg-white p-4 lg:p-4.5 rounded-2xl shadow-sm border border-slate-100/80 flex items-center hover:shadow-md transition-all relative"
                    >
                      <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 mr-3.5 font-display font-black text-base shrink-0">
                        3
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-extrabold text-slate-800 truncate block">{s.subject}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-xs font-bold text-slate-400 shrink-0">{s.date.substring(5)}</span>
                        </div>
                        <p className="text-sm sm:text-base font-black text-slate-700 font-mono">{s.startPage} ~ {s.endPage}p</p>
                      </div>

                      <button
                        onClick={() => handleToggleReviewComplete(s.id, 'review3')}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 ${
                          s.completedReviews.review3
                            ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200'
                            : 'border-slate-200 text-slate-300 hover:border-amber-500 hover:bg-amber-50/30'
                        }`}
                      >
                        {s.completedReviews.review3 ? (
                          <Check className="w-5 h-5 stroke-[3px]" />
                        ) : (
                          <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* === 4. FOURTH REVIEW (4차 복습: D+15, 일요일 제외) === */}
              {reviews4.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs font-black text-rose-600 uppercase tracking-wider">4차 복습 (15일 전 진도)</span>
                    <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg border border-rose-100/40">D-15 Target</span>
                  </div>

                  {reviews4.map(s => (
                    <div 
                      key={s.id} 
                      className="group bg-white p-4 lg:p-4.5 rounded-2xl shadow-sm border border-slate-100/80 flex items-center hover:shadow-md transition-all relative"
                    >
                      <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 mr-3.5 font-display font-black text-base shrink-0">
                        4
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-extrabold text-slate-800 truncate block">{s.subject}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <span className="text-xs font-bold text-slate-400 shrink-0">{s.date.substring(5)}</span>
                        </div>
                        <p className="text-sm sm:text-base font-black text-slate-700 font-mono">{s.startPage} ~ {s.endPage}p</p>
                      </div>

                      <button
                        onClick={() => handleToggleReviewComplete(s.id, 'review4')}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90 ${
                          s.completedReviews.review4
                            ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                            : 'border-slate-200 text-slate-300 hover:border-rose-500 hover:bg-rose-50/30'
                        }`}
                      >
                        {s.completedReviews.review4 ? (
                          <Check className="w-5 h-5 stroke-[3px]" />
                        ) : (
                          <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Empty state for reviews */}
              {!hasAnyReviews && (
                <div className="border-2 border-dashed border-slate-200/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2.5 bg-slate-50/50">
                  <span className="text-3xl">🐸</span>
                  <p className="text-xs font-extrabold text-slate-700">남아있는 복습 미션이 없습니다.</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                    선택일 기준 복습 주기에 해당하는 진도가 없습니다. 완벽한 타이밍에 복습 카드가 이곳에 정착합니다.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* BEAUTIFUL FROG MASCOT STATS & MOOD BOARD (Cleverly fills the column to balance heights perfectly) */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 lg:p-8 text-white shadow-xl shadow-green-200/50 relative overflow-hidden flex flex-col justify-between min-h-[340px]">
            {/* Background elements */}
            <div className="absolute -right-12 -bottom-12 w-44 h-44 bg-green-400/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute right-4 top-4 text-8xl opacity-15 select-none pointer-events-none">🐸</div>

            <div>
              <div className="flex items-center gap-2 mb-4.5">
                <span className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-green-100">Study Stats & Mascot</span>
              </div>

              {/* Frog cheer dialog block */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 lg:p-5 border border-white/10 relative mb-6">
                <div className="absolute left-6 -top-2 w-3 h-3 bg-white/10 rotate-45 border-l border-t border-white/10" />
                <p className="text-xs sm:text-sm font-bold leading-relaxed">
                  {remainingReviewsCount === 0 && sessions.length > 0
                    ? "“오늘 계획된 모든 복습 미션 올클리어! 정말 대단해요 개굴! 내일의 성장도 벌써 기대되는걸요?🐸💚”"
                    : sessions.length === 0
                    ? "“새로운 공부를 시작해볼까요? 왼쪽에서 오늘의 진도를 등록하시면 개굴이가 완벽한 복습 주기를 설계해 드려요!🐸✨”"
                    : "“복습은 장기 기억의 지름길 개굴! 오늘 남아있는 복습 미션을 차근차근 해결하며 뇌에 근육을 키워봐요!🐸💪”"
                  }
                </p>
                <span className="text-[10px] sm:text-xs font-black text-green-200 block mt-2.5 text-right">
                  — 청개구리 멘토 개구리
                </span>
              </div>
            </div>

            {/* Quick dashboard stats */}
            <div className="grid grid-cols-3 gap-3.5 mb-5">
              <div className="bg-white/10 backdrop-blur-md border border-white/5 p-3 lg:p-4 rounded-2xl text-center">
                <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1.5" />
                <span className="text-[9px] sm:text-[10px] font-bold text-green-200 block">학습 연속</span>
                <span className="text-sm sm:text-base font-extrabold block">{streak}일째</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/5 p-3 lg:p-4 rounded-2xl text-center">
                <BookOpen className="w-4 h-4 text-blue-300 mx-auto mb-1.5" />
                <span className="text-[9px] sm:text-[10px] font-bold text-green-200 block">정복한 쪽수</span>
                <span className="text-sm sm:text-base font-extrabold block">{totalPagesStudied}p</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/5 p-3 lg:p-4 rounded-2xl text-center">
                <TrendingUp className="w-4 h-4 text-yellow-300 mx-auto mb-1.5" />
                <span className="text-[9px] sm:text-[10px] font-bold text-green-200 block">복습 완료율</span>
                <span className="text-sm sm:text-base font-extrabold block">{reviewCompletionRate}%</span>
              </div>
            </div>

            {/* Supabase Connectivity & Diagnostics Widget */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-extrabold tracking-wider text-green-100 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping"></span>
                  Supabase 연동 상태 진단
                </span>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => {
                    if (supabaseClient) {
                      fetchFromSupabase();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg transition-all active:scale-95 disabled:opacity-50 text-white cursor-pointer"
                  title="연동 데이터 수동 새로고침"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status details */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-green-200">연동 클라이언트:</span>
                  <span className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] ${supabaseClient ? 'bg-green-400/20 text-green-100' : 'bg-red-500/20 text-red-100'}`}>
                    {supabaseClient ? '활성화 (OK)' : '비활성화 (Missing)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-green-200">환경변수 등록 상태:</span>
                  <span className="font-mono text-[10px]">
                    URL: {SB_URL ? '✅ 등록됨' : '❌ 미설정'} | Key: {SB_KEY ? '✅ 등록됨' : '❌ 미설정'}
                  </span>
                </div>

                {supabaseClient ? (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    <span className="text-green-200 text-[10px] block">마지막 연동 상태:</span>
                    {supabaseError ? (
                      <div className="bg-amber-500/20 border border-amber-500/30 text-amber-100 p-2 rounded-lg text-[10.5px] leading-relaxed space-y-1">
                        <p className="font-extrabold">⚠️ 연동 오류 감지</p>
                        {supabaseError === 'missing_table' && (
                          <p>Supabase에 <code className="bg-white/10 px-1 rounded text-white font-mono">spaced_study_sessions</code> 테이블이 없거나 권한이 없습니다. SQL 스크립트를 올바르게 실행했는지 확인해주세요.</p>
                        )}
                        {supabaseError === 'credentials' && (
                          <p>API Key/URL 자격증명이 잘못되었습니다. 복사 붙여넣기 시 공백이 포함되었는지 확인하세요.</p>
                        )}
                        {supabaseError === 'general' && (
                          <p>일반 에러: {supabaseRawError || '연결 실패'}</p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-400/20 border border-green-400/30 text-green-100 p-2 rounded-lg text-[10.5px] flex items-center gap-2">
                        <span className="text-sm">🐸</span>
                        <div>
                          <p className="font-extrabold">실시간 클라우드 동기화 중</p>
                          <p className="text-[9.5px] text-green-200 mt-0.5">최초 진도 등록 및 체크 상태가 Supabase에 즉시 백업되고 있습니다.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-2.5 rounded-lg text-[10.5px] leading-relaxed space-y-2">
                    <p className="font-extrabold text-amber-200">💡 환경변수 미설정 해결 방법:</p>
                    
                    <div className="space-y-1">
                      <p className="font-bold text-[10.5px] text-white">1. AI Studio 미리보기용:</p>
                      <ul className="list-disc list-inside ml-1 text-[10px] text-red-200 space-y-0.5">
                        <li>우측 상단 <b>Settings</b> 메뉴 클릭</li>
                        <li><b>Environment Variables</b>에 등록:</li>
                        <div className="ml-3 font-mono text-[9px] text-white space-y-0.5">
                          <div>- <code className="bg-white/15 px-1 rounded text-green-300">SUPABASE_URL</code></div>
                          <div>- <code className="bg-white/15 px-1 rounded text-green-300">SUPABASE_ANON_KEY</code></div>
                        </div>
                        <li>등록 후 <b>빌드 서버 리스타트</b> & 새로고침</li>
                      </ul>
                    </div>

                    <div className="space-y-1 pt-1.5 border-t border-white/5">
                      <p className="font-bold text-[10.5px] text-white">2. Vercel 배포용 (중요):</p>
                      <p className="text-[10px] text-red-200 leading-normal">
                        Vite 앱은 브라우저 노출을 위해 반드시 접두사 <code className="bg-white/10 px-0.5 rounded text-white font-mono">VITE_</code>가 붙은 환경변수가 필요합니다.
                      </p>
                      <ul className="list-disc list-inside ml-1 text-[10px] text-red-200 space-y-0.5">
                        <li>Vercel 대시보드 &gt; <b>Settings</b> &gt; <b>Environment Variables</b> 진입</li>
                        <li>아래 두 변수를 똑같이 추가:</li>
                        <div className="ml-3 font-mono text-[9px] text-white space-y-0.5">
                          <div>- <code className="bg-white/15 px-1 rounded text-yellow-300">VITE_SUPABASE_URL</code></div>
                          <div>- <code className="bg-white/15 px-1 rounded text-yellow-300">VITE_SUPABASE_ANON_KEY</code></div>
                        </div>
                        <li>추가 후 <b>Deployments</b> 탭에서 <b>Redeploy(재배포)</b> 진행</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* BOTTOM SECTION: ALL STUDY LISTS TABLE (Grand consolidated history timeline) */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 mt-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-green-600" />
                전체 공부 및 에이징 타임라인
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">등록된 최초 학습 데이터의 일요일 제외 복습 수행 현황을 전체적으로 통합 관리합니다. (오래된 순부터 정렬)</p>
            </div>
          </div>

          {sessions.length > 0 ? (
            <div className="overflow-x-auto overflow-y-auto max-h-[440px] xl:max-h-[500px] rounded-2xl border border-slate-100 relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-[11px] sm:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 z-20">
                  <tr>
                    <th className="py-4 px-4.5">최초 학습일</th>
                    <th className="py-4 px-4.5">과목</th>
                    <th className="py-4 px-4.5">공부 범위</th>
                    <th className="py-4 px-4.5 text-center">2차 (D+4)</th>
                    <th className="py-4 px-4.5 text-center">3차 (D+7)</th>
                    <th className="py-4 px-4.5 text-center">4차 (D+15)</th>
                    <th className="py-4 px-4.5 text-right pr-6">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
                  {[...sessions].sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    return a.createdAt - b.createdAt;
                  }).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 sm:py-4 px-4.5 font-bold text-slate-900">
                        {s.date} <span className="text-[10px] sm:text-xs text-slate-400 font-medium">({getKoreanDayOfWeek(s.date)})</span>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4.5 font-extrabold">
                        <span className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs">
                          {s.subject}
                        </span>
                      </td>
                      <td className="py-3.5 sm:py-4 px-4.5 font-mono font-bold text-green-600">
                        <span className="bg-green-50/50 border border-green-100/30 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
                          {s.startPage} ~ {s.endPage}p
                        </span>
                      </td>
                      
                      {/* D+4 Review toggle (일요일 제외 주기) */}
                      <td className="py-3.5 sm:py-4 px-4.5 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold">
                            {(s.review2Date || calculateFutureDateExcludingSundays(s.date, 4)).substring(5).replace('-', '/')}
                          </span>
                          <button
                            onClick={() => handleToggleReviewComplete(s.id, 'review2')}
                            className={`w-6.5 h-6.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                              s.completedReviews.review2
                                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-transparent hover:border-green-400'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </button>
                        </div>
                      </td>

                      {/* D+7 Review toggle (일요일 제외 주기) */}
                      <td className="py-3.5 sm:py-4 px-4.5 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold">
                            {(s.review3Date || calculateFutureDateExcludingSundays(s.date, 7)).substring(5).replace('-', '/')}
                          </span>
                          <button
                            onClick={() => handleToggleReviewComplete(s.id, 'review3')}
                            className={`w-6.5 h-6.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                              s.completedReviews.review3
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-transparent hover:border-amber-400'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </button>
                        </div>
                      </td>

                      {/* D+15 Review toggle (일요일 제외 주기) */}
                      <td className="py-3.5 sm:py-4 px-4.5 text-center">
                        <div className="flex flex-col items-center gap-1 justify-center">
                          <span className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold">
                            {(s.review4Date || calculateFutureDateExcludingSundays(s.date, 15)).substring(5).replace('-', '/')}
                          </span>
                          <button
                            onClick={() => handleToggleReviewComplete(s.id, 'review4')}
                            className={`w-6.5 h-6.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                              s.completedReviews.review4
                                ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-transparent hover:border-rose-400'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </button>
                        </div>
                      </td>

                      {/* Delete option */}
                      <td className="py-3.5 sm:py-4 px-4.5 text-right pr-6">
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center active:scale-90"
                          title="기록 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="font-display text-xs font-bold text-slate-500">기록된 이력이 아직 없습니다.</h4>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5">상단의 입력란을 채워 공부 진도를 추가해보세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* === MODAL: STUDY COMPLETE & REVIEWS & LUCKY MESSAGE === */}
      <AnimatePresence>
        {showLuckyModal && lastSavedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLuckyModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Sparkle Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
              {[...Array(12)].map((_, i) => {
                const randomX = Math.random() * 100;
                const randomY = Math.random() * 100;
                const randomScale = Math.random() * 1.1 + 0.5;
                const randomDelay = Math.random() * 1.5;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0, y: 100 }}
                    animate={{ 
                      scale: [0, randomScale, 0], 
                      opacity: [0, 1, 0],
                      x: [`${randomX - 4}%`, `${randomX}%`, `${randomX + 4}%`],
                      y: [`90%`, `${randomY}%`]
                    }}
                    transition={{ 
                      duration: 2.8, 
                      delay: randomDelay, 
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                    className="absolute text-yellow-400 text-xl select-none"
                    style={{ left: `${randomX}%` }}
                  >
                    ✨
                  </motion.div>
                );
              })}
            </div>

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative z-50"
            >
              {/* Top Banner Accent */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center text-white relative">
                <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[9px] font-bold rounded-full mb-2 uppercase tracking-widest">
                  Success Added
                </span>
                <h3 className="font-display text-lg sm:text-xl font-extrabold tracking-tight">공부 진도가 성공적으로 등록되었습니다! 🐸</h3>
              </div>

              {/* Content Body */}
              <div className="p-6 space-y-5">
                
                {/* 1. STUDY SUMMARY */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">등록된 과목</span>
                    <span className="font-extrabold text-slate-800 text-sm block">
                      {lastSavedSession.subject}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">범위</span>
                    <span className="text-xs font-mono bg-green-50 border border-green-100 text-green-700 font-extrabold px-2 py-0.5 rounded-lg">
                      {lastSavedSession.startPage} ~ {lastSavedSession.endPage}p
                    </span>
                  </div>
                </div>

                {/* 2. REPEATED SCHEDULES */}
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">🔔 스케줄 복습 플래너 (일요일 제외 완료)</span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    
                    {/* 2차 */}
                    <div className="bg-green-50/50 border border-green-100/50 rounded-xl p-2.5 text-center">
                      <span className="text-[9px] font-extrabold text-green-600 block mb-0.5">2차 (D+4)</span>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {calculateFutureDateExcludingSundays(lastSavedSession.date, 4).substring(5).replace('-', '/')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        ({getKoreanDayOfWeek(calculateFutureDateExcludingSundays(lastSavedSession.date, 4))})
                      </span>
                    </div>

                    {/* 3차 */}
                    <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-2.5 text-center">
                      <span className="text-[9px] font-extrabold text-amber-600 block mb-0.5">3차 (D+7)</span>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {calculateFutureDateExcludingSundays(lastSavedSession.date, 7).substring(5).replace('-', '/')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        ({getKoreanDayOfWeek(calculateFutureDateExcludingSundays(lastSavedSession.date, 7))})
                      </span>
                    </div>

                    {/* 4차 */}
                    <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-2.5 text-center">
                      <span className="text-[9px] font-extrabold text-rose-600 block mb-0.5">4차 (D+15)</span>
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {calculateFutureDateExcludingSundays(lastSavedSession.date, 15).substring(5).replace('-', '/')}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        ({getKoreanDayOfWeek(calculateFutureDateExcludingSundays(lastSavedSession.date, 15))})
                      </span>
                    </div>

                  </div>
                </div>

                {/* 3. LUCKY FORTUNE MESSAGE */}
                <div className="bg-gradient-to-br from-green-50 to-green-100/40 border border-green-100 rounded-xl p-4 relative overflow-hidden text-xs">
                  <div className="absolute right-3 bottom-0.5 text-4xl opacity-15 select-none animate-bounce">
                    🐸
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Smile className="w-3.5 h-3.5 text-green-600" />
                    <h4 className="font-display text-[9px] font-extrabold text-green-800 uppercase tracking-wider">
                      {currentLuckyMessage.character}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                    "{currentLuckyMessage.text}"
                  </p>
                </div>

              </div>

              {/* Confirm button */}
              <div className="bg-slate-50 px-5 py-4 flex items-center justify-end border-t border-slate-100">
                <button
                  onClick={() => setShowLuckyModal(false)}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  확인 완료! 🍀
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* === MODAL: DELETE CONFIRMATION === */}
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTargetId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden relative z-50"
            >
              {/* Header */}
              <div className="bg-rose-500 p-5 text-center text-white relative">
                <h3 className="font-display text-base font-extrabold tracking-tight">학습 기록 삭제 🐸</h3>
              </div>

              {/* Content Body */}
              <div className="p-6 text-center space-y-3">
                <p className="text-sm font-extrabold text-slate-800 leading-relaxed">
                  이 학습 기록을 정말 삭제하시겠습니까?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  관련된 모든 복습 임무와 타임라인 일정이 영구적으로 삭제되며 복구할 수 없습니다.
                </p>
              </div>

              {/* Action buttons */}
              <div className="bg-slate-50 px-5 py-4 flex items-center justify-end gap-2 border-t border-slate-100 text-xs font-bold">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={confirmDeleteSession}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition cursor-pointer"
                >
                  네, 삭제합니다
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
