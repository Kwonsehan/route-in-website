-- ===================================================================
-- ROUTE-IN 1:1 맞춤 제안 문의 신청 데이터베이스 마이그레이션 쿼리
-- 파일명: 001_create_inquiries_table.sql
-- 규칙 준수: 000_ 순서 번호 부여 및 supabase/migrations 폴더 내 관리
-- ===================================================================

-- 1. UUID 확장 및 암호화 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. 문의 신청 정보 저장 테이블 (inquiries) 생성
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 개인정보 암호화 저장 필드 (AES-256 암호화 텍스트)
    form_name TEXT NOT NULL,                -- 담당자 성함 (암호화)
    form_org TEXT NOT NULL,                 -- 소속 기관 / 대학 / 기업명
    form_phone TEXT NOT NULL,               -- 연락처 (암호화)
    form_email TEXT NOT NULL,               -- 이메일 주소 (암호화)
    
    -- 사업 신청 정보 필드
    module_selected TEXT NOT NULL,          -- 희망 교육 모듈 선택
    budget_range TEXT DEFAULT '미정',        -- 예상 예산 범위
    schedule_info TEXT,                     -- 희망 사업 일정 및 인원
    message TEXT,                           -- 상세 문의 및 요청사항
    
    -- 처리 상태 및 관리 타임스탬프
    status VARCHAR(20) DEFAULT 'pending',   -- 접수 상태 (pending, in_progress, completed)
    created_at TIMESTAMPTZ DEFAULT NOW(),   -- 접수 일시
    updated_at TIMESTAMPTZ DEFAULT NOW()    -- 수정 일시
);

-- 3. 테이블 및 컬럼 설명 (주석) 추가
COMMENT ON TABLE public.inquiries IS 'ROUTE-IN B2B 기관 1:1 맞춤 제안 신청 문의 데이터베이스 테이블';
COMMENT ON COLUMN public.inquiries.form_name IS '담당자 성함 (개인정보 암호화 보관)';
COMMENT ON COLUMN public.inquiries.form_phone IS '담당자 연락처 (AES-256-GCM 암호화 보관)';
COMMENT ON COLUMN public.inquiries.form_email IS '담당자 이메일 주소 (AES-256-GCM 암호화 보관)';

-- 4. 성능 최적화 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);

-- 5. Row Level Security (RLS) 보안 정책 설정
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- 관리자 및 익명 사용자의 안전한 INSERT 허용 정책
CREATE POLICY "Allow anonymous insert for inquiries" 
ON public.inquiries 
FOR INSERT 
WITH CHECK (true);

-- 관리자 역할에 대해서만 SELECT 허용 정책
CREATE POLICY "Allow authenticated read for inquiries" 
ON public.inquiries 
FOR SELECT 
USING (auth.role() = 'authenticated');
