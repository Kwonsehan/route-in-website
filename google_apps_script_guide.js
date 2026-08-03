// ===================================================================
// [최종 완성본] ROUTE-IN 구글 Apps Script 원스톱 코드
// -------------------------------------------------------------------
// 동작 원리:
//  - doPost(e) : 웹사이트 JS fetch로 데이터를 받아 처리
//  - doGet(e)  : URL 파라미터로 데이터를 받아 처리 (302 리다이렉트 대응)
//
// 1. 구글 스프레드시트에 행 자동 추가
// 2. dj.youth00@gmail.com 으로 실시간 이메일 발송
//    (replyTo를 신청자 이메일로 설정해서 답장하기 편리하게!)
// ===================================================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // --------------------------------------------------------
    // 1. 대표님 구글 스프레드시트 ID (절대 바뀌지 않음)
    // --------------------------------------------------------
    var SPREADSHEET_ID = "1mFfC7slLBvaRr1fZhXfjTpYzoldroPAFGUh70OO-27c";
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getActiveSheet();

    // --------------------------------------------------------
    // 2. 폼 데이터 파싱 (POST JSON / POST form-data / GET 파라미터 모두 지원)
    // --------------------------------------------------------
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // application/x-www-form-urlencoded 파싱
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var createdAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    var name     = (data.name     || '').toString();
    var org      = (data.org      || '').toString();
    var phone    = (data.phone    || '').toString();
    var email    = (data.email    || '').toString();
    var module_  = (data.module   || '').toString();
    var budget   = (data.budget   || '미정').toString();
    var schedule = (data.schedule || '').toString();
    var message  = (data.message  || '').toString();

    // --------------------------------------------------------
    // 3. 헤더 행 없으면 자동 생성 (최초 1회)
    // --------------------------------------------------------
    if (sheet.getLastRow() === 0) {
      var headers = ['접수일시','담당자 성함','소속 기관','연락처','이메일','희망 모듈','예산','일정/인원','문의 내용'];
      sheet.appendRow(headers);
      var hr = sheet.getRange(1, 1, 1, headers.length);
      hr.setFontWeight('bold');
      hr.setBackground('#2563EB');
      hr.setFontColor('#FFFFFF');
    }

    // --------------------------------------------------------
    // 4. 스프레드시트 행 추가
    // --------------------------------------------------------
    sheet.appendRow([createdAt, name, org, phone, email, module_, budget, schedule, message]);

    // --------------------------------------------------------
    // 5. 이메일 발송 (GmailApp + replyTo 설정으로 수신함 직통!)
    //    - 발신: 대표님 본인 구글 계정 (스크립트 실행 계정)
    //    - 수신: dj.youth00@gmail.com (대표님 이메일)
    //    - replyTo: 신청자 이메일 (편리한 답장용)
    //    
    //    ※ 구글 정책상 같은 계정에서 같은 계정으로 보내면
    //      보낸편지함에만 가고 수신함에 안 올 수 있습니다.
    //    ※ 따라서 subject 앞에 [★신규문의★] 붙여서
    //      라벨/필터로 찾기 쉽게 합니다.
    // --------------------------------------------------------
    var TO_EMAIL = "dj.youth00@gmail.com";
    var subject = "[★ROUTE-IN 신규문의★] " + name + " / " + org;
    var body =
      "====================================================\n" +
      "★ 새로운 ROUTE-IN 1:1 맞춤 제안 문의가 접수되었습니다! ★\n" +
      "====================================================\n\n" +
      "📅 접수 일시    : " + createdAt + "\n" +
      "👤 담당자 성함  : " + name + "\n" +
      "🏢 소속 기관명  : " + org + "\n" +
      "📞 연락처      : " + phone + "\n" +
      "📧 신청자 이메일: " + email + "\n" +
      "📚 희망 교육 모듈: " + module_ + "\n" +
      "💰 예상 예산 범위: " + budget + "\n" +
      "🗓️  희망 일정/인원: " + schedule + "\n\n" +
      "💬 상세 문의 내용:\n" + message + "\n\n" +
      "====================================================\n" +
      "📊 구글 스프레드시트 장부 바로가기:\n" +
      "https://docs.google.com/spreadsheets/d/" + SPREADSHEET_ID + "/edit\n" +
      "====================================================";

    // GmailApp 으로 발송 (replyTo = 신청자 이메일)
    GmailApp.sendEmail(TO_EMAIL, subject, body, {
      replyTo: email || TO_EMAIL,
      name: "ROUTE-IN 문의 알림봇"
    });

    // --------------------------------------------------------
    // 6. 성공 응답 (CORS 허용 헤더 포함)
    // --------------------------------------------------------
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', name: name }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
