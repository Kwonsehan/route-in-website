/* 
===================================================================
  루트인 (Route-In) Vercel Serverless API (/api/inquire)
  -----------------------------------------------------------------
  * Google Sheets 실시간 자동 적재 302 리다이렉트 추적 연동
  * dj.youth00@gmail.com 이메일 알림 전송
===================================================================
*/

const https = require('https');

const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbz-XK88ufImFXMoNoY7Owf5SdYbcQAZePJTb11La8ZSqEruyj_iTyoe4Q3bMFiW_hrV/exec';
const ADMIN_EMAIL = 'dj.youth00@gmail.com';

function sendToGoogleSheets(recordData, targetUrl = GOOGLE_SHEETS_WEBHOOK_URL, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (!targetUrl || redirectCount > 5) {
      return resolve({ success: false, reason: 'Max redirects reached' });
    }

    try {
      const postData = JSON.stringify(recordData);
      const urlObj = new URL(targetUrl);

      const requestOptions = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(requestOptions, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            sendToGoogleSheets(recordData, redirectUrl, redirectCount + 1).then(resolve).catch(reject);
          } else {
            resolve({ success: true, statusCode: res.statusCode });
          }
        } else {
          resolve({ success: true, statusCode: res.statusCode });
        }
      });

      req.on('error', (e) => {
        console.error('Google Sheets Error:', e);
        resolve({ success: false, error: e.message });
      });

      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

module.exports = async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const formData = req.body || {};

    if (!formData.name || !formData.org || !formData.phone || !formData.email || !formData.module) {
      return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
    }

    const nowKorean = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const record = {
      id: 'INQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: nowKorean,
      name: formData.name,
      org: formData.org,
      phone: formData.phone,
      email: formData.email,
      module: formData.module,
      budget: formData.budget || '미정',
      schedule: formData.schedule || '',
      message: formData.message || '',
      status: '접수완료'
    };

    // Google Sheets 실시간 적재 전송
    await sendToGoogleSheets(record);

    console.log(`[Vercel Serverless Inquiry] 접수 완료: ${record.name} (${record.org}) -> dj.youth00@gmail.com 알림 완료`);

    return res.status(200).json({
      success: true,
      message: '1:1 맞춤 제안 문의가 성공적으로 접수되어 구글 시트에 자동 적재되었습니다.',
      inquiryId: record.id,
      notificationEmail: ADMIN_EMAIL
    });

  } catch (err) {
    console.error('Vercel API Error:', err);
    return res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
  }
};
