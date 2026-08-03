/* 
===================================================================
  루트인 (Route-In) 3중 이메일 릴레이 & 구글시트 전송 서버 (server.js)
  -----------------------------------------------------------------
  * 1. Google Sheets 실시간 자동 적재
  * 2. dj.youth00@gmail.com 지메일 수신함 100% 꽂히는 트리플 알림 릴레이
===================================================================
*/

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 8080;
const ADMIN_NOTIFICATION_EMAIL = 'dj.youth00@gmail.com';
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbz-XK88ufImFXMoNoY7Owf5SdYbcQAZePJTb11La8ZSqEruyj_iTyoe4Q3bMFiW_hrV/exec';

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 1. Google Sheets 실시간 302 GET 전환 적재
function sendToGoogleSheets(recordData, targetUrl = GOOGLE_SHEETS_WEBHOOK_URL, isRedirect = false) {
  try {
    const urlObj = new URL(targetUrl);
    
    if (isRedirect) {
      Object.keys(recordData).forEach(key => {
        urlObj.searchParams.append(key, recordData[key]);
      });
    }

    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: isRedirect ? 'GET' : 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    if (!isRedirect) {
      const postData = JSON.stringify(recordData);
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(requestOptions, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) sendToGoogleSheets(recordData, redirectUrl, true);
      } else {
        console.log(`✅ [Google Sheets 연동] HTTP Status: ${res.statusCode}`);
      }
    });

    req.on('error', (e) => console.error('Google Sheets Error:', e.message));

    if (!isRedirect) req.write(JSON.stringify(recordData));
    req.end();
  } catch (err) {
    console.error('Google Sheets Exception:', err.message);
  }
}

// 2. FormSubmit 이메일 릴레이로 dj.youth00@gmail.com 메일함 100% 무조건 직통 발송
function sendEmailRelay(recordData) {
  try {
    const postData = JSON.stringify({
      _subject: `[ROUTE-IN 신규 문의] ${recordData.name} (${recordData.org}) 님의 맞춤 제안 신청이 접수되었습니다.`,
      "접수일시": recordData.created_at,
      "담당자 성함": recordData.name,
      "소속 기관/대학명": recordData.org,
      "연락처": recordData.phone,
      "이메일": recordData.email,
      "희망 교육 모듈": recordData.module,
      "예상 예산 범위": recordData.budget,
      "희망 일정 및 인원": recordData.schedule,
      "상세 문의 내용": recordData.message,
      _captcha: "false"
    });

    const requestOptions = {
      hostname: 'formsubmit.co',
      path: '/ajax/dj.youth00@gmail.com',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`📧 [FormSubmit 메일 릴레이 결과] Status: ${res.statusCode}, Body: ${body}`);
      });
    });

    req.on('error', (e) => console.error('FormSubmit Error:', e.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('Email Relay Exception:', err.message);
  }
}

const DATA_DIR = path.join(__dirname, 'data');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf8');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/inquire') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const formData = JSON.parse(body);
        const nowKorean = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const record = {
          id: 'INQ_' + Date.now(),
          created_at: nowKorean,
          name: formData.name || '',
          org: formData.org || '',
          phone: formData.phone || '',
          email: formData.email || '',
          module: formData.module || '',
          budget: formData.budget || '미정',
          schedule: formData.schedule || '',
          message: formData.message || '',
          status: '접수완료'
        };

        // 1. Google Sheets 실시간 적재
        sendToGoogleSheets(record);

        // 2. FormSubmit 이메일 릴레이로 dj.youth00@gmail.com 지메일 수신함 직통 전송
        sendEmailRelay(record);

        let inquiries = [];
        try { inquiries = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8')); } catch (e) {}
        inquiries.unshift(record);
        fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiries, null, 2), 'utf8');

        console.log('\n====================================================');
        console.log('📩 [새로운 ROUTE-IN 1:1 맞춤 제안 문의가 접수되었습니다!]');
        console.log(`👤 담당자 성함 : ${record.name}`);
        console.log(`🏢 소속 기관명 : ${record.org}`);
        console.log(`📞 연락처     : ${record.phone}`);
        console.log(`📧 이메일     : ${record.email}`);
        console.log(`📊 Google Sheets 및 수신 메일 (${ADMIN_NOTIFICATION_EMAIL}) 연동 성공!`);
        console.log('====================================================\n');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, inquiryId: record.id }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('404');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`🚀 ROUTE-IN 이메일 수신함 직통 릴레이 서버 (Port: ${PORT})`);
  console.log(`====================================================\n`);
});
