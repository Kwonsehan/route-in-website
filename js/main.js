/* 
===================================================================
  루트인 (Route-In) 메인 JS - 구글 시트 + 이메일 fetch 직접 전송
  -------------------------------------------------------------------
  * fetch()로 Apps Script에 JSON POST → 구글 시트 적재 + 이메일 발송
  * 구글 302 리다이렉트 대응: fetch redirect:'follow' 사용
===================================================================
*/

document.addEventListener('DOMContentLoaded', () => {

  // ── 갤러리 슬라이더 ─────────────────────────────────────────────
  const galleryTrack  = document.getElementById('galleryTrack');
  const galleryPrevBtn = document.getElementById('galleryPrevBtn');
  const galleryNextBtn = document.getElementById('galleryNextBtn');
  const galleryDots   = document.querySelectorAll('#galleryDots .dot');
  const slides        = document.querySelectorAll('.gallery-slide');
  let currentGalleryIndex = 0;
  const totalGallerySlides = slides.length;
  let galleryTimer = null;

  function updateGallerySlider(index) {
    if (!galleryTrack) return;
    if (index < 0) currentGalleryIndex = totalGallerySlides - 1;
    else if (index >= totalGallerySlides) currentGalleryIndex = 0;
    else currentGalleryIndex = index;
    galleryTrack.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
    galleryDots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentGalleryIndex));
  }
  function startGalleryTimer() {
    stopGalleryTimer();
    galleryTimer = setInterval(() => updateGallerySlider(currentGalleryIndex + 1), 3500);
  }
  function stopGalleryTimer() { if (galleryTimer) clearInterval(galleryTimer); }

  if (galleryTrack && slides.length > 0) {
    if (galleryPrevBtn) galleryPrevBtn.addEventListener('click', () => { updateGallerySlider(currentGalleryIndex - 1); startGalleryTimer(); });
    if (galleryNextBtn) galleryNextBtn.addEventListener('click', () => { updateGallerySlider(currentGalleryIndex + 1); startGalleryTimer(); });
    galleryDots.forEach((dot, idx) => dot.addEventListener('click', () => { updateGallerySlider(idx); startGalleryTimer(); }));
    const galleryViewport = document.getElementById('galleryViewport');
    if (galleryViewport) {
      galleryViewport.addEventListener('mouseenter', stopGalleryTimer);
      galleryViewport.addEventListener('mouseleave', startGalleryTimer);
    }
    startGalleryTimer();
  }

  // ── 라이트박스 ─────────────────────────────────────────────────
  const imageLightboxModal = document.getElementById('imageLightboxModal');
  const lightboxImg        = document.getElementById('lightboxImg');
  const lightboxTitle      = document.getElementById('lightboxTitle');
  const lightboxTag        = document.getElementById('lightboxTag');
  const lightboxCounter    = document.getElementById('lightboxCounter');
  const lightboxCloseBtn   = document.getElementById('lightboxCloseBtn');
  const lightboxPrevBtn    = document.getElementById('lightboxPrevBtn');
  const lightboxNextBtn    = document.getElementById('lightboxNextBtn');
  let activeLightboxIndex = 0;

  function showLightboxSlide(index) {
    if (!slides || slides.length === 0) return;
    if (index < 0) activeLightboxIndex = slides.length - 1;
    else if (index >= slides.length) activeLightboxIndex = 0;
    else activeLightboxIndex = index;
    const img = slides[activeLightboxIndex].querySelector('img');
    if (!img) return;
    lightboxImg.style.opacity = '0.3';
    setTimeout(() => {
      lightboxImg.src = img.getAttribute('data-full') || img.getAttribute('src');
      lightboxImg.alt = img.getAttribute('data-title') || img.getAttribute('alt');
      if (lightboxTitle) lightboxTitle.textContent = img.getAttribute('data-title') || img.getAttribute('alt');
      if (lightboxTag)   lightboxTag.textContent   = img.getAttribute('data-tag') || '📸 ROUTE-IN 현장 스케치';
      if (lightboxCounter) lightboxCounter.textContent = `${activeLightboxIndex + 1} / ${slides.length}`;
      lightboxImg.style.opacity = '1';
    }, 150);
  }

  function closeLightbox() {
    imageLightboxModal?.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (slides && imageLightboxModal) {
    slides.forEach((slide, idx) => slide.addEventListener('click', () => { showLightboxSlide(idx); imageLightboxModal.classList.add('active'); document.body.style.overflow = 'hidden'; }));
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); showLightboxSlide(activeLightboxIndex - 1); });
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', (e) => { e.stopPropagation(); showLightboxSlide(activeLightboxIndex + 1); });
    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    imageLightboxModal.addEventListener('click', (e) => { if (e.target === imageLightboxModal) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!imageLightboxModal.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showLightboxSlide(activeLightboxIndex - 1);
      else if (e.key === 'ArrowRight') showLightboxSlide(activeLightboxIndex + 1);
    });
  }

  // ── 테마 토글 ──────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('routein_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('routein_theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    themeToggleBtn.title = theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
  }

  // ── 모바일 메뉴 ────────────────────────────────────────────────
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu      = document.getElementById('navMenu');
  const navOverlay   = document.getElementById('navOverlay');
  function toggleMobileMenu() {
    const isActive = navMenu?.classList.contains('mobile-active');
    navMenu?.classList.toggle('mobile-active', !isActive);
    mobileToggle?.classList.toggle('active', !isActive);
    navOverlay?.classList.toggle('active', !isActive);
    document.body.style.overflow = isActive ? '' : 'hidden';
  }
  mobileToggle?.addEventListener('click', toggleMobileMenu);
  navOverlay?.addEventListener('click', toggleMobileMenu);
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { if (navMenu?.classList.contains('mobile-active')) toggleMobileMenu(); }));

  // ── 헤더 스크롤 ────────────────────────────────────────────────
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 40));

  // ── 카운터 애니메이션 ──────────────────────────────────────────
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;
  const countUp = (el) => {
    const target = parseFloat(el.getAttribute('data-target'));
    const suffix = el.getAttribute('data-suffix') || '';
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const totalFrames = Math.round(1800 / (1000 / 60));
    let frame = 0;
    const counter = setInterval(() => {
      frame++;
      const val = target * (1 - Math.pow(1 - frame / totalFrames, 3));
      el.textContent = val.toFixed(decimals) + suffix;
      if (frame === totalFrames) { clearInterval(counter); el.textContent = target.toFixed(decimals) + suffix; }
    }, 1000 / 60);
  };
  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !animated) { statNumbers.forEach(countUp); animated = true; }
    }, { threshold: 0.4 }).observe(heroStats);
  }

  // ── 모듈 탭 필터 ───────────────────────────────────────────────
  const tabBtns    = document.querySelectorAll('.tab-btn');
  const moduleCards = document.querySelectorAll('.module-card');
  tabBtns.forEach(btn => btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.getAttribute('data-filter');
    moduleCards.forEach(card => {
      const show = filter === 'all' || card.getAttribute('data-category') === filter;
      card.style.opacity = '0';
      card.style.transform = 'translateY(15px)';
      setTimeout(() => {
        card.style.display = show ? 'flex' : 'none';
        if (show) setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 50);
      }, 300);
    });
  }));

  // ── 모바일 모듈 카드 터치 ──────────────────────────────────────
  moduleCards.forEach(card => card.addEventListener('click', () => {
    if (window.innerWidth <= 992) {
      moduleCards.forEach(c => { if (c !== card) c.classList.remove('mobile-active'); });
      card.classList.toggle('mobile-active');
    }
  }));

  // ── 성공 모달 ──────────────────────────────────────────────────
  const successModal       = document.getElementById('successModal');
  const successModalCloseBtn = document.getElementById('successModalCloseBtn');
  const successConfirmBtn  = document.getElementById('successConfirmBtn');

  function openSuccessModal() {
    if (successModal) { successModal.classList.add('active'); document.body.style.overflow = 'hidden'; }
  }
  function closeSuccessModal() {
    if (successModal) { successModal.classList.remove('active'); document.body.style.overflow = ''; }
  }
  successModalCloseBtn?.addEventListener('click', closeSuccessModal);
  successConfirmBtn?.addEventListener('click', closeSuccessModal);
  successModal?.addEventListener('click', (e) => { if (e.target === successModal) closeSuccessModal(); });

  // ═══════════════════════════════════════════════════════════════
  // ★★★ 폼 제출 핵심 로직 ★★★
  //
  // 신청 버튼 클릭 시 동시에 2가지를 처리합니다:
  //   1. Web3Forms API 전송  → Web3Forms 서버가 dj.youth00@gmail.com 수신함으로 직통 이메일 발송
  //   2. Apps Script 전송   → 구글 스프레드시트에 행 자동 적재
  //
  // Web3Forms는 외부 서버에서 발송하므로
  // Gmail 자기전송 차단 정책 완전 우회! ✅
  // ═══════════════════════════════════════════════════════════════
  const contactForm = document.getElementById('routeInContactForm');
  const submitBtn   = contactForm?.querySelector('[type="submit"]');

  // ── Web3Forms Access Key (dj.youth00@gmail.com 수신함 직통 이메일 발송) ──
  const WEB3FORMS_KEY = '9aaf4ce2-618e-4938-9ec3-2d4802c3cc02';

  // ── 구글 Apps Script 웹앱 URL (구글 시트 엑셀 적재용) ──
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-XK88ufImFXMoNoY7Owf5SdYbcQAZePJTb11La8ZSqEruyj_iTyoe4Q3bMFiW_hrV/exec';

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 버튼 로딩 상태
      if (submitBtn) { submitBtn.textContent = '⏳ 전송 중...'; submitBtn.disabled = true; }

      // 폼 데이터 수집
      const name     = document.getElementById('formName')?.value        || '';
      const org      = document.getElementById('formOrg')?.value         || '';
      const phone    = document.getElementById('formPhone')?.value       || '';
      const email    = document.getElementById('formEmail')?.value       || '';
      const module_  = document.getElementById('formModuleSelect')?.value || '';
      const budget   = document.getElementById('formBudget')?.value      || '';
      const schedule = document.getElementById('formSchedule')?.value    || '';
      const message  = document.getElementById('formMsg')?.value         || '';

      // ── 1. Web3Forms API 전송 (dj.youth00@gmail.com 수신함 직통 이메일 알림) ──
      // Web3Forms 서버에서 외부 발신 → 구글 자기전송 차단 정책 완전 우회
      const web3Promise = fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `[★ROUTE-IN 신규문의★] ${name} / ${org}`,
          name:    name,
          email:   email,
          '소속 기관':     org,
          '연락처':        phone,
          '희망 교육 모듈': module_,
          '예상 예산 범위': budget,
          '희망 일정/인원': schedule,
          '상세 문의 내용': message,
          // 스팸 봇 차단
          botcheck: '',
        }),
      }).catch(err => console.warn('[Web3Forms] 전송 오류:', err));

      // ── 2. Apps Script 전송 (구글 시트 엑셀 적재용) ─────────────
      const appsScriptPromise = fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ name, org, phone, email, module: module_, budget, schedule, message }),
      }).catch(err => console.warn('[Apps Script] 전송 오류:', err));

      // 두 전송 동시 실행
      await Promise.allSettled([web3Promise, appsScriptPromise]);

      // 성공 모달 & 폼 초기화
      contactForm.reset();
      openSuccessModal();

      // 버튼 복구
      if (submitBtn) { submitBtn.textContent = '교육 및 사업 문의 신청하기'; submitBtn.disabled = false; }
    });
  }

});
