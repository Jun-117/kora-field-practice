// KORA Field — 3 languages (English · 한국어 · नेपाली). Stored data stays English; only what is shown changes.
// Works on the rendered page: every text node / placeholder is looked up here (exact → pattern → " · " parts).
// 🔴 Nepali is a draft by Claude — Tara should read it once and correct it.
export const LANGS = [['en', 'EN'], ['ko', '한'], ['ne', 'ने']];
let cur = 'en';
export const getLang = () => cur;
export const locale = () => ({ en: 'en-GB', ko: 'ko-KR', ne: 'ne-NP' }[cur]);
// Dates: browsers often lack Nepali date data (fall back to the phone's language), so Nepali names are built here.
const NE_MON = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
const NE_DAY = ['आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
export function fmtDate(d, opts = {}) {
  if (cur !== 'ne') return d.toLocaleDateString(locale(), opts);
  const tz = opts.timeZone; const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'numeric' }).formatToParts(d);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value; const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const day = get('day'), mon = Number(get('month')) - 1;
  return [opts.weekday ? NE_DAY[wd] : '', `${day} ${NE_MON[mon] || ''}`].filter(Boolean).join(', ');
}
export function fmtTime(d, opts = {}) { return d.toLocaleTimeString(cur === 'ne' ? 'en-GB' : locale(), opts); }

// 'English': ['한국어', 'नेपाली']
const W = {
  // navigation & shell
  'Today': ['오늘', 'आज'], 'Map': ['지도', 'नक्सा'], 'New': ['새 기록', 'नयाँ'], 'Customers': ['고객', 'ग्राहकहरू'], 'Status': ['상태', 'स्थिति'],
  'Command': ['관제실', 'कमाण्ड'], 'Money': ['돈 관리', 'पैसा'], 'Field work': ['현장', 'फिल्ड काम'], 'Reports': ['보고서', 'रिपोर्ट'], 'Sync & settings': ['동기화·설정', 'सिङ्क र सेटिङ'],
  'New install': ['신규 설치', 'नयाँ जडान'], 'Payment': ['수금', 'भुक्तानी'], 'Visit': ['방문', 'भ्रमण'], 'Phone view': ['폰 화면', 'फोन दृश्य'],
  'Back': ['뒤로', 'पछाडि'], 'Save': ['저장', 'सेभ गर्नुहोस्'], 'Save anyway': ['그래도 저장', 'जे होस् सेभ गर्नुहोस्'], 'required': ['필수', 'आवश्यक'], 'All': ['전체', 'सबै'],
  'Pokhara': ['포카라', 'पोखरा'], 'KORA Field': ['KORA 필드', 'KORA फिल्ड'], 'FIELD · COMMAND': ['현장 · 관제', 'फिल्ड · कमाण्ड'], 'Story': ['스토리', 'स्टोरी'],
  'Search customers · code · phone · tole': ['이름 · 코드 · 전화 · 동네로 검색', 'ग्राहक · कोड · फोन · टोल खोज्नुहोस्'],
  'Search name, KC code, phone, tole, serial': ['이름 · KC코드 · 전화 · 동네 · 시리얼로 검색', 'नाम, KC कोड, फोन, टोल, सिरियल खोज्नुहोस्'],
  'DEMO DATA — NOT REAL': ['가짜 데이터 — 실제 아님', 'डेमो डाटा — वास्तविक होइन'], 'DEMO DATA': ['가짜 데이터', 'डेमो डाटा'],
  // login & approval
  'Email': ['이메일', 'इमेल'], 'Password': ['비밀번호', 'पासवर्ड'], 'Sign in': ['로그인', 'साइन इन'], 'Sign out': ['로그아웃', 'साइन आउट'], 'Forgot password': ['비밀번호 찾기', 'पासवर्ड बिर्सनुभयो'],
  'Pokhara water service · staff app': ['포카라 정수기 서비스 · 직원용 앱', 'पोखरा पानी सेवा · कर्मचारी एप'],
  'Waiting for approval': ['승인 대기 중', 'स्वीकृतिको पर्खाइमा'], 'Refresh': ['새로고침', 'रिफ्रेस'], 'Signed in as': ['로그인 계정', 'साइन इन गरिएको'],
  'Ask Jun to approve this account (Status → Users). Then tap Refresh.': ['Jun에게 이 계정 승인을 부탁하세요(상태 → 사용자). 그다음 새로고침.', 'यो खाता स्वीकृत गर्न Jun लाई भन्नुहोस् (स्थिति → प्रयोगकर्ता), अनि रिफ्रेस थिच्नुहोस्।'],
  'The first sign-in needs internet. After that the app works offline.': ['첫 로그인만 인터넷이 필요해요. 그 뒤엔 오프라인으로 돼요.', 'पहिलो पटक साइन इन गर्न इन्टरनेट चाहिन्छ। त्यसपछि एप अफलाइन चल्छ।'],
  'Wrong email or password.': ['이메일이나 비밀번호가 틀렸어요.', 'इमेल वा पासवर्ड गलत छ।'], 'No internet. The first sign-in needs internet.': ['인터넷 없음. 첫 로그인엔 인터넷이 필요해요.', 'इन्टरनेट छैन। पहिलो साइन इनमा इन्टरनेट चाहिन्छ।'],
  // sync
  'All saved on the server': ['서버에 전부 저장됨', 'सबै सर्भरमा सेभ भयो'], 'Offline': ['오프라인', 'अफलाइन'], 'Online': ['온라인', 'अनलाइन'], 'nothing waiting': ['대기 없음', 'केही बाँकी छैन'],
  'Phone storage failing — use paper': ['폰 저장 실패 — 종이에 적기', 'फोनमा सेभ हुँदैन — कागजमा लेख्नुहोस्'],
  'Saving on this phone is failing — write it on paper and tell Jun.': ['이 폰에 저장이 안 돼요 — 종이에 적고 Jun에게 알려주세요.', 'यो फोनमा सेभ भइरहेको छैन — कागजमा लेखेर Jun लाई भन्नुहोस्।'],
  'Fix the red fields': ['빨간 칸을 고치세요', 'रातो भागहरू मिलाउनुहोस्'], 'Check the yellow notes, then tap Save anyway': ['노란 안내를 확인하고 「그래도 저장」을 누르세요', 'पहेँलो सूचना हेरेर «जे होस् सेभ» थिच्नुहोस्'],
  // greeting / hero
  'Good morning': ['좋은 아침이에요', 'शुभ प्रभात'], 'Good afternoon': ['안녕하세요', 'शुभ दिन'], 'Good evening': ['오늘도 수고했어요', 'शुभ साँझ'], 'team': ['팀', 'टिम'],
  'Visits due': ['방문할 집', 'भ्रमण बाँकी'], 'To collect': ['받을 돈', 'असुली बाँकी'], 'Calls': ['전화할 곳', 'फोन कल'], "Open today's route": ['오늘 동선 열기', 'आजको रुट खोल्नुहोस्'],
  'Collections': ['수금', 'असुली'], 'Requests': ['요청', 'अनुरोध'], 'Bills tomorrow': ['내일 결제일', 'भोलिको बिल'], 'Leads to follow': ['다시 연락할 리드', 'फलो-अप गर्ने लिड'],
  'reminders': ['미리 알림', 'सम्झना'], 'by tole': ['동네별', 'टोल अनुसार'], 'onboarding & happy calls': ['설치 후 안부 · 해피콜', 'अनबोर्डिङ र ह्याप्पी कल'], 'open': ['처리 중', 'खुला'], 'send reminders': ['미리 알려주기', 'सम्झना पठाउनुहोस्'], 'follow-up due': ['연락할 날 됨', 'फलो-अप गर्ने बेला'],
  'Chase first': ['먼저 받을 돈', 'पहिले असुल्ने'], 'Open requests': ['처리 중인 요청', 'खुला अनुरोध'], 'Nobody to chase today': ['오늘 받을 돈 없어요', 'आज असुल्नुपर्ने कोही छैन'], 'No visits due': ['방문할 집 없어요', 'भ्रमण बाँकी छैन'], 'No open requests': ['처리할 요청 없어요', 'खुला अनुरोध छैन'],
  // tiles on New
  'customer + device + day-1 payment': ['고객 등록 · 설치 · 첫 결제', 'ग्राहक + यन्त्र + पहिलो दिनको भुक्तानी'], 'filters · TDS · flow · repair': ['필터 · TDS · 유량 · 수리', 'फिल्टर · TDS · बहाव · मर्मत'],
  'monthly bill · repair': ['월 요금 · 수리비', 'मासिक बिल · मर्मत'], 'Service request': ['A/S · 요청 접수', 'सेवा अनुरोध'], 'breakdown · leak · claim': ['고장 · 누수 · 불만', 'बिग्रिएको · चुहावट · दाबी'],
  'Lead': ['리드', 'सम्भावित ग्राहक'], 'interested household': ['관심 보인 집', 'चासो भएको घर'], 'Check-in call': ['안부 전화', 'फलो-अप कल'], 'day 7/30/60/90 · happy call': ['설치 후 7 · 30 · 60 · 90일 · 해피콜', '७/३०/६०/९० दिन · ह्याप्पी कल'],
  'Recovery case': ['기기 회수', 'यन्त्र फिर्ता केस'], 'customer left — get the device': ['해지 고객 — 기기 되찾기', 'ग्राहक छोड्यो — यन्त्र फिर्ता ल्याउनुहोस्'], 'Training': ['교육', 'तालिम'], 'who learned what': ['교육 기록 남기기', 'कसले के सिक्यो'],
  'Stock': ['재고', 'मौज्दात'], 'devices & filters in/out': ['기기 · 필터 입고 / 출고', 'यन्त्र र फिल्टर आउने/जाने'],
  // form sections & fields
  'Customer': ['고객', 'ग्राहक'], 'Customer name': ['고객 이름', 'ग्राहकको नाम'], 'Mobile number': ['휴대폰 번호', 'मोबाइल नम्बर'], 'Zone': ['구역', 'क्षेत्र'], 'Ward': ['와드', 'वडा'], 'Tole': ['동네', 'टोल'], 'Tole name': ['동네 이름', 'टोलको नाम'],
  'How to find the house': ['집 찾는 법', 'घर कसरी भेट्ने'], 'People in the household': ['가족 수', 'परिवार संख्या'], 'Drinking water before KORA': ['KORA 전 마시던 물', 'KORA अघि पिउने पानी'],
  'How they heard about KORA': ['KORA를 알게 된 경로', 'KORA को बारेमा कसरी थाहा भयो'], 'Referred by (existing customer)': ['추천인 (기존 고객)', 'सिफारिस गर्ने (हालको ग्राहक)'], 'Referred by (name, if not a customer)': ['추천인 이름 (고객이 아니면)', 'सिफारिस गर्नेको नाम (ग्राहक होइन भने)'],
  'Water & site': ['물 상태 · 설치 환경', 'पानी र ठाउँ'], 'E-1 step 1 — measure before installing.': ['E-1 1단계 — 설치 전에 먼저 재세요.', 'E-1 चरण १ — जडान अघि नाप्नुहोस्।'],
  'Water source': ['물 출처', 'पानीको स्रोत'], 'Water pressure (PSI)': ['수압 (PSI)', 'पानीको चाप (PSI)'], 'Raw water TDS': ['원수 TDS', 'कच्चा पानीको TDS'], 'Device': ['기기', 'यन्त्र'],
  'Device serial number': ['기기 시리얼 번호', 'यन्त्रको सिरियल नम्बर'], 'Install date': ['설치일', 'जडान मिति'], 'Sign-up date': ['가입일', 'दर्ता मिति'], 'Plan': ['요금제', 'योजना'],
  'Final checks': ['최종 점검', 'अन्तिम जाँच'], 'Checklist': ['체크리스트', 'जाँचसूची'], 'Purified water TDS': ['정수 TDS', 'शुद्ध पानीको TDS'], 'Flow at the tap (L/min)': ['꼭지 유량 (L/min)', 'धाराको बहाव (L/min)'],
  'First-day payment': ['첫날 결제', 'पहिलो दिनको भुक्तानी'], 'Paid by': ['결제 수단', 'भुक्तानी माध्यम'], 'Transaction ID': ['거래 번호', 'कारोबार नम्बर'], 'Photos': ['사진', 'फोटो'], 'Photos (3 required)': ['사진 (3장 필수)', 'फोटो (३ वटा आवश्यक)'],
  'Take photo': ['사진 찍기', 'फोटो खिच्नुहोस्'], 'From album': ['앨범에서', 'एल्बमबाट'], 'Other': ['기타', 'अन्य'], 'House location': ['집 위치', 'घरको स्थान'], 'Get location now': ['현재 위치 저장', 'अहिले स्थान लिनुहोस्'], 'Not captured yet': ['아직 위치 없음', 'अझै लिइएको छैन'],
  'Installed by': ['설치 기사', 'जडान गर्ने'], 'Notes': ['메모', 'टिप्पणी'], 'Tags (comma separated)': ['태그 (쉼표로 구분)', 'ट्याग (अल्पविरामले छुट्याउनुहोस्)'], 'Private notes (only admin sees)': ['비공개 메모 (관리자만)', 'गोप्य टिप्पणी (एडमिन मात्र)'],
  'Monthly bill is on this same day every month (G-1 §1-3).': ['매달 이 날짜가 결제일이에요 (G-1 §1-3).', 'मासिक बिल हरेक महिना यही मितिमा आउँछ (G-1 §1-3)।'],
  'UV 6W passes at 1.2 L/min or less (verdict 2026-09-22).': ['UV 6W는 1.2 L/min 이하에서 통과 (2026-09-22 판정).', 'UV 6W १.२ L/min वा कममा पास हुन्छ (२०२६-०९-२२ निर्णय)।'],
  'E-1 final checklist — all must be ticked. Plan #8: flow and water source are required.': ['E-1 최종 점검 — 전부 체크해야 저장돼요. 계획 #8: 유량 · 물 출처 필수.', 'E-1 अन्तिम जाँचसूची — सबैमा टिक चाहिन्छ। योजना #८: बहाव र पानीको स्रोत अनिवार्य।'],
  'Day 1 = NPR 4,900 (install fee incl. first month). G-1 §1-1: do not finish the install before the payment is confirmed.': ['첫날 = NPR 4,900 (설치비, 첫 달 포함). G-1 §1-1: 입금 확인 전엔 설치 완료 금지.', 'पहिलो दिन = NPR ४,९०० (जडान शुल्क, पहिलो महिना सहित)। G-1 §1-1: भुक्तानी पक्का नभई जडान पूरा नगर्नुहोस्।'],
  'G-1 §2-1: device as installed · TDS meter (raw vs purified) · signed contract.': ['G-1 §2-1: 설치된 기기 · TDS 측정기 (원수 vs 정수) · 서명한 계약서.', 'G-1 §2-1: जडान गरिएको यन्त्र · TDS मिटर (कच्चा र शुद्ध) · हस्ताक्षर भएको सम्झौता।'],
  '30–80 normal · 20–30 low (pump needed) · <20 very low · >80 needs a reducer (E-1)': ['30–80 정상 · 20–30 낮음(펌프 필요) · 20 미만 매우 낮음 · 80 초과 감압밸브 (E-1)', '३०–८० सामान्य · २०–३० कम (पम्प चाहिन्छ) · २० भन्दा कम धेरै कम · ८० भन्दा बढी रिड्युसर चाहिन्छ (E-1)'],
  'Referral rewards follow G-1 §4: 1 month free for both (referrer after 3 months).': ['추천 보상은 G-1 §4: 둘 다 1개월 무료 (추천인은 3개월 뒤).', 'सिफारिस पुरस्कार G-1 §४ अनुसार: दुवैलाई १ महिना निःशुल्क (सिफारिस गर्नेलाई ३ महिनापछि)।'],
  // install options
  'No leaks at any joint (checked twice)': ['모든 연결부 누수 없음 (두 번 확인)', 'कुनै जोर्नीमा चुहावट छैन (दुई पटक जाँचियो)'], 'Pump runs quietly': ['펌프 소리 조용함', 'पम्प शान्तसँग चल्छ'], 'UV lamp is on': ['UV 램프 켜짐', 'UV बत्ती बलेको छ'],
  'TDS shown to the customer': ['고객에게 TDS 보여줌', 'ग्राहकलाई TDS देखाइयो'], 'Contract signed (2 copies)': ['계약서 서명 (2부)', 'सम्झौतामा हस्ताक्षर (२ प्रति)'], 'Told: next filter change in about 4 months': ['다음 필터 교체 약 4개월 뒤라고 안내함', 'भनियो: अर्को फिल्टर करिब ४ महिनामा फेरिन्छ'],
  'Gave our number for breakdowns': ['고장 나면 연락할 번호 알려줌', 'बिग्रँदा फोन गर्न नम्बर दिइयो'], 'Received 4,900': ['4,900 받음', '४,९०० प्राप्त'], 'Received 3,800 (referral: 1st month free)': ['3,800 받음 (추천: 첫 달 무료)', '३,८०० प्राप्त (सिफारिस: पहिलो महिना निःशुल्क)'], 'Not yet': ['아직', 'अझै छैन'],
  'Municipal tap': ['수돗물', 'धारा (नगरपालिका)'], 'Well / borehole': ['우물 · 관정', 'इनार / बोरिङ'], 'Tanker': ['급수차', 'ट्याङ्कर'], 'Spring': ['샘물', 'मुहान'],
  'Jar (20L delivery)': ['20L 물통 배달', 'जार (२० लिटर डेलिभरी)'], 'Boiled tap': ['수돗물 끓임', 'उमालेको धाराको पानी'], 'Bottled': ['생수', 'बोतलको पानी'], 'Has purifier': ['정수기 있음', 'प्युरिफायर छ'], 'Untreated': ['정수 안 하고 마심', 'प्रशोधन नगरिएको'],
  'Standard': ['기본', 'स्ट्यान्डर्ड'], 'Standard + Backup Power': ['기본 + 보조 전원', 'स्ट्यान्डर्ड + ब्याकअप पावर'], 'Word of mouth': ['입소문', 'मुखबाट मुख'], 'Bank transfer': ['계좌이체', 'बैंक ट्रान्सफर'], 'Cash': ['현금', 'नगद'],
  // visit
  'Visit date': ['방문일', 'भ्रमण मिति'], 'Visit type': ['방문 종류', 'भ्रमणको प्रकार'], 'Routine check': ['정기 점검', 'नियमित जाँच'], 'Filter change': ['필터 교체', 'फिल्टर परिवर्तन'], 'Repair': ['수리', 'मर्मत'], 'Sanitisation': ['소독', 'सफाइ (किटाणुनाशक)'],
  'Scheduled': ['예정', 'तय गरिएको'], 'In progress': ['진행 중', 'काम हुँदैछ'], 'Completed': ['완료', 'सम्पन्न'], 'Cancelled': ['취소', 'रद्द'], 'On hold': ['보류', 'रोकिएको'],
  'Filters': ['필터', 'फिल्टर'], 'Filters changed': ['교체한 필터', 'फेरिएका फिल्टर'], 'Old PP filter colour': ['뺀 PP 필터 색', 'पुरानो PP फिल्टरको रङ'], 'White': ['흰색', 'सेतो'], 'Brown': ['갈색', 'खैरो'], 'Black': ['검정', 'कालो'],
  'Old filters taken back?': ['헌 필터 가져왔나요?', 'पुराना फिल्टर फिर्ता ल्याइयो?'], 'How many old filters': ['가져온 헌 필터 수', 'कति वटा पुराना फिल्टर'], 'Yes': ['예', 'हो'], 'No': ['아니오', 'होइन'],
  'Measurements': ['측정', 'मापन'], 'TDS before': ['작업 전 TDS', 'पहिलेको TDS'], 'TDS after': ['작업 후 TDS', 'पछिको TDS'], 'Flow (L/min)': ['유량 (L/min)', 'बहाव (L/min)'], 'Parts used': ['사용한 부품', 'प्रयोग गरिएका पार्टस'],
  'Pipes sanitised on this visit?': ['이번에 배관 소독했나요?', 'यो भ्रमणमा पाइप सफा गरियो?'], 'Next & who': ['다음 방문 · 담당', 'अर्को भ्रमण र को'], 'Next visit date': ['다음 방문일', 'अर्को भ्रमण मिति'], 'Technician': ['기사', 'प्राविधिक'],
  'Transport': ['이동 수단', 'यातायात'], 'Motorbike': ['오토바이', 'मोटरसाइकल'], 'Pickup · Taxi': ['픽업 · 택시', 'पिकअप · ट्याक्सी'], 'Walk': ['도보', 'पैदल'], 'Bicycle': ['자전거', 'साइकल'],
  'Time at the house (minutes)': ['작업 시간 (분)', 'घरमा बिताएको समय (मिनेट)'], 'Filter cost (NPR)': ['필터 비용 (NPR)', 'फिल्टर खर्च (NPR)'],
  'E-2: booking intervals only — decide by what you see. PP brown/black → replace now.': ['E-2: 예약용 주기일 뿐 — 보이는 대로 판단. PP가 갈색·검정이면 바로 교체.', 'E-2: यो बुकिङ अवधि मात्र हो — देखेर निर्णय गर्नुहोस्। PP खैरो/कालो भए तुरुन्त फेर्नुहोस्।'],
  'G-1 §2-2: one old filter back for each new one.': ['G-1 §2-2: 새 필터 하나당 헌 필터 하나 회수.', 'G-1 §2-2: हरेक नयाँ फिल्टरको लागि एउटा पुरानो फिर्ता।'],
  'Required to complete a visit (G-1 §2-3).': ['방문 완료에 필수 (G-1 §2-3).', 'भ्रमण पूरा गर्न आवश्यक (G-1 §2-3)।'],
  'Required to complete (G-1 §2-3). Suggested: monthly for 6 months after install, then every 3 months.': ['완료에 필수 (G-1 §2-3). 권장: 설치 후 6개월은 매달, 그 뒤 3개월마다.', 'पूरा गर्न आवश्यक (G-1 §2-3)। सुझाव: जडानपछि ६ महिना हरेक महिना, त्यसपछि हरेक ३ महिना।'],
  'E-2: full pipe sanitisation every 3 months (quarterly).': ['E-2: 배관 전체 소독 3개월마다 (분기).', 'E-2: हरेक ३ महिनामा पूरा पाइप सफाइ।'],
  'G-1 §2-1 filter change: old filter · device after · TDS after. Repair: fault close-up · working after.': ['G-1 §2-1 필터 교체: 헌 필터 · 교체 후 기기 · 교체 후 TDS. 수리: 고장 부위 · 수리 후 작동.', 'G-1 §2-1 फिल्टर परिवर्तन: पुरानो फिल्टर · पछिको यन्त्र · पछिको TDS। मर्मत: बिग्रिएको भाग · मर्मतपछि चलेको।'],
  // payment
  'Payment date': ['결제일', 'भुक्तानी मिति'], 'What for': ['결제 항목', 'केको लागि'], 'Amount received (NPR)': ['받은 금액 (NPR)', 'प्राप्त रकम (NPR)'], 'Where': ['받은 곳', 'कहाँ'], 'Field visit': ['현장 방문', 'फिल्ड भ्रमण'], 'Office': ['사무실', 'कार्यालय'], 'Digital': ['온라인', 'डिजिटल'],
  'Discount given (NPR)': ['할인액 (NPR)', 'दिइएको छुट (NPR)'], 'Discount reason': ['할인 이유', 'छुटको कारण'], 'Promotion': ['프로모션', 'प्रमोसन'], 'Referral': ['추천', 'सिफारिस'], 'Claim compensation': ['불만 보상', 'दाबी क्षतिपूर्ति'],
  'Installation fee (4,900)': ['설치비 (4,900)', 'जडान शुल्क (४,९००)'], 'Monthly subscription': ['월 요금', 'मासिक सदस्यता'], 'Repair / other': ['수리 · 기타', 'मर्मत / अन्य'], 'Penalty': ['위약금', 'जरिवाना'], 'Referral credit': ['추천 할인', 'सिफारिस क्रेडिट'],
  'Referral credit for (the new customer)': ['추천 할인 대상 (새 고객)', 'सिफारिस क्रेडिट (नयाँ ग्राहकको लागि)'], 'from Khalti / eSewa / bank': ['Khalti · eSewa · 은행에서', 'Khalti / eSewa / बैंकबाट'],
  'Nothing overdue': ['연체 없음', 'बाँकी छैन'], 'Next': ['다음', 'अर्को'],
  // request
  'Problem': ['증상', 'समस्या'], 'Priority': ['우선순위', 'प्राथमिकता'], 'Received at': ['접수 시각', 'प्राप्त समय'], 'What the customer said': ['고객이 한 말', 'ग्राहकले के भन्नुभयो'], 'Handled by': ['담당', 'हेर्ने'], 'What we did': ['조치 내용', 'हामीले के गर्‍यौं'], 'Done on': ['완료일', 'सम्पन्न मिति'],
  'Breakdown': ['고장', 'बिग्रिएको'], 'Water quality': ['수질', 'पानीको गुणस्तर'], 'Leak': ['누수', 'चुहावट'], 'Install request': ['설치 요청', 'जडान अनुरोध'], 'Claim': ['불만', 'दाबी'],
  'Urgent': ['긴급', 'अत्यावश्यक'], 'Normal': ['보통', 'सामान्य'], 'Low': ['낮음', 'कम'], 'Received': ['접수됨', 'प्राप्त'], 'Done': ['완료', 'सकियो'],
  'G-1 §2-4: office hours → reply within 2 h, visit same or next day.': ['G-1 §2-4: 근무시간 → 2시간 안 응답, 당일·익일 방문.', 'G-1 §2-4: कार्यालय समयमा → २ घण्टाभित्र जवाफ, सोही दिन वा भोलि भ्रमण।'],
  'reply overdue': ['응답 늦음', 'जवाफ ढिलो'], 'visit overdue': ['방문 늦음', 'भ्रमण ढिलो'], '3+ days!': ['3일 넘음!', '३+ दिन!'],
  // lead
  'Name': ['이름', 'नाम'], 'Stage': ['단계', 'चरण'], 'Thinking': ['고민 중', 'सोच्दै'], 'Demo booked': ['시연 예약', 'डेमो तय'], 'Signed': ['계약함', 'सम्झौता भयो'], 'Rejected': ['안 함', 'अस्वीकार'],
  'Demo date': ['시연일', 'डेमो मिति'], 'Follow up on': ['다시 연락할 날', 'फलो-अप मिति'], 'Why not': ['안 하는 이유', 'किन होइन'], 'Leads': ['리드', 'सम्भावित ग्राहक'], 'Install': ['설치', 'जडान'],
  // recovery
  'Why this case exists': ['회수하는 이유', 'यो केस किन'], 'Customer left on': ['해지일', 'ग्राहक छोडेको मिति'], 'Why they left': ['해지 이유', 'किन छोडे'], 'Recovery started': ['회수 시작', 'फिर्ता सुरु'],
  'Attempts so far': ['시도 횟수', 'अहिलेसम्मका प्रयास'], 'Outcome': ['결과', 'नतिजा'], 'Recovered': ['회수 성공', 'फिर्ता भयो'], 'Partial': ['부분 회수', 'आंशिक'], 'Failed – no contact': ['실패 – 연락 안 됨', 'असफल – सम्पर्क भएन'],
  'Failed – refused': ['실패 – 거부', 'असफल – अस्वीकार'], 'Failed – lost or damaged': ['실패 – 분실·훼손', 'असफल – हराएको वा बिग्रिएको'], 'Closed on': ['종료일', 'बन्द मिति'], 'Why it failed': ['실패 이유', 'किन असफल'],
  'Device & deposit': ['기기 · 보증금', 'यन्त्र र धरौटी'], 'Device serial': ['기기 시리얼', 'यन्त्रको सिरियल'], 'Can it be refurbished?': ['리퍼 가능한가요?', 'फेरि मर्मत गरेर चलाउन मिल्छ?'], 'Unknown': ['모름', 'थाहा छैन'],
  'Filter serials': ['필터 시리얼', 'फिल्टर सिरियल'], 'Cost of recovery (NPR)': ['회수 비용 (NPR)', 'फिर्ता खर्च (NPR)'], 'Deposit refunded (NPR)': ['보증금 환불 (NPR)', 'फिर्ता गरिएको धरौटी (NPR)'], 'Deposit forfeited (NPR)': ['보증금 몰취 (NPR)', 'जफत धरौटी (NPR)'],
  'transport + time': ['교통비 + 시간', 'यातायात + समय'], 'This is the real output of the table — why recovery fails.': ['제일 중요한 칸 — 회수가 왜 실패하는지 남겨요.', 'यही यो तालिकाको मुख्य कुरा हो — फिर्ता किन असफल हुन्छ।'],
  'Forfeited deposit becomes taxable (lawyer R3 D2(c)).': ['몰취한 보증금은 과세 대상 (변호사 R3 D2(c)).', 'जफत धरौटीमा कर लाग्छ (वकिल R3 D2(c))।'],
  'Recovery protocol: record every attempt — success/fail, days, cost, why it failed (Recovery_Cases design).': ['회수 규칙: 시도마다 기록 — 성공·실패, 걸린 날, 비용, 실패 이유.', 'फिर्ता नियम: हरेक प्रयास लेख्नुहोस् — सफल/असफल, दिन, खर्च, असफल हुनुको कारण।'],
  // check-in / training / stock
  'Which call': ['무슨 전화', 'कुन कल'], 'Date': ['날짜', 'मिति'], 'Called by': ['전화한 사람', 'फोन गर्ने'], 'Result': ['결과', 'नतिजा'], 'OK': ['정상', 'ठीक छ'], 'Issue found': ['문제 있음', 'समस्या भेटियो'], 'How happy (1–5)': ['만족도 (1–5)', 'कति खुसी (१–५)'], 'What they said': ['고객이 한 말', 'उहाँले के भन्नुभयो'],
  'Quarterly call': ['분기 전화', 'त्रैमासिक कल'], 'Random happy call': ['무작위 해피콜', 'अनियमित ह्याप्पी कल'], 'Sister (happy call)': ['언니 (해피콜)', 'दिदी (ह्याप्पी कल)'],
  'Day 7 happy call': ['7일 해피콜', '७ दिने ह्याप्पी कल'], 'Day 30 check-in': ['30일 안부 전화', '३० दिने फलो-अप'], 'Day 60 check-in': ['60일 안부 전화', '६० दिने फलो-अप'], 'Day 90 check-in': ['90일 안부 전화', '९० दिने फलो-अप'], 'Quarterly happy call': ['분기 해피콜', 'त्रैमासिक ह्याप्पी कल'],
  'Training record': ['교육 기록', 'तालिम रेकर्ड'], 'Who was trained': ['교육받은 사람', 'कसले तालिम लियो'], 'Topic': ['주제', 'विषय'], 'Trainer': ['교육한 사람', 'प्रशिक्षक'], 'Minutes': ['분', 'मिनेट'], 'Photo of the signed sheet': ['서명지 사진', 'हस्ताक्षर गरिएको पानाको फोटो'], 'What was covered': ['다룬 내용', 'के सिकाइयो'],
  'Install SOP (E-1)': ['설치 SOP (E-1)', 'जडान SOP (E-1)'], 'A/S SOP (E-2)': ['A/S SOP (E-2)', 'मर्मत SOP (E-2)'], 'Field rules (G-1)': ['현장 규정 (G-1)', 'फिल्ड नियम (G-1)'], 'Cash & payments': ['현금 · 결제', 'नगद र भुक्तानी'], 'App use': ['앱 사용법', 'एप प्रयोग'],
  'Stock movement': ['재고 입출고', 'मौज्दात आवतजावत'], 'Item': ['품목', 'सामान'], 'Movement': ['이동', 'आवतजावत'], 'Quantity': ['수량', 'परिमाण'], 'Reference (PI / shipment / person)': ['참고 (PI · 선적 · 사람)', 'सन्दर्भ (PI / ढुवानी / व्यक्ति)'],
  'In': ['입고', 'भित्र'], 'Out': ['출고', 'बाहिर'], 'Adjustment': ['조정', 'मिलान'], 'Disposal': ['폐기', 'फाल्ने'], 'Issue': ['기사에게 지급', 'जारी'], 'Return': ['반납', 'फिर्ता'],
  'Installs and filter changes are subtracted automatically.': ['설치·필터 교체는 자동으로 빠져요.', 'जडान र फिल्टर परिवर्तन आफैं घट्छ।'], 'Adjustment may be negative.': ['조정은 음수도 돼요.', 'मिलान ऋणात्मक पनि हुन सक्छ।'],
  // customer detail
  'Call': ['전화', 'फोन'], 'WhatsApp': ['WhatsApp', 'ह्वाट्सएप'], 'Directions': ['길찾기', 'बाटो'], 'Pay': ['결제 받기', 'भुक्तानी'], 'Request': ['요청', 'अनुरोध'], 'Edit': ['수정', 'सम्पादन'],
  'Active': ['활성', 'सक्रिय'], 'Paused': ['일시정지', 'रोकिएको'], 'Churned': ['해지', 'छोडेको'], 'on phone': ['전송 전', 'फोनमा मात्र'], 'Paid up': ['완납', 'पूरा तिरेको'],
  'Next bill': ['다음 청구', 'अर्को बिल'], 'Deposit held': ['맡은 보증금', 'राखिएको धरौटी'], 'Month of contract': ['계약 개월', 'सम्झौताको महिना'], 'contract ended — renew': ['계약 끝남 — 재계약', 'सम्झौता सकियो — नवीकरण गर्नुहोस्'],
  'Amount': ['금액', 'रकम'], 'Paid': ['낸 돈', 'तिरेको'], 'paid': ['냄', 'तिरेको'], 'partial': ['일부 냄', 'आंशिक'], 'due': ['미납', 'बाँकी'], 'future': ['예정', 'आउने'],
  'Device & filters': ['기기 · 필터', 'यन्त्र र फिल्टर'], 'Serial': ['시리얼', 'सिरियल'], 'Installed': ['설치', 'जडान'], 'Water': ['물', 'पानी'], 'Flow · pressure': ['유량 · 수압', 'बहाव · चाप'], 'Next visit': ['다음 방문', 'अर्को भ्रमण'],
  'Filter': ['필터', 'फिल्टर'], 'Last': ['마지막', 'पछिल्लो'], 'Due': ['예정일', 'म्याद'], 'install': ['설치 때', 'जडानमा'], 'observe': ['관찰', 'हेर्नुहोस्'], 'overdue': ['늦음', 'म्याद नाघेको'], 'soon': ['곧', 'छिट्टै'], 'ok': ['정상', 'ठीक'],
  'Purified TDS over time': ['정수 TDS 추이', 'समयसँग शुद्ध पानीको TDS'], 'No photos yet': ['아직 사진 없음', 'अझै फोटो छैन'], 'Loading…': ['불러오는 중…', 'लोड हुँदैछ…'], 'No visits yet': ['아직 방문 없음', 'अझै भ्रमण छैन'], 'No payments yet': ['아직 결제 없음', 'अझै भुक्तानी छैन'],
  'Onboarding & calls': ['온보딩 · 통화', 'अनबोर्डिङ र कल'], 'Recovery': ['회수', 'फिर्ता'], 'Details': ['상세', 'विवरण'], 'Phone': ['전화', 'फोन'], 'Household': ['가족 수', 'परिवार'], 'Water before': ['전에 마시던 물', 'पहिलेको पानी'],
  'Signed up': ['가입일', 'दर्ता'], 'Heard via': ['알게 된 경로', 'थाहा पाएको माध्यम'], 'Private notes': ['비공개 메모', 'गोप्य टिप्पणी'], 'Save private notes': ['비공개 메모 저장', 'गोप्य टिप्पणी सेभ'], 'Only admin sees this': ['관리자만 봐요', 'एडमिनले मात्र देख्छ'],
  'Customer is leaving → recovery case': ['해지해요 → 기기 회수 시작', 'ग्राहक छोड्दैछ → फिर्ता केस'], 'Receipt': ['영수증', 'रसिद'], 'Send receipt on WhatsApp': ['WhatsApp으로 영수증 보내기', 'ह्वाट्सएपमा रसिद पठाउनुहोस्'],
  'Customer not found on this phone.': ['이 폰에 없는 고객이에요.', 'यो फोनमा ग्राहक भेटिएन।'], 'Referral reward': ['추천 보상', 'सिफारिस पुरस्कार'], 'apply': ['적용', 'लागू गर्नुहोस्'], 'send WhatsApp': ['WhatsApp 보내기', 'ह्वाट्सएप पठाउनुहोस्'],
  'visits': ['방문', 'भ्रमण'], 'Visits': ['방문', 'भ्रमण'], 'Payments': ['결제', 'भुक्तानी'],
  // lists
  'Late 7+ days — home visit (contract §2.7)': ['7일 넘게 연체 — 집 방문 (계약 §2.7)', '७+ दिन ढिलो — घर भ्रमण (सम्झौता §२.७)'], 'Late 3–6 days — Tara calls': ['3~6일 연체 — 타라가 전화', '३–६ दिन ढिलो — तारा फोन गर्छिन्'],
  'Late 1–2 days — re-remind': ['1~2일 연체 — 한 번 더 알림', '१–२ दिन ढिलो — फेरि सम्झाउने'], 'Due today — afternoon re-reminder': ['오늘 결제일 — 오후에 한 번 더', 'आज म्याद — दिउँसो फेरि सम्झाउने'], 'Reminder (due in ≤3 days)': ['미리 알림 (3일 안)', 'सम्झना (३ दिनभित्र म्याद)'],
  'Remind': ['미리 알림', 'सम्झाउने'], 'Due today': ['오늘 결제일', 'आज म्याद'], 'Late': ['연체', 'ढिलो'], 'today': ['오늘', 'आज'],
  'G-1 §1-3: 3 days before → reminder · due day → re-remind · +3 → Tara calls · +7 → home visit': ['G-1 §1-3: 3일 전 알림 · 당일 재알림 · +3일 타라 전화 · +7일 가정 방문', 'G-1 §1-3: ३ दिनअघि सम्झना · म्यादको दिन फेरि · +३ दिन तारा फोन · +७ दिन घर भ्रमण'],
  'Nobody to chase': ['받을 돈 없어요', 'असुल्नुपर्ने कोही छैन'], 'Route': ['동선', 'रुट'],
  'Grouped by tole so one day covers one area (plan #6). Monthly for 6 months after install, then every 3 months; filter dues pull a visit earlier.': ['동네별로 묶어 하루 한 동네 (계획 #6). 설치 후 6개월 매달, 이후 3개월마다. 필터 교체일이 방문을 앞당겨요.', 'टोल अनुसार समूह — एक दिन एक क्षेत्र (योजना #६)। जडानपछि ६ महिना हरेक महिना, त्यसपछि हरेक ३ महिना।'],
  'Day 7 happy call (G-1 §3-1) · day 30/60/90 check-ins (plan #7) · quarterly happy call (G-1 §3-2)': ['7일 해피콜 (G-1 §3-1) · 30·60·90일 체크인 (계획 #7) · 분기 해피콜 (G-1 §3-2)', '७ दिने ह्याप्पी कल · ३०/६०/९० दिने फलो-अप · त्रैमासिक ह्याप्पी कल'],
  "Plan #12: pick 3 active customers not called in the last 30 days — for the sister's check.": ['계획 #12: 최근 30일 통화 안 한 고객 3명 뽑기 — 언니 확인용.', 'योजना #१२: पछिल्लो ३० दिनमा फोन नगरिएका ३ जना छान्नुहोस्।'], 'Pick 3': ['3명 뽑기', '३ जना छान्नुहोस्'],
  'No calls due': ['전화할 곳 없어요', 'कल बाँकी छैन'], 'Everyone was called in the last 30 days': ['30일 안에 다 통화했어요', 'सबैलाई ३० दिनभित्र फोन गरियो'], 'New request': ['새 요청', 'नयाँ अनुरोध'], 'No bills tomorrow': ['내일 청구 없음', 'भोलि बिल छैन'],
  'New lead': ['새 리드', 'नयाँ लिड'], 'Recovery cases': ['회수 건', 'फिर्ता केस'], 'No recovery cases': ['회수 건 없음', 'फिर्ता केस छैन'], 'Filter status': ['필터 상태', 'फिल्टर स्थिति'], 'All filters on schedule': ['필터 모두 제때', 'सबै फिल्टर समयमा'], 'Nobody paused': ['일시정지 없음', 'कोही रोकिएको छैन'],
  'Green = OK · yellow = overdue · red = 7+ days · grey = left. The map picture needs internet; dots always show.': ['초록 = 정상 · 노랑 = 연체 · 빨강 = 7일+ · 회색 = 해지. 지도 그림은 인터넷 필요, 점은 항상 보여요.', 'हरियो = ठीक · पहेँलो = ढिलो · रातो = ७+ दिन · खैरो = छोडेको। नक्साको चित्रलाई इन्टरनेट चाहिन्छ।'],
  // status & reports
  'Active households': ['활성 가구', 'सक्रिय घरधुरी'], 'Collection (bills paid)': ['수금률 (낸 청구 비율)', 'असुली (तिरेका बिल)'], 'Overdue': ['연체', 'म्याद नाघेको'], 'Deposit held (not ours)': ['맡은 보증금 (우리 돈 아님)', 'राखिएको धरौटी (हाम्रो होइन)'],
  'Records on this phone': ['이 폰의 기록', 'यो फोनका रेकर्ड'], 'Send now': ['지금 보내기', 'अहिले पठाउनुहोस्'], 'Reload all': ['서버에서 다시 받기', 'सबै फेरि लोड'], 'Protect phone storage': ['폰 저장 공간 지키기', 'फोनको स्टोरेज सुरक्षित गर्नुहोस्'],
  'Lists & reports': ['목록 · 보고서', 'सूची र रिपोर्ट'], 'all money in': ['들어온 돈 전부', 'आएको सबै पैसा'], 'VAT by month': ['월별 VAT', 'महिनाअनुसार VAT'], 'export CSV': ['CSV 내보내기', 'CSV निर्यात'], 'Deposit book': ['보증금 장부', 'धरौटी खाता'], 'what we hold': ['보관 중인 돈', 'हामीसँग राखिएको'],
  'Direction gate': ['방향 게이트', 'दिशा जाँच'], 'churn · retention · collection': ['이탈 · 유지 · 수금', 'छोड्ने · टिक्ने · असुली'], 'Stock & FCL': ['재고 · FCL', 'मौज्दात र FCL'], 'order signal': ['발주 신호', 'अर्डर संकेत'], 'Filter learning': ['필터 수명 학습', 'फिल्टर सिकाइ'], 'real intervals': ['실제 교체 주기', 'वास्तविक अवधि'],
  'all customers': ['고객 전체', 'सबै ग्राहक'], 'due & overdue': ['예정 · 지남', 'बाँकी र ढिलो'], 'pipeline': ['진행 단계', 'पाइपलाइन'], 'Recoveries': ['회수', 'फिर्ता'], 'devices back': ['기기 되찾기', 'यन्त्र फिर्ता'], 'Trainings': ['교육', 'तालिम'], 'records': ['기록', 'रेकर्ड'],
  'Referrals': ['추천', 'सिफारिस'], 'rewards due': ['줄 보상', 'दिनुपर्ने पुरस्कार'], 'How to use': ['사용법', 'कसरी प्रयोग गर्ने'], 'one page for staff': ['직원용 한 장 안내', 'कर्मचारीका लागि एक पाना'], 'Bank CSV match': ['은행 CSV 대조', 'बैंक CSV मिलान'],
  'Export all data': ['전체 데이터 내보내기', 'सबै डाटा निर्यात'], 'backup': ['백업', 'ब्याकअप'], 'Users': ['사용자', 'प्रयोगकर्ता'], 'approve staff': ['직원 승인', 'कर्मचारी स्वीकृत'], 'Settings': ['설정', 'सेटिङ'], 'lead time · techs': ['리드타임 · 기사', 'लिड टाइम · प्राविधिक'],
  'Theme': ['테마', 'थिम'], 'Command centre': ['관제실', 'कमाण्ड सेन्टर'], 'Diagnostics': ['진단', 'निदान'], 'Download CSV': ['CSV 받기', 'CSV डाउनलोड'], 'Everything as one JSON file': ['전부 JSON 파일 하나로', 'सबै एउटै JSON फाइलमा'],
  'Month': ['월', 'महिना'], 'Cash in': ['들어온 돈', 'आएको नगद'], 'Taxable': ['과세 매출', 'करयोग्य'], 'Deposit': ['보증금', 'धरौटी'], 'Forfeits': ['몰취', 'जफत'], 'Net': ['공급가', 'खुद'], 'VAT 13%': ['VAT 13%', 'भ्याट १३%'], 'No payments yet ': ['아직 결제 없음', 'अझै भुक्तानी छैन'],
  'Collected': ['받은 돈', 'संकलित'], 'Refunded': ['환불', 'फिर्ता गरिएको'], 'Forfeited': ['몰취', 'जफत'], 'Held': ['보유', 'राखिएको'], 'Total': ['합계', 'जम्मा'], 'No deposit collected yet': ['아직 받은 보증금 없음', 'अझै धरौटी संकलन छैन'],
  'Churn per month': ['월 이탈률', 'मासिक छोड्ने दर'], '90-day retention': ['90일 유지율', '९० दिने टिकाउ'], 'not judgeable yet': ['아직 판단 못 함', 'अझै निर्णय गर्न मिल्दैन'], 'TRIGGERED': ['기준 넘음', 'चेतावनी'], 'trigger': ['기준', 'सीमा'], 'inside the line': ['기준 안', 'सीमाभित्र'],
  'FCL#1 signal': ['FCL#1 신호', 'FCL#1 संकेत'], 'ORDER NOW': ['지금 발주', 'अहिले अर्डर'], 'not yet': ['아직', 'अझै होइन'], '30+ bills issued': ['청구 30건 이상', '३०+ बिल जारी'], 'Collection ≥ 60% (not the 50% disaster zone)': ['수금률 60% 이상 (50%대 위험 구간 아님)', 'असुली ≥ ६०%'],
  'No repeated defect (3+ same type in 90 days)': ['반복 불량 없음 (90일 안 같은 유형 3건+)', 'दोहोरिएको खराबी छैन'], 'Record stock movement': ['재고 입출고 기록', 'मौज्दात आवतजावत लेख्नुहोस्'], 'Movements': ['입출고 기록', 'आवतजावत'], 'No movements yet': ['아직 입출고 없음', 'अझै आवतजावत छैन'],
  'Booking': ['기준 주기', 'बुकिङ'], 'Observed': ['실측', 'देखिएको'], 'Samples': ['표본', 'नमूना'], 'Training records': ['교육 기록', 'तालिम रेकर्ड'], 'No training records': ['교육 기록 없음', 'तालिम रेकर्ड छैन'], 'New record': ['새 기록', 'नयाँ रेकर्ड'],
  'Referral rewards': ['추천 보상', 'सिफारिस पुरस्कार'], 'new customer': ['새 고객', 'नयाँ ग्राहक'], 'referrer': ['추천인', 'सिफारिस गर्ने'], 'ready': ['준비됨', 'तयार'], 'No referrals yet': ['아직 추천 없음', 'अझै सिफारिस छैन'], 'Apply': ['적용', 'लागू'],
  'Bank statement match': ['은행 내역 대조', 'बैंक विवरण मिलान'], 'Description': ['내용', 'विवरण'], 'Match': ['대조', 'मिलाउनुहोस्'], 'Users': ['사용자', 'प्रयोगकर्ता'], 'Approve': ['승인', 'स्वीकृत'], 'Block': ['차단', 'रोक्नुहोस्'],
  'FCL lead time (weeks)': ['FCL 리드타임 (주)', 'FCL लिड टाइम (हप्ता)'], 'Extra technician names (comma separated)': ['기사 이름 추가 (쉼표 구분)', 'थप प्राविधिकको नाम'], 'Public holidays (YYYY-MM-DD, comma separated)': ['공휴일 (YYYY-MM-DD, 쉼표 구분)', 'सार्वजनिक बिदा (YYYY-MM-DD)'],
  'Save settings': ['설정 저장', 'सेटिङ सेभ'], 'Day 1': ['첫날', 'पहिलो दिन'], 'Months 2–13': ['2–13개월', '२–१३ महिना'], 'Months 14–36': ['14–36개월', '१४–३६ महिना'],
  'How to use KORA Field': ['KORA 필드 사용법', 'KORA फिल्ड कसरी प्रयोग गर्ने'], 'One page for Tara and technicians': ['타라와 기사용 한 장', 'तारा र प्राविधिकका लागि एक पाना'], 'The dot at the top': ['위쪽 동그라미', 'माथिको थोप्लो'],
  'Everything is on the server.': ['전부 서버에 있어요.', 'सबै सर्भरमा छ।'], 'Saved on this phone. It sends by itself when there is internet — keep working.': ['이 폰에 저장됨. 인터넷 되면 알아서 가요 — 계속 일하세요.', 'यो फोनमा सेभ भयो। इन्टरनेट आएपछि आफैं जान्छ — काम जारी राख्नुहोस्।'],
  'Something is wrong. Write it on paper and tell Jun.': ['문제 있음. 종이에 적고 Jun에게 알려주세요.', 'केही गडबड छ। कागजमा लेखेर Jun लाई भन्नुहोस्।'], 'No internet? No problem': ['인터넷 없어도 괜찮아요', 'इन्टरनेट छैन? समस्या छैन'],
  // desk
  'Households': ['가구', 'घरधुरी'], 'active': ['활성', 'सक्रिय'], 'installed': ['설치', 'जडान'], 'paused': ['일시정지', 'रोकिएको'], 'left': ['해지', 'छोडेको'], 'Monthly recurring': ['매달 들어올 돈', 'मासिक नियमित आम्दानी'],
  'cash this month': ['이번 달 입금', 'यो महिनाको नगद'], 'Collection': ['수금률', 'असुली'], 'bills paid': ['낸 청구', 'तिरेका बिल'], 'on time': ['제때', 'समयमा'], 'not our money': ['우리 돈 아님', 'हाम्रो पैसा होइन'], 'collected': ['받음', 'संकलित'], 'refunded': ['환불', 'फिर्ता'], 'forfeited': ['몰취', 'जफत'],
  'every household': ['전체 가구', 'सबै घरधुरी'], 'full map': ['전체 지도', 'पूरा नक्सा'], 'details': ['자세히', 'विवरण'], 'Plan B triggers': ['플랜 B 기준', 'योजना B सीमा'], 'order signal ': ['발주 신호', 'अर्डर संकेत'], 'stock': ['재고', 'मौज्दात'], 'list': ['목록', 'सूची'], 'all': ['전체', 'सबै'],
  'Field today': ['오늘 현장', 'आजको फिल्ड'], 'visits due by tole': ['동네별 방문', 'टोल अनुसार भ्रमण'], 'Installs': ['설치', 'जडान'], 'per week (12 weeks)': ['주별 (12주)', 'हप्ता अनुसार (१२ हप्ता)'], 'per month (NPR)': ['월별 (NPR)', 'महिना अनुसार (NPR)'],
  'E-2 booking status': ['E-2 교체 예정', 'E-2 बुकिङ स्थिति'], 'Live': ['실시간', 'लाइभ'], 'latest records': ['최근 기록', 'पछिल्ला रेकर्ड'], 'Onboarding': ['온보딩', 'अनबोर्डिङ'], 'Money book': ['이번 달 장부', 'पैसाको खाता'], 'this month': ['이번 달', 'यो महिना'],
  'Taxable (VAT incl.)': ['과세분 (VAT 포함)', 'करयोग्य (भ्याट सहित)'], 'VAT 13% to file': ['신고할 VAT 13%', 'बुझाउनुपर्ने भ्याट १३%'], 'Deposit received': ['받은 보증금', 'प्राप्त धरौटी'], 'Overdue now': ['지금 연체', 'अहिले बाँकी'],
  'OK ': ['정상', 'ठीक'], 'overdue ': ['연체', 'ढिलो'], '7+ days': ['7일+', '७+ दिन'], 'filter slots': ['필터 수', 'फिल्टर'], 'due ≤14 d': ['14일 안', '१४ दिनभित्र'], 'calls': ['통화', 'कल'], 'Chase list': ['받을 돈 목록', 'असुली सूची'], 'Recurring': ['매달 들어올 돈', 'नियमित'],
  'per month': ['월별', 'महिनामा'], 'all': ['전체', 'सबै'], 'Deposit received ': ['받은 보증금', 'प्राप्त धरौटी'], 'open on the right': ['오른쪽에 열려요', 'दायाँतिर खुल्छ'], 'open in the middle · click outside to go back': ['가운데 열려요 · 바깥을 누르면 돌아가요', 'बीचमा खुल्छ · बाहिर थिच्दा फर्किन्छ'], 'the month you picked': ['고른 달', 'छानेको महिना'], 'the month you picked · tap a bar to move': ['고른 달 · 막대를 누르면 이동', 'छानेको महिना · बार थिचेर सार्नुहोस्'], 'the month you picked · NPR received in that month': ['고른 달 · 그 달에 받은 NPR', 'छानेको महिना · त्यो महिना आएको NPR'], 'each bar = homes paying at that month’s end': ['막대 = 그 달 말에 내고 있던 가구', 'बार = त्यो महिनाको अन्त्यमा तिर्ने घर'], 'Full width': ['전체 너비', 'पूरा चौडाइ'],
  'Bill of the month with the payment QR': ['이번 달 청구서 + 결제 QR', 'यो महिनाको बिल + भुक्तानी QR'], Memo: ['메모', 'मेमो'], "Tomorrow's homes — send the notice": ['내일 갈 집 — 예고 보내기', 'भोलिका घर — सूचना पठाउने'],
  'Getting the devices back': ['기기 회수', 'उपकरण फिर्ता'], 'recovery cases': ['회수 건', 'फिर्ता केस'], Cases: ['건수', 'केस'], 'Cost · NPR': ['비용 · NPR', 'खर्च · NPR'], 'Per case with a cost': ['비용 적힌 건당', 'खर्च लेखिएको प्रति केस'], 'transport + time typed on each recovery case': ['회수 건마다 적은 교통비 + 시간', 'हरेक फिर्ता केसमा लेखिएको यातायात + समय'],
  'Getting the devices back · cost': ['기기 회수 · 비용', 'उपकरण फिर्ता · खर्च'], 'Recovery cases · device back': ['회수 건 · 기기 돌아옴', 'फिर्ता केस · उपकरण फिर्ता'],
  'During a referral campaign the referrer gets 50% off a bill, 3 months after this home joins.': ['추천 캠페인 중에만: 추천인은 이 집이 가입하고 3개월 뒤 청구 50% 할인.', 'रेफरल अभियानमा मात्र: यो घर जोडिएको ३ महिनापछि रेफर गर्नेलाई एक बिलमा ५०% छुट।'],
  '50% off a bill (referrer)': ['청구 50% 할인 (추천인)', 'एक बिलमा ५०% छुट (रेफर गर्ने)'],
  'Only during a campaign (Settings) · the referrer gets 50% off a bill, 3 months after the new home signed up, only after install + fee paid · the new home gets nothing · no cash': ['캠페인 중에만(설정) · 추천인은 새 집 가입 3개월 뒤 청구 50% 할인 · 설치하고 설치비 낸 뒤에만 · 새 집은 보상 없음 · 현금 없음', 'अभियानमा मात्र (सेटिङ) · नयाँ घर जोडिएको ३ महिनापछि रेफर गर्नेलाई एक बिलमा ५०% छुट · जडान + शुल्क तिरेपछि मात्र · नयाँ घरलाई केही छैन · नगद छैन'],
  'pin colour = money': ['핀 색 = 돈', 'पिनको रङ = पैसा'], 'icon = the job: 🔧 visit · 🧪 filter · 💰 collect · 🛠 request': ['아이콘 = 할 일: 🔧 방문 · 🧪 필터 · 💰 수금 · 🛠 요청', 'आइकन = काम: 🔧 भ्रमण · 🧪 फिल्टर · 💰 असुली · 🛠 अनुरोध'], 'zoom out for tole totals': ['축소하면 동네 합계', 'टोलको जम्मा हेर्न सानो पार्नुहोस्'], '📍 = you': ['📍 = 나', '📍 = तपाईं'],
  '🟡 someone said so': ['🟡 누가 그렇게 말함', '🟡 कसैले भनेको'], '🔴 our guess — the dot is how sure the date is, not how important the item is.': ['🔴 우리 추정 — 점은 날짜 확신도지 중요도가 아님.', '🔴 हाम्रो अनुमान — थोप्लाले मिति कति पक्का भन्छ, महत्त्व होइन।'],
  'Days = how long the ball has been with them. Tap an item to edit; ✓ closes it. Nothing here is typed into the code — import a JSON to fill a board.': ['일수 = 공이 그쪽에 가 있던 날수. 항목을 누르면 수정, ✓는 닫기. 코드엔 아무것도 안 들어감 — JSON을 가져와 보드를 채움.', 'दिन = बल उनीहरूसँग कति दिन रह्यो। वस्तु थिचेर सम्पादन; ✓ ले बन्द। कोडमा केही लेखिँदैन — बोर्ड भर्न JSON ल्याउनुहोस्।'],
  done: ['완료', 'सकियो'], 'Open to edit': ['눌러서 수정', 'सम्पादन गर्न खोल्नुहोस्'], 'Open again': ['다시 열기', 'फेरि खोल्ने'], 'Type a new name for a new board.': ['새 이름을 쓰면 새 보드가 생김.', 'नयाँ बोर्डका लागि नयाँ नाम लेख्नुहोस्।'], 'Type a name — a board is made from its first item.': ['이름을 쓰면 — 첫 항목으로 보드가 생김.', 'नाम लेख्नुहोस् — पहिलो वस्तुबाट बोर्ड बन्छ।'],
  'e.g. Licences · Shipment': ['예: 허가 · 선적', 'जस्तै: इजाजत · ढुवानी'], 'e.g. Import licence (EXIM code)': ['예: 수입 허가(EXIM 코드)', 'जस्तै: आयात इजाजत (EXIM कोड)'], 'the officer': ['담당 공무원', 'अधिकारी'], 'the forwarder': ['포워더', 'फर्वार्डर'], 'the lawyer': ['변호사', 'वकिल'],
  'The board counts the days from here.': ['보드가 이날부터 날짜를 셈.', 'बोर्डले यहीँदेखि दिन गन्छ।'], 'file:line': ['파일:줄', 'फाइल:लाइन'], 'who said it': ['누가 말했나', 'कसले भन्यो'], link: ['링크', 'लिंक'], 'Smaller = higher.': ['작을수록 위', 'सानो = माथि'], Bank: ['은행', 'बैंक'],
  '🎁 Referral campaign': ['🎁 추천 캠페인', '🎁 रेफरल अभियान'], 'No — no card, no rewards, no tree (the usual state)': ['아니요 — 카드·보상·관계도 없음(평소 상태)', 'होइन — कार्ड, इनाम, रूख छैन (सामान्य अवस्था)'], 'Yes — referrer gets 50% off a bill (switch on when installs slow down)': ['예 — 추천인 청구 50% 할인(설치가 느려질 때 켬)', 'हो — रेफर गर्नेलाई एक बिलमा ५०% छुट (जडान सुस्त हुँदा खोल्ने)'],
  'Together — one visit changes every filter that falls due before the next change': ['함께 — 다음 교체 전에 도는 필터를 한 번 방문에 전부 교체', 'सँगै — अर्को फेराइअघि पुग्ने सबै फिल्टर एकै भ्रमणमा'], 'Separate — each filter on its own date': ['따로 — 필터마다 자기 날짜', 'छुट्टै — हरेक फिल्टर आफ्नै मितिमा'],
  'Together: the next change is the earliest due filter; the visit takes every filter due before the one after it.': ['함께: 다음 교체일 = 가장 먼저 도는 필터, 그다음 교체 전에 도는 필터는 그 방문에 같이.', 'सँगै: अर्को फेराइ = सबैभन्दा पहिले पुग्ने फिल्टर; त्यसपछिको फेराइअघि पुग्ने सबै त्यही भ्रमणमा।'], 'Now:': ['지금:', 'अहिले:'],
  'Kora Care Private Limited (as on the PAN / VAT certificate)': ['Kora Care Private Limited (PAN/VAT 증명서 그대로)', 'Kora Care Private Limited (PAN / VAT प्रमाणपत्र अनुसार)'], 'The first line of every customer picture, in capitals.': ['고객 그림마다 첫 줄 — 대문자로.', 'हरेक ग्राहक तस्बिरको पहिलो लाइन, ठूला अक्षरमा।'], 'Empty = the registered name (OCR certificate).': ['비우면 = 등기된 이름(OCR 증명서).', 'खाली = दर्ता भएको नाम (OCR प्रमाणपत्र)।'],
  'The picture the customer scans from their gallery (bill + QR card). Saved the moment you pick it — the QR is never written into the app code.': ['고객이 갤러리에서 스캔할 그림(청구서+QR 카드). 고르는 순간 저장 — QR은 앱 코드에 안 들어감.', 'ग्राहकले ग्यालरीबाट स्क्यान गर्ने तस्बिर (बिल + QR कार्ड)। छान्नेबित्तिकै सुरक्षित — QR एपको कोडमा लेखिँदैन।'],
  bank: ['은행', 'बैंक'], 'account name': ['예금주', 'खाताको नाम'], 'account number': ['계좌번호', 'खाता नम्बर'], 'For customers whose app cannot read the QR — type the transfer details.': ['QR을 못 읽는 앱의 고객용 — 이체 정보를 적으세요.', 'QR पढ्न नसक्ने एप भएका ग्राहकका लागि — ट्रान्सफर विवरण लेख्नुहोस्।'],
  'Filters go together: everything that falls due before the next change is done on this visit (pre-ticked).': ['필터는 함께: 다음 교체 전에 도는 건 이번 방문에 같이(미리 체크됨).', 'फिल्टर सँगै: अर्को फेराइअघि पुग्ने सबै यही भ्रमणमा (पहिले नै छानिएको)।'], '🧾 Bill + QR': ['🧾 청구서+QR', '🧾 बिल + QR'], '🧾 QR': ['🧾 QR', '🧾 QR'], 'Company payment QR (bank account QR)': ['회사 결제 QR(은행 계좌 QR)', 'कम्पनी भुक्तानी QR'], '📷 Upload QR': ['📷 QR 올리기', '📷 QR राख्ने'], 'none yet': ['아직 없음', 'अहिले छैन'], 'Remove': ['삭제', 'हटाउने'], 'Bank line under the QR': ['QR 밑 은행 줄', 'QR मुनिको बैंक लाइन'], 'Save my card': ['내 카드 저장', 'मेरो कार्ड सुरक्षित'], 'your full name': ['전체 이름', 'पूरा नाम'], '(you)': ['(나)', '(तपाईं)'], 'admin · what the customer cards show when you did the visit': ['관리자 · 네가 방문한 집 카드에 나오는 것', 'एडमिन · तपाईंले गरेको भ्रमणको कार्डमा देखिने'], 'staff · what the customer cards show when you did the visit': ['직원 · 네가 방문한 집 카드에 나오는 것', 'स्टाफ · तपाईंले गरेको भ्रमणको कार्डमा देखिने'],
  'Milestones': ['마일스톤', 'माइलस्टोन'], 'Company build': ['회사 준비', 'कम्पनी तयारी'], 'Waiting on others': ['남이 들고 있는 것', 'अरूसँग रहेको'], 'Longest wait': ['가장 오래 막힘', 'सबैभन्दा लामो पर्खाइ'], 'Due in 14 days': ['14일 안 기한', '१४ दिनभित्र'], 'past due': ['기한 지남', 'म्याद नाघेको'], 'of this board': ['이 보드 기준', 'यो बोर्डको'],
  'Who holds the ball': ['공 든 사람', 'कसले समातेको'], 'open items': ['열린 항목', 'खुला'], 'Dates on this board': ['이 보드의 날짜', 'यो बोर्डका मिति'], 'No dates yet': ['날짜 없음', 'मिति छैन'], 'How to read it': ['읽는 법', 'कसरी पढ्ने'], 'with them': ['그쪽에', 'उनीहरूसँग'], 'was due': ['기한이었음', 'म्याद थियो'], '＋ Item': ['＋ 항목', '＋ वस्तु'], '＋ Board': ['＋ 보드', '＋ बोर्ड'], '📥 Import JSON': ['📥 JSON 가져오기', '📥 JSON ल्याउने'], '⬇️ JSON': ['⬇️ JSON', '⬇️ JSON'], 'Nothing open on this board 🏖️': ['이 보드에 열린 것 없음 🏖️', 'यो बोर्डमा खुला केही छैन 🏖️'],
  'Todo': ['할 것', 'गर्ने'], 'Waiting': ['대기', 'पर्खाइ'], 'Done': ['완료', 'सकियो'], 'Us': ['우리', 'हामी'], 'Ministry': ['정부 부처', 'मन्त्रालय'], 'Lawyer': ['변호사', 'वकिल'], 'Forwarder': ['포워더', 'फर्वार्डर'], 'Immigration': ['이민국', 'अध्यागमन'], 'Milestone': ['마일스톤', 'माइलस्टोन'], 'Board': ['보드', 'बोर्ड'], 'Name (optional)': ['이름(선택)', 'नाम (ऐच्छिक)'], 'State': ['상태', 'अवस्था'], 'With them since': ['그쪽에 넘어간 날', 'उनीहरूसँग देखि'], 'Due / expected': ['기한 / 예상', 'म्याद / अपेक्षित'], 'How sure is that date': ['그 날짜 확신도', 'मिति कति पक्का'], 'Source': ['출처', 'स्रोत'], 'Order on the board': ['보드 순서', 'बोर्डमा क्रम'], '🟢 measured': ['🟢 실측', '🟢 नापिएको'], '🟡 second-hand': ['🟡 전언', '🟡 सुनेको'], '🔴 guess': ['🔴 추정', '🔴 अनुमान'],
  'Referral campaign on?': ['추천 캠페인 켤까?', 'रेफरल अभियान?'], 'Filter changes': ['필터 교체 방식', 'फिल्टर फेर्ने तरिका'], 'Legal name in Nepali': ['네팔어 법인명', 'नेपालीमा कानुनी नाम'], 'Full name (on the visit note / installed card)': ['전체 이름(방문 메모·설치 카드용)', 'पूरा नाम (भ्रमण नोट / जडान कार्ड)'], '📷 Photo': ['📷 사진', '📷 फोटो'], 'round photo on the customer cards · face, good light': ['고객 카드의 원형 사진 · 얼굴·밝은 곳', 'ग्राहक कार्डको गोलो फोटो · अनुहार · उज्यालो'], 'Active & paused': ['활성 · 일시정지', 'सक्रिय र रोकिएको'], 'Visit due': ['방문 예정', 'भ्रमण बाँकी'],
  'Installed ': ['설치', 'जडान'], 'Next bill ': ['다음 청구', 'अर्को बिल'], 'households drinking KORA water today': ['가구가 오늘 KORA 물을 마셔요', 'घरधुरीले आज KORA पानी पिउँदैछन्'], 'installed so far': ['지금까지 설치', 'अहिलेसम्म जडान'],
  'ON COURSE': ['순항 중', 'ठीक बाटोमा'], 'CHECK': ['점검 필요', 'जाँच'], 'NOT YET': ['아직', 'अझै होइन'], 'VAT to file': ['신고할 VAT', 'बुझाउनुपर्ने भ्याट'], 'deposit held — not ours': ['맡은 보증금 — 우리 돈 아님', 'राखिएको धरौटी — हाम्रो होइन'],
  'stock at order point': ['재고가 발주선 도달', 'अर्डर बिन्दुमा मौज्दात'], '30+ bills': ['청구 30건+', '३०+ बिल'], 'collection ≥ 60%': ['수금률 ≥ 60%', 'असुली ≥ ६०%'], 'no repeated defect': ['반복 불량 없음', 'दोहोरिएको खराबी छैन'],
  // route
  'Collect': ['수금', 'असुली'], 'Repairs': ['수리', 'मर्मत'], 'To chase': ['받을 돈', 'असुल्ने'], 'Order': ['순서', 'क्रम'], 'Nothing left': ['남은 곳 없음', 'बाँकी छैन'], 'Navigate': ['길찾기', 'बाटो देखाउनुहोस्'], 'Open': ['열기', 'खोल्नुहोस्'], 'Close': ['닫기', 'बन्द'],
  "Today's order": ['오늘 순서', 'आजको क्रम'], 'Visit due ': ['방문 예정', 'भ्रमण बाँकी'], 'Home visit — overdue': ['연체 — 집 방문', 'घर भ्रमण — ढिलो'], 'Repair / request': ['수리 · 요청', 'मर्मत / अनुरोध'], 'Done today': ['오늘 완료', 'आज सकियो'], 'Visited today': ['오늘 방문함', 'आज भ्रमण गरियो'],
  'No stops': ['들를 곳 없음', 'रोकिने ठाउँ छैन'], 'Map library could not load.': ['지도를 불러오지 못했어요.', 'नक्सा लोड भएन।'], 'My location': ['내 위치', 'मेरो स्थान'],
  'Language': ['언어', 'भाषा'], 'Alerts': ['알림', 'सूचना'], 'No alerts — all clear': ['알림 없음 — 모두 정상', 'कुनै सूचना छैन — सबै ठीक'], 'FCL#1: all order conditions met — order now': ['FCL#1: 발주 조건 전부 충족 — 지금 발주', 'FCL#1: सबै सर्त पूरा — अहिले अर्डर गर्नुहोस्'],
  'Stock is at the FCL#1 order point': ['재고가 FCL#1 발주선에 닿았어요', 'मौज्दात FCL#1 अर्डर बिन्दुमा'], '— choose —': ['— 선택 —', '— छान्नुहोस् —'], '— choose customer —': ['— 고객 선택 —', '— ग्राहक छान्नुहोस् —'],
  'e.g. next to the blue-gate shop, 2nd floor': ['예: 파란 대문 가게 옆, 2층', 'जस्तै: निलो गेट भएको पसलको छेउ, दोस्रो तला'], 'e.g. dog, landlord, hard water': ['예: 개, 집주인, 센물', 'जस्तै: कुकुर, घरधनी, कडा पानी'],
  'hard water, options added, …': ['센물, 추가 옵션, …', 'कडा पानी, थप विकल्प, …'], 'complaints, symptoms, anything to remember': ['불만, 증상, 기억할 것', 'गुनासो, लक्षण, सम्झनुपर्ने कुरा'], 'e.g. O-ring ×2, fitting ×1': ['예: O링 ×2, 피팅 ×1', 'जस्तै: O-रिङ ×२, फिटिङ ×१'],
  'e.g. 1.1': ['예: 1.1', 'जस्तै: १.१'], 'Churn / month': ['월 이탈률', 'मासिक छोड्ने दर'], 'devices': ['대', 'यन्त्र'], 'G-1 §1-3 pipeline': ['G-1 §1-3 흐름', 'G-1 §1-3 प्रवाह'], 'G-1 §2-4 clock': ['G-1 §2-4 시계', 'G-1 §2-4 घडी'],
  'to chase:': ['받을 돈:', 'असुल्नुपर्ने:'], 'NPR': ['NPR', 'रु.'], 'hh-mo': ['가구-월', 'घर-महिना'], 'homes': ['가구', 'घर'], 'bills': ['청구', 'बिल'], 'Pokhara · every household': ['포카라 · 모든 가구', 'पोखरा · सबै घरधुरी'], 'No customers': ['고객 없음', 'ग्राहक छैन'], 'No match': ['일치 없음', 'मिलेन'], 'Nothing yet': ['아직 없음', 'अझै केही छैन'],
};
// dynamic text: [regex, ko, ne] ($1.. = captured)
const P = [
  [/^(\d+) need a call\/visit$/, '$1곳 전화·방문 필요', '$1 जनालाई फोन/भ्रमण चाहिन्छ'], [/^(\d+) past reply time$/, '$1건 응답 시간 지남', '$1 वटाको जवाफ ढिलो'],
  [/^in (\d+) d$/, '$1일 후', '$1 दिनमा'], [/^(\d+) d late$/, '$1일 연체', '$1 दिन ढिलो'], [/^(\d+) to send$/, '보낼 것 $1개', '$1 वटा पठाउन बाँकी'], [/^(\d+) sent$/, '보냄 $1', '$1 पठाइयो'], [/^(\d+) days$/, '$1일', '$1 दिन'], [/^(\d+) d$/, '$1일', '$1 दिन'],
  [/^(\d+) on this phone — sends when online$/, '폰에 $1건 — 연결되면 전송', 'यो फोनमा $1 — इन्टरनेट आएपछि जान्छ'], [/^(\d+) refused by the server — see Status$/, '서버가 $1건 거절 — 상태 확인', 'सर्भरले $1 अस्वीकार गर्‍यो — स्थिति हेर्नुहोस्'],
  [/^last server contact (.+)$/, '마지막 서버 연결 $1', 'पछिल्लो सर्भर सम्पर्क $1'], [/^(\d+) min ago$/, '$1분 전', '$1 मिनेट अघि'], [/^(\d+) h ago$/, '$1시간 전', '$1 घण्टा अघि'], [/^(\d+) d ago$/, '$1일 전', '$1 दिन अघि'], [/^just now$/, '방금', 'भर्खरै'],
  [/^(Good morning|Good afternoon|Good evening), (.+)$/, (m) => `${W[m[1]][0]}, ${m[2]}`, (m) => `${W[m[1]][1]}, ${m[2]}`],
  [/^Next: #(\d+) (.+)$/, '다음: #$1 $2', 'अर्को: #$1 $2'], [/^Route \((\d+)\)$/, '동선 ($1)', 'रुट ($1)'], [/^(\d+) stops ordered from your location · ≈(.+) km$/, '내 위치 기준 $1곳 순서 · 약 $2 km', 'तपाईंको स्थानबाट $1 ठाउँ क्रमबद्ध · करिब $2 km'],
  [/^(\d+) stops ordered from the first stop · ≈(.+) km$/, '첫 집 기준 $1곳 순서 · 약 $2 km', 'पहिलो ठाउँबाट $1 ठाउँ क्रमबद्ध · करिब $2 km'], [/^(\d+) stops$/, '$1곳', '$1 ठाउँ'], [/^≈(.+) km straight-line$/, '직선 약 $1 km', 'सीधा करिब $1 km'],
  [/^(\d+) stop\(s\) without GPS — open the customer and tap “Get location” next visit$/, 'GPS 없는 곳 $1개 — 다음 방문 때 고객 화면에서 「위치 잡기」', 'GPS नभएका $1 ठाउँ — अर्को भ्रमणमा «स्थान लिनुहोस्» थिच्नुहोस्'],
  [/^Visit due (.+)$/, '방문 예정 $1', 'भ्रमण $1'], [/^Filter due (.+)$/, '필터 $1', 'फिल्टर $1'], [/^filter (.+)$/, '필터 $1', 'फिल्टर $1'], [/^due (.+)$/, '$1 마감', 'म्याद $1'], [/^reply by (.+)$/, '$1까지 응답', '$1 सम्म जवाफ'],
  [/^through bill (\d+)$/, '$1회차까지 납부', '$1 औं बिलसम्म तिरेको'], [/^overdue since (.+)$/, '$1부터 연체', '$1 देखि बाँकी'], [/^(.+) on (\d{4}-\d{2}-\d{2})$/, '$2 · $1', '$2 · $1'],
  [/^(NPR [\d,]+) due$/, '$1 미납', '$1 बाँकी'], [/^of (NPR [\d,]+)$/, '/ $1', '/ $1'], [/^Waiting (\d+)$/, '대기 $1', 'बाँकी $1'], [/^Refused (\d+)$/, '거절 $1', 'अस्वीकार $1'], [/^Sent \(14 days\) (\d+)$/, '전송 (14일) $1', 'पठाइयो (१४ दिन) $1'],
  [/^(\d+) records$/, '$1건', '$1 रेकर्ड'], [/^\+(\d+) more — search to narrow$/, '+$1명 더 — 검색으로 좁히세요', '+$1 थप — खोजेर छान्नुहोस्'], [/^(\d+) leads$/, '리드 $1명', '$1 लिड'], [/^(\d+) signed$/, '계약 $1', '$1 सम्झौता'],
  [/^(\d+) homes$/, '$1가구', '$1 घर'], [/^7\+ days (\d+)$/, '7일+ $1', '७+ दिन $1'], [/^(\d+)\/(\d+) bills$/, '청구 $1/$2', '$1/$2 बिल'], [/^on time (\d+)%$/, '제때 $1%', 'समयमा $1%'], [/^overdue ([\d,]+)$/, '연체 $1', 'बाँकी $1'],
  [/^([\d.]+)\/wk installs$/, '주 $1대 설치', 'हप्तामा $1 जडान'], [/^(\d+) paused$/, '일시정지 $1', '$1 रोकिएको'], [/^(\d+) left$/, '해지 $1', '$1 छोडेको'], [/^\/ (\d+) installed$/, '/ 설치 $1', '/ $1 जडान'],
  [/^cash this month ([\d,]+)$/, '이번 달 입금 $1', 'यो महिना $1'], [/^collected ([\d,]+)$/, '받은 돈 $1', 'संकलित $1'], [/^refunded ([\d,]+)$/, '환불 $1', 'फिर्ता $1'], [/^forfeited ([\d,]+)$/, '몰취 $1', 'जफत $1'], [/^stock (\d+) devices$/, '재고 $1대', 'मौज्दात $1 यन्त्र'],
  [/^FCL (ORDER NOW|stock low|not yet)$/, (m) => 'FCL ' + ({ 'ORDER NOW': '지금 발주', 'stock low': '재고 부족', 'not yet': '발주 아직' })[m[1]], (m) => 'FCL ' + ({ 'ORDER NOW': 'अहिले अर्डर', 'stock low': 'मौज्दात कम', 'not yet': 'अझै होइन' })[m[1]]],
  [/^to chase: (.+)$/, '받을 돈: $1', 'असुल्नुपर्ने: $1'], [/^(\d+) follow-ups due$/, '연락할 리드 $1', '$1 फलो-अप बाँकी'], [/^(\d+) calls due now$/, '지금 통화할 곳 $1', 'अहिले $1 कल बाँकी'],
  [/^trigger ([\d.]+%)$/, '기준 $1', 'सीमा $1'], [/^sample (\d+) \/ (\d+) (.+)$/, '표본 $1 / $2', 'नमूना $1 / $2'], [/^(\d+)\/(\d+) (bills|homes|hh-mo)$/, '$1/$2', '$1/$2'],
  [/^Stock (-?\d+) ≤ ([\d.]+) \(avg ([\d.]+)\/week × (\d+) weeks\)$/, '재고 $1 ≤ $2 (주평균 $3 × $4주)', 'मौज्दात $1 ≤ $2 (हप्ताको औसत $3 × $4 हप्ता)'], [/^Stock (-?\d+) ≤ (.+)$/, '재고 $1 ≤ $2', 'मौज्दात $1 ≤ $2'],
  [/^Repeated: (.+)$/, (m) => '반복: ' + m[1].replace(/Breakdown|Leak|Water quality/g, (x) => W[x][0]), (m) => 'दोहोरिएको: ' + m[1].replace(/Breakdown|Leak|Water quality/g, (x) => W[x][1])],
  [/^Ward (\S+)$/, '와드 $1', 'वडा $1'], [/^7\+ days: (\d+) homes$/, '7일+: $1가구', '७+ दिन: $1 घर'], [/^(\d+) calls · (\d+) open requests$/, '통화 $1 · 열린 요청 $2', '$1 कल · $2 खुला अनुरोध'], [/^(\d+) open$/, '$1건 열림', '$1 खुला'], [/^(\d+) due$/, '$1곳', '$1 बाँकी'], [/^(\d+) by tole$/, '동네별 $1곳', 'टोल अनुसार $1'],
  [/^(\d+) request\(s\) past the reply time \(G-1 §2-4\)$/, '응답 시간 지난 요청 $1건 (G-1 §2-4)', 'जवाफ समय नाघेका $1 अनुरोध (G-1 §2-4)'], [/^(\d+) home\(s\) 7\+ days late — home visit$/, '7일+ 연체 $1가구 — 가정 방문', '७+ दिन ढिलो $1 घर — घर भ्रमण'],
  [/^(\d+) filter\(s\) past the booking date$/, '예약일 지난 필터 $1개', 'बुकिङ मिति नाघेका $1 फिल्टर'], [/^(\d+) onboarding call\(s\) overdue$/, '늦은 온보딩 통화 $1건', 'ढिलो भएका $1 अनबोर्डिङ कल'], [/^(\d+) lead\(s\) to follow up$/, '연락할 리드 $1명', 'फलो-अप गर्ने $1 लिड'],
  [/^(\d+) record\(s\) refused by the server — see Status$/, '서버가 거절한 기록 $1건 — 상태 확인', 'सर्भरले अस्वीकार गरेका $1 रेकर्ड — स्थिति हेर्नुहोस्'], [/^Direction gate: (\w+) crossed its trigger$/, '방향 게이트: $1 기준 넘음', 'दिशा जाँच: $1 सीमा नाघ्यो'],
  [/^Customers · (\d+)$/, '고객 · $1', 'ग्राहक · $1'], [/^Max (\d+) photos$/, '사진은 최대 $1장', 'बढीमा $1 फोटो'], [/^Created (\d+) payments$/, '결제 $1건 생성', '$1 भुक्तानी बनाइयो'], [/^Match (\d+) rows$/, '$1줄 대조', '$1 पङ्क्ति मिलाउनुहोस्'], [/^Create (\d+) payments$/, '결제 $1건 만들기', '$1 भुक्तानी बनाउनुहोस्'],
  [/^Saved on phone(?: \(\+(\d+) photo\))? — sends when online$/, (m) => `폰에 저장됨${m[1] ? ` (+사진 ${m[1]})` : ''} — 연결되면 전송`, (m) => `फोनमा सेभ भयो${m[1] ? ` (+${m[1]} फोटो)` : ''} — इन्टरनेट आएपछि जान्छ`],
  [/^(\d+) record\(s\) not sent yet — tap again to sign out anyway$/, '아직 안 보낸 기록 $1건 — 그래도 로그아웃하려면 다시 누르세요', '$1 रेकर्ड अझै पठाइएको छैन — जे होस् साइन आउट गर्न फेरि थिच्नुहोस्'],
  [/^Same number as (.+)\. Save anyway only if this is really a different household\.$/, '$1와 같은 번호예요. 정말 다른 집일 때만 「그래도 저장」.', 'यो नम्बर $1 सँग मिल्छ। साँच्चै फरक घर भए मात्र सेभ गर्नुहोस्।'],
  [/^G-1 §2-1 asks for 3 photos — you have (\d+)\.$/, 'G-1 §2-1은 사진 3장 — 지금 $1장.', 'G-1 §2-1 ले ३ फोटो माग्छ — तपाईंसँग $1 छ।'], [/^Above 1\.2 L\/min the UV margin is thin — (.+)$/, '1.2 L/min 넘으면 UV 여유가 얇아요 — 유량 조절기를 확인하세요.', '१.२ L/min भन्दा माथि UV कमजोर हुन्छ — फ्लो रेस्ट्रिक्टर जाँच्नुहोस्।'],
];

// ---- v0.4 (2026-09-28): drawer steps · directions from here · customer page order · CA pack · history · desk panels · ⌘K
// 🔴 Nepali = Claude draft, Tara to check (same as above).
const W4 = {
  'History': ['기간 조회', 'इतिहास'], 'Language': ['언어', 'भाषा'], 'Search & actions': ['검색·실행', 'खोज र काम'], 'Close (Esc)': ['닫기 (Esc)', 'बन्द (Esc)'],
  'Navigate': ['길찾기', 'बाटो'], 'Navigate from here': ['내 위치에서 길찾기', 'यहाँबाट बाटो'], 'Do now': ['지금 할 일', 'अहिले गर्ने'], 'Nothing due here': ['여기 밀린 일 없음', 'यहाँ केही बाँकी छैन'],
  'Remind': ['미리 알림', 'सम्झाउनुहोस्'], 'Update': ['수정', 'अपडेट'], 'Log call': ['통화 기록', 'कल लेख्नुहोस्'], 'Contract ended — renew': ['계약 만료 — 재계약', 'सम्झौता सकियो — नवीकरण'],
  'G-1 §1-3: send the reminder 3 days before': ['G-1 §1-3: 3일 전에 알림 보내기', 'G-1 §1-3: ३ दिन अघि सम्झना पठाउनुहोस्'], 'Referral: 1st month free': ['추천: 첫 달 무료', 'रेफरल: पहिलो महिना नि:शुल्क'], 'Referral reward: 1 month free': ['추천 보상: 1개월 무료', 'रेफरल इनाम: १ महिना नि:शुल्क'],
  'Location': ['위치', 'स्थान'], 'every 3 months (E-2)': ['3개월마다 (E-2)', 'हरेक ३ महिना (E-2)'], 'no booking interval — observe': ['예약 주기 없음 — 관찰', 'बुकिङ अवधि छैन — हेर्नुहोस्'], 'Find the house': ['집 찾는 법', 'घर कसरी भेट्ने'], 'Customer has left': ['해지한 고객', 'ग्राहकले छोडिसके'], 'No recovery case yet': ['회수 건 아직 없음', 'फिर्ता केस अझै छैन'], 'get the device back and settle the deposit': ['기기 회수하고 보증금 정산', 'उपकरण फिर्ता लिई धरौटी मिलाउनुहोस्'], 'Start': ['시작', 'सुरु'], 'Tap the pin button on the map to see how far you are': ['지도의 📍 버튼을 누르면 내 위치와 거리가 나와요', 'कति टाढा हुनुहुन्छ हेर्न नक्सामा 📍 थिच्नुहोस्'],
  'No location saved for this house yet — tap ✏️ Edit → “Get location now” at the door.': ['이 집 위치가 아직 없어요 — 문 앞에서 ✏️ 수정 → 「지금 위치 잡기」.', 'यो घरको स्थान छैन — ढोकामा ✏️ सम्पादन → «अहिले स्थान लिनुहोस्» थिच्नुहोस्।'],
  'No location saved for this house yet — ask Jun to add it.': ['이 집 위치가 아직 없어요 — Jun에게 추가 요청.', 'यो घरको स्थान छैन — Jun लाई थप्न भन्नुहोस्।'],
  'Tole · ward · zone': ['동네 · 와드 · 구역', 'टोल · वडा · जोन'], 'Customer': ['고객', 'ग्राहक'], 'Buyer PAN': ['구매자 PAN', 'खरिदकर्ता PAN'], 'no bill no.': ['빌 번호 없음', 'बिल नम्बर छैन'],
  'My location': ['내 위치', 'मेरो स्थान'], 'Back to the house': ['집으로 돌아가기', 'घरमा फर्कनुहोस्'], 'Finding your location…': ['내 위치 찾는 중…', 'तपाईंको स्थान खोज्दै…'],
  'Location is blocked for this site — Google will guess the start. Allow location for this site.': ['이 사이트 위치 권한이 막혀 있어요 — 출발지를 구글이 추측해요. 위치 권한을 허용하세요.', 'यो साइटको स्थान बन्द छ — सुरु ठाउँ Google ले अनुमान गर्छ। स्थान अनुमति दिनुहोस्।'],
  'Location not available — Google will guess the start.': ['위치를 못 잡았어요 — 출발지를 구글이 추측해요.', 'स्थान पाइएन — सुरु ठाउँ Google ले अनुमान गर्छ।'],
  'Location is blocked — allow it for this site (and for the browser in the computer settings).': ['위치 권한이 막혔어요 — 이 사이트 허용 + 컴퓨터 설정에서 브라우저 위치 허용.', 'स्थान बन्द छ — यो साइट र कम्प्युटर सेटिङमा ब्राउजरलाई अनुमति दिनुहोस्।'],
  'Location not available': ['위치를 못 잡았어요', 'स्थान पाइएन'], 'Directions ready': ['길찾기 준비됨', 'बाटो तयार'], 'Open Google Maps': ['구글 지도 열기', 'Google Maps खोल्नुहोस्'],
  'start: Google will guess — location is off': ['출발지: 구글 추측 — 위치 꺼짐', 'सुरु: Google को अनुमान — स्थान बन्द'],
  // forms & settings
  'VAT bill no.': ['VAT 빌 번호', 'भ्याट बिल नं.'], 'number on the VAT bill you gave': ['고객에게 준 VAT 빌의 번호', 'ग्राहकलाई दिएको भ्याट बिलको नम्बर'],
  'Goes into the IRD sales book for the CA (Money → CA pack). The app does not print tax invoices.': ['CA에게 줄 IRD 매출장에 들어가요(돈 → CA 팩). 앱은 세금계산서를 발행하지 않아요.', 'CA को IRD बिक्री खातामा जान्छ (पैसा → CA प्याक)। एपले कर बीजक छाप्दैन।'],
  'Goes into the IRD sales book for the CA. The app does not print tax invoices.': ['CA에게 줄 IRD 매출장에 들어가요. 앱은 세금계산서를 발행하지 않아요.', 'CA को IRD बिक्री खातामा जान्छ। एपले कर बीजक छाप्दैन।'],
  'Buyer PAN (business customers only)': ['구매자 PAN (사업자 고객만)', 'खरिदकर्ता PAN (व्यवसायी ग्राहक मात्र)'], '9 digits — leave empty for homes': ['9자리 — 가정집은 비워두기', '९ अंक — घरको लागि खाली राख्नुहोस्'],
  'Printed in the IRD sales book. Hotels, shops, offices usually have one.': ['IRD 매출장에 찍혀요. 호텔·가게·사무실은 보통 있어요.', 'IRD बिक्री खातामा छापिन्छ। होटल, पसल, अफिससँग प्रायः हुन्छ।'], 'PAN has 9 digits.': ['PAN은 9자리예요.', 'PAN ९ अंकको हुन्छ।'],
  'Company (for the CA pack)': ['회사 정보 (CA 팩용)', 'कम्पनी (CA प्याकका लागि)'], 'Legal company name': ['법인 정식 이름', 'कम्पनीको कानुनी नाम'], 'as on the PAN / VAT certificate': ['PAN/VAT 증명서에 적힌 그대로', 'PAN / भ्याट प्रमाणपत्रमा जस्तै'],
  'Company PAN (VAT)': ['회사 PAN (VAT)', 'कम्पनी PAN (भ्याट)'], '9 digits': ['9자리', '९ अंक'], 'Address': ['주소', 'ठेगाना'], 'e.g. Pokhara-13, Kaski': ['예: Pokhara-13, Kaski', 'जस्तै: पोखरा-१३, कास्की'],
  'Nepali calendar fix (only if the CA says a month length is wrong)': ['네팔력 보정 (CA가 달 길이가 틀렸다고 할 때만)', 'नेपाली पात्रो सुधार (CA ले महिनाको दिन गलत भने मात्र)'],
  'Years 2080–2083 are checked against 3 sources. From 2084 the sources disagree — put the official month lengths here when the calendar is out.': ['2080~2083년은 소스 3개로 확인했어요. 2084년부터는 소스끼리 달라요 — 공식 달력이 나오면 여기에 달 길이를 넣으세요.', '२०८०–२०८३ तीन स्रोतसँग मिलाइएको छ। २०८४ देखि स्रोत फरक छन् — आधिकारिक पात्रो आएपछि यहाँ राख्नुहोस्।'],
  'Company PAN has 9 digits': ['회사 PAN은 9자리예요', 'कम्पनी PAN ९ अंकको हुन्छ'],
  'The command centre opens when this window is at least 960 px wide — make the browser window wider (or full screen).': ['관제실은 창 폭이 960px 이상일 때 열려요 — 브라우저 창을 넓히거나 전체화면으로.', 'कमाण्ड सेन्टर ९६० px भन्दा चौडा झ्यालमा खुल्छ — ब्राउजर झ्याल ठूलो बनाउनुहोस्।'],
  // CA pack
  'CA pack': ['CA 팩', 'CA प्याक'], 'IRD sales book · Excel': ['IRD 매출장 · 엑셀', 'IRD बिक्री खाता · एक्सेल'], 'Data to fix': ['고칠 데이터', 'सुधार्नुपर्ने डाटा'], 'missing GPS · bill no.': ['GPS·빌번호 누락', 'GPS · बिल नं. छुटेको'],
  'IRD sales book (बिक्री खाता · rule 23(1)(ज)) for a Nepali month — the file to hand to the CA. Prices include VAT → value = amount ÷ 1.13. Cash basis by payment date. Deposit is not a sale until forfeited.': ['네팔 달(BS) 기준 IRD 매출장(बिक्री खाता · 규칙 23(1)(ज)) — CA에게 그대로 주는 파일. 가격은 VAT 포함 → 공급가 = 금액 ÷ 1.13. 입금일 기준(현금주의). 보증금은 몰취 전엔 매출 아님.', 'नेपाली महिनाको IRD बिक्री खाता (नियम २३(१)(ज)) — CA लाई दिने फाइल। मूल्यमा भ्याट समावेश → मूल्य = रकम ÷ १.१३। भुक्तानी मितिको आधारमा। धरौटी जफत नभएसम्म बिक्री होइन।'],
  '4 months': ['4개월', '४ महिना'], 'Period': ['기간', 'अवधि'], 'AD dates': ['양력 날짜', 'ई.सं. मिति'], 'Company': ['회사', 'कम्पनी'], 'not set': ['미입력', 'राखिएको छैन'], 'Settings': ['설정', 'सेटिङ'],
  'Return due': ['신고 기한', 'विवरण बुझाउने म्याद'], 'usually within 25 days after the period ends — confirm with the CA': ['보통 기간 끝나고 25일 안 — CA에게 확인', 'सामान्यतया अवधि सकिएको २५ दिनभित्र — CA सँग पक्का गर्नुहोस्'],
  'Ready for the CA — every row has a bill number': ['CA에게 줄 준비 끝 — 모든 줄에 빌 번호 있음', 'CA का लागि तयार — हरेक पङ्क्तिमा बिल नम्बर छ'],
  'Taxable sales (value)': ['과세 매출 (공급가)', 'करयोग्य बिक्री (मूल्य)'], 'VAT on sales 13%': ['매출 VAT 13%', 'बिक्रीमा भ्याट १३%'], 'Exempt · export': ['면세 · 수출', 'छुट · निकासी'], 'Rows (bills)': ['줄 수 (빌)', 'पङ्क्ति (बिल)'],
  'Cash received': ['받은 돈', 'प्राप्त रकम'], 'Deposit received (liability)': ['받은 보증금 (부채)', 'प्राप्त धरौटी (दायित्व)'], 'Deposit refunded · forfeited': ['보증금 환불 · 몰취', 'धरौटी फिर्ता · जफत'], 'Deposit held now': ['지금 보유 보증금', 'अहिले राखिएको धरौटी'],
  'Excel — IRD format': ['엑셀 — IRD 양식', 'एक्सेल — IRD ढाँचा'], 'Print / PDF': ['인쇄 / PDF', 'प्रिन्ट / PDF'], 'Message for the CA': ['CA에게 보낼 메시지', 'CA लाई सन्देश'], 'Left out of the sales book': ['매출장에서 뺀 것', 'बिक्री खाताबाट हटाइएको'],
  'This app does not issue tax invoices. Type the number of the VAT bill you actually gave (bill book or approved billing software) in each payment — that is the “Bill no.” column.': ['이 앱은 세금계산서를 발행하지 않아요. 실제로 준 VAT 빌 번호(빌북 또는 승인된 빌링 소프트웨어)를 결제마다 적으세요 — 그게 「빌 번호」 칸이에요.', 'यो एपले कर बीजक जारी गर्दैन। दिएको भ्याट बिलको नम्बर (बिल बुक वा स्वीकृत बिलिङ सफ्टवेयर) हरेक भुक्तानीमा लेख्नुहोस् — त्यो नै «बिल नं.» हो।'],
  'Copy, attach the Excel file, send to the CA:': ['복사해서 엑셀 파일 첨부 후 CA에게 보내기:', 'कपी गर्नुहोस्, एक्सेल फाइल जोडेर CA लाई पठाउनुहोस्:'], 'Copy': ['복사', 'कपी'], 'Copied': ['복사됨', 'कपी भयो'], 'Making the Excel file…': ['엑셀 만드는 중…', 'एक्सेल बनाउँदै…'], 'Allow pop-ups for printing': ['인쇄하려면 팝업 허용', 'प्रिन्टका लागि पप-अप अनुमति दिनुहोस्'],
  'Company name / PAN missing — Settings': ['회사 이름 / PAN 없음 — 설정', 'कम्पनी नाम / PAN छैन — सेटिङ'], 'Nepali calendar for this year is provisional — check the month dates with the CA': ['이 해 네팔력은 임시값 — 달 날짜를 CA와 확인', 'यो वर्षको पात्रो अस्थायी हो — महिनाका मिति CA सँग मिलाउनुहोस्'],
  // data to fix
  'Things that make reports wrong or visits slow. Tap a row to fix it.': ['보고서를 틀리게 하거나 방문을 느리게 하는 것들. 줄을 누르면 고칠 수 있어요.', 'रिपोर्ट गलत वा भ्रमण ढिलो बनाउने कुरा। सुधार्न पङ्क्ति थिच्नुहोस्।'],
  'Houses without GPS': ['GPS 없는 집', 'GPS नभएका घर'], 'no pin on the map, no route, no directions': ['지도 핀·동선·길찾기 불가', 'नक्सामा पिन, रुट, बाटो केही छैन'], 'No “how to find the house”': ['「집 찾는 법」 없음', '«घर कसरी भेट्ने» छैन'], 'new technicians get lost': ['새 기사가 길을 잃어요', 'नयाँ प्राविधिक हराउँछन्'],
  'Payments without a VAT bill no. (last 120 days)': ['VAT 빌 번호 없는 결제 (최근 120일)', 'भ्याट बिल नं. नभएका भुक्तानी (पछिल्लो १२० दिन)'], 'the CA sales book needs it': ['CA 매출장에 필요해요', 'CA बिक्री खातालाई चाहिन्छ'],
  'Completed visits without TDS after': ['「TDS 후」 없는 완료 방문', 'पछिको TDS नभएका भ्रमण'], 'the TDS line and filter learning need it': ['TDS 그래프·필터 학습에 필요해요', 'TDS रेखा र फिल्टर सिकाइलाई चाहिन्छ'], 'Open leads without a follow-up date': ['후속 연락일 없는 리드', 'फलो-अप मिति नभएका लिड'], 'they are forgotten': ['잊혀져요', 'बिर्सिन्छन्'], 'All good': ['전부 정상', 'सबै ठीक'],
  // desk panels
  'your location': ['내 위치', 'मेरो स्थान'], 'Overdue age': ['미수 연령', 'बाँकीको उमेर'], 'how old the unpaid bills are': ['안 낸 청구가 얼마나 묵었나', 'नतिरेका बिल कति पुराना'], 'money': ['돈', 'पैसा'], 'history': ['기간 조회', 'इतिहास'],
  'Next 4 weeks': ['앞으로 4주', 'आउँदो ४ हप्ता'], 'bills falling due': ['돌아오는 청구', 'आउने बिल'], 'trust the numbers': ['숫자를 믿을 수 있게', 'अंकमा भरोसा'], 'fix': ['고치기', 'सुधार'],
  'Due today': ['오늘 결제일', 'आज म्याद'], '1–7 days': ['1–7일', '१–७ दिन'], '8–30 days': ['8–30일', '८–३० दिन'], '31–60 days': ['31–60일', '३१–६० दिन'], '61–90 days': ['61–90일', '६१–९० दिन'], '90+ days': ['90일+', '९०+ दिन'],
  'IRD sales book by Nepali month': ['네팔 달별 IRD 매출장', 'नेपाली महिनाअनुसार IRD बिक्री खाता'], 'Nepali month': ['네팔 달', 'नेपाली महिना'], 'Bills': ['빌', 'बिल'], 'Taxable value': ['과세 공급가', 'करयोग्य मूल्य'], 'Deposit in': ['보증금 입금', 'धरौटी प्राप्त'], 'Ready?': ['준비?', 'तयार?'], 'now': ['이번 달', 'अहिले'], 'ready': ['준비됨', 'तयार'], 'check': ['확인 필요', 'जाँच्नुहोस्'],
  'Nepal files VAT by Nepali month. Tap a month → Excel in the IRD layout (बिक्री खाता) + summary + deposits.': ['네팔 VAT는 네팔 달 기준 신고. 달을 누르면 → IRD 양식 엑셀(बिक्री खाता) + 요약 + 보증금.', 'नेपालमा भ्याट नेपाली महिनाअनुसार बुझाइन्छ। महिना थिच्नुहोस् → IRD ढाँचाको एक्सेल + सारांश + धरौटी।'],
  'open': ['처리 중', 'खोल्नुहोस्'], 'refundable — a liability': ['돌려줄 돈 — 부채', 'फिर्ता हुने — दायित्व'], 'older than 30 days:': ['30일 넘은 것:', '३० दिनभन्दा पुरानो:'], 'NPR — hardest to collect': ['NPR — 제일 받기 어려움', 'रु. — उठाउन सबैभन्दा गाह्रो'],
  'Billed': ['청구액', 'बिल गरिएको'], 'Plus overdue now': ['+ 지금 연체', '+ अहिलेको बाँकी'], 'Deposit book': ['보증금 장부', 'धरौटी खाता'], 'VAT by AD month': ['양력 월별 VAT', 'ई.सं. महिनाअनुसार भ्याट'],
  'Route starts from your location': ['동선은 내 위치에서 출발', 'रुट तपाईंको स्थानबाट सुरु हुन्छ'], 'Team': ['팀', 'टोली'], 'Who': ['누구', 'को'], 'Installs': ['설치', 'जडान'], 'Visits': ['방문', 'भ्रमण'], 'Filters': ['필터', 'फिल्टर'], 'Repairs': ['수리', 'मर्मत'],
  'Requests done': ['요청 처리', 'सकिएका अनुरोध'], 'Days out': ['출동일', 'फिल्डका दिन'], 'Jobs / day': ['하루 작업', 'दिनको काम'], 'Min / visit': ['방문당 분', 'भ्रमणको मिनेट'], 'Last month': ['지난달', 'गत महिना'],
  'No completed work this month yet': ['이번 달 완료 작업 아직 없음', 'यो महिना अझै काम सकिएको छैन'], 'Jobs = installs + completed visits. Plan: 4–8 homes a day, 6 days a week.': ['작업 = 설치 + 완료 방문. 계획: 하루 4~8집, 주 6일.', 'काम = जडान + सकिएका भ्रमण। योजना: दिनमा ४–८ घर, हप्तामा ६ दिन।'],
  'Filters needed': ['필요한 필터', 'चाहिने फिल्टर'], 'next 90 days vs stock': ['90일 안 필요량 vs 재고', 'आउँदो ९० दिन बनाम मौज्दात'], 'Filter': ['필터', 'फिल्टर'], 'Needed': ['필요', 'चाहिने'], 'In stock': ['재고', 'मौज्दात'], 'ok': ['정상', 'ठीक'], 'When': ['언제', 'कहिले'], 'Nothing due in 90 days': ['90일 안 필요 없음', '९० दिनमा केही छैन'], 'stock': ['재고', 'मौज्दात'],
  'By tole': ['동네별', 'टोलअनुसार'], 'Tole': ['동네', 'टोल'], 'Homes': ['가구', 'घर'], 'Active': ['활성', 'सक्रिय'], 'Overdue homes': ['연체 가구', 'बाँकी घर'], 'Overdue NPR': ['연체액', 'बाँकी रकम'], 'Collection': ['수금률', 'असुली'], 'Last TDS (avg)': ['최근 TDS (평균)', 'पछिल्लो TDS (औसत)'], 'No GPS': ['GPS 없음', 'GPS छैन'],
  'clear tole ✕': ['동네 해제 ✕', 'टोल हटाउनुहोस् ✕'], 'tap a tole to filter': ['동네를 누르면 걸러져요', 'छान्न टोल थिच्नुहोस्'],
  'at month end': ['월말 기준', 'महिनाको अन्त्यमा'], 'this month': ['이번 달', 'यो महिना'], 'bills due by month end': ['월말까지 청구분', 'महिनाअन्त्यसम्मका बिल'], 'In · out': ['들어옴 · 나감', 'आएको · गएको'], 'Households': ['가구', 'घरपरिवार'],
  'active at each month end': ['월말마다 활성 가구', 'हरेक महिनाअन्त्यमा सक्रिय'], 'every month': ['매달', 'हरेक महिना'], 'Field': ['현장', 'फिल्ड'], 'Visits done': ['완료 방문', 'सकिएका भ्रमण'], 'Filters changed': ['교체 필터', 'फेरिएका फिल्टर'], 'Sanitised': ['살균', 'सफा गरिएको'],
  'Requests in · done': ['요청 접수 · 처리', 'अनुरोध आएका · सकिएका'], 'Calls logged': ['기록된 통화', 'लेखिएका कल'], 'Recovery cases': ['회수 건', 'फिर्ता केस'], 'Installs & leavers': ['설치 · 해지', 'जडान र छोड्ने'], 'None this month': ['이번 달 없음', 'यो महिना छैन'],
  'Every month': ['전체 달', 'सबै महिना'], 'tap a row': ['줄을 누르세요', 'पङ्क्ति थिच्नुहोस्'], 'Month': ['월', 'महिना'], 'Left': ['해지', 'छोडेका'], 'Active (end)': ['활성 (월말)', 'सक्रिय (अन्त्य)'], 'Cash in': ['입금', 'आम्दानी'], 'VAT': ['VAT', 'भ्याट'],
  'Overdue (end)': ['연체 (월말)', 'बाँकी (अन्त्य)'], 'Requests': ['요청', 'अनुरोध'], 'Cohorts': ['코호트', 'समूह'], '% of each install month still with us': ['설치 달별 아직 남은 비율', 'हरेक जडान महिनाका अझै रहेका %'], 'Installed': ['설치', 'जडान'],
  'M3 = 3 months after install. Green ≥ 95% · yellow ≥ 85% (the gate line) · red below.': ['M3 = 설치 3개월 뒤. 초록 ≥95% · 노랑 ≥85%(게이트선) · 그 아래 빨강.', 'M3 = जडानको ३ महिनापछि। हरियो ≥९५% · पहेँलो ≥८५% (गेट रेखा) · तल रातो।'],
  'Tap a month': ['달을 누르세요', 'महिना थिच्नुहोस्'], 'Customer, page or action…': ['고객, 화면, 할 일…', 'ग्राहक, पेज वा काम…'], 'choose': ['선택', 'छान्नुहोस्'], 'esc close': ['esc 닫기', 'esc बन्द'], 'page': ['화면', 'पेज'], 'form': ['입력', 'फारम'], 'report': ['보고서', 'रिपोर्ट'], 'list': ['목록', 'सूची'], 'language': ['언어', 'भाषा'], 'the day in 6 slides': ['오늘을 6장으로', '६ स्लाइडमा आज'],
  'company · calendar · techs': ['회사 · 달력 · 기사', 'कम्पनी · पात्रो · प्राविधिक'], 'AD months · CSV': ['양력 월 · CSV', 'ई.सं. महिना · CSV'], 'IRD sales book': ['IRD 매출장', 'IRD बिक्री खाता'],
  'your location (needs location allowed for this site)': ['내 위치 (이 사이트 위치 허용 필요)', 'मेरो स्थान (साइटलाई अनुमति चाहिन्छ)'], 'scroll gently to zoom': ['살살 스크롤해서 확대', 'बिस्तारै स्क्रोल गरेर जुम'],
  'Past months are rebuilt from the records: payments, visits and leavers up to that day. Paused customers count as active in past months (the pause start is not stored).': ['지난 달은 기록으로 다시 계산: 그날까지의 결제·방문·해지. 일시정지 고객은 지난 달엔 활성으로 셈(정지 시작일을 저장 안 함).', 'पुराना महिना रेकर्डबाट फेरि गणना: त्यो दिनसम्मका भुक्तानी, भ्रमण र छोड्ने। रोकिएका ग्राहक पुराना महिनामा सक्रिय गनिन्छन्।'],
};
for (const [k, v] of Object.entries(W4)) if (!(k in W)) W[k] = v;
const MON_KO = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const BSM = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
const BSM_NE = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
P.push(
  [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/, (m) => `${m[2]}년 ${MON_KO[m[1]]}월`, (m) => `${NE_MON[MON_KO[m[1]] - 1]} ${m[2]}`],
  [/^(Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4})$/, '$1 $2', (m) => `${BSM_NE[BSM.indexOf(m[1])]} ${m[2]}`],
  [/^(Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4}) – (Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4})$/, '$1 $2 – $3 $4', (m) => `${BSM_NE[BSM.indexOf(m[1])]} ${m[2]} – ${BSM_NE[BSM.indexOf(m[3])]} ${m[4]}`],
  [/^next visit (\S+)$/, '다음 방문 $1', 'अर्को भ्रमण $1'], [/^next bill (\S+)$/, '다음 청구 $1', 'अर्को बिल $1'], [/^Collect (NPR [\d,]+)$/, '$1 수금', '$1 उठाउनुहोस्'],
  [/^Bill (NPR [\d,]+) due (.+)$/, '$2 청구 $1', '$2 मा बिल $1'], [/^Visit due today$/, '오늘 방문', 'आज भ्रमण'], [/^Filters to change: (.+)$/, '교체할 필터: $1', 'फेर्ने फिल्टर: $1'],
  [/^bill (\S+)$/, '빌 $1', 'बिल $1'], [/^([\d.]+ (?:m|km)) from you \(straight line\)$/, '내 위치에서 직선 $1', 'तपाईंबाट सिधा $1'], [/^from your location \(±(.+) m\)$/, '내 위치에서 출발 (±$1 m)', 'तपाईंको स्थानबाट (±$1 m)'],
  [/^(\d+) row\(s\) without a VAT bill number$/, 'VAT 빌 번호 없는 줄 $1개', 'भ्याट बिल नम्बर नभएका $1 पङ्क्ति'], [/^Same bill number used twice: (.+)$/, '같은 빌 번호 중복: $1', 'एउटै बिल नम्बर दोहोरियो: $1'],
  [/^(\d+) penalty payment\(s\) left out — ask the CA how to treat them$/, '연체료 $1건 제외 — 처리 방법 CA에게 문의', '$1 जरिवाना भुक्तानी हटाइयो — CA सँग सोध्नुहोस्'],
  [/^Bill no\. (.+) is already on another payment \((.+)\)\. Each VAT bill has its own number\.$/, '빌 번호 $1은(는) 다른 결제($2)에 이미 있어요. VAT 빌마다 번호가 달라야 해요.', 'बिल नं. $1 अर्को भुक्तानीमा ($2) छ। हरेक भ्याट बिलको छुट्टै नम्बर हुन्छ।'],
  [/^vs (\w{3} \d{4}) end$/, (m) => `${T(m[1])} 말 대비`, (m) => `${T(m[1])} अन्त्यको तुलनामा`], [/^vs (\w{3} \d{4})$/, (m) => `${T(m[1])} 대비`, (m) => `${T(m[1])} को तुलनामा`], [/^last month ([\d,]+)$/, '지난달 $1', 'गत महिना $1'],
  [/^expected at today's collection (.+):$/, '지금 수금률 $1 기준 예상:', 'आजको असुली $1 मा अपेक्षित:'], [/^Expected at (.+)$/, '$1 기준 예상', '$1 मा अपेक्षित'], [/^(\d+) no bill no\.$/, '빌번호 없음 $1', '$1 बिल नं. छैन'],
  [/^(\d+) bills$/, '청구 $1건', '$1 बिल'], [/^(\d+) areas$/, '$1곳', '$1 क्षेत्र'], [/^(\d+) jobs$/, '$1건', '$1 काम'], [/^short (\d+)$/, '$1개 부족', '$1 कम'], [/^this month \((.+)\)$/, (m) => `이번 달 (${T(m[1])})`, (m) => `यो महिना (${T(m[1])})`],
  [/^\+(\d+) more — use the search$/, '+$1명 더 — 검색 사용', '+$1 थप — खोज प्रयोग गर्नुहोस्'], [/^as of (\S+)( \(today\))?$/, (m) => `${m[1]} 기준${m[2] ? ' (오늘)' : ''}`, (m) => `${m[1]} सम्म${m[2] ? ' (आज)' : ''}`],
  [/^(\d+) installed$/, '설치 $1', '$1 जडान'], [/^VAT ([\d,]+)$/, 'VAT $1', 'भ्याट $1'], [/^deposit ([\d,]+)$/, '보증금 $1', 'धरौटी $1'], [/^deposit held ([\d,]+)$/, '보유 보증금 $1', 'राखिएको धरौटी $1'], [/^MRR ([\d,]+)$/, '월 반복매출 $1', 'मासिक आम्दानी $1'],
  [/^(\d+) months after last change$/, '마지막 교체 후 $1개월', 'पछिल्लो फेरेको $1 महिनापछि'], [/^(\d+) months after install$/, '설치 후 $1개월', 'जडानको $1 महिनापछि'],
  [/^PP looked (brown|black) on (\S+) — replace now \(E-2\)$/, (m) => `${m[2]}에 PP가 ${m[1] === 'brown' ? '갈색' : '검정'} — 지금 교체 (E-2)`, (m) => `${m[2]} मा PP ${m[1] === 'brown' ? 'खैरो' : 'कालो'} — अहिले फेर्नुहोस् (E-2)`],
  [/^(.+) · left$/, '$1 · 해지', '$1 · छोड्यो'], [/^\+(\d+) more rows in the Excel file$/, '엑셀에 $1줄 더', 'एक्सेलमा $1 थप पङ्क्ति'],
);

// ---- v0.5 (2026-09-28): own route order · staff & permissions · expenses · devices · relocations · photos (🔴 Nepali = draft)
const W5 = {
  'Auto order': ['자동 순서', 'स्वचालित क्रम'], 'from where you are': ['내 위치 기준', 'तपाईं भएको ठाउँबाट'], 'from where you are (finding you…)': ['내 위치 기준 (위치 찾는 중…)', 'तपाईं भएको ठाउँबाट (खोज्दै…)'],
  'Your own order': ['직접 정한 순서', 'आफ्नै क्रम'], 'Back to auto': ['자동으로 되돌리기', 'फेरि स्वचालित'], 'Change order': ['순서 바꾸기', 'क्रम बदल्नुहोस्'],
  'Auto — redone from where you are as you move': ['자동 — 움직이면 내 위치 기준으로 다시 짜요', 'स्वचालित — हिँड्दै गर्दा तपाईंको ठाउँबाट फेरि मिलाउँछ'],
  'move a stop': ['집 순서 옮기기', 'ठाउँ सार्नुहोस्'], 'go there next': ['다음에 여기로', 'अब यहाँ जाने'], 'tap a name to open. Changing the order switches to your own order.': ['이름을 누르면 열려요. 순서를 바꾸면 「직접 정한 순서」로 바뀌어요.', 'नाम थिचे खुल्छ। क्रम बदल्दा आफ्नै क्रममा जान्छ।'],
  'Up': ['위로', 'माथि'], 'Down': ['아래로', 'तल'], 'Go there next': ['다음에 여기로', 'अब यहाँ जाने'],
  'Relocation': ['이사', 'स्थानान्तरण'], 'customer moves house': ['고객이 집을 옮겨요', 'ग्राहक घर सर्दै'], 'Expense': ['지출', 'खर्च'], 'bill · receipt · VAT': ['영수증 · 계산서 · VAT', 'बिल · रसिद · भ्याट'],
  'Device event': ['기기 이력', 'उपकरण घटना'], 'arrival · check · refurbish': ['입고 · 검수 · 수리', 'आगमन · जाँच · मर्मत'], 'Add photos': ['사진 추가', 'फोटो थप्नुहोस्'], 'house · device · contract': ['집 · 기기 · 계약서', 'घर · उपकरण · सम्झौता'],
  'Your account cannot do this — ask Jun': ['이 계정은 이 작업 권한이 없어요 — Jun에게 요청', 'यो खाताले यो गर्न सक्दैन — Jun लाई भन्नुहोस्'],
  'Your account cannot open this — ask Jun.': ['이 계정은 여기를 열 수 없어요 — Jun에게 요청하세요.', 'यो खाताले यो खोल्न सक्दैन — Jun लाई भन्नुहोस्।'], 'Your account cannot open this page.': ['이 계정은 이 화면을 열 수 없어요.', 'यो खाताले यो पेज खोल्न सक्दैन।'],
  'Moving house': ['이사 가요', 'घर सर्दै'], 'Leaving → recovery': ['해지 → 기기 회수', 'छोड्दै → फिर्ता'],
  'Date paid': ['낸 날', 'तिरेको मिति'], 'Category': ['분류', 'वर्ग'], 'What was bought': ['산 것', 'के किनियो'], 'e.g. 10 PP filters · September rent · petrol': ['예: PP 필터 10개 · 9월 월세 · 기름', 'जस्तै: PP फिल्टर १० · असोज भाडा · पेट्रोल'],
  'Amount paid (NPR, VAT included)': ['낸 금액 (NPR, VAT 포함)', 'तिरेको रकम (रु., भ्याट सहित)'], 'Supplier': ['거래처', 'आपूर्तिकर्ता'], 'shop / company / person': ['가게 · 회사 · 사람', 'पसल · कम्पनी · व्यक्ति'],
  'VAT bill (with the supplier PAN)?': ['VAT 계산서 받았나요 (거래처 PAN 있음)?', 'भ्याट बिल (आपूर्तिकर्ताको PAN सहित)?'],
  'Only a VAT bill gives input VAT back. Petrol pumps, shops and CA fees usually give one if you ask.': ['VAT 계산서가 있어야 매입세액을 돌려받아요. 주유소·가게·CA 수수료는 달라고 하면 보통 줘요.', 'भ्याट बिल भए मात्र खरिद भ्याट फिर्ता हुन्छ। पेट्रोल पम्प, पसल र CA ले मागे प्रायः दिन्छन्।'],
  'Supplier PAN': ['거래처 PAN', 'आपूर्तिकर्ता PAN'], 'Supplier bill no.': ['거래처 계산서 번호', 'आपूर्तिकर्ता बिल नं.'], 'VAT on the bill (NPR)': ['계산서의 VAT (NPR)', 'बिलमा भ्याट (रु.)'],
  'Leave empty = 13% of the amount (amount × 13 ÷ 113).': ['비워두면 금액의 13% (금액 × 13 ÷ 113).', 'खाली छोडे = रकमको १३% (रकम × १३ ÷ ११३)।'], 'Import (customs declaration)?': ['수입 (세관 신고서)?', 'पैठारी (भन्सार प्रज्ञापनपत्र)?'],
  'Customs declaration no. (प्रज्ञापनपत्र)': ['세관 신고서 번호 (प्रज्ञापनपत्र)', 'प्रज्ञापनपत्र नं.'], 'Asset that lasts more than a year?': ['1년 넘게 쓰는 자산인가요?', 'एक वर्षभन्दा बढी चल्ने सम्पत्ति?'],
  'Devices for rent, motorbikes, tools, computer → yes (purchase book capital column).': ['대여용 기기·오토바이·공구·컴퓨터 → 예 (매입장 자본 칸).', 'भाडाका उपकरण, मोटरसाइकल, औजार, कम्प्युटर → हो (खरिद खाताको पूंजीगत महल)।'],
  'Paid from': ['어디서 낸 돈', 'कहाँबाट तिरेको'], 'Paid back to Jun?': ['Jun에게 돌려줬나요?', 'Jun लाई फिर्ता दियो?'], 'Receipt / bill photo (or PDF)': ['영수증 · 계산서 사진 (또는 PDF)', 'रसिद / बिलको फोटो (वा PDF)'],
  'Choose a category.': ['분류를 고르세요.', 'वर्ग छान्नुहोस्।'], 'The purchase book needs the bill number to claim the VAT back.': ['매입세액을 돌려받으려면 매입장에 계산서 번호가 필요해요.', 'भ्याट फिर्ताका लागि खरिद खातामा बिल नम्बर चाहिन्छ।'],
  'VAT cannot be more than the amount.': ['VAT가 금액보다 클 수 없어요.', 'भ्याट रकमभन्दा बढी हुन सक्दैन।'], 'No receipt photo — the CA may ask for it.': ['영수증 사진 없음 — CA가 달라고 할 수 있어요.', 'रसिदको फोटो छैन — CA ले माग्न सक्छ।'],
  'Devices & import': ['기기 · 수입', 'उपकरण र पैठारी'], 'Filters & spare parts': ['필터 · 부품', 'फिल्टर र पार्टपुर्जा'], 'Customs, freight & clearing': ['관세 · 운임 · 통관', 'भन्सार, ढुवानी र क्लियरिङ'],
  'Salaries & wages': ['급여 · 일당', 'तलब र ज्याला'], 'Fuel & transport': ['기름 · 교통', 'इन्धन र यातायात'], 'Motorbike upkeep': ['오토바이 관리', 'मोटरसाइकल मर्मत'], 'Rent': ['임대료', 'भाडा'],
  'Phone & internet': ['전화 · 인터넷', 'फोन र इन्टरनेट'], 'Software & subscriptions': ['소프트웨어 · 구독', 'सफ्टवेयर र सदस्यता'], 'Marketing & printing': ['마케팅 · 인쇄', 'मार्केटिङ र छपाइ'],
  'Office supplies': ['사무용품', 'कार्यालय सामग्री'], 'Tools & equipment': ['공구 · 장비', 'औजार र उपकरण'], 'Professional fees (CA, lawyer)': ['전문가 수수료 (CA · 변호사)', 'पेशागत शुल्क (CA, वकिल)'],
  'Bank & payment fees': ['은행 · 결제 수수료', 'बैंक र भुक्तानी शुल्क'], 'Government fees & taxes': ['정부 수수료 · 세금', 'सरकारी शुल्क र कर'],
  'Company bank': ['회사 통장', 'कम्पनी बैंक'], 'Petty cash (Tara)': ['소액 현금 (타라)', 'सानो नगद (तारा)'], 'Jun personal — reimburse': ['Jun 개인 돈 — 돌려받기', 'Jun को व्यक्तिगत — फिर्ता'], 'Wallet / card': ['지갑 · 카드', 'वालेट / कार्ड'], 'Card': ['카드', 'कार्ड'],
  'What happened': ['무슨 일', 'के भयो'], 'Installs, recoveries and relocation swaps are added automatically from those forms.': ['설치·회수·이사 때 기기 교체는 그 기록에서 자동으로 들어가요.', 'जडान, फिर्ता र स्थानान्तरणका साटासाट ती फारमबाट आफैं थपिन्छन्।'],
  'Serial number(s)': ['시리얼 번호', 'सिरियल नम्बर'], 'one per line — several at once for a shipment': ['한 줄에 하나 — 입고분은 한 번에 여러 개', 'एक लाइनमा एउटा — ढुवानीका धेरै एकैपटक'], 'Batch / PI': ['입고 묶음 / PI', 'ब्याच / PI'],
  'Landed cost per device (NPR)': ['기기 1대 도착 원가 (NPR)', 'प्रति उपकरण आइपुगेको लागत (रु.)'], 'Price + freight + customs + clearing ÷ units (for the asset register).': ['제품값 + 운임 + 관세 + 통관 ÷ 대수 (자산 대장용).', 'मूल्य + ढुवानी + भन्सार + क्लियरिङ ÷ संख्या (सम्पत्ति खाताका लागि)।'],
  'What is wrong': ['무엇이 문제인가', 'के बिग्रियो'], 'PI: inspect within 14 days of arrival — photos + serial for the claim.': ['PI: 도착 14일 안에 검수 — 청구용 사진 + 시리얼.', 'PI: आइपुगेको १४ दिनभित्र जाँच — दाबीका लागि फोटो + सिरियल।'],
  'Enter at least one serial.': ['시리얼을 하나 이상 넣으세요.', 'कम्तीमा एउटा सिरियल लेख्नुहोस्।'], 'Write what is wrong.': ['무엇이 문제인지 적으세요.', 'के बिग्रियो लेख्नुहोस्।'],
  'Received into stock': ['입고', 'मौज्दातमा आयो'], 'Arrival check OK': ['입고 검수 정상', 'आगमन जाँच ठीक'], 'Arrival check — defect': ['입고 검수 — 불량', 'आगमन जाँच — खराबी'], 'Sent to refurbish': ['수리 보냄', 'मर्मतमा पठाइयो'],
  'Refurbished — ready': ['수리 완료 — 사용 가능', 'मर्मत सकियो — तयार'], 'Swapped out': ['교체로 회수', 'साटेर निकालियो'], 'Scrapped': ['폐기', 'फालियो'], 'Lost / stolen': ['분실 · 도난', 'हरायो / चोरियो'],
  'In stock': ['재고', 'मौज्दातमा'], 'At a customer': ['고객 집', 'ग्राहकको घरमा'], 'Back — check it': ['회수됨 — 점검 필요', 'फिर्ता — जाँच्नुहोस्'], 'At refurbish': ['수리 중', 'मर्मतमा'], 'Defect — claim': ['불량 — 청구', 'खराबी — दाबी'], 'Lost': ['분실', 'हरायो'],
  'Move date': ['이사 날짜', 'सर्ने मिति'], 'New address': ['새 주소', 'नयाँ ठेगाना'], "When the status is Done, the customer's address and map pin change to this one (the old one stays on this record).": ['상태가 완료면 고객 주소와 지도 핀이 여기로 바뀌어요 (옛 주소는 이 기록에 남아요).', 'स्थिति «सकियो» भएपछि ग्राहकको ठेगाना र नक्सा पिन यहीँ बदलिन्छ (पुरानो यस रेकर्डमा रहन्छ)।'],
  'How to find the new house': ['새 집 찾는 법', 'नयाँ घर कसरी भेट्ने'], 'New house location': ['새 집 위치', 'नयाँ घरको स्थान'], 'Same device moved?': ['같은 기기를 옮겼나요?', 'उही उपकरण सारियो?'], 'New device serial': ['새 기기 시리얼', 'नयाँ उपकरणको सिरियल'],
  'Relocation fee charged (NPR)': ['받은 이사비 (NPR)', 'लिइएको स्थानान्तरण शुल्क (रु.)'], 'No fixed fee in the contract draft yet — 0 if none.': ['계약 초안에 정해진 이사비 없음 — 없으면 0.', 'सम्झौताको मस्यौदामा शुल्क तोकिएको छैन — नभए ०।'],
  'Water pressure at the new house (PSI)': ['새 집 수압 (PSI)', 'नयाँ घरको पानीको प्रेसर (PSI)'], 'Choose the new tole.': ['새 동네를 고르세요.', 'नयाँ टोल छान्नुहोस्।'], 'Choose the new ward.': ['새 와드를 고르세요.', 'नयाँ वडा छान्नुहोस्।'], 'Enter the new serial.': ['새 시리얼을 넣으세요.', 'नयाँ सिरियल लेख्नुहोस्।'],
  'Check the fee.': ['금액을 확인하세요.', 'शुल्क जाँच्नुहोस्।'], 'Save the new house location before marking Done.': ['완료로 바꾸기 전에 새 집 위치를 저장하세요.', '«सकियो» गर्नु अघि नयाँ घरको स्थान सेभ गर्नुहोस्।'], 'Requested': ['요청됨', 'अनुरोध गरियो'],
  'What is it': ['무슨 사진', 'के हो'], 'House / entrance': ['집 · 입구', 'घर / ढोका'], 'Contract': ['계약서', 'सम्झौता'], 'Water / TDS': ['물 · TDS', 'पानी / TDS'], 'Add at least one photo.': ['사진을 한 장 이상 넣으세요.', 'कम्तीमा एउटा फोटो थप्नुहोस्।'],
  'What the company paid. VAT bills give input VAT back — they fill the purchase book (खरिद खाता) in the CA pack.': ['회사가 낸 돈. VAT 계산서가 있으면 매입세액을 돌려받고, CA 팩의 매입장(खरिद खाता)에 들어가요.', 'कम्पनीले तिरेको। भ्याट बिलले खरिद भ्याट फिर्ता दिन्छ — CA प्याकको खरिद खातामा जान्छ।'],
  'Paid this month': ['이번 달 지출', 'यो महिना तिरेको'], 'Input VAT (VAT bills)': ['매입세액 (VAT 계산서)', 'खरिद भ्याट (भ्याट बिल)'], 'Cost without VAT': ['VAT 뺀 비용', 'भ्याटबाहेक लागत'], 'Owed to Jun (not paid back)': ['Jun에게 돌려줄 돈', 'Jun लाई फिर्ता दिन बाँकी'],
  'No expenses this month': ['이번 달 지출 없음', 'यो महिना खर्च छैन'], 'New expense': ['새 지출', 'नयाँ खर्च'], 'no VAT bill': ['VAT 계산서 없음', 'भ्याट बिल छैन'], 'Expenses CSV (all)': ['지출 CSV (전체)', 'खर्च CSV (सबै)'], 'Expenses': ['지출', 'खर्च'],
  'Devices by serial': ['시리얼별 기기', 'सिरियलअनुसार उपकरण'], 'Every purifier: where it is now and everything that happened to it. Installs, recoveries and relocation swaps are added by themselves.': ['정수기 한 대 한 대: 지금 어디 있고 무슨 일이 있었는지. 설치·회수·이사 교체는 자동으로 들어가요.', 'हरेक प्युरिफायर: अहिले कहाँ छ र के-के भयो। जडान, फिर्ता र साटासाट आफैं थपिन्छन्।'],
  'Stock by count (stock movements):': ['수량 기준 재고 (입출고):', 'संख्याअनुसार मौज्दात:'], 'by serial “In stock”:': ['시리얼 기준 「재고」:', 'सिरियलअनुसार «मौज्दात»:'], '— different: register the serials of the shipment (Device event → Received).': ['— 서로 달라요: 입고분 시리얼을 등록하세요 (기기 이력 → 입고).', '— फरक छ: ढुवानीका सिरियल दर्ता गर्नुहोस् (उपकरण घटना → आयो)।'],
  'Device event (arrival · check · refurbish)': ['기기 이력 (입고 · 검수 · 수리)', 'उपकरण घटना (आगमन · जाँच · मर्मत)'], 'Now': ['지금', 'अहिले'], 'Batch': ['입고 묶음', 'ब्याच'], 'No devices yet': ['아직 기기 없음', 'अझै उपकरण छैन'],
  'No history for this serial yet.': ['이 시리얼은 아직 이력이 없어요.', 'यो सिरियलको इतिहास छैन।'], 'at': ['위치:', 'मा'], 'install form': ['설치 기록', 'जडान फारम'], 'recovery case': ['회수 건', 'फिर्ता केस'], 'device event': ['기기 이력', 'उपकरण घटना'],
  'Send to refurbish': ['수리 보내기', 'मर्मतमा पठाउनुहोस्'], 'Scrap': ['폐기', 'फाल्नुहोस्'], 'Relocations': ['이사', 'स्थानान्तरण'], 'Customers moving house: new address, new pin, device moved or swapped.': ['집 옮기는 고객: 새 주소 · 새 핀 · 기기 이동 또는 교체.', 'घर सर्ने ग्राहक: नयाँ ठेगाना, नयाँ पिन, उपकरण सारियो वा साटियो।'],
  'No relocations': ['이사 없음', 'स्थानान्तरण छैन'], 'New relocation': ['새 이사', 'नयाँ स्थानान्तरण'], 'moving house': ['집 옮기기', 'घर सर्ने'], 'every serial': ['시리얼 전체', 'सबै सिरियल'], 'bills · input VAT': ['계산서 · 매입세액', 'बिल · खरिद भ्याट'],
  'Staff & permissions': ['직원 · 권한', 'कर्मचारी र अनुमति'], 'who can do what': ['누가 무엇을 할 수 있나', 'कसले के गर्न सक्छ'], 'Who can do what': ['누가 무엇을 할 수 있나', 'कसले के गर्न सक्छ'], 'Areas': ['담당 동네', 'क्षेत्र'], 'admin': ['관리자', 'एडमिन'],
  'Name (shown on records)': ['이름 (기록에 표시)', 'नाम (रेकर्डमा देखिन्छ)'], 'e.g. Tara': ['예: Tara', 'जस्तै: तारा'], 'Preset': ['기본 권한 묶음', 'तयारी सेट'], 'Rights': ['권한', 'अधिकार'], 'Areas (only if “See every customer” is off)': ['담당 동네 (「모든 고객 보기」가 꺼져 있을 때만)', 'क्षेत्र («सबै ग्राहक हेर्ने» बन्द भए मात्र)'],
  'Save rights': ['권한 저장', 'अधिकार सेभ'], 'Block': ['차단', 'रोक्नुहोस्'], 'Unblock': ['차단 풀기', 'रोक हटाउनुहोस्'], 'Approve with these rights': ['이 권한으로 승인', 'यी अधिकारसहित स्वीकृत'], '(no name yet)': ['(이름 없음)', '(नाम छैन)'],
  'active': ['사용 중', 'सक्रिय'], 'pending': ['승인 대기', 'पर्खाइमा'], 'blocked': ['차단됨', 'रोकिएको'], 'Write their name first': ['이름부터 적으세요', 'पहिले नाम लेख्नुहोस्'], 'Blocked': ['차단함', 'रोकियो'], 'Unblocked': ['차단 풀림', 'रोक हटियो'],
  'Only Jun manages accounts.': ['계정 관리는 Jun만 해요.', 'खाता Jun ले मात्र मिलाउँछ।'], 'No staff yet. Someone signs in with their email → they appear here as pending.': ['아직 직원 없음. 누가 이메일로 로그인하면 여기 「승인 대기」로 나타나요.', 'अझै कर्मचारी छैन। कसैले इमेलबाट साइन इन गरेपछि यहाँ पर्खाइमा देखिन्छ।'],
  'See every customer': ['모든 고객 보기', 'सबै ग्राहक हेर्ने'], 'off = only the areas ticked below': ['끄면 = 아래에서 고른 동네만', 'बन्द = तल छानेका क्षेत्र मात्र'], 'New installs': ['신규 설치', 'नयाँ जडान'], 'Visits · requests · calls · relocations': ['방문 · 요청 · 전화 · 이사', 'भ्रमण · अनुरोध · कल · स्थानान्तरण'],
  'Record payments': ['수금 입력', 'भुक्तानी लेख्ने'], 'Take cash (G-1 §1-1: only Tara)': ['현금 받기 (G-1 §1-1: 타라만)', 'नगद लिने (G-1 §1-1: तारा मात्र)'], 'Edit any customer': ['모든 고객 수정', 'जुनसुकै ग्राहक सम्पादन'],
  'See money & reports (VAT, deposits, CA pack, history)': ['돈 · 보고서 보기 (VAT · 보증금 · CA 팩 · 기간 조회)', 'पैसा र रिपोर्ट हेर्ने (भ्याट, धरौटी, CA प्याक, इतिहास)'], 'Record & see expenses': ['지출 입력 · 보기', 'खर्च लेख्ने र हेर्ने'], 'Stock & devices': ['재고 · 기기', 'मौज्दात र उपकरण'], 'Download data (CSV · backup)': ['데이터 내려받기 (CSV · 백업)', 'डाटा डाउनलोड (CSV · ब्याकअप)'],
  'Office (all but export)': ['사무실 (내려받기 빼고 전부)', 'कार्यालय (डाउनलोडबाहेक सबै)'], 'View only': ['보기만', 'हेर्ने मात्र'],
  'Profit & loss': ['손익', 'नाफा-नोक्सान'], 'cash basis, before tax': ['현금 기준 · 세전', 'नगद आधार · करअघि'], 'Revenue (no VAT)': ['매출 (VAT 제외)', 'आम्दानी (भ्याटबाहेक)'], 'Expenses (no VAT)': ['지출 (VAT 제외)', 'खर्च (भ्याटबाहेक)'], 'Result': ['결과', 'नतिजा'],
  'Deposit is not revenue (a liability). Device purchases count in the month paid — the CA spreads them as depreciation.': ['보증금은 매출 아님 (부채). 기기 구입은 낸 달에 잡혀요 — CA가 감가상각으로 나눠요.', 'धरौटी आम्दानी होइन (दायित्व)। उपकरण खरिद तिरेको महिनामा गनिन्छ — CA ले ह्रासकट्टीमा बाँड्छ।'],
  'Paid': ['낸 돈', 'तिरेको'], 'Input VAT': ['매입세액', 'खरिद भ्याट'], 'Devices': ['기기', 'उपकरण'], 'Staff': ['직원', 'कर्मचारी'], 'sales + purchase book · Excel': ['매출장 + 매입장 · 엑셀', 'बिक्री + खरिद खाता · एक्सेल'],
  'Purchases with VAT bill (value)': ['VAT 계산서 매입 (공급가)', 'भ्याट बिल भएका खरिद (मूल्य)'], 'Input VAT (purchases)': ['매입세액', 'खरिद भ्याट'], 'VAT to pay = sales VAT − input VAT': ['낼 VAT = 매출세액 − 매입세액', 'तिर्ने भ्याट = बिक्री भ्याट − खरिद भ्याट'],
  'All customers': ['전체 고객', 'सबै ग्राहक'], 'Install': ['설치', 'जडान'], 'Field': ['현장', 'फिल्ड'], 'Cash': ['현금', 'नगद'], 'Money': ['돈', 'पैसा'], 'Download': ['내려받기', 'डाउनलोड'],
  'Admin (Jun) has every right and cannot be changed. Everyone else: pick a preset, then switch single rights. Areas only tidy their screens — they are not a security wall. Money, expenses and new customers are also checked by the server (rules v0.5).': ['관리자(Jun)는 모든 권한이 있고 바꿀 수 없어요. 다른 사람은 기본 묶음을 고른 뒤 권한을 하나씩 켜고 끄세요. 담당 동네는 화면만 줄여줄 뿐 보안 장치가 아니에요. 돈·지출·신규 고객은 서버(규칙 v0.5)에서도 한 번 더 막아요.', 'एडमिन (Jun) सँग सबै अधिकार छ र बदलिँदैन। अरूका लागि सेट छानेर एक-एक अधिकार खोल्नुहोस्। क्षेत्रले स्क्रिन मात्र मिलाउँछ — सुरक्षा होइन। पैसा, खर्च र नयाँ ग्राहक सर्भरले पनि जाँच्छ (नियम v0.5)।'],
  '12 months (NPR)': ['12개월 (NPR)', '१२ महिना (रु.)'], '12 months': ['12개월', '१२ महिना'], 'In stock by serial:': ['시리얼 기준 재고:', 'सिरियलअनुसार मौज्दात:'], 'Jun, paid back': ['Jun 개인 돈 · 돌려줌', 'Jun · फिर्ता दिइयो'], 'Jun, to pay back': ['Jun 개인 돈 · 돌려줘야 함', 'Jun · फिर्ता दिन बाँकी'],
  'PDF too big (max 700 KB) — take a photo instead': ['PDF가 너무 커요 (최대 700KB) — 사진으로 찍어 주세요', 'PDF धेरै ठूलो (बढीमा ७०० KB) — फोटो खिच्नुहोस्'], 'Location': ['위치', 'स्थान'],
};
for (const [k, v] of Object.entries(W5)) if (!(k in W)) W[k] = v;
const COLW = { 'Install / customer': ['설치 · 고객', 'जडान / ग्राहक'], Visit: ['방문', 'भ्रमण'], Payment: ['수금', 'भुक्तानी'], Request: ['요청', 'अनुरोध'], Lead: ['리드', 'लिड'], Recovery: ['회수', 'फिर्ता'], Training: ['교육', 'तालिम'], Call: ['전화', 'कल'], Stock: ['재고', 'मौज्दात'], Expense: ['지출', 'खर्च'], Device: ['기기', 'उपकरण'], Relocation: ['이사', 'स्थानान्तरण'] };
P.push(
  [/^Auto order from (your location|the first stop)$/, (m) => `📡 ${m[1] === 'your location' ? '내 위치' : '첫 집'} 기준 자동 순서`, (m) => `${m[1] === 'your location' ? 'तपाईंको स्थान' : 'पहिलो ठाउँ'}बाट स्वचालित क्रम`],
  [/^Relocations \((\d+)\)$/, '이사 ($1)', 'स्थानान्तरण ($1)'], [/^new device (\S+)$/, '새 기기 $1', 'नयाँ उपकरण $1'],
  [/^Input VAT (NPR [\d,]+)$/, '매입세액 $1', 'खरिद भ्याट $1'], [/^value (NPR [\d,]+)$/, '공급가 $1', 'मूल्य $1'], [/^VAT ([\d.]+)$/, 'VAT $1', 'भ्याट $1'],
  [/^All (\d+)$/, '전체 $1', 'सबै $1'], [/^(In stock|At a customer|Back — check it|At refurbish|Defect — claim|Scrapped|Lost) (\d+)$/, (m) => `${W[m[1]][0]} ${m[2]}`, (m) => `${W[m[1]][1]} ${m[2]}`],
  [/^(\d+) device\(s\) not checked yet — PI terms: inspect within 14 days of arrival \((\S+) is the first deadline\)\.$/, '아직 검수 안 한 기기 $1대 — PI 조건: 도착 14일 안 검수 (첫 기한 $2).', '$1 उपकरण जाँच बाँकी — PI: आइपुगेको १४ दिनभित्र ($2 पहिलो म्याद)।'],
  [/^(\d+) installed device\(s\) still inside the 30-day dead-on-arrival claim window\.$/, '설치 30일 안이라 초기불량(DOA) 청구 가능한 기기 $1대.', '३० दिने DOA दाबी अवधिभित्र $1 जडान उपकरण।'],
  [/^Arrival check due by (\S+) \(PI: 14 days\)\.$/, '$1까지 입고 검수 (PI: 14일).', '$1 सम्म आगमन जाँच (PI: १४ दिन)।'], [/^Dead-on-arrival claim window until (\S+)\.$/, '$1까지 초기불량(DOA) 청구 가능.', '$1 सम्म DOA दाबी गर्न सकिन्छ।'],
  [/^batch (.+)$/, '입고 묶음 $1', 'ब्याच $1'], [/^landed (NPR [\d,]+)$/, '도착 원가 $1', 'आइपुगेको लागत $1'],
  [/^last seen (.+)$/, (m) => `마지막 접속 ${T(m[1])}`, (m) => `पछिल्लो पटक ${T(m[1])}`], [/^✅ (.+) approved$/, '✅ $1 승인됨', '✅ $1 स्वीकृत'], [/^✅ Rights saved for (.+)$/, '✅ $1 권한 저장됨', '✅ $1 को अधिकार सेभ भयो'],
  [/^Could not load users: (.+)$/, '사용자 목록을 못 불러왔어요: $1', 'प्रयोगकर्ता लोड भएन: $1'],
  [/^(Install \/ customer|Visit|Payment|Request|Lead|Recovery|Training|Call|Stock|Expense|Device|Relocation) (\S*)$/, (m) => `${COLW[m[1]][0]} ${m[2]}`, (m) => `${COLW[m[1]][1]} ${m[2]}`],
  [/^(\d+) to do$/, '$1건 남음', '$1 बाँकी'], [/^(\d+) device\(s\) waiting for the 14-day arrival check$/, '14일 입고 검수 기다리는 기기 $1대', '१४ दिने आगमन जाँच पर्खिरहेका $1 उपकरण'], [/^(\d+) relocation\(s\) to do$/, '해야 할 이사 $1건', 'गर्न बाँकी $1 स्थानान्तरण'],
  [/^Input VAT comes from expenses entered with a VAT bill \((\d+) bills this period\)\. Whether each one can be claimed is the CA's call\.$/, '매입세액은 VAT 계산서로 입력한 지출에서 나와요 (이 기간 $1건). 공제 가능 여부는 CA가 판단해요.', 'खरिद भ्याट भ्याट बिलसहित लेखिएका खर्चबाट आउँछ (यो अवधि $1 बिल)। दाबी मिल्छ कि CA ले भन्छ।'],
  [/^(\d+) VAT purchase\(s\) without the supplier bill number$/, '거래처 계산서 번호 없는 VAT 매입 $1건', 'बिल नम्बर नभएका $1 भ्याट खरिद'],
  [/^Photo failed: (.+)$/, (m) => `사진 실패: ${T(m[1])}`, (m) => `फोटो भएन: ${T(m[1])}`],
);
// ---- v0.6 (2026-09-28): calendar · dispatch · backup · staff accounts · alerts inbox · story digest · TV · reports text.
// W6 overrides earlier entries on purpose (Korean pass #2: plainer, less "translated"). 🔴 Nepali = Claude draft, Tara to check.
const KO_BSM = ['바이사크', '제스타', '아사르', '스라완', '바드라', '아스윈', '카르틱', '망시르', '푸스', '마그', '팔군', '차이트라'];
const BS3 = ['Bai', 'Jes', 'Asa', 'Shr', 'Bha', 'Asw', 'Kar', 'Man', 'Pou', 'Mag', 'Fal', 'Cha'];
const HOL = {
  Ghatasthapana: ['가타스타파나', 'घटस्थापना'], Dashain: ['다사인', 'दशैं'], 'Kojagrat Purnima': ['코자그랏 보름', 'कोजाग्रत पूर्णिमा'], Tihar: ['티하르', 'तिहार'], 'Falgunanda Jayanti': ['팔구난다 탄신일', 'फाल्गुनन्द जयन्ती'], Chhath: ['차트', 'छठ'],
  'Indra Jatra': ['인드라 자트라', 'इन्द्रजात्रा'], Jitiya: ['지티야', 'जितिया'], 'Day of Persons with Disabilities': ['세계 장애인의 날', 'अन्तर्राष्ट्रिय अपाङ्गता दिवस'], 'Dhanya Purnima · Yomari Punhi': ['단야 보름 · 요마리 푸니', 'धान्य पूर्णिमा · योमरी पुन्हि'],
  'Dhanya Purnima': ['단야 보름', 'धान्य पूर्णिमा'], 'Yomari Punhi': ['요마리 푸니', 'योमरी पुन्हि'], Christmas: ['크리스마스', 'क्रिसमस'], 'Tamu Lhosar': ['타무 로사르 (구룽 설날)', 'तमू ल्होछार'], 'Prithvi Jayanti': ['프리트비 탄신일', 'पृथ्वी जयन्ती'],
  'Maghe Sankranti': ['마게 상크란티', 'माघे सङ्क्रान्ति'], "Martyrs' Day": ['순교자의 날', 'सहिद दिवस'], 'Gandaki Province Day': ['간다키주 설립일', 'गण्डकी प्रदेश स्थापना दिवस'], 'Sonam Lhosar': ['소남 로사르', 'सोनम ल्होछार'], 'Basanta Panchami': ['바산타 판차미', 'वसन्त पञ्चमी'],
  'Democracy Day': ['민주주의의 날', 'प्रजातन्त्र दिवस'], 'Maha Shivaratri': ['마하 시바라트리', 'महाशिवरात्री'], "Women's Day": ['세계 여성의 날', 'महिला दिवस'], 'Gyalpo Lhosar': ['걀포 로사르', 'ग्याल्पो ल्होसार'], 'Holi (hill districts)': ['홀리 (산간 지역)', 'फागुपूर्णिमा (पहाड)'],
  'Ghode Jatra': ['고데 자트라', 'घोडेजात्रा'], Phulpati: ['풀파티', 'फूलपाती'], 'Vijaya Dashami (Tika)': ['비자야 다사미 (티카)', 'विजया दशमी (टीका)'], 'Laxmi Puja': ['락슈미 푸자', 'लक्ष्मी पूजा'], 'Bhai Tika': ['바이 티카', 'भाइटीका'], 'Office closed (settings)': ['사무실 휴무 (설정)', 'कार्यालय बन्द (सेटिङ)'],
};
const COLK = { customers: ['고객', 'ग्राहक'], visits: ['방문', 'भ्रमण'], payments: ['수금', 'भुक्तानी'], requests: ['요청', 'अनुरोध'], leads: ['리드', 'लिड'], recoveries: ['회수', 'फिर्ता'], contractEvents: ['계약 일', 'सम्झौता घटना'], screenings: ['가입 심사', 'दर्ता जाँच'], claims: ['공급사 청구', 'आपूर्तिकर्ता दाबी'], tools: ['공구', 'औजार'], payroll: ['급여', 'तलब'], waterTests: ['원수 바이알', 'कच्चा पानी भायल'], trainings: ['교육', 'तालिम'], checkins: ['통화', 'कल'], stockMoves: ['재고 이동', 'मौज्दात'], expenses: ['지출', 'खर्च'], deviceEvents: ['기기 이력', 'उपकरण'], relocations: ['이사', 'सराइ'], events: ['일정', 'कार्यक्रम'], audit: ['변경 기록', 'परिवर्तन लग'], milestones: ['마일스톤', 'माइलस्टोन'] };
const W6 = {
  ...HOL,
  // shell · topbar · sidebar
  History: ['월별 기록', 'इतिहास'], Calendar: ['달력', 'पात्रो'], Dispatch: ['배정', 'काम बाँडफाँड'], Backup: ['백업', 'ब्याकअप'], NPT: ['네팔 시각', 'नेपाल समय'],
  'TV mode — pages rotate every 20 s': ['TV 모드 — 20초마다 화면이 넘어가요', 'TV मोड — हरेक २० सेकेन्डमा पेज फेरिन्छ'], 'TV mode': ['TV 모드', 'TV मोड'], 'pages rotate every 20 s': ['20초마다 화면 전환', 'हरेक २० सेकेन्डमा पेज फेरिन्छ'], 'Esc or click to stop': ['Esc나 클릭하면 멈춰요', 'रोक्न Esc वा क्लिक'],
  'Done for today': ['오늘은 확인', 'आजलाई भयो'], 'Hide for 3 days': ['3일 숨기기', '३ दिन लुकाउनुहोस्'], 'show all': ['모두 보기', 'सबै देखाउनुहोस्'],
  'Allow location': ['위치 허용', 'स्थान अनुमति'], 'Allow location once to see yourself on the map and to start directions from where you are.': ['위치를 한 번만 허용하면 지도에 내 위치가 뜨고, 길찾기도 지금 있는 곳에서 시작해요.', 'एक पटक स्थान अनुमति दिनुहोस् — नक्सामा आफू देखिनुहुन्छ र बाटो यहीँबाट सुरु हुन्छ।'],
  'Zoom in': ['확대', 'ठूलो'], 'Zoom out': ['축소', 'सानो'], 'A JavaScript library for interactive maps': ['지도 라이브러리', 'नक्सा लाइब्रेरी'],
  'No backup yet — make one': ['아직 백업이 없어요 — 하나 만들어 두세요', 'ब्याकअप छैन — एउटा बनाउनुहोस्'],
  'since last time + the day in 7 slides': ['지난번 이후 + 오늘 하루를 7장으로', 'पछिल्लो पटकदेखि + ७ स्लाइडमा आज'], 'Calendar event': ['달력 일정', 'पात्रो कार्यक्रम'],
  // calendar
  'AD month': ['양력 달', 'ई.सं. महिना'], 'Nepali month': ['네팔력 달', 'नेपाली महिना'], Both: ['둘 다', 'दुवै'], Company: ['회사', 'कम्पनी'],
  'working days': ['근무일', 'काम गर्ने दिन'], 'days off': ['쉬는 날', 'बिदा'], 'visits & filters': ['방문·필터', 'भ्रमण र फिल्टर'], bills: ['청구', 'बिल'],
  Sun: ['일', 'आइत'], Mon: ['월', 'सोम'], Tue: ['화', 'मंगल'], Wed: ['수', 'बुध'], Thu: ['목', 'बिही'], Fri: ['금', 'शुक्र'], Sat: ['토', 'शनि'],
  Payday: ['월급날', 'तलब दिन'], 'last day of the Nepali month (change in Settings)': ['네팔력 달 마지막 날 (설정에서 바꿔요)', 'नेपाली महिनाको अन्तिम दिन (सेटिङमा बदल्नुहोस्)'],
  'office closed': ['사무실 휴무', 'कार्यालय बन्द'], Saturday: ['토요일', 'शनिबार'], 'Working day': ['근무일', 'काम गर्ने दिन'], 'Day off': ['쉬는 날', 'बिदा'], Nothing: ['없음', 'केही छैन'],
  'Company event': ['회사 일정', 'कम्पनी कार्यक्रम'], 'Customer event': ['고객 일정', 'ग्राहक कार्यक्रम'], 'Bills due': ['청구일', 'बिलको म्याद'], 'Leads & demos': ['리드 · 시연', 'लिड र डेमो'], Moves: ['이사', 'घर सराइ'],
  'Devices in': ['기기 입고', 'उपकरण आगमन'], 'Arrival checks': ['입고 검수', 'आगमन जाँच'], 'Cash in': ['입금', 'आम्दानी'], Done: ['완료', 'भयो'], 'Customer events': ['고객 일정', 'ग्राहक कार्यक्रम'],
  'bills': ['청구', 'बिल'], 'visits': ['방문', 'भ्रमण'], 'filters': ['필터', 'फिल्टर'], 'calls': ['전화', 'कल'], 'leads': ['리드', 'लिड'], 'moves': ['이사', 'सराइ'], 'devices': ['기기', 'उपकरण'], 'cash in': ['입금', 'आम्दानी'],
  'routine visit': ['정기 방문', 'नियमित भ्रमण'], paid: ['납부 완료', 'तिरेको'], demo: ['시연', 'डेमो'], 'follow up': ['연락하기', 'फलो-अप'],
  'Next 14 days': ['앞으로 14일', 'आउँदा १४ दिन'], 'Public holidays': ['공휴일', 'सार्वजनिक बिदा'], '2083, Pokhara': ['2083년 · 포카라', '२०८३ · पोखरा'],
  'women staff who keep it': ['지키는 여직원만', 'मनाउने महिला कर्मचारी'], 'Gandaki only': ['간다키주만', 'गण्डकी मात्र'], 'Kathmandu Valley only': ['카트만두 분지만', 'काठमाडौं उपत्यका मात्र'], 'Kirat followers': ['키란트교 신자만', 'किरात धर्मावलम्बी'],
  'staff with a disability': ['장애가 있는 직원만', 'अपाङ्गता भएका कर्मचारी'], 'schools only': ['학교만', 'विद्यालय मात्र'], 'some people only': ['일부만', 'केही मात्र'],
  'Nepal Rajpatra 2082.11.18 (Home Ministry)': ['네팔 관보 2082.11.18 (내무부)', 'नेपाल राजपत्र २०८२।११।१८ (गृह मन्त्रालय)'], 'Gandaki Rajpatra 2082.12.05': ['간다키주 관보 2082.12.05', 'गण्डकी प्रदेश राजपत्र २०८२।१२।०५'],
  'Eid ul-Fitr and Bakar Eid are holidays "on the day" (G §2.1 त·थ) — no date in the notice': ['이드와 바카르 이드는 「그날」 쉬는 휴일이라 관보에 날짜가 없어요 (G §2.1 त·थ)', 'ईद र बकर ईद «त्यही दिन» बिदा — सूचनामा मिति छैन (G §2.1 त·थ)'],
  'Nepali year 2084 (from 14 Apr 2027) is not published yet': ['네팔력 2084년(2027-04-14부터) 공휴일은 아직 발표 전이에요', 'वि.सं. २०८४ (२०२७ अप्रिल १४ देखि) को बिदा अझै प्रकाशित छैन'],
  Deadlines: ['신고·납부 기한', 'म्यादहरू'], 'next 4 months': ['앞으로 4개월', 'आउँदा ४ महिना'], payday: ['월급날', 'तलब दिन'], payroll: ['급여 설정', 'तलब'],
  By: ['기한', 'म्याद'], 'Nepali date': ['네팔력 날짜', 'नेपाली मिति'], What: ['내용', 'के'], Note: ['메모', 'टिप्पणी'],
  'VAT return': ['VAT 신고', 'भ्याट विवरण'], 'file even with no sales': ['매출이 없어도 신고해요', 'बिक्री नभए पनि बुझाउनुहोस्'], 'IRD online': ['IRD 온라인', 'IRD अनलाइन'], 'falls on a day off': ['쉬는 날이에요', 'बिदाको दिन पर्छ'],
  'a day off — do it the working day before': ['쉬는 날 — 그 전 근무일에 끝내세요', 'बिदा — अघिल्लो कार्य दिनमै गर्नुहोस्'], 'skip if under NPR 2,000': ['2,000 NPR 미만이면 안 내도 돼요', 'रु. २,००० भन्दा कम भए तिर्नु पर्दैन'], 'end of the fiscal year': ['회계연도 마지막 날', 'आर्थिक वर्षको अन्त्य'],
  'TDS on salaries': ['급여 원천징수 (TDS)', 'तलबको TDS'], 'SSF contribution': ['SSF 납부', 'SSF योगदान'], '[conflict] 15 or 25 days — 15 used': ['[충돌] 15일 vs 25일 — 빠른 15일 기준', '[द्वन्द्व] १५ वा २५ दिन — १५ प्रयोग'],
  'Income tax return': ['법인세 신고', 'आयकर विवरण'], '3 months after the year ends': ['회계연도 끝나고 3개월 안', 'वर्ष सकिएको ३ महिनाभित्र'], 'OCR annual report': ['OCR 연차 보고', 'OCR वार्षिक प्रतिवेदन'],
  '6 months after the year ends': ['회계연도 끝나고 6개월 안', 'वर्ष सकिएको ६ महिनाभित्र'], 'late = NPR 100 a day': ['늦으면 하루 100 NPR', 'ढिलो भए दिनको रु. १००'], 'Scooter tax': ['스쿠터세', 'स्कुटर कर'], '2 scooters': ['스쿠터 2대', '२ स्कुटर'],
  'before the end of Asar': ['아사르 말 전까지', 'असार मसान्तअघि'], 'late = 5–32 % extra': ['늦으면 5~32% 더 내요', 'ढिलो भए ५–३२% थप'], 'EXIM code renewal': ['EXIM 코드 갱신', 'EXIM कोड नवीकरण'], 'first expiry': ['첫 만료', 'पहिलो म्याद'],
  'Domain koracarenepal.com expires': ['도메인 koracarenepal.com 만료', 'डोमेन koracarenepal.com को म्याद'], 'auto-renew is on — check the card': ['자동 갱신 켜짐 — 카드만 확인', 'स्वतः नवीकरण — कार्ड जाँच्नुहोस्'], 'e-TDS': ['e-TDS', 'e-TDS'],
  // event form
  'Which calendar': ['어느 달력', 'कुन पात्रो'], 'Company = paydays, days off, meetings, deadlines': ['회사 = 월급날 · 쉬는 날 · 회의 · 기한', 'कम्पनी = तलब, बिदा, बैठक, म्याद'], 'Customers = stock arrivals, demos, special visits': ['고객 = 물량 입고 · 시연 · 따로 잡은 방문', 'ग्राहक = सामान आगमन, डेमो, विशेष भ्रमण'],
  'What kind': ['종류', 'प्रकार'], 'Office closed': ['사무실 휴무', 'कार्यालय बन्द'], Deadline: ['기한', 'म्याद'], Meeting: ['회의', 'बैठक'], Training: ['교육', 'तालिम'], 'Stock arrival': ['물량 입고', 'सामान आगमन'], 'Customer visit': ['고객 방문', 'ग्राहक भ्रमण'],
  'Demo / event': ['시연 · 행사', 'डेमो / कार्यक्रम'], 'Installation day': ['설치하는 날', 'जडान दिन'], Title: ['제목', 'शीर्षक'], 'e.g. 50 devices arrive': ['예: 기기 50대 입고', 'जस्तै: ५० उपकरण आउँछ'], 'Tara day off': ['타라 휴무', 'तारा बिदा'], 'CA meeting': ['CA 미팅', 'CA बैठक'],
  'Last day (only if it runs several days)': ['마지막 날 (며칠 이어질 때만)', 'अन्तिम दिन (धेरै दिन भए मात्र)'], Time: ['시간', 'समय'], Repeats: ['반복', 'दोहोरिने'], Once: ['한 번', 'एक पटक'], 'Every month': ['매달', 'हरेक महिना'], 'Every Nepali month': ['네팔력으로 매달', 'हरेक नेपाली महिना'], 'Every year': ['매년', 'हरेक वर्ष'],
  'Customer (optional)': ['고객 (선택)', 'ग्राहक (ऐच्छिक)'], Planned: ['예정', 'योजना'], Cancelled: ['취소', 'रद्द'], 'Write a title.': ['제목을 적어 주세요.', 'शीर्षक लेख्नुहोस्।'], 'The last day is before the first day.': ['마지막 날이 첫날보다 빨라요.', 'अन्तिम दिन पहिलो दिनभन्दा अघि छ।'], 'Up to 60 days.': ['최대 60일이에요.', 'बढीमा ६० दिन।'],
  // dispatch
  selected: ['선택됨', 'छानियो'], 'Just today': ['오늘만', 'आज मात्र'], Until: ['날짜까지', 'सम्म'], 'From now on': ['앞으로 계속', 'अबदेखि सधैं'], 'send to': ['보낼 사람', 'पठाउने'], Nobody: ['미배정', 'कसैलाई होइन'], Clear: ['선택 해제', 'हटाउनुहोस्'],
  'Drag a home onto a person, or tick several and press a name.': ['집을 사람 칸으로 끌어다 놓거나, 여러 집을 체크한 뒤 이름을 누르세요.', 'घरलाई व्यक्तितिर तान्नुहोस्, वा धेरै छानेर नाम थिच्नुहोस्।'],
  'a cover that ends tonight (sick day)': ['오늘 하루만 대신 가요 (아픈 날 등)', 'आजको लागि मात्र सट्टा (बिरामी दिन)'], 'a cover to a date': ['정한 날까지 대신 가요', 'तोकेको मितिसम्म सट्टा'],
  'their regular person. Staff phones then show their own homes + the unassigned ones (Jun sees everything).': ['원래 담당자를 바꿔요. 직원 폰에는 자기 담당 집과 미배정 집만 떠요 (Jun은 다 봐요).', 'नियमित जिम्मेवार बदलिन्छ। कर्मचारीको फोनमा आफ्नो र नतोकिएका घर मात्र देखिन्छ (Jun ले सबै देख्छ)।'],
  'Whole area': ['동네 통째로', 'पूरै टोल'], tole: ['동네', 'टोल'], person: ['사람', 'व्यक्ति'], 'Move (from now on)': ['옮기기 (앞으로 계속)', 'सार्नुहोस् (अबदेखि)'], "today's jobs to": ['오늘 일 넘기기', 'आजको काम दिनुहोस्'],
  "Give today's jobs to someone else": ['오늘 일을 다른 사람에게 넘겨요', 'आजको काम अरूलाई दिनुहोस्'], 'All homes': ['담당 집 전체', 'सबै घर'], select: ['선택', 'छान्नुहोस्'], 'No jobs today': ['오늘 할 일 없음', 'आज काम छैन'], 'Nobody yet': ['아직 미배정', 'अझै कसैलाई होइन'],
  'Choose the tole and the person': ['동네랑 사람을 골라 주세요', 'टोल र व्यक्ति छान्नुहोस्'], 'Goes to': ['담당', 'जिम्मेवार'], 'nobody yet': ['아직 없음', 'अझै छैन'], 'end cover': ['대신 가기 끝', 'सट्टा अन्त्य'], 'Nobody assigned': ['담당자 없음', 'कसैलाई तोकिएको छैन'], 'Cover ended': ['대신 가기 끝냄', 'सट्टा सकियो'],
  'Signed up': ['가입', 'दर्ता'], Installed: ['설치', 'जडान'], Left: ['해지', 'छोड्यो'],
  // staff accounts
  'New staff account': ['새 직원 계정', 'नयाँ कर्मचारी खाता'], 'They get an email to set their own password. After they sign in once, the phone stays signed in.': ['직원은 메일을 받아 비밀번호를 직접 정해요. 폰에서 한 번 로그인하면 그 뒤로 계속 로그인돼 있어요.', 'उनीहरूले इमेलबाट आफ्नै पासवर्ड राख्छन्। एक पटक साइन इन गरेपछि फोनमा साइन इन रहिरहन्छ।'],
  'e.g. Ramesh': ['예: Ramesh', 'जस्तै: Ramesh'], 'their own email': ['직원 본인 이메일', 'उनको आफ्नै इमेल'], 'Create account & send the email': ['계정 만들고 메일 보내기', 'खाता बनाएर इमेल पठाउनुहोस्'], 'Password link': ['비밀번호 설정 링크', 'पासवर्ड लिङ्क'],
  'Tap again to block — their phone is wiped': ['한 번 더 누르면 차단 — 그 폰의 회사 데이터도 지워져요', 'फेरि थिच्दा ब्लक — उनको फोनको डाटा मेटिन्छ'], 'Creating…': ['만드는 중…', 'बनाउँदै…'],
  'This email already has an account — ask them to sign in; they appear below as pending.': ['이미 계정이 있는 이메일이에요 — 로그인하라고 하면 아래에 「승인 대기」로 떠요.', 'यो इमेलको खाता पहिल्यै छ — साइन इन गर्न भन्नुहोस्; तल पर्खाइमा देखिन्छ।'],
  'Check the email': ['이메일을 확인하세요', 'इमेल जाँच्नुहोस्'], 'Check the email.': ['이메일을 확인하세요.', 'इमेल जाँच्नुहोस्।'], 'Email sign-in is switched off in Firebase.': ['Firebase에서 이메일 로그인이 꺼져 있어요.', 'Firebase मा इमेल साइन इन बन्द छ।'], 'No internet.': ['인터넷이 안 돼요.', 'इन्टरनेट छैन।'],
  'Company data on this phone has been removed.': ['이 폰에 있던 회사 데이터를 지웠어요.', 'यो फोनबाट कम्पनीको डाटा हटाइयो।'], 'Write their name first': ['이름부터 적어 주세요', 'पहिले नाम लेख्नुहोस्'], 'Password link sent (demo)': ['비밀번호 링크 보냄 (데모)', 'पासवर्ड लिङ्क पठाइयो (डेमो)'],
  // backup
  'Everything in one go: customers, visits, payments, expenses, devices… as Excel + JSON.': ['고객 · 방문 · 수금 · 지출 · 기기… 전부 한 번에 엑셀 + JSON으로 받아요.', 'सबै एकैचोटि: ग्राहक, भ्रमण, भुक्तानी, खर्च, उपकरण… एक्सेल + JSON।'],
  'Last backup': ['마지막 백업', 'पछिल्लो ब्याकअप'], 'Days ago': ['지난 날수', 'दिन अघि'], never: ['아직 없음', 'कहिल्यै होइन'], 'Records now': ['지금 기록 수', 'अहिलेका रेकर्ड'], 'Done by': ['한 사람', 'गर्ने'],
  'Back up everything now': ['지금 전부 백업', 'अहिले सबै ब्याकअप'], 'Back up now': ['지금 백업', 'अहिले ब्याकअप'], 'include photos (bigger file)': ['사진도 넣기 (파일이 커져요)', 'फोटो पनि (फाइल ठूलो)'],
  'One Excel file (a sheet per table, easy to read) + one JSON file (the complete copy). Both go to the Downloads folder of this computer — keep them in the vault / Google Drive. The bell reminds you after 7 days.': ['엑셀 1개(표마다 시트 하나, 보기 쉬움) + JSON 1개(빠짐없는 사본). 둘 다 이 컴퓨터 다운로드 폴더로 가요 — 금고나 구글 드라이브로 옮겨 두세요. 7일이 지나면 🔔이 알려 줘요.', 'एउटा एक्सेल (हरेक तालिकाको पाना) + एउटा JSON (पूरा प्रति)। दुवै Downloads मा जान्छ — भल्ट वा Google Drive मा राख्नुहोस्। ७ दिनपछि घण्टीले सम्झाउँछ।'],
  'Check a backup file': ['백업 파일 확인', 'ब्याकअप फाइल जाँच'], 'Opens a JSON backup and compares its record counts with today — nothing is written back.': ['JSON 백업을 열어서 지금 기록 수와 비교만 해요 — 아무것도 덮어쓰지 않아요.', 'JSON ब्याकअप खोलेर आजसँग रेकर्ड गन्ती मिलाउँछ — केही लेखिँदैन।'],
  'Server-side backup (recommended too)': ['서버 쪽 백업 (이것도 해 두면 좋아요)', 'सर्भरतर्फ ब्याकअप (यो पनि राम्रो)'],
  'Firestore can take its own scheduled backups (daily or weekly, kept up to 14 weeks) and point-in-time recovery for 7 days — this needs the Blaze plan and is switched on in the Firebase console (Firestore → Disaster recovery / Backups). The file backup above works on any plan.': ['Firestore도 자체 예약 백업(매일·매주, 최대 14주 보관)과 최근 7일 시점 복구가 돼요 — Blaze 요금제가 필요하고 Firebase 콘솔(Firestore → 재해 복구 / 백업)에서 켜요. 위의 파일 백업은 요금제와 상관없이 돼요.', 'Firestore आफैं तालिकाबद्ध ब्याकअप (दैनिक/साप्ताहिक, १४ हप्तासम्म) र ७ दिनको रिकभरी गर्छ — Blaze प्लान चाहिन्छ। माथिको फाइल ब्याकअप जुनसुकै प्लानमा चल्छ।'],
  // anomaly chips · story
  'Since you last looked': ['지난번에 본 뒤로', 'पछिल्लो पटक हेरेदेखि'], 'the last 7 days': ['최근 7일', 'पछिल्लो ७ दिन'], 'NPR came in': ['NPR 들어왔어요', 'रुपैयाँ आयो'], 'new homes': ['새 집', 'नयाँ घर'], 'visits done': ['방문 완료', 'भ्रमण सकियो'],
  'requests in → done': ['요청 접수 → 처리', 'अनुरोध आयो → सकियो'], 'new leads': ['새 리드', 'नयाँ लिड'], 'Replay growth': ['성장 과정 재생', 'वृद्धि फेरि हेर्नुहोस्'], 'No homes with a location yet': ['위치가 저장된 집이 아직 없어요', 'स्थान भएका घर अझै छैनन्'],
  'installs / week (4 wk)': ['주당 설치 (최근 4주)', 'हप्तामा जडान (४ हप्ता)'], 'NPR in so far': ['지금까지 들어온 NPR', 'अहिलेसम्म आएको रुपैयाँ'], 'of bills paid': ['청구 납부율', 'बिल तिरिएको'], 'visits due': ['방문할 집', 'भ्रमण बाँकी'], collection: ['수금률', 'असुली'], 'churn / month': ['월 해지율', 'मासिक छोड्ने दर'],
  'households drinking KORA water today': ['오늘 KORA 물을 마시는 집', 'आज KORA पानी पिउने घर'], 'installed so far': ['지금까지 설치', 'अहिलेसम्म जडान'], 'deposit held — not our money': ['보관 중인 보증금 — 우리 돈 아님', 'राखिएको धरौटी — हाम्रो होइन'], 'VAT to file': ['신고할 VAT', 'बुझाउने भ्याट'],
  // month centre window
  'Active at month end': ['월말 이용 중', 'महिनाको अन्त्यमा सक्रिय'], 'Result (no VAT)': ['손익 (VAT 뺌)', 'नतिजा (भ्याटबिना)'], 'revenue − expenses': ['매출 − 지출', 'आम्दानी − खर्च'], 'Overdue at month end': ['월말 미수금', 'महिनाको अन्त्यमा बाँकी'],
  'per day': ['하루별', 'दिनअनुसार'], 'Money by kind': ['종류별 돈', 'प्रकारअनुसार पैसा'], 'Expenses by category': ['분류별 지출', 'वर्गअनुसार खर्च'], Bill: ['계산서', 'बिल'], 'Visits CSV': ['방문 CSV', 'भ्रमण CSV'], 'Payments CSV': ['수금 CSV', 'भुक्तानी CSV'], 'Open this month': ['이 달 자세히', 'यो महिना खोल्नुहोस्'],
  'tap a row for the full month': ['줄을 누르면 그 달 전체가 열려요', 'पूरा महिना हेर्न पङ्क्ति थिच्नुहोस्'], '% of each install month still with us': ['설치한 달별로 아직 쓰는 비율', 'जडान महिनाअनुसार अझै बसेका %'],
  'Taxable = install + subscription + repair (cash). Deposit is not revenue until forfeited (lawyer R3 D2(c)). Penalty shown apart — confirm with the CA. Cash basis by payment date — confirm with the CA.': ['과세 = 설치비 + 구독료 + 수리비 (현금 기준). 보증금은 몰취되기 전까지 매출이 아니에요 (변호사 R3 D2(c)). 연체료는 따로 보여요 — CA 확인. 받은 날 기준 현금주의 — CA 확인.', 'करयोग्य = जडान + सदस्यता + मर्मत (नगद)। धरौटी जफत नभएसम्म आम्दानी होइन (वकिल R3 D2(c))। जरिवाना छुट्टै — CA सँग पक्का गर्नुहोस्। भुक्तानी मितिअनुसार नगद आधार — CA सँग पक्का गर्नुहोस्।'],
  // reports (older text, first Korean)
  'This month': ['이번 달', 'यो महिना'], 'Average payment': ['평균 결제', 'औसत भुक्तानी'], 'Last 30 days': ['최근 30일', 'पछिल्लो ३० दिन'], 'How they paid': ['낸 방법', 'कसरी तिरे'], 'k NPR': ['천 NPR', 'हजार रु.'], Type: ['종류', 'प्रकार'], Method: ['방법', 'तरिका'],
  'VAT this month': ['이번 달 VAT', 'यो महिनाको भ्याट'], sales: ['매출', 'बिक्री'], 'VAT incl.': ['VAT 포함', 'भ्याट सहित'], 'VAT on sales': ['매출 VAT', 'बिक्रीको भ्याट'], 'CA pack — IRD sales book (Nepali month)': ['CA 자료 — IRD 매출장 (네팔력 달)', 'CA प्याक — IRD बिक्री खाता (नेपाली महिना)'],
  'Held for customers (a liability, not our money):': ['고객 돈으로 보관 중 (부채 — 우리 돈 아님):', 'ग्राहकको लागि राखिएको (दायित्व, हाम्रो पैसा होइन):'], 'Held for customers (a liability, not our money)': ['고객 돈으로 보관 중 (부채 — 우리 돈 아님)', 'ग्राहकको लागि राखिएको (दायित्व)'], 'Held now': ['지금 보관 중', 'अहिले राखिएको'], 'all time': ['전체 기간', 'सबै समय'], 'became revenue': ['매출로 넘어간 것', 'आम्दानी भयो'],
  'Homes by amount held': ['집별 보관 금액', 'घरअनुसार राखिएको रकम'], 'Triggers: churn > 3.5%/month': ['기준: 월 해지율 > 3.5%', 'सीमा: मासिक छोड्ने > ३.५%'], '90-day retention < 85%': ['90일 유지율 < 85%', '९० दिने टिकाउ < ८५%'],
  'collection < 50%. Each needs its own sample before it can be judged.': ['수금률 < 50%. 셋 다 판정하려면 각자 표본이 따로 필요해요.', 'असुली < ५०%। हरेकलाई छुट्टै नमूना चाहिन्छ।'], 'Stock & FCL signal': ['재고 · FCL 신호', 'मौज्दात र FCL संकेत'],
  'FCL#1 = the later of: stock ≤ 4-week average installs × lead time (13 weeks)': ['FCL#1 = 두 조건 중 늦게 되는 날: 재고 ≤ 최근 4주 평균 설치 × 리드타임(13주)', 'FCL#1 = जुन पछि: मौज्दात ≤ ४ हप्ते औसत जडान × लिड टाइम (१३ हप्ता)'],
  '30+ bills + collection not in the 50% zone + no repeated defect': ['청구 30건+ · 수금률 50% 구간 아님 · 같은 고장 반복 없음', '३०+ बिल + असुली ५०% क्षेत्रमा होइन + दोहोरिने खराबी छैन'], 'Devices in stock': ['재고 기기', 'मौज्दातमा उपकरण'],
  'Installs / week': ['주당 설치', 'हप्तामा जडान'], '4 weeks': ['4주', '४ हप्ता'], weeks: ['주', 'हप्ता'], 'Filters in stock': ['재고 필터', 'मौज्दातमा फिल्टर'], 'next 90 days': ['앞으로 90일', 'आउँदा ९० दिन'], 'Spin-down': ['스핀다운', 'स्पिन-डाउन'],
  'Real days between changes, across all households (plan #9). The booking intervals are E-2 values; PoC data decides the final ones.': ['모든 집에서 실제로 교체한 간격 (계획 #9). 예약 주기는 E-2 값이고, 최종 값은 PoC 데이터로 정해요.', 'सबै घरमा फेर्ने बीचको वास्तविक दिन (योजना #९)। बुकिङ अवधि E-2 को; अन्तिम PoC डाटाले तय गर्छ।'],
  'Real change interval vs booking': ['실제 교체 간격 vs 예약 주기', 'वास्तविक अवधि बनाम बुकिङ'], months: ['개월', 'महिना'],
  'G-1 §4: new customer — 1st month free': ['G-1 §4: 새 고객 — 첫 달 무료', 'G-1 §4: नयाँ ग्राहक — पहिलो महिना नि:शुल्क'], 'referrer — 1 month free 3 months later, only after install + fee paid': ['추천인 — 설치하고 설치비까지 낸 뒤, 3개월 후에 1개월 무료', 'सिफारिसकर्ता — जडान र शुल्कपछि ३ महिनामा १ महिना नि:शुल्क'], 'no cash': ['현금 지급 없음', 'नगद छैन'],
  'Referral pairs': ['추천 짝', 'रेफरल जोडी'], 'Rewards ready': ['줄 보상', 'तयार इनाम'], Applied: ['적용함', 'लागू'], 'Value applied': ['적용 금액', 'लागू रकम'],
  'Plan #12 — name': ['계획 #12 — 이름', 'योजना #१२ — नाम'], date: ['날짜', 'मिति'], topic: ['주제', 'विषय'], trainer: ['강사', 'प्रशिक्षक'], 'signed sheet': ['서명지', 'सही गरिएको पाना'], 'per person': ['사람별', 'व्यक्तिअनुसार'],
  'Every save goes to the phone first, twice (two stores).': ['저장하면 먼저 폰에 두 군데로 저장돼요.', 'सेभ गर्दा पहिले फोनमा दुई ठाउँमा जान्छ।'], 'Photos too — they upload later.': ['사진도 마찬가지 — 나중에 올라가요.', 'फोटो पनि — पछि अपलोड हुन्छ।'],
  'Open the app from the': ['앱은', 'एप खोल्नुहोस्'], 'home-screen icon': ['홈 화면 아이콘', 'होम स्क्रिन आइकन'], ', not a Safari tab.': ['으로 여세요 (사파리 탭 말고).', 'बाट, Safari ट्याबबाट होइन।'], 'not a Safari tab.': ['으로 여세요 (사파리 탭 말고).', 'बाट, Safari ट्याबबाट होइन।'],
  'Never clear Safari history / website data': ['사파리 방문 기록 · 웹사이트 데이터는 절대 지우지 마세요', 'Safari इतिहास / वेबसाइट डाटा कहिल्यै नमेट्नुहोस्'], 'on this phone while records are waiting.': ['— 아직 안 보낸 기록이 있을 땐 특히요.', '— रेकर्ड पर्खिरहेको बेला।'],
  'Tap': ['누르기:', 'थिच्नुहोस्'], 'once.': ['(한 번만)', 'एक पटक।'], 'New install (E-1)': ['신규 설치 (E-1)', 'नयाँ जडान (E-1)'], '1. Measure raw TDS and pressure first.': ['1. 먼저 원수 TDS와 수압을 재요.', '१. पहिले कच्चा TDS र प्रेसर नाप्नुहोस्।'],
  '2. Install, leak test twice, pump quiet, UV lamp on.': ['2. 설치 → 누수 두 번 확인 → 펌프 조용한지 → UV 램프 켜졌는지.', '२. जडान, दुई पटक चुहावट जाँच, पम्प शान्त, UV बत्ती बल्यो।'], '3. Measure purified TDS and flow (UV: 1.2 L/min or less).': ['3. 정수 TDS와 유량을 재요 (UV: 1.2 L/min 이하).', '३. सफा पानीको TDS र फ्लो नाप्नुहोस् (UV: १.२ L/min वा कम)।'],
  '4. Tick all checks': ['4. 점검 항목 전부 체크', '४. सबै जाँच टिक गर्नुहोस्'], 'take the 3 photos (device, TDS meter, signed contract).': ['사진 3장 (기기 · TDS 측정기 · 서명한 계약서).', '३ फोटो (उपकरण, TDS मिटर, सही गरिएको सम्झौता)।'],
  '5. Day-1 payment NPR 4,900 by QR — the install is not finished before it is confirmed (G-1 §1-1).': ['5. 첫날 4,900 NPR을 QR로 — 입금 확인 전엔 설치 끝난 게 아니에요 (G-1 §1-1).', '५. पहिलो दिन रु. ४,९०० QR बाट — पक्का नभएसम्म जडान सकिँदैन (G-1 §1-1)।'],
  'Visits (E-2': ['방문 (E-2', 'भ्रमण (E-2'], 'G-1 §2)': ['G-1 §2)', 'G-1 §2)'], 'Look at the PP filter: brown or black → replace now.': ['PP 필터 색 보기: 갈색이나 검정이면 바로 교체.', 'PP फिल्टर हेर्नुहोस्: खैरो वा कालो → अहिले फेर्नुहोस्।'],
  'One old filter back for every new one.': ['새 필터 하나 넣으면 헌 필터 하나 회수.', 'हरेक नयाँको लागि एउटा पुरानो फिर्ता।'], 'A completed visit needs photos, TDS after, and the next visit date.': ['방문 완료엔 사진 · 교체 후 TDS · 다음 방문일이 필요해요.', 'पूरा भ्रमणमा फोटो, पछिको TDS र अर्को मिति चाहिन्छ।'],
  'Sanitise pipes every 3 months — tick it on the visit.': ['3개월마다 배관 소독 — 방문 기록에 체크.', 'हरेक ३ महिना पाइप सफा — भ्रमणमा टिक गर्नुहोस्।'], 'Money (G-1 §1)': ['돈 (G-1 §1)', 'पैसा (G-1 §1)'],
  'Bill = same day each month as the install day. Months 2–13: 1,400 (1,100 + 300 deposit). From month 14: 1,100.': ['청구일 = 매달 설치한 날짜. 2~13개월: 1,400 (1,100 + 보증금 300). 14개월부터: 1,100.', 'बिल = हरेक महिना जडानकै दिन। २–१३ महिना: १,४०० (१,१०० + ३०० धरौटी)। १४ औं महिनादेखि: १,१००।'],
  '3 days before → WhatsApp reminder': ['3일 전 → 왓츠앱 알림', '३ दिन अघि → WhatsApp सम्झना'], '+3 days → Tara calls': ['+3일 → 타라가 전화', '+३ दिन → ताराले फोन'], '+7 days → home visit.': ['+7일 → 집 방문.', '+७ दिन → घर भ्रमण।'],
  'Only Tara takes cash. Everyone else: Khalti / eSewa / Fonepay QR.': ['현금은 타라만 받아요. 나머지는 Khalti / eSewa / Fonepay QR.', 'नगद तारा मात्र लिन्छिन्। अरू: Khalti / eSewa / Fonepay QR।'], 'Send the receipt from the customer page — the deposit is on its own line.': ['영수증은 고객 화면에서 보내요 — 보증금은 따로 한 줄로 나와요.', 'रसिद ग्राहक पेजबाट पठाउनुहोस् — धरौटी छुट्टै लाइनमा।'],
  'Breakdowns (G-1 §2-4)': ['고장 (G-1 §2-4)', 'बिग्रँदा (G-1 §2-4)'], 'Office hours → reply within 2 hours, visit today or tomorrow. After 17:00 → reply today, visit tomorrow. Saturday → reply next morning. 3+ days = red.': ['근무 시간 → 2시간 안에 답하고 오늘이나 내일 방문. 17시 이후 → 오늘 답하고 내일 방문. 토요일 → 다음 날 아침에 답. 3일 넘으면 빨강.', 'कार्यालय समय → २ घण्टाभित्र जवाफ, आज वा भोलि भ्रमण। १७:०० पछि → आज जवाफ, भोलि भ्रमण। शनिबार → भोलि बिहान। ३+ दिन = रातो।'],
  'Plan #2. Upload the bank/Fonepay CSV → match rows to customers by KC code, phone, or a unique amount → create payments. Nothing is saved until you tap Create.': ['계획 #2. 은행·Fonepay CSV 올리기 → KC 코드·전화번호·겹치지 않는 금액으로 고객과 맞추기 → 수금 기록 만들기. 「만들기」를 누르기 전엔 아무것도 저장 안 돼요.', 'योजना #२। बैंक/Fonepay CSV अपलोड → KC कोड, फोन वा अद्वितीय रकमले ग्राहक मिलाउनुहोस् → भुक्तानी बनाउनुहोस्। Create नथिचेसम्म केही सेभ हुँदैन।'],
  'The bank / Fonepay export format is not known yet — any CSV or Excel file with date, amount and description columns works. Send Jun one real file to tune the matching.': ['은행·Fonepay 내보내기 형식은 아직 몰라요 — 날짜 · 금액 · 설명 열이 있는 CSV나 엑셀이면 돼요. 실제 파일 하나를 Jun에게 보내 주면 맞춰 볼게요.', 'बैंक/Fonepay फाइल ढाँचा थाहा छैन — मिति, रकम र विवरण भएको CSV वा एक्सेल चल्छ। मिलाउन Jun लाई एउटा साँचो फाइल पठाउनुहोस्।'],
  'Prices are fixed by the contract (2026-09-03) and shown for reference.': ['가격은 계약서(2026-09-03)로 정해져 있고 참고용으로만 보여요.', 'मूल्य सम्झौता (२०२६-०९-०३) ले तय गरेको — जानकारीका लागि मात्र।'], 'Default 13 = the "25 units" rule (8/month × 13 weeks).': ['기본 13 = 「25대」 규칙 (월 8대 × 13주).', 'पूर्वनिर्धारित १३ = «२५ युनिट» नियम (८/महिना × १३ हप्ता)।'],
  'Extra days the office is closed (YYYY-MM-DD, comma separated)': ['따로 쉬는 날 (YYYY-MM-DD, 쉼표로 구분)', 'थप बिदा (YYYY-MM-DD, अल्पविरामले छुट्याउनुहोस्)'],
  'Saturdays and the official 2083 public holidays (Home Ministry + Gandaki notices) are already in the calendar. Add only your own extra days off. Used for the calendar and the G-1 §2-4 breakdown clock.': ['토요일과 2083년 공식 공휴일(내무부 + 간다키주 고시)은 이미 달력에 들어 있어요. 회사가 따로 쉬는 날만 적으세요. 달력과 G-1 §2-4 고장 응답 시계에 같이 써요.', 'शनिबार र २०८३ का आधिकारिक बिदा (गृह मन्त्रालय + गण्डकी) पात्रोमा छन्। आफ्नो थप बिदा मात्र थप्नुहोस्।'],
  'Payday — day of the Nepali month': ['월급날 — 네팔력 며칠', 'तलब दिन — नेपाली महिनाको गते'], 'Shown in the company calendar. Empty = the last day of each Nepali month. Type "off" to hide it.': ['회사 달력에 떠요. 비우면 네팔력 매달 마지막 날. 「off」라고 쓰면 안 보여요.', 'कम्पनी पात्रोमा देखिन्छ। खाली = हरेक नेपाली महिनाको अन्तिम दिन। लुकाउन "off" लेख्नुहोस्।'],
  'Staff on payroll?': ['월급 받는 직원 있음?', 'तलब पाउने कर्मचारी?'], 'No — no salaries yet': ['아니요 — 아직 급여 없음', 'छैन — तलब छैन'], 'Yes — show TDS and SSF deadlines': ['예 — TDS · SSF 기한도 보여 주기', 'छ — TDS र SSF म्याद देखाउनुहोस्'],
  'empty = last day': ['비우면 마지막 날', 'खाली = अन्तिम दिन'], 'e.g. 1': ['예: 1', 'जस्तै: १'], 'e.g. Ramesh, Sita': ['예: Ramesh, Sita', 'जस्तै: Ramesh, Sita'],
  'Backup to this computer (Firestore scheduled backups need the Blaze plan).': ['이 컴퓨터로 백업 (Firestore 예약 백업은 Blaze 요금제 필요).', 'यो कम्प्युटरमा ब्याकअप (Firestore तालिका ब्याकअपलाई Blaze चाहिन्छ)।'],
  'G-1 §2-4 deadlines': ['G-1 §2-4 기한', 'G-1 §2-4 म्याद'], '3+ days = red': ['3일 넘으면 빨강', '३+ दिन = रातो'], 'Recovered / failed / days / cost / why it failed': ['회수 · 실패 · 걸린 날 · 비용 · 실패 이유', 'फिर्ता / असफल / दिन / लागत / किन असफल'],
  'Bills due tomorrow': ['내일 청구', 'भोलिको बिल'], 'G-1 §1-3 asks for the reminder 3 days before — this is the last easy chance': ['G-1 §1-3은 3일 전 알림이 원칙 — 지금이 편하게 보낼 마지막 기회예요', 'G-1 §1-3 ले ३ दिन अघि सम्झना माग्छ — यो अन्तिम सजिलो मौका'],
  'entered at last visit': ['지난 방문 때 입력', 'पछिल्लो भ्रमणमा लेखिएको'], 'no filter': ['필터 교체 없음', 'फिल्टर छैन'], done: ['완료', 'भयो'], 'Churn date': ['해지일', 'छोडेको मिति'], 'Paused until': ['일시정지 끝나는 날', 'सम्म रोकिएको'], 'Edit customer': ['고객 정보 수정', 'ग्राहक सम्पादन'],
  List: ['목록', 'सूची'], 'Stock & FCL': ['재고 · FCL', 'मौज्दात र FCL'], filter: ['필터', 'फिल्टर'], 'random pick': ['무작위로 고르기', 'अनियमित छनोट'], 'overdue & soon': ['지남 · 곧', 'ढिलो र चाँडै'],
  'Loading… (needs internet)': ['불러오는 중… (인터넷 필요)', 'लोड हुँदै… (इन्टरनेट चाहिन्छ)'], 'liability per home': ['집별 부채', 'घरअनुसार दायित्व'], 'with sample sizes': ['표본 크기와 함께', 'नमूना आकारसहित'], 'G-1 §4 rewards': ['G-1 §4 보상', 'G-1 §4 इनाम'], 'staff one-pager': ['직원용 한 장 설명', 'कर्मचारी एक पाना'],
  cases: ['건', 'केस'], customers: ['고객', 'ग्राहक'], 'plan #2': ['계획 #2', 'योजना #२'], '4 months from the chosen month': ['고른 달부터 4개월', 'छानेको महिनादेखि ४ महिना'],
  'No “how to find the house”': ['「집 찾는 법」이 비어 있어요', '«घर कसरी भेट्ने» छैन'], 'plan #7 (day 7 / 30 / 60 / 90)': ['계획 #7 (7 · 30 · 60 · 90일째)', 'योजना #७ (७ / ३० / ६० / ९० औं दिन)'],
  'Status → Protect phone storage': ['상태 → 폰 저장공간 보호', 'स्थिति → फोन भण्डारण सुरक्षित'], 'E-2 booking intervals (PP 4 / monsoon 3': ['E-2 예약 주기 (PP 4 / 우기 3', 'E-2 बुकिङ अवधि (PP ४ / मनसुन ३'], 'UF 24 months': ['UF 24개월', 'UF २४ महिना'],
  'sanitise 3) — the verdict is what you see on site': ['소독 3) — 최종 판단은 현장에서 본 상태로', 'सफाइ ३) — अन्तिम निर्णय साइटमा देखेकै'], 'Referral reward: 1 month free (referrer) —': ['추천 보상: 1개월 무료 (추천인) —', 'रेफरल इनाम: १ महिना नि:शुल्क (सिफारिसकर्ता) —'],
  off: ['끄기', 'बन्द'], '· % of each install month still with us': ['· 설치한 달별로 아직 쓰는 비율(%)', '· जडान महिनाअनुसार अझै बसेका %'],
  active: ['이용 중', 'सक्रिय'], 'bills paid': ['청구 대비 납부', 'तिरेका बिल'], collected: ['받은 돈', 'संकलित'], 'not yet': ['발주 아직', 'अझै होइन'],
  'e.g. TQ-PI-20260808': ['예: TQ-PI-20260808', 'जस्तै: TQ-PI-20260808'], 'e.g. 50 devices arrive · Tara day off · CA meeting': ['예: 기기 50대 입고 · 타라 휴무 · CA 미팅', 'जस्तै: ५० उपकरण आउँछ · तारा बिदा · CA बैठक'],
};
for (const [k, v] of Object.entries(W6)) W[k] = v;
P.unshift( // first: these replace older, weaker patterns (e.g. BS months left in English)
  [/^(Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4})$/, (m) => `${m[2]}년 ${KO_BSM[BSM.indexOf(m[1])]}`, (m) => `${BSM_NE[BSM.indexOf(m[1])]} ${m[2]}`],
  [/^(Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4}) – (Baisakh|Jestha|Asar|Shrawan|Bhadra|Aswin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra) (\d{4})$/, (m) => `${m[2]}년 ${KO_BSM[BSM.indexOf(m[1])]} – ${m[4] === m[2] ? '' : m[4] + '년 '}${KO_BSM[BSM.indexOf(m[3])]}`, (m) => `${BSM_NE[BSM.indexOf(m[1])]} ${m[2]} – ${BSM_NE[BSM.indexOf(m[3])]} ${m[4]}`],
  [/^(\w{3} \d{4}) – (\w{3} \d{4})$/, (m) => `${T(m[1])} – ${T(m[2])}`, (m) => `${T(m[1])} – ${T(m[2])}`],
  [/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{1,2})$/, (m) => `${m[2]}일 (${W[m[1]][0]})`, (m) => `${W[m[1]][1]} ${m[2]}`],
  [/^(\d{1,2}) (Bai|Jes|Asa|Shr|Bha|Asw|Kar|Man|Pou|Mag|Fal|Cha)$/, (m) => `${KO_BSM[BS3.indexOf(m[2])]} ${m[1]}`, (m) => `${m[1]} ${BSM_NE[BS3.indexOf(m[2])]}`],
  [/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, (m) => `${MON_KO[m[2]]}월 ${m[1]}일`, (m) => `${NE_MON[MON_KO[m[2]] - 1]} ${m[1]}`],
  [/^day (\d+) of the Nepali month$/, '네팔력 매달 $1일', 'नेपाली महिनाको $1 गते'], [/^late since (\S+)$/, '$1부터 밀림', '$1 देखि ढिलो'],
  [/^((?:PP|CTO|UF|UV|Spin-down|sanitise)(?:, (?:PP|CTO|UF|UV|Spin-down|sanitise))*) due$/, (m) => `${m[1].replace(/sanitise/g, '소독')} 차례`, (m) => `${m[1].replace(/sanitise/g, 'सफाइ')} पालो`],
  [/^\+(\d+) more$/, '+$1개 더', '+$1 थप'], [/^(overdue|ok|due in 14 days): (\d+)$/, (m) => `${{ overdue: '지남', ok: '정상', 'due in 14 days': '14일 안' }[m[1]]}: ${m[2]}`, (m) => `${{ overdue: 'ढिलो', ok: 'ठीक', 'due in 14 days': '१४ दिनभित्र' }[m[1]]}: ${m[2]}`],
  [/^(\d{4}-\d{2}-\d{2}) (Quarterly call|Random happy call|Follow-up call|D7|D30|D60|D90)$/, (m) => `${m[1]} ${T(m[2])}`, (m) => `${m[1]} ${T(m[2])}`], [/^(NPR [\d,]+) \(incl\. deposit (\d+)\)$/, '$1 (보증금 $2 포함)', '$1 (धरौटी $2 सहित)'], [/^incl\. deposit (NPR [\d,]+)$/, '보증금 $1 포함', 'धरौटी $1 सहित'], [/^(\d+) payments?$/, '결제 $1건', '$1 भुक्तानी'], [/^bill (\d+)$/, '$1회차', '$1 औं बिल'], [/^(\d+) hidden$/, '$1개 숨김', '$1 लुकाइएको'],
  [/^Advance tax (\d)$/, '중간예납 $1차', 'अग्रिम कर $1'], [/^FY (\S+)$/, '회계연도 $1', 'आ.व. $1'], [/^(\d+) today$/, '오늘 $1건', 'आज $1'], [/^until (\S+)$/, '$1까지', '$1 सम्म'], [/^now (\S+)$/, '지금 $1', 'अहिले $1'],
  [/^Undo \((\d+)\)$/, '되돌리기 ($1)', 'पूर्ववत् ($1)'], [/^(\d+) undone$/, '$1건 되돌림', '$1 पूर्ववत्'], [/^No homes in (.+)$/, '$1엔 집이 없어요', '$1 मा घर छैन'],
  [/^(\d+) homes? → (.+?)( \(today only\)| \(until (\S+)\))?$/, (m) => `${m[1]}집 → ${m[2] === 'nobody' ? '미배정' : m[2]}${m[3] ? (m[4] ? ` (${m[4]}까지)` : ' (오늘만)') : ''}`, (m) => `${m[1]} घर → ${m[2] === 'nobody' ? 'कसैलाई होइन' : m[2]}${m[3] ? (m[4] ? ` (${m[4]} सम्म)` : ' (आज मात्र)') : ''}`],
  [/^Now goes to (.+)$/, '이제 $1 담당', 'अब $1 जान्छ'], [/^Everything here \((\d+)\)$/, '이 집의 모든 기록 ($1)', 'यहाँको सबै ($1)'], [/^filters (.+)$/, '필터 $1', 'फिल्टर $1'],
  [/^(.+): account made — the password email is on its way$/, '$1 계정 완료 — 비밀번호 메일이 가고 있어요', '$1: खाता बन्यो — पासवर्ड इमेल जाँदैछ'], [/^Password link sent to (.+)$/, '$1에게 비밀번호 링크를 보냈어요', '$1 लाई पासवर्ड लिङ्क पठाइयो'],
  [/^Last backup (\d+) days ago — make a new one$/, '마지막 백업이 $1일 전 — 새로 하나 만드세요', 'पछिल्लो ब्याकअप $1 दिन अघि — नयाँ बनाउनुहोस्'],
  [/^Office closed tomorrow — (.+)$/, (m) => `내일 사무실 휴무 — ${T(m[1])}`, (m) => `भोलि कार्यालय बन्द — ${T(m[1])}`],
  [/^(VAT return|TDS on salaries|SSF contribution|Advance tax \d|Income tax return|OCR annual report|Scooter tax|EXIM code renewal|Domain koracarenepal\.com expires)(?: · ([^—]+?))? — (today|by (\S+))( \(a holiday — do it the day before\))?$/,
    (m) => `${T(m[1])}${m[2] ? ' · ' + T(m[2]) : ''} — ${m[4] ? m[4] + '까지' : '오늘'}${m[5] ? ' (쉬는 날 — 하루 전에 끝내기)' : ''}`, (m) => `${T(m[1])}${m[2] ? ' · ' + T(m[2]) : ''} — ${m[4] ? m[4] + ' सम्म' : 'आज'}${m[5] ? ' (बिदा — अघिल्लो दिन)' : ''}`],
  [/^Cash in this week ([+−])(\d+)% vs the usual week$/, (m) => `이번 주 입금이 평소보다 ${m[2]}% ${m[1] === '+' ? '많아요' : '적어요'}`, (m) => `यो हप्ता आम्दानी सामान्यभन्दा ${m[2]}% ${m[1] === '+' ? 'बढी' : 'कम'}`],
  [/^Requests ([\d.]+)× the usual week \((\d+)\)$/, '요청이 평소의 $1배 ($2건)', 'अनुरोध सामान्यको $1 गुणा ($2)'], [/^Installs this week (\d+) vs ([\d.]+) usual$/, '이번 주 설치 $1대 (평소 $2대)', 'यो हप्ता जडान $1 (सामान्य $2)'], [/^(\d+) homes left this week$/, '이번 주 해지 $1가구', 'यो हप्ता $1 घर छोडे'],
  [/^(.+) in (\d+) days — (\d+) days off \((\S+) → (\S+)\)\. Collect & visit before\.$/, (m) => `${m[1].split(' + ').map((x) => T(x)).join(' + ')} ${m[2]}일 뒤 — ${m[3]}일 연속 휴무 (${m[4]} → ${m[5]}). 그 전에 수금·방문을 끝내세요.`, (m) => `${m[1].split(' + ').map((x) => T(x)).join(' + ')} ${m[2]} दिनमा — ${m[3]} दिन बिदा (${m[4]} → ${m[5]})। अघि नै असुली र भ्रमण गर्नुहोस्।`],
  [/^(\d+) days ago$/, '$1일 전', '$1 दिन अघि'], [/^recurring ([\d,]+) \/ month$/, '월 반복 매출 $1', 'मासिक $1'], [/^(\d+) of (\d+)$/, '$2건 중 $1건', '$2 मध्ये $1'], [/^(\d+) calls$/, '전화 $1건', '$1 कल'], [/^(\d+) open requests$/, '열린 요청 $1건', '$1 खुला अनुरोध'],
  [/^order point ([\d.]+) \(([\d.]+)\/week × (\d+) weeks\)$/, '발주 기준 $1 (주 $2대 × $3주)', 'अर्डर बिन्दु $1 ($2/हप्ता × $3 हप्ता)'], [/^order point ([\d.]+)$/, '발주 기준 $1', 'अर्डर बिन्दु $1'],
  [/^\((.+)\)$/, (m) => `(${T(m[1])})`, (m) => `(${T(m[1])})`], [/^(\d+) samples$/, '표본 $1', '$1 नमूना'], [/^([\d.]+) mo$/, '$1개월', '$1 महिना'], [/^(PP|CTO|UF|UV) (booking|real)$/, (m) => `${m[1]} ${m[2] === 'booking' ? '예약' : '실제'}`, (m) => `${m[1]} ${m[2] === 'booking' ? 'बुकिङ' : 'वास्तविक'}`],
  [/^from (\d{4}-\d{2}-\d{2})$/, '$1부터', '$1 देखि'], [/^by ([A-Z][a-z]+)$/, '$1 담당', '$1 द्वारा'], [/^(\d+) min$/, '$1분', '$1 मिनेट'], [/^In (\d+) × (.+)$/, (m) => `입고 ${m[1]} × ${T(m[2])}`, (m) => `आगमन ${m[1]} × ${T(m[2])}`],
  [/^full ([\d,]+)$/, '전액 $1', 'पूरा $1'], [/^follow up (\S+)$/, '$1 연락', '$1 फलो-अप'], [/^started (\S+)$/, '$1 시작', '$1 सुरु'], [/^attempts (\d+)$/, '시도 $1번', '$1 प्रयास'],
  [/^raw TDS (\S+) → (\S+)$/, '원수 TDS $1 → $2', 'कच्चा TDS $1 → $2'], [/^flow ([\d.]+)$/, '유량 $1', 'फ्लो $1'], [/^TDS (\d+)→(\d+)$/, 'TDS $1→$2', 'TDS $1→$2'], [/^PP (White|Brown|Black)$/, (m) => `PP ${{ White: '흰색', Brown: '갈색', Black: '검정' }[m[1]]}`, (m) => `PP ${{ White: 'सेतो', Brown: 'खैरो', Black: 'कालो' }[m[1]]}`],
  [/^(OK|Issue found) by (.+)$/, (m) => `${m[1] === 'OK' ? '이상 없음' : '문제 있음'} · ${m[2]}`, (m) => `${m[1] === 'OK' ? 'ठीक' : 'समस्या'} · ${m[2]}`], [/^max (\d+)$/, '최대 $1', 'बढीमा $1'],
  [/^(Visits|Payments|Expenses) \((\d+)\)$/, (m) => `${{ Visits: '방문', Payments: '수금', Expenses: '지출' }[m[1]]} (${m[2]})`, (m) => `${{ Visits: 'भ्रमण', Payments: 'भुक्तानी', Expenses: 'खर्च' }[m[1]]} (${m[2]})`], [/^(\d+) filters$/, '필터 $1개', '$1 फिल्टर'],
  [/^(customers|visits|payments|requests|leads|recoveries|trainings|checkins|stockMoves|expenses|deviceEvents|relocations|events|audit|contractEvents|screenings|claims|tools|payroll|waterTests|milestones) \((\d+)\) CSV$/, (m) => `${COLK[m[1]][0]} (${m[2]}) CSV`, (m) => `${COLK[m[1]][1]} (${m[2]}) CSV`], [/^on (\d{4}-\d{2}-\d{2})$/, '$1', '$1'], [/^Next: bill (\d+)$/, '다음: $1회차', 'अर्को: $1 औं बिल'], [/^\(incl\. deposit (NPR [\d,]+)\)$/, '(보증금 $1 포함)', '(धरौटी $1 सहित)'],
);

// ---- v0.7 (2026-09-28): sidebar groups · what-if · referrals · field live (🔴 Nepali = draft, Tara to check)
const W7 = {
  'Run the day': ['오늘 운영', 'आजको काम'], 'Customers & growth': ['고객 · 성장', 'ग्राहक र वृद्धि'], 'Money & plans': ['돈 · 계획', 'पैसा र योजना'], Company: ['회사', 'कम्पनी'],
  'Field live': ['현장 실시간', 'फिल्ड लाइभ'], 'Device orders': ['기기 주문', 'उपकरण अर्डर'], 'What-if': ['가정 계산기', 'के भए के हुन्छ'], Referrals: ['추천 관계도', 'सिफारिस'],
  // field live
  'Done today': ['오늘 한 일', 'आज सकिएको'], 'Cash today': ['오늘 받은 돈', 'आजको पैसा'], 'all methods': ['모든 결제 방법', 'सबै तरिका'], 'Out working': ['지금 일하는 중', 'काममा'],
  'saved something in the last 45 min': ['최근 45분 안에 기록을 남긴 사람', 'पछिल्लो ४५ मिनेटमा केही सेभ गरेका'], 'last saved spot of each person': ['사람마다 마지막으로 저장한 곳', 'हरेकको पछिल्लो सेभ ठाउँ'],
  'green = done today': ['초록 = 오늘 끝남', 'हरियो = आज सकियो'], 'grey = still to go': ['회색 = 아직 남음', 'खैरो = बाँकी'],
  'A spot is saved only when someone saves a record with location allowed — not tracked in between.': ['위치가 허용된 폰으로 기록을 저장할 때만 그 자리가 남아요 — 그 사이는 추적하지 않아요.', 'स्थान अनुमति भएको फोनले रेकर्ड सेभ गर्दा मात्र ठाउँ बस्छ — बीचमा ट्र्याक हुँदैन।'],
  working: ['일하는 중', 'काममा'], quiet: ['조용함', 'शान्त'], 'not started': ['아직 시작 전', 'सुरु भएको छैन'], 'next:': ['다음:', 'अर्को:'], next: ['다음', 'अर्को'], visit: ['방문', 'भ्रमण'], call: ['통화', 'कल'],
  'G-1 §1-1: only Tara takes cash': ['G-1 §1-1: 현금은 타라만 받아요', 'G-1 §1-1: नगद तारा मात्र'], 'no location saved today': ['오늘 저장된 위치 없음', 'आज स्थान सेभ भएको छैन'], 'Nothing saved today yet': ['오늘 저장한 기록 아직 없음', 'आज केही सेभ भएको छैन'],
  'Not assigned yet': ['아직 배정 안 됨', 'अझै तोकिएको छैन'], 'No staff yet': ['아직 직원 없음', 'कर्मचारी छैन'],
  // referrals
  'Came by word of mouth': ['입소문으로 온 집', 'मुखबाट आएका'], 'Homes brought per referrer': ['추천인 한 명이 데려온 집', 'एक जनाले ल्याएका घर'], 'Still with us': ['아직 쓰는 비율', 'अझै बसेका'], 'referred vs others': ['추천 vs 나머지', 'सिफारिस बनाम अरू'],
  Rewards: ['보상', 'इनाम'], rewards: ['보상', 'इनाम'], 'ready to apply': ['줄 차례', 'दिन तयार'], 'Who brought whom': ['누가 누구를 데려왔나', 'कसले कसलाई ल्यायो'], 'circle size = homes they brought': ['원 크기 = 데려온 집 수', 'वृत्तको आकार = ल्याएका घर'],
  'Top referrers': ['많이 데려온 집', 'धेरै ल्याउने'], 'How customers came': ['고객이 온 길', 'ग्राहक कसरी आए'], 'None yet': ['아직 없음', 'अझै छैन'],
  'No referrals yet — when a new customer says who told them, the tree grows here.': ['아직 추천이 없어요 — 새 고객이 누구 소개로 왔는지 적으면 여기 나무가 자라요.', 'अझै सिफारिस छैन — नयाँ ग्राहकले कसले भन्यो लेखेपछि यहाँ रूख बढ्छ।'],
  // what-if
  'Move a slider — the next 36 months are recalculated from today': ['막대를 움직이면 오늘부터 36개월을 다시 계산해요', 'स्लाइडर सार्नुहोस् — आजदेखि ३६ महिना फेरि गणना हुन्छ'],
  'A calculator on assumptions, not a forecast. Sources: plan 2026-09-27 §2–§3.': ['가정으로 돌리는 계산기지 예측이 아니에요. 근거: 계획 2026-09-27 §2~§3.', 'अनुमानमा चल्ने क्याल्कुलेटर, पूर्वानुमान होइन। स्रोत: योजना २०२६-०९-२७ §२–§३।'],
  Worse: ['나쁘게', 'खराब'], Middle: ['중간', 'मध्यम'], Better: ['좋게', 'राम्रो'], 'Reset to today': ['오늘 값으로', 'आजको मानमा'],
  Growth: ['성장', 'वृद्धि'], Price: ['가격', 'मूल्य'], People: ['사람', 'मान्छे'], Devices: ['기기', 'उपकरण'], 'Running costs': ['운영비', 'चालु खर्च'],
  'Installs per week': ['주당 설치', 'हप्तामा जडान'], 'Homes leaving per month (%)': ['월 해지율 (%)', 'मासिक छोड्ने (%)'], 'Share of bills paid (%)': ['청구 납부율 (%)', 'तिरिएको बिल (%)'],
  'Monthly price (NPR, VAT incl.)': ['월 요금 (NPR, VAT 포함)', 'मासिक मूल्य (भ्याट सहित)'], 'Day-1 payment (NPR, incl. 1st month)': ['첫날 받는 돈 (NPR, 첫 달 포함)', 'पहिलो दिनको भुक्तानी (पहिलो महिना सहित)'],
  Technicians: ['기사 수', 'प्राविधिक'], 'Salary per technician (NPR / month)': ['기사 1명 월급 (NPR)', 'प्राविधिकको तलब (महिना)'], 'Homes one technician can do a day': ['기사 1명이 하루에 도는 집', 'एक प्राविधिकले दिनमा गर्ने घर'],
  'Devices in stock now': ['지금 재고 기기', 'अहिले मौज्दात'], 'Order → arrival (weeks)': ['발주 → 도착 (주)', 'अर्डर → आगमन (हप्ता)'], 'Devices per order': ['한 번에 주문하는 대수', 'एक अर्डरमा उपकरण'],
  'Cost per device (NPR)': ['기기 1대 원가 (NPR)', 'उपकरणको लागत'], 'Devices recovered from leavers (%)': ['해지 집에서 기기 회수율 (%)', 'छोड्नेबाट फिर्ता (%)'],
  'Filters & parts per home (NPR / month)': ['집당 필터·부품 (NPR / 월)', 'घरको फिल्टर र पार्ट (महिना)'], 'Fixed costs (NPR / month)': ['고정비 (NPR / 월)', 'स्थिर खर्च (महिना)'], 'Fuel per technician (NPR / month)': ['기사 1명 기름값 (NPR / 월)', 'प्राविधिकको इन्धन (महिना)'],
  'Tara pace': ['타라 속도', 'ताराको गति'], 'app shows the real 4-week average': ['실제 최근 4주 평균은 앱에 나와요', 'एपमा वास्तविक ४ हप्ते औसत'], 'Tara counts as 1 until someone is hired': ['사람을 뽑기 전까진 타라가 1명', 'भर्ना नहुँदासम्म तारा = १'],
  'from the app (stock page)': ['앱 재고 화면 값', 'एपको मौज्दात पेजबाट'], 'plan §2: FCL#1 = 350': ['계획 §2: FCL#1 = 350대', 'योजना §२: FCL#१ = ३५०'], 'pilot landed 17,636': ['파일럿 도착 원가 17,636', 'पाइलट लागत १७,६३६'], 'PI prices': ['PI 단가', 'PI मूल्य'],
  'Homes in 12': ['12', '१२'], '36 months': ['36개월 뒤 집 수', '३६ महिनामा घर'], 'Homes in 12 · 24 · 36 months': ['12 · 24 · 36개월 뒤 집 수', '१२ · २४ · ३६ महिनामा घर'], 'First month with cash left': ['처음 돈이 남는 달', 'पहिलो पटक पैसा बच्ने महिना'],
  'Cash needed to get there (lowest point)': ['그때까지 필요한 돈 (가장 낮은 지점)', 'त्यहाँसम्म चाहिने पैसा (सबैभन्दा तल)'], 'Monthly cash in month 36': ['36개월째 월 현금', '३६ औं महिनाको नगद'], 'no VAT': ['VAT 뺌', 'भ्याटबिना'], 'before your salaries': ['부부 월급 전', 'तलबअघि'],
  'Months short of devices': ['기기가 모자란 달', 'उपकरण नपुगेको महिना'], 'never ran out': ['한 번도 안 모자람', 'कहिल्यै सकिएन'], 'Months short of people': ['사람이 모자란 달', 'मान्छे नपुगेको महिना'], 'enough hands': ['손 충분', 'पर्याप्त'],
  'installs stopped — order earlier or more': ['설치가 멈춰요 — 더 일찍·더 많이 주문', 'जडान रोकियो — चाँडै वा धेरै अर्डर'], 'visits ate the install time — hire': ['방문이 설치 시간을 먹어요 — 사람 뽑기', 'भ्रमणले जडान समय खायो — भर्ना गर्नुहोस्'],
  'Deposit held at month 36': ['36개월째 맡은 보증금', '३६ औं महिनामा धरौटी'], 'customers’ money — not ours': ['고객 돈 — 우리 돈 아님', 'ग्राहकको पैसा — हाम्रो होइन'], 'never below today': ['오늘보다 안 내려감', 'आजभन्दा तल छैन'], 'not within 36 months': ['36개월 안엔 없음', '३६ महिनाभित्र छैन'],
  'monthly cash (no VAT)': ['월 현금 (VAT 뺌)', 'मासिक नगद (भ्याटबिना)'], 'red = loss': ['빨강 = 손실', 'रातो = घाटा'], 'cash since today (incl. device orders)': ['오늘부터 쌓인 현금 (기기 주문 포함)', 'आजदेखिको नगद (उपकरण अर्डर सहित)'], households: ['가구 수', 'घर'], 'device order': ['기기 주문', 'उपकरण अर्डर'],
  Revenue: ['매출', 'आम्दानी'], Costs: ['비용', 'खर्च'], 'Devices bought': ['기기 구매', 'किनेको उपकरण'], 'Cash since today': ['오늘부터 누적', 'आजदेखि जम्मा'], Limit: ['막힘', 'सीमा'], Month: ['달', 'महिना'], Homes: ['집', 'घर'], Installs: ['설치', 'जडान'], Visits: ['방문', 'भ्रमण'], Stock: ['재고', 'मौज्दात'],
  'no devices': ['기기 없음', 'उपकरण छैन'], 'no time': ['시간 없음', 'समय छैन'], quarterly: ['분기', 'त्रैमासिक'],
};
for (const [k, v] of Object.entries(W7)) W[k] = v;
P.unshift(
  [/^(\d+) (?:visits )?done$/, '$1건 완료', '$1 सकियो'], [/^(\d+) visits done$/, '방문 $1건 완료', '$1 भ्रमण सकियो'], [/^(\d+) still to go$/, '$1건 남음', '$1 बाँकी'], [/^(\d+) to go$/, '$1건 남음', '$1 बाँकी'],
  [/^last (\d{2}:\d{2}) \((.+)\)$/, (m) => `마지막 ${m[1]} (${m[2].replace(/(\d+)m$/, '$1분 전').replace(/(\d+)h$/, '$1시간 전').replace(/(\d+)d$/, '$1일 전')})`, '$1 मा अन्तिम ($2)'], [/^cash ([\d,]+)$/, '현금 $1', 'नगद $1'],
  [/^(\d+) of (\d+) homes$/, '$2집 중 $1집', '$2 मध्ये $1 घर'], [/^(\d+) homes brought someone$/, '$1집이 누군가를 데려옴', '$1 घरले कसैलाई ल्याए'], [/^others (\S+)$/, '나머지 $1', 'अरू $1'], [/^(\d+) trees$/, '나무 $1개', '$1 रूख'],
  [/^generations: on their own (\d+)$/, '세대: 스스로 온 집 $1', 'पुस्ता: आफैं आएका $1'], [/^gen (\d+) (\d+)$/, '$1세대 $2', 'पुस्ता $1: $2'], [/^brought (\d+)$/, '$1집 데려옴', '$1 ल्याए'],
  [/^Move a slider — the next 36 months are recalculated from today \((\d+) homes now\)\.$/, '막대를 움직이면 오늘부터 36개월을 다시 계산해요 (지금 $1집).', 'स्लाइडर सार्नुहोस् — आजदेखि ३६ महिना फेरि (अहिले $1 घर)।'],
  [/^plan §3 red list: (.+)$/, '계획 §3 빨간 목록: $1', 'योजना §३ रातो सूची: $1'], [/^plan §3: bad debt 3 % → 97 %$/, '계획 §3: 대손 3% → 97%', 'योजना §३: खराब ऋण ३% → ९७%'], [/^contract 9\/3: (.+)$/, '계약 9/3: $1', 'सम्झौता ९/३: $1'],
  [/^plan §3: 66,000 for 3 staff ≈ 22,000$/, '계획 §3: 직원 3명 66,000 ≈ 1명 22,000', 'योजना §३: ३ जनालाई ६६,००० ≈ २२,०००'], [/^plan: 4–8 a day, 6 days a week$/, '계획: 하루 4~8집, 주 6일', 'योजना: दिनमा ४–८, हप्तामा ६ दिन'],
  [/^plan §2: 13 weeks \(9 if prepared\)$/, '계획 §2: 13주 (미리 준비하면 9주)', 'योजना §२: १३ हप्ता (तयारी भए ९)'], [/^plan §3: FCL 12,062$/, '계획 §3: FCL 12,062', 'योजना §३: FCL १२,०६२'], [/^cycles: 242$/, '교체 주기: 242', 'चक्र: २४२'],
  [/^plan §3: 13,690 \(rent$/, '계획 §3: 13,690 (임대료', 'योजना §३: १३,६९० (भाडा'], [/^SaaS\)$/, 'SaaS)', 'SaaS)'], [/^phone$/, '전화', 'फोन'], [/^plan §3: 2,167$/, '계획 §3: 2,167', 'योजना §३: २,१६७'],
  [/^month (\d+) from now$/, '지금부터 $1번째 달', 'अबदेखि $1 औं महिना'], [/^lowest in (.+)$/, (m) => `가장 낮은 달 ${T(m[1])}`, (m) => `सबैभन्दा तल ${T(m[1])}`], [/^(\d+) each$/, '한 번에 $1대', 'एक पटकमा $1'], [/^order (\d+)$/, '주문 $1대', 'अर्डर $1'],
  [/^(\d+) homes$/, '$1가구', '$1 घर'],
);

// ---- v0.8 (2026-09-28): watch list · … (🔴 Nepali = draft, Tara to check)
const W8 = {
  // #1 watch list
  'Watch list': ['챙길 집', 'ध्यान दिनुपर्ने घर'], 'Look after this week': ['이번 주 챙길 집', 'यो हप्ता ध्यान दिनुपर्ने'], 'Look after first': ['먼저 챙길 집', 'पहिले हेर्नुपर्ने'], 'Keep an eye on': ['지켜볼 집', 'नजर राख्नुपर्ने'], 'Small signs': ['작은 신호', 'सानो संकेत'],
  'Checked this week': ['이번 주 확인함', 'यो हप्ता जाँचियो'], 'hidden 7 days unless worse': ['나빠지지 않으면 7일 숨김', 'नबिग्रे ७ दिन लुकाइन्छ'], 'show again': ['다시 보기', 'फेरि देखाउनुहोस्'],
  'All levels': ['전체', 'सबै'], First: ['먼저', 'पहिले'], Eye: ['지켜보기', 'नजर'], Small: ['작은 신호', 'सानो'], 'All signs': ['모든 신호', 'सबै संकेत'], 'Service & water': ['서비스 · 물', 'सेवा र पानी'], 'Stage of life': ['고객 단계', 'चरण'],
  'Points from signs in the records. It orders who to call first — not a forecast (no verdict before 600 household-months).': ['기록에 나온 신호로 점수를 매겨요. 누구한테 먼저 연락할지 순서만 정하는 거지 예측이 아니에요 (600 가구-월 전엔 판정 안 함).', 'रेकर्डका संकेतबाट अंक। पहिले कसलाई फोन गर्ने भन्ने क्रम मात्र — पूर्वानुमान होइन (६०० घर-महिनाअघि निर्णय छैन)।'],
  'Points from signs in the records (late bills, open problems, unhappy calls, first 90 days, moving…). It orders who to call first — it is not a forecast.': ['기록에 나온 신호(밀린 돈 · 안 끝난 문제 · 불만 통화 · 첫 90일 · 이사…)로 점수를 매겨요. 누구한테 먼저 연락할지 순서만 정하지 예측은 아니에요.', 'रेकर्डका संकेत (ढिलो बिल, खुला समस्या, असन्तुष्ट कल, पहिलो ९० दिन, सराइ…) बाट अंक। पहिले कसलाई फोन गर्ने क्रम मात्र — पूर्वानुमान होइन।'],
  Homes: ['집', 'घर'], 'red = first': ['빨강 = 먼저', 'रातो = पहिले'], 'orange = eye': ['주황 = 지켜보기', 'सुन्तला = नजर'], 'faint = small signs': ['흐림 = 작은 신호', 'धमिलो = सानो संकेत'],
  'Most common signs': ['자주 나온 신호', 'धेरै देखिएका संकेत'], 'Whose homes': ['누구 담당인가', 'कसको घर'], 'first + eye': ['먼저 + 지켜보기', 'पहिले + नजर'], 'How points are given': ['점수 주는 법', 'अंक कसरी'], 'Nobody here 🏖️': ['아무도 없어요 🏖️', 'कोही छैन 🏖️'], 'No signs': ['신호 없음', 'संकेत छैन'],
  'Nobody to worry about 🏖️': ['걱정할 집 없어요 🏖️', 'चिन्ता गर्नुपर्ने छैन 🏖️'],
  '30+ days late': ['30일 넘게 밀림', '३०+ दिन ढिलो'], '7–29 days late': ['7~29일 밀림', '७–२९ दिन ढिलो'], '1–6 days late': ['1~6일 밀림', '१–६ दिन ढिलो'], 'Late on 2 of the last 3 bills': ['최근 청구 3번 중 2번 늦음', 'पछिल्ला ३ मध्ये २ बिल ढिलो'],
  'Open request': ['안 끝난 요청', 'खुला अनुरोध'], '2+ problems in 60 days': ['60일 안에 문제 2번 이상', '६० दिनमा २+ समस्या'], 'Last call: issue found': ['마지막 통화: 문제 있음', 'पछिल्लो कल: समस्या'], 'Last call: ★★ or less': ['마지막 통화: ★★ 이하', 'पछिल्लो कल: ★★ वा कम'],
  'Last call: ★★★': ['마지막 통화: ★★★', 'पछिल्लो कल: ★★★'], 'Purified TDS up 30+': ['정수 TDS 30 이상 오름', 'सफा पानीको TDS ३०+ बढ्यो'], 'Visit cancelled or on hold': ['방문 취소·보류', 'भ्रमण रद्द वा रोकियो'], 'Visit 14+ days late': ['방문 14일 넘게 밀림', 'भ्रमण १४+ दिन ढिलो'],
  'Filter overdue': ['필터 교체 밀림', 'फिल्टर ढिलो'], 'First 90 days': ['첫 90일', 'पहिलो ९० दिन'], 'Onboarding call overdue': ['온보딩 통화 밀림', 'अनबोर्डिङ कल ढिलो'], 'Moving house': ['이사 예정', 'घर सर्दै'], 'Contract ended': ['계약 끝남', 'सम्झौता सकियो'], 'Pause ended': ['일시정지 끝남', 'रोक सकियो'],
  '🔴 Weights are a first guess. One late bill counts little: skipping a payment early is common in pay-as-you-go businesses. New homes get a point: the first 90 days carry most of the leaving.': ['🔴 점수는 첫 추정치예요. 한 번 늦게 낸 건 조금만 쳐요: 구독형 사업에선 초기에 한 번 거르는 게 흔해요. 새 집엔 1점: 해지가 첫 90일에 몰려요.', '🔴 अंक पहिलो अनुमान हो। एक पटक ढिलो कम गनिन्छ: सुरुमा एक पटक छुटाउनु सामान्य हो। नयाँ घरलाई १ अंक: धेरै छोड्ने पहिलो ९० दिनमा हुन्छ।'],
  'See request': ['요청 보기', 'अनुरोध हेर्नुहोस्'], 'See move': ['이사 보기', 'सराइ हेर्नुहोस्'], Checked: ['확인함', 'जाँचियो'], 'Checked — hide for 7 days unless it gets worse': ['확인함 — 나빠지지 않으면 7일 숨김', 'जाँचियो — नबिग्रे ७ दिन लुकाउनुहोस्'],
  'Filter order dates': ['필터 주문 날짜', 'फिल्टर अर्डर मिति'], 'On the shelf': ['선반 재고', 'मौज्दात'], 'Needed 90 days': ['90일 필요량', '९० दिनमा चाहिने'], '12 months': ['12개월', '१२ महिना'], 'Runs out': ['다 떨어지는 날', 'सकिने दिन'], 'Order by': ['주문 마감', 'अर्डर गर्ने अन्तिम दिन'], 'Order qty': ['주문량', 'अर्डर संख्या'],
  'order now — late': ['지금 주문 — 늦음', 'अहिले अर्डर — ढिलो'], 'order soon': ['곧 주문', 'चाँडै अर्डर'], 'Change lead time, safety weeks and months to cover in Settings → Filters.': ['리드타임·안전 주·몇 달 치는 설정 → 필터에서 바꿔요.', 'लिड टाइम, सुरक्षा हप्ता र महिना सेटिङ → फिल्टरमा बदल्नुहोस्।'],
  'Filters (order dates)': ['필터 (주문 날짜)', 'फिल्टर (अर्डर मिति)'], 'Filter lead time — order to shelf (weeks)': ['필터 리드타임 — 주문부터 선반까지 (주)', 'फिल्टर लिड टाइम — अर्डरदेखि मौज्दातसम्म (हप्ता)'],
  '🔴 Filters may come from China or India — put the real number after the first order.': ['🔴 필터는 중국이나 인도에서 올 수 있어요 — 첫 주문 뒤 실제 숫자로 바꾸세요.', '🔴 फिल्टर चीन वा भारतबाट आउन सक्छ — पहिलो अर्डरपछि साँचो संख्या राख्नुहोस्।'],
  'Safety weeks before running out': ['다 떨어지기 전 여유 주', 'सकिनुअघि सुरक्षा हप्ता'], 'Months one order should cover': ['주문 한 번이 버틸 개월 수', 'एक अर्डरले धान्ने महिना'],
  'Filters on the shelf': ['선반 위 필터', 'मौज्दातमा फिल्टर'], 'next 9 months': ['앞으로 9개월', 'आउँदा ९ महिना'], 'red band = short (clipped)': ['빨간 띠 = 모자람 (아래는 잘림)', 'रातो पट्टी = कमी'], 'dot = runs out': ['점 = 다 떨어지는 날', 'थोप्लो = सकिने दिन'], 'dashed = last day to order': ['점선 = 주문 마감일', 'धर्का = अर्डरको अन्तिम दिन'],
  Leavers: ['해지 분석', 'छोड्ने'], 'why homes left': ['왜 떠났나', 'किन छोडे'], 'Main reason they left': ['떠난 주된 이유', 'छोड्ने मुख्य कारण'], 'In their words': ['고객이 한 말', 'उनकै शब्दमा'], 'e.g. moving to Kathmandu in November': ['예: 11월에 카트만두로 이사', 'जस्तै: मंसिरमा काठमाडौं सर्दै'],
  'One main reason — the Leavers page adds them up (lost monthly revenue per reason).': ['주된 이유 하나 — 해지 분석 화면이 이유별로 모아요(이유별 잃은 월매출).', 'एउटा मुख्य कारण — छोड्ने पेजले जोड्छ (कारणअनुसार गुमेको आम्दानी)।'], 'Choose the main reason.': ['주된 이유를 고르세요.', 'मुख्य कारण छान्नुहोस्।'],
  'Moved away (outside our area)': ['이사 감 (서비스 지역 밖)', 'टाढा सरे (हाम्रो क्षेत्रबाहिर)'], 'Money — cannot pay': ['돈 — 낼 수 없음', 'पैसा — तिर्न सक्दैनन्'], 'Went back to jar / other water': ['자르 물·다른 물로 돌아감', 'जार/अरू पानीमा फर्के'], 'Water taste or quality': ['물맛·수질', 'पानीको स्वाद वा गुण'],
  'Breakdowns / slow service': ['고장·늦은 서비스', 'बिग्रने/ढिलो सेवा'], 'Landlord said no': ['집주인 반대', 'घरधनीले मानेनन्'], 'Bought own purifier': ['정수기 직접 삼', 'आफ्नै प्युरिफायर किने'], 'Household closed / death': ['집 정리·사망', 'घर बन्द/मृत्यु'], 'Not recorded': ['기록 없음', 'लेखिएको छैन'],
  'Money not come in yet': ['돈이 아직 안 들어옴', 'पैसा अझै आएको छैन'], 'No money this month': ['이번 달 돈 없음', 'यो महिना पैसा छैन'], Forgot: ['깜빡함', 'बिर्से'], 'Unhappy — held back': ['불만 — 일부러 안 냄', 'असन्तुष्ट — रोके'],
  'If a payment is late — why?': ['돈이 밀렸다면 — 왜?', 'भुक्तानी ढिलो भए — किन?'], 'Paid late — why?': ['늦게 냄 — 왜?', 'ढिलो तिरे — किन?'],
  '"Money not come in yet" can be fixed by moving the bill day; "no money" cannot — so keep the two apart.': ['「돈이 아직 안 들어옴」은 청구일을 옮기면 풀리고 「돈 없음」은 안 풀려요 — 그래서 둘을 나눠 적어요.', '«पैसा अझै आएन» बिल दिन सारेर मिल्छ; «पैसा छैन» मिल्दैन — त्यसैले छुट्टै राख्नुहोस्।'],
  'Ask once. "Money not come in yet" (remittance, salary) vs "no money this month" need different fixes.': ['한 번만 물어보세요. 「돈이 아직 안 들어옴」(송금·월급)과 「이번 달 돈 없음」은 해결법이 달라요.', 'एक पटक सोध्नुहोस्। «पैसा अझै आएन» (रेमिट्यान्स, तलब) र «यो महिना पैसा छैन» को उपाय फरक हो।'],
  'Why homes left and what it cost. The reason is the main reason on the recovery case. Lost monthly = subscription price (VAT incl.) · lost contract = months left of 36 × price.': ['왜 떠났고 얼마를 잃었나. 이유 = 회수 건에 적은 주된 이유. 잃은 월매출 = 구독료(VAT 포함) · 잃은 계약 = 36개월 중 남은 달 × 요금.', 'किन छोडे र कति गुम्यो। कारण = फिर्ता केसको मुख्य कारण। मासिक गुमेको = सदस्यता मूल्य · सम्झौता गुमेको = ३६ मध्ये बाँकी महिना × मूल्य।'],
  'Left on': ['해지일', 'छोडेको मिति'], Months: ['개월', 'महिना'], 'Main reason': ['주된 이유', 'मुख्य कारण'], 'Device back': ['기기 회수', 'उपकरण फिर्ता'], 'Contract lost': ['잃은 계약', 'गुमेको सम्झौता'], 'Nobody has left 🏖️': ['떠난 집 없음 🏖️', 'कोही छोडेनन् 🏖️'],
  'Why payments were late': ['돈이 밀린 이유', 'भुक्तानी ढिलो किन'], 'last 12 months': ['최근 12개월', 'पछिल्लो १२ महिना'], 'No late reasons recorded yet': ['아직 기록된 이유 없음', 'कारण अझै लेखिएको छैन'],
  'Asked when a late home pays or on a follow-up call. "Money not come in yet" → move the bill day to when money arrives · "No money this month" → a different talk.': ['밀린 집이 낼 때나 후속 통화 때 물어요. 「돈이 아직 안 들어옴」 → 청구일을 돈 들어오는 날로 옮기기 · 「이번 달 돈 없음」 → 다른 대화가 필요.', 'ढिलो घरले तिर्दा वा फलो-अप कलमा सोधिन्छ। «पैसा अझै आएन» → बिल दिन सार्नुहोस् · «यो महिना पैसा छैन» → अर्कै कुरा।'],
  'Record': ['기록', 'लेख्नुहोस्'], 'Homes left': ['떠난 집', 'छोडेका घर'], 'all time': ['전체 기간', 'सबै समय'], 'Monthly revenue lost': ['잃은 월매출', 'गुमेको मासिक आम्दानी'], 'if none of them had left': ['아무도 안 떠났다면', 'कोही नछोडेको भए'], 'Contract value lost': ['잃은 계약 금액', 'गुमेको सम्झौता रकम'],
  'months left of 36 × price': ['36개월 중 남은 달 × 요금', '३६ मध्ये बाँकी × मूल्य'], 'Months before leaving': ['떠나기까지 개월', 'छोड्नुअघिका महिना'], median: ['중앙값', 'मध्यिका'], 'Main reasons': ['주된 이유', 'मुख्य कारण'], 'by reason (NPR)': ['이유별 (NPR)', 'कारणअनुसार (रु.)'],
  'When they left': ['언제 떠났나', 'कहिले छोडे'], 'months after install': ['설치 후 개월', 'जडानपछिका महिना'], 'Leavers per month': ['월별 해지', 'मासिक छोड्ने'], 'Blue = timing (move the bill day) · red = no money.': ['파랑 = 타이밍 (청구일 옮기기) · 빨강 = 돈 없음.', 'नीलो = समय (बिल दिन सार्नुहोस्) · रातो = पैसा छैन।'],
  '0–3 months': ['0~3개월', '०–३ महिना'], '3–6 months': ['3~6개월', '३–६ महिना'], '6–12 months': ['6~12개월', '६–१२ महिना'], '12–24 months': ['12~24개월', '१२–२४ महिना'], '24+ months': ['24개월+', '२४+ महिना'],
  Capacity: ['기사 용량', 'क्षमता'], 'Field capacity': ['현장 용량', 'फिल्ड क्षमता'], 'jobs vs hands': ['일감 vs 사람', 'काम बनाम मान्छे'], 'Work days': ['근무일', 'काम दिन'], Repairs: ['수리', 'मर्मत'], 'From before': ['밀린 일', 'पहिलेको बाँकी'], Jobs: ['일감', 'काम'], Slots: ['가능 칸', 'स्लट'], Load: ['부하', 'भार'], closed: ['휴무', 'बन्द'],
  'This week by person': ['이번 주 사람별', 'यो हप्ता व्यक्तिअनुसार'], 'No homes due this week': ['이번 주 방문할 집 없음', 'यो हप्ता घर छैन'], 'Assign homes on the Dispatch page. Repairs and installs are not split by person.': ['집 배정은 배정 화면에서. 수리·설치는 사람별로 나누지 않았어요.', 'घर बाँडफाँड पेजमा तोक्नुहोस्। मर्मत र जडान व्यक्तिअनुसार छुट्याइएको छैन।'],
  'People in the field, homes a day, install slots and hiring lead time are in Settings → Field capacity.': ['현장 인원·하루 집 수·설치 칸·채용 기간은 설정 → 현장 용량에서 바꿔요.', 'फिल्ड मान्छे, दिनको घर, जडान स्लट र भर्ना समय सेटिङ → फिल्ड क्षमतामा।'],
  'People doing field work': ['현장 일하는 사람 수', 'फिल्डमा काम गर्ने मान्छे'], 'Homes one person can do a day': ['한 사람이 하루에 도는 집', 'एक जनाले दिनमा गर्ने घर'], '🔴 6 = Coway-style benchmark (rough); 4 is the careful case.': ['🔴 6 = 코웨이식 기준(대략), 4 = 보수적인 경우.', '🔴 ६ = कोवे जस्तो (अनुमान); ४ = सतर्क।'],
  'Visit slots one install takes': ['설치 1건이 먹는 방문 칸', 'एक जडानले लिने स्लट'], 'Weeks to find and train a technician': ['기사 뽑고 가르치는 데 걸리는 주', 'प्राविधिक खोजी र तालिम हप्ता'], 'This week': ['이번 주', 'यो हप्ता'], load: ['부하', 'भार'], 'Busiest week': ['가장 바쁜 주', 'सबैभन्दा व्यस्त हप्ता'], 'next 8': ['앞 8주', 'आउँदा ८'],
  'People in the field': ['현장 인원', 'फिल्डका मान्छे'], 'Hire by': ['채용 시점', 'भर्ना गर्ने'], 'at today’s pace': ['지금 속도로', 'आजको गतिमा'], 'not needed in 12 months': ['12개월 안엔 필요 없음', '१२ महिनाभित्र चाहिँदैन'], 'jobs vs slots': ['일감 vs 칸', 'काम बनाम स्लट'], 'left from before': ['전주에서 밀린 일', 'पहिलेको बाँकी'], 'homes to visit': ['방문할 집', 'भ्रमण गर्ने घर'],
  'slots (red = over)': ['가능 칸 (빨강 = 넘침)', 'स्लट (रातो = बढी)'], '= holidays that week': ['= 그 주 휴일', '= त्यो हप्ताको बिदा'], 'fine for 12 months': ['12개월 괜찮음', '१२ महिना ठीक'],
  Callbacks: ['재고장 (콜백)', 'फेरि बिग्रेको'], 'problems soon after a job': ['작업 직후 생긴 문제', 'कामपछि छिट्टै समस्या'], Who: ['누구', 'को'], Rate: ['비율', 'दर'], 'Last training': ['마지막 교육', 'पछिल्लो तालिम'], 'No jobs in 90 days': ['90일간 작업 없음', '९० दिनमा काम छैन'],
  'Few jobs = the rate jumps around; read it with the numbers next to it. Colours: over 10 % red · over 5 % orange (🔴 first guess).': ['작업이 적으면 비율이 크게 흔들려요 — 옆 숫자와 같이 보세요. 색: 10% 넘으면 빨강 · 5% 넘으면 주황 (🔴 첫 추정).', 'काम थोरै भए दर धेरै हल्लिन्छ; छेउको संख्यासँग हेर्नुहोस्। रङ: १०% माथि रातो · ५% माथि सुन्तला (🔴 अनुमान)।'],
  'No callbacks 🏖️': ['재고장 없음 🏖️', 'फेरि बिग्रेको छैन 🏖️'], 'Callback rate': ['재고장 비율', 'फेरि बिग्रने दर'], '90 days': ['90일', '९० दिन'], 'Days after the job': ['작업 후 며칠', 'कामपछि दिन'], 'short = the job itself': ['짧을수록 작업 자체 문제', 'छोटो = कामकै समस्या'], 'no callbacks yet': ['아직 재고장 없음', 'अझै छैन'],
  'with jobs': ['작업한 사람', 'काम गर्ने'], 'Rate by person': ['사람별 비율', 'व्यक्तिअनुसार दर'], 'Callbacks per month': ['월별 재고장', 'मासिक फेरि बिग्रेको'], 'by job month': ['작업한 달 기준', 'काम गरेको महिना'], 'No jobs yet': ['아직 작업 없음', 'अझै काम छैन'], 'No jobs': ['작업 없음', 'काम छैन'],
  'Callback window — days after a job': ['재고장으로 볼 기간 — 작업 후 며칠', 'कामपछि कति दिनभित्र'],
  Phones: ['폰 상태', 'फोनहरू'], Devices: ['기기', 'उपकरण'], 'Need a look': ['확인 필요', 'हेर्नुपर्ने'], 'Records waiting': ['안 보낸 기록', 'पठाउन बाँकी'], 'on phones, not on the server yet': ['폰에만 있고 서버엔 아직 없음', 'फोनमा छ, सर्भरमा छैन'], Refused: ['거절됨', 'अस्वीकार'],
  "the server said no — see the phone's Status": ['서버가 거절 — 그 폰의 상태 화면 확인', 'सर्भरले मानेन — फोनको स्थिति हेर्नुहोस्'], 'Phones & computers': ['폰 · 컴퓨터', 'फोन र कम्प्युटर'], Device: ['기기', 'उपकरण'], App: ['앱', 'एप'], 'Last opened': ['마지막 실행', 'पछिल्लो पटक खोलेको'], 'Last server contact': ['마지막 서버 연결', 'पछिल्लो सर्भर सम्पर्क'],
  Waiting: ['대기', 'बाँकी'], 'Home-screen app': ['홈 화면 앱', 'होम स्क्रिन एप'], 'Storage protected': ['저장공간 보호', 'भण्डारण सुरक्षित'], Needs: ['필요한 것', 'चाहिने'], reload: ['새로 불러오기', 'फेरि लोड'],
  'No device has reported yet — each phone reports when the app opens.': ['아직 보고한 기기 없음 — 앱을 열면 보고해요.', 'कुनै उपकरणले रिपोर्ट गरेको छैन — एप खोल्दा रिपोर्ट हुन्छ।'],
  'Each phone reports every 10 minutes while the app is open, when the connection comes back, and after sending: only counts, app version and settings — no locations, no record contents. This computer:': ['폰은 앱이 열려 있는 동안 10분마다, 인터넷이 돌아올 때, 전송한 뒤에 보고해요: 개수·앱 버전·설정만 — 위치나 기록 내용은 안 보내요. 이 컴퓨터:', 'एप खुला हुँदा हरेक १० मिनेट, इन्टरनेट फर्कँदा र पठाएपछि फोनले रिपोर्ट गर्छ: संख्या, संस्करण र सेटिङ मात्र — स्थान वा रेकर्ड होइन। यो कम्प्युटर:'],
  'old app version — open it on Wi-Fi to update': ['옛 앱 버전 — 와이파이에서 열어 업데이트', 'पुरानो संस्करण — Wi-Fi मा खोलेर अपडेट'], 'storage not protected — Status → Protect phone storage': ['저장공간 보호 꺼짐 — 상태 → 폰 저장공간 보호', 'भण्डारण असुरक्षित — स्थिति → फोन भण्डारण सुरक्षित'],
  'opened in Safari, not the home-screen app': ['홈 화면 앱이 아니라 사파리로 엶', 'होम स्क्रिन एप होइन, Safari बाट खोलियो'], 'phone storage failing': ['폰 저장 실패', 'फोन भण्डारण असफल'],
  'last call': ['마지막 통화', 'पछिल्लो कल'], 'Last call': ['마지막 통화', 'पछिल्लो कल'], 'Purified TDS up 30': ['정수 TDS 30 이상 오름', 'सफा पानीको TDS ३०+ बढ्यो'], dispatch: ['배정', 'बाँडफाँड'], watch: ['챙길 집', 'ध्यान दिनुपर्ने घर'], Open: ['열기', 'खोल्नुहोस्'], 'Checked — hidden for 7 days unless it gets worse': ['확인함 — 나빠지지 않으면 7일 숨겨요', 'जाँचियो — नबिग्रे ७ दिन लुकाइयो'], 'Follow-up call': ['후속 통화', 'फलो-अप कल'], paused: ['일시정지', 'रोकिएको'], 'contract ended — renew': ['계약 끝남 — 재계약', 'सम्झौता सकियो — नवीकरण'],
};
for (const [k, v] of Object.entries(W8)) W[k] = v;
const P8 = [
  [/^(\d+) pts$/, '$1점', '$1 अंक'], [/^(\d+) people$/, '$1명', '$1 जना'], [/^Phones & computers · (\d+)$/, '폰 · 컴퓨터 · $1', 'फोन र कम्प्युटर · $1'], [/^(\d+) refused by the server$/, '서버가 $1건 거절', 'सर्भरले $1 अस्वीकार'],
  [/^(\d+) waiting for (\d+) days$/, '$1건이 $2일째 대기', '$1 वटा $2 दिनदेखि बाँकी'], [/^(\d+) waiting to send$/, '$1건 전송 대기', '$1 पठाउन बाँकी'], [/^not opened for (\d+) days$/, '$1일째 안 엶', '$1 दिनदेखि खोलेको छैन'], [/^Could not load: (.+) — publish rules v0\.8 first\.$/, '불러오기 실패: $1 — 먼저 규칙 v0.8을 게시하세요.', 'लोड भएन: $1 — पहिले नियम v0.8 प्रकाशित गर्नुहोस्।'], [/^Callbacks · (\d+)$/, '재고장 · $1', 'फेरि बिग्रेको · $1'], [/^(\d+) of (\d+) jobs$/, '작업 $2건 중 $1건', '$2 मध्ये $1 काम'], [/^within (\d+) days of a job$/, '작업 후 $1일 안', 'कामपछि $1 दिनभित्र'],
  [/^(\d+) days after (.+) on (\S+) by (.+)$/, (m) => `${m[3]} ${T(m[2])} 뒤 ${m[1]}일 · ${m[4]}`, (m) => `${m[3]} ${T(m[2])} पछि ${m[1]} दिन · ${m[4]}`], [/^Callbacks · 90 days · (.+)$/, '재고장 · 90일 · $1', 'फेरि बिग्रेको · ९० दिन · $1'],
  [/^A breakdown, leak or water-quality request within (\d+) days after a visit or install at the same home counts against whoever did that job\. Last 90 days of jobs\.$/, '방문·설치 뒤 $1일 안에 같은 집에서 고장·누수·수질 요청이 오면 그 작업을 한 사람 앞으로 셉니다. 최근 90일 작업 기준.', 'भ्रमण वा जडानपछि $1 दिनभित्र सोही घरबाट बिग्रिएको, चुहिएको वा पानीको गुण अनुरोध आए त्यो काम गर्नेको नाममा गनिन्छ। पछिल्लो ९० दिन।'], [/^(\d+) holidays?$/, '휴일 $1일', '$1 बिदा'], [/^(\d+) homes · (\d+) slots$/, '$1집 · $2칸', '$1 घर · $2 स्लट'], [/^(\d+) jobs · (\d+) slots$/, '일감 $1 · 칸 $2', '$1 काम · $2 स्लट'], [/^(\d+) homes a day each$/, '한 사람 하루 $1집', 'हरेक दिनको $1 घर'],
  [/^installs \(× (\d+) slots\)$/, '설치 (× $1칸)', 'जडान (× $1 स्लट)'], [/^Next (\d+) weeks$/, '앞으로 $1주', 'आउँदा $1 हप्ता'], [/^≈ (\d+) jobs still waiting after week (\d+)\.$/, '$2주 뒤에도 일감 약 $1건이 남아요.', '$2 हप्तापछि पनि करिब $1 काम बाँकी।'],
  [/^busy from (.+) · (\d+) weeks to hire & train$/, (m) => `${T(m[1])}부터 바쁨 · 뽑고 가르치는 데 ${m[2]}주`, (m) => `${T(m[1])} देखि व्यस्त · भर्ना र तालिम ${m[2]} हप्ता`], [/^with one more: busy again (.+)$/, (m) => `한 명 더 있으면: ${T(m[1])}에 다시 바쁨`, (m) => `एक थप भए: ${T(m[1])} मा फेरि व्यस्त`], [/^with one more: fine for 12 months$/, '한 명 더 있으면: 12개월 괜찮음', 'एक थप भए: १२ महिना ठीक'],
  [/^Week of (\S+): (\d+) jobs for (\d+) slots — move visits or add hands$/, '$1 주: 일감 $2건에 칸 $3개 — 방문을 옮기거나 사람을 늘리세요', '$1 हप्ता: $2 काम, $3 स्लट — भ्रमण सार्नुहोस् वा मान्छे थप्नुहोस्'],
  [/^Next (\d+) weeks: homes to visit \+ repairs \+ installs, against (\d+) (?:person|people) × (\d+) homes a day × working days \(Saturdays and closed days off\)\. One install ≈ (\d+) visit slots\.$/, '앞 $1주: 방문할 집 + 수리 + 설치를 $2명 × 하루 $3집 × 근무일(토요일·휴무일 제외)과 비교해요. 설치 1건 ≈ 방문 $4칸.', 'आउँदा $1 हप्ता: भ्रमण + मर्मत + जडान, $2 जना × दिनमा $3 घर × काम दिनसँग। एक जडान ≈ $4 स्लट।'], [/^(\d+) this month$/, '이번 달 $1', 'यो महिना $1'], [/^(\d+) of (\d+) with a reason$/, '$2곳 중 $1곳 이유 있음', '$2 मध्ये $1 कारणसहित'], [/^(\d+) mo avg$/, '평균 $1개월', 'औसत $1 महिना'], [/^left (\S+) · (\d+) months$/, '$1 해지 · $2개월', '$1 छोडे · $2 महिना'],
  [/^(\d+) leaver\(s\) without a recovery case$/, '회수 건 없는 해지 $1곳', 'फिर्ता केस नभएका $1 छोड्ने'], [/^— no reason recorded, device and deposit not tracked\.$/, '— 이유도 없고 기기·보증금도 추적 안 돼요.', '— कारण छैन, उपकरण र धरौटी ट्र्याक छैन।'],
  [/^Order (\w+) filters by (\S+)( \(late\))? — stock runs out around (\S+)$/, (m) => `${m[1]} 필터 ${m[2]}까지 주문${m[3] ? ' (늦음)' : ''} — ${m[4]}쯤 다 떨어져요`, (m) => `${m[1]} फिल्टर ${m[2]} सम्म अर्डर${m[3] ? ' (ढिलो)' : ''} — ${m[4]} तिर सकिन्छ`],
  [/^Order (\w+) filters$/, '$1 필터 주문', '$1 फिल्टर अर्डर'], [/^about (\d+)$/, '약 $1개', 'करिब $1'], [/^runs out around (\S+)$/, '$1쯤 다 떨어짐', '$1 तिर सकिन्छ'],
  [/^order (\w+) now$/, '$1 지금 주문', '$1 अहिले अर्डर'], [/^order (\w+) by (\S+)$/, '$1 주문 마감 $2', '$1 अर्डर $2 सम्म'], [/^(\w+) out ~(\S+)$/, '$1 소진 ~$2', '$1 सकिने ~$2'], [/^next order: (\w+) by (\S+)$/, '다음 주문: $1 · $2까지', 'अर्को अर्डर: $1 · $2 सम्म'],
  [/^Stock minus every home's filter changes \(booking intervals\) and new homes at ([\d.]+) a week\. Order-by = runs out − (\d+) weeks lead time − (\d+) weeks safety\. Quantity covers (\d+) months after arrival\. 🔴 Lead time is a guess until a real filter order has come in\.$/, '재고에서 모든 집의 필터 교체(예약 주기)와 주 $1집씩 늘어나는 새 집을 빼서 계산해요. 주문 마감 = 다 떨어지는 날 − 리드타임 $2주 − 여유 $3주. 주문량은 도착 뒤 $4개월 치. 🔴 리드타임은 실제 필터 주문 전까진 추정값이에요.', 'मौज्दातबाट हरेक घरको फिल्टर फेराइ र हप्तामा $1 नयाँ घर घटाइन्छ। अर्डर मिति = सकिने दिन − $2 हप्ता लिड − $3 हप्ता सुरक्षा। मात्रा = आगमनपछि $4 महिना। 🔴 लिड टाइम अनुमान हो।'], [/^(\d+)\+ points$/, '$1점 이상', '$1+ अंक'], [/^(\d+)–(\d+) points$/, '$1~$2점', '$1–$2 अंक'],
  [/^(\d+) days late · (NPR [\d,]+)$/, '$1일 밀림 · $2', '$1 दिन ढिलो · $2'], [/^late on (\d+) of the last (\d+) bills$/, '최근 청구 $2번 중 $1번 늦음', 'पछिल्ला $2 मध्ये $1 बिल ढिलो'],
  [/^open requests?: ([^·]+?)(?: · waiting (\d+) days)?$/, (m) => `안 끝난 요청: ${m[1].split(', ').map((x) => T(x)).join(', ')}${m[2] ? ` · ${m[2]}일째 대기` : ''}`, (m) => `खुला अनुरोध: ${m[1].split(', ').map((x) => T(x)).join(', ')}${m[2] ? ` · ${m[2]} दिनदेखि` : ''}`],
  [/^(\d+) problems in (\d+) days$/, '$2일 안에 문제 $1번', '$2 दिनमा $1 समस्या'], [/^last call: issue found \((\S+)\)$/, '마지막 통화: 문제 있음 ($1)', 'पछिल्लो कल: समस्या ($1)'], [/^last call: (★+) unhappy$/, '마지막 통화: $1 불만', 'पछिल्लो कल: $1 असन्तुष्ट'], [/^last call: (★+)$/, '마지막 통화: $1', 'पछिल्लो कल: $1'],
  [/^purified TDS up (\d+) → (\d+)$/, '정수 TDS $1 → $2로 오름', 'सफा TDS $1 → $2 बढ्यो'], [/^(\d+) visits? cancelled or on hold$/, '방문 $1번 취소·보류', '$1 भ्रमण रद्द वा रोकियो'], [/^visit (\d+) days late$/, '방문 $1일 밀림', 'भ्रमण $1 दिन ढिलो'],
  [/^filter overdue: (.+)$/, '필터 교체 밀림: $1', 'फिल्टर ढिलो: $1'], [/^first 90 days \(day (\d+)\)$/, '첫 90일 ($1일째)', 'पहिलो ९० दिन ($1 औं दिन)'], [/^((?:D\d+|Q)(?:, (?:D\d+|Q))*) call overdue$/, '$1 통화 밀림', '$1 कल ढिलो'],
  [/^moving(?: (\S+))?$/, (m) => `이사 예정${m[1] ? ' ' + m[1] : ''}`, (m) => `सर्दै${m[1] ? ' ' + m[1] : ''}`], [/^pause ended (\S+) — restart\?$/, '일시정지 끝남 $1 — 다시 시작?', 'रोक सकियो $1 — फेरि सुरु?'],
  [/^(\d+) home\(s\) to look after this week$/, '이번 주 챙길 집 $1곳', 'यो हप्ता हेर्नुपर्ने $1 घर'], [/^(\d+) checked this week$/, '이번 주 $1곳 확인함', 'यो हप्ता $1 जाँचियो'], [/^Homes · (\d+)$/, '집 · $1', 'घर · $1'],
];
P.unshift(...P8);
// v0.8 security: change log (2026-09-29)
Object.assign(W, {
  'Change log': ['변경 기록', 'परिवर्तन लग'], Changes: ['변경', 'परिवर्तन'], 'edits of saved records': ['저장된 기록을 고친 것', 'सेभ भएका रेकर्डको सम्पादन'], 'Money & status': ['돈 · 상태', 'पैसा र स्थिति'], 'amount · discount · refund · status · rights': ['금액 · 할인 · 환불 · 상태 · 권한', 'रकम · छुट · फिर्ता · स्थिति · अधिकार'],
  'Last change': ['마지막 변경', 'पछिल्लो परिवर्तन'], Everything: ['전체', 'सबै'], Everyone: ['모두', 'सबैजना'], Changed: ['바뀐 것', 'परिवर्तन भएको'], '🕵️ Changes to this home': ['🕵️ 이 집 기록 변경', '🕵️ यो घरका परिवर्तन'], 'Changes to this home': ['이 집 기록 변경', 'यो घरका परिवर्तन'],
  'No edits yet — new records are not listed, only changes to saved ones.': ['아직 고친 기록 없음 — 새 기록은 안 나오고 저장된 기록을 고친 것만 나와요.', 'अझै सम्पादन छैन — नयाँ रेकर्ड होइन, सेभ भएकाको परिवर्तन मात्र देखिन्छ।'],
  'Every edit of a saved record (and of Settings) writes one entry: who, when, and each field before → after. Entries cannot be changed or deleted (rules v0.8), and only you can read them. New records are not listed — they carry who made them.': ['저장된 기록(설정 포함)을 고칠 때마다 한 줄이 남아요: 누가, 언제, 칸마다 전 → 후. 이 기록은 고치거나 지울 수 없고(규칙 v0.8) 관리자만 봐요. 새 기록은 안 나와요 — 누가 만들었는지는 기록 자체에 있어요.', 'सेभ भएको रेकर्ड (र सेटिङ) सम्पादन गर्दा एक लाइन बस्छ: को, कहिले, हरेक फिल्ड अघि → पछि। यो बदल्न वा मेटाउन मिल्दैन (नियम v0.8) र एडमिनले मात्र हेर्छ। नयाँ रेकर्ड देखिँदैन।'],
});
P.unshift([/^Change log · (\d+)$/, '변경 기록 · $1', 'परिवर्तन लग · $1']);
// v0.8 #12 money approvals (2026-09-29)
Object.assign(W, {
  'Money approvals': ['돈 작업 승인', 'पैसा स्वीकृति'], 'discounts · refunds': ['할인 · 환불', 'छुट · फिर्ता'], 'Decided · last 30': ['결정됨 · 최근 30건', 'निर्णय भयो · पछिल्ला ३०'], 'Nothing waiting 🏖️': ['기다리는 것 없음 🏖️', 'केही बाँकी छैन 🏖️'], 'Nothing yet': ['아직 없음', 'अझै छैन'],
  '✓ OK': ['✓ 승인', '✓ ठीक'], '✕ No': ['✕ 거절', '✕ होइन'], Waiting: ['대기', 'बाँकी'], Approved: ['승인됨', 'स्वीकृत'], 'Not approved': ['거절됨', 'अस्वीकृत'], '✓ Approved': ['✓ 승인했어요', '✓ स्वीकृत'], '✕ Not approved': ['✕ 거절했어요', '✕ अस्वीकृत'],
  'Only an approver can do this': ['승인 권한이 있는 사람만 할 수 있어요', 'स्वीकृति दिन मिल्नेले मात्र'], 'Someone else has to OK your own': ['내가 올린 건 다른 사람이 승인해야 해요', 'आफ्नै कुरा अरूले स्वीकृत गर्नुपर्छ'],
  'A discount or a deposit refund above these amounts waits for an OK; until then it does not count. 0 = every one needs an OK. 🔴 First guesses — set your own.': ['이 금액을 넘는 할인·보증금 환불은 승인을 기다려요. 승인 전엔 반영 안 돼요. 0 = 전부 승인 필요. 🔴 첫 추정 — 직접 정하세요.', 'यो रकमभन्दा बढी छुट वा धरौटी फिर्ता स्वीकृति पर्खन्छ; त्यसअघि गनिँदैन। ० = सबैलाई स्वीकृति चाहिन्छ। 🔴 पहिलो अनुमान — आफैं तोक्नुहोस्।'],
  'Discount needs an OK above (NPR)': ['할인 승인 필요 기준 (NPR 초과)', 'यति (रु.) भन्दा बढी छुटमा स्वीकृति'], 'Deposit refund needs an OK above (NPR)': ['보증금 환불 승인 필요 기준 (NPR 초과)', 'यति (रु.) भन्दा बढी धरौटी फिर्तामा स्वीकृति'], 'Who can give the OK': ['누가 승인하나', 'कसले स्वीकृति दिने'],
  'Admin only': ['관리자(Jun)만', 'एडमिन मात्र'], 'Admin or money right': ['관리자 또는 돈 권한', 'एडमिन वा पैसाको अधिकार'],
});
P.unshift(
  [/^(\d+) money action\(s\) wait for your OK$/, '승인 기다리는 돈 작업 $1건', 'तपाईंको स्वीकृति पर्खिरहेका $1 पैसा काम'], [/^(\d+) of your money action\(s\) wait for an OK$/, '내가 올린 돈 작업 $1건이 승인 대기', 'तपाईंका $1 पैसा काम स्वीकृति पर्खिरहेका'],
  [/^Waiting · (\d+)$/, '대기 · $1', 'बाँकी · $1'], [/^(\d+) waiting$/, '$1건 대기', '$1 बाँकी'], [/^Money approvals · (\d+) waiting$/, '돈 작업 승인 · $1건 대기', 'पैसा स्वीकृति · $1 बाँकी'],
  [/^Discount (NPR [\d,]+)$/, '할인 $1', 'छुट $1'], [/^Deposit refund (NPR [\d,]+)$/, '보증금 환불 $1', 'धरौटी फिर्ता $1'], [/^Discount ([\d,]+)$/, '할인 $1', 'छुट $1'], [/^Deposit refund ([\d,]+)$/, '보증금 환불 $1', 'धरौटी फिर्ता $1'],
  [/^(Approved|Not approved) by (.+?) (\S*)$/, (m) => `${m[1] === 'Approved' ? '승인' : '거절'}: ${m[2]} ${m[3]}`, (m) => `${m[1] === 'Approved' ? 'स्वीकृत' : 'अस्वीकृत'}: ${m[2]} ${m[3]}`],
  [/^Discount (NPR [\d,]+) sent for an OK — it counts once approved$/, '할인 $1 승인 요청함 — 승인되면 반영돼요', 'छुट $1 स्वीकृतिका लागि पठाइयो — स्वीकृत भएपछि गनिन्छ'], [/^Deposit refund (NPR [\d,]+) sent for an OK — pay it out only after the OK$/, '보증금 환불 $1 승인 요청함 — 승인 뒤에만 내주세요', 'धरौटी फिर्ता $1 स्वीकृतिका लागि पठाइयो — स्वीकृतिपछि मात्र दिनुहोस्'],
  [/^(\d+) \(every discount\)$/, '$1 (모든 할인)', '$1 (सबै छुट)'], [/^(\d+) \(every refund\)$/, '$1 (모든 환불)', '$1 (सबै फिर्ता)'],
  [/^Rules \(Settings → Money approvals · 🔴 first guesses\): discount over (NPR [\d,]+) and deposit refund over (NPR [\d,]+) need an OK from (.+)\. Until then the discount does not reduce the bill and the refund does not leave the deposit book\.$/, (m) => `규칙 (설정 → 돈 작업 승인 · 🔴 첫 추정): ${m[1]} 넘는 할인과 ${m[2]} 넘는 보증금 환불은 ${m[3] === 'Jun (admin)' ? 'Jun(관리자)' : 'Jun 또는 돈 권한 있는 사람'}의 승인이 필요해요. 승인 전엔 할인이 청구를 줄이지 않고 환불도 보증금 장부에서 빠지지 않아요.`, (m) => `नियम (सेटिङ → पैसा स्वीकृति · 🔴 पहिलो अनुमान): ${m[1]} भन्दा बढी छुट र ${m[2]} भन्दा बढी धरौटी फिर्तामा ${m[3] === 'Jun (admin)' ? 'Jun (एडमिन)' : 'Jun वा पैसाको अधिकार भएको व्यक्ति'} को स्वीकृति चाहिन्छ। त्यसअघि छुटले बिल घटाउँदैन र फिर्ता धरौटी खाताबाट निस्किँदैन।`],
);
// v0.8 #10 grant KPIs · PAYGo PERFORM (2026-09-29) — KPI names stay close to CGAP's English so a grant officer recognises them
Object.assign(W, {
  'Grant KPIs': ['그랜트 KPI', 'अनुदान KPI'], 'PAYGo PERFORM': ['PAYGo PERFORM', 'PAYGo PERFORM'], 'Grant KPIs (PAYGo PERFORM)': ['그랜트 KPI (PAYGo PERFORM)', 'अनुदान KPI (PAYGo PERFORM)'],
  'The industry KPI set of CGAP · GOGLA · IFC ("PAYGo PERFORM KPIs: Definitions at a Glance"), counted from our records. KORA is a rental, so each line says how we read it: 🟢 CGAP formula on our records · 🟡 CGAP formula on a KORA reading · 🔴 approximation · n/a does not apply.': ['CGAP · GOGLA · IFC 업계 표준 KPI(「PAYGo PERFORM KPIs: Definitions at a Glance」)를 우리 기록으로 셌어요. KORA는 렌탈이라 줄마다 읽은 방법을 적었어요: 🟢 우리 기록에 CGAP 공식 그대로 · 🟡 CGAP 공식을 KORA식으로 읽음 · 🔴 근사치 · n/a 해당 없음.', 'CGAP · GOGLA · IFC को उद्योग KPI («PAYGo PERFORM KPIs: Definitions at a Glance»), हाम्रो रेकर्डबाट। KORA भाडा मोडेल हो, त्यसैले हरेक लाइनमा कसरी गनियो लेखिएको छ: 🟢 CGAP सूत्र हाम्रो रेकर्डमा · 🟡 KORA अनुसार पढिएको · 🔴 अनुमान · n/a लागू हुँदैन।'],
  'Last month': ['지난달', 'गत महिना'], 'Last 3 months': ['최근 3개월', 'पछिल्लो ३ महिना'], 'Last 12 months': ['최근 12개월', 'पछिल्लो १२ महिना'], 'This Nepali fiscal year': ['이번 네팔 회계연도', 'यो नेपाली आर्थिक वर्ष'], 'This month so far': ['이번 달 지금까지', 'यो महिना अहिलेसम्म'],
  'Portfolio quality': ['포트폴리오 품질', 'पोर्टफोलियो गुणस्तर'], Financial: ['재무', 'वित्तीय'], Unit: ['대당', 'प्रति इकाइ'], Company: ['회사', 'कम्पनी'], Operational: ['운영', 'सञ्चालन'],
  KPI: ['KPI', 'KPI'], Value: ['값', 'मान'], Grade: ['등급', 'स्तर'], 'How we count it': ['세는 방법', 'कसरी गनियो'],
  'Outstanding receivables': ['미수 채권 (남은 계약 청구액)', 'बाँकी प्राप्य'], 'Collection rate': ['수금률', 'असुली दर'], 'Receivables at risk · >30 days unpaid': ['위험 채권 · 30일 넘게 미납', 'जोखिममा प्राप्य · ३० दिनभन्दा बढी नतिरेको'], 'Receivables at risk · >90 days unpaid': ['위험 채권 · 90일 넘게 미납', 'जोखिममा प्राप्य · ९० दिनभन्दा बढी'], 'Receivables at risk · >180 days unpaid': ['위험 채권 · 180일 넘게 미납', 'जोखिममा प्राप्य · १८० दिनभन्दा बढी'],
  'Receivables at risk · collection rate <70 % since install': ['위험 채권 · 설치 후 수금률 70% 미만', 'जोखिममा प्राप्य · जडानदेखि असुली <७०%'], 'Receivables at risk · collection rate <50 % since install': ['위험 채권 · 설치 후 수금률 50% 미만', 'जोखिममा प्राप्य · जडानदेखि असुली <५०%'],
  'Write-off ratio': ['대손 비율', 'अपलेखन अनुपात'], 'Repossession ratio': ['기기 회수 비율', 'फिर्ता लिएको अनुपात'], 'Contractual credit period': ['계약 기간', 'सम्झौता अवधि'], 'Effective credit period': ['실제 상환 기간', 'वास्तविक भुक्तानी अवधि'],
  'Total cash receipts from customers': ['고객에게 받은 현금 합계', 'ग्राहकबाट जम्मा नगद'], 'Cost of goods sold ratio': ['매출원가 비율', 'बिक्री लागत अनुपात'], 'Sales and maintenance cost ratio': ['판매·유지보수 비용 비율', 'बिक्री र मर्मत लागत अनुपात'], 'Total contribution margin': ['총 공헌이익률', 'कुल योगदान मार्जिन'],
  'Financial expense ratio': ['금융비용 비율', 'वित्तीय खर्च अनुपात'], 'Fixed cost ratio': ['고정비 비율', 'स्थिर लागत अनुपात'], 'Total EBT margin': ['세전 이익률', 'करअघिको मार्जिन'], 'Unit customer deposit': ['대당 첫 결제 (선납금)', 'प्रति इकाइ सुरु भुक्तानी'], 'Unit follow-on payments': ['대당 이후 청구액', 'प्रति इकाइ पछिका भुक्तानी'],
  'Average selling price (contract value)': ['평균 판매가 (계약 금액)', 'औसत बिक्री मूल्य (सम्झौता रकम)'], 'Unit device cost': ['대당 기기 원가', 'प्रति इकाइ उपकरण लागत'], 'Total net sales (units)': ['순판매 (대)', 'कुल खुद बिक्री (इकाइ)'], 'Repeat sales': ['재구매 (재가입)', 'दोहोरिएको बिक्री'],
  'Sales distribution · B2B': ['판매 구분 · B2B', 'बिक्री वितरण · B2B'], 'Sales model · subscription (PAYGo-like)': ['판매 모델 · 구독 (PAYGo형)', 'बिक्री मोडेल · सदस्यता (PAYGo जस्तो)'], 'Country sales · Nepal': ['국가별 판매 · 네팔', 'देशअनुसार बिक्री · नेपाल'], 'Net Promoter Score': ['순추천지수 (NPS)', 'नेट प्रमोटर स्कोर'], 'Sales points rate': ['판매 거점 비율', 'बिक्री केन्द्र दर'], Liquidity: ['유동성', 'तरलता'],
  'Active homes: unpaid bills + bills still to come until month 36 (VAT incl.). As of today.': ['이용 중인 집: 안 낸 청구 + 36개월까지 남은 청구 (VAT 포함). 오늘 기준.', 'सक्रिय घर: नतिरेका बिल + ३६ औं महिनासम्म आउने बिल (VAT सहित)। आजसम्म।'],
  'Outstanding receivables of homes whose oldest unpaid bill is over 30 days old ÷ all outstanding receivables. As of today.': ['가장 오래된 미납 청구가 30일 넘은 집의 미수 채권 ÷ 전체 미수 채권. 오늘 기준.', 'सबैभन्दा पुरानो नतिरेको बिल ३० दिनभन्दा पुरानो भएका घरको प्राप्य ÷ सबै प्राप्य। आजसम्म।'],
  'Same with 90 days.': ['90일로 같은 계산.', '९० दिनमा उही।'], 'Same with 180 days.': ['180일로 같은 계산.', '१८० दिनमा उही।'], 'Homes that paid under 70 % of their bills 2+ so far.': ['지금까지 2회차부터의 청구를 70% 미만 낸 집.', 'अहिलेसम्म बिल २+ को ७०% भन्दा कम तिरेका घर।'], 'Homes that paid under 50 % of their bills 2+ so far.': ['지금까지 2회차부터의 청구를 50% 미만 낸 집.', 'अहिलेसम्म बिल २+ को ५०% भन्दा कम तिरेका घर।'],
  'Does not apply: a rental is never "paid off" — the device stays KORA\'s.': ['해당 없음: 렌탈이라 「다 갚는」 시점이 없어요 — 기기는 KORA 소유.', 'लागू हुँदैन: भाडामा «तिरिसकेको» हुँदैन — उपकरण KORA कै।'],
  '(Cash receipts − goods − sales − servicing − other variable costs) ÷ cash receipts.': ['(받은 현금 − 원가 − 판매 − 서비스 − 기타 변동비) ÷ 받은 현금.', '(नगद − सामान − बिक्री − सेवा − अन्य परिवर्ती लागत) ÷ नगद।'], 'No loans → 0 (bank fees are counted as a variable cost).': ['대출 없음 → 0 (은행 수수료는 변동비로 셈).', 'ऋण छैन → ० (बैंक शुल्क परिवर्ती लागतमा)।'],
  'Every other expense (salaries, rent, phone, software, fees, …) ÷ cash receipts.': ['나머지 모든 지출 (급여·임대료·전화·소프트웨어·수수료 …) ÷ 받은 현금.', 'बाँकी सबै खर्च (तलब, भाडा, फोन, सफ्टवेयर, शुल्क …) ÷ नगद।'], '(Cash receipts − all expenses paid) ÷ cash receipts. Cash basis, before tax.': ['(받은 현금 − 낸 모든 지출) ÷ 받은 현금. 현금 기준, 세전.', '(नगद − तिरेका सबै खर्च) ÷ नगद। नगद आधार, करअघि।'],
  'Day-1 payment in the contract (includes month 1).': ['계약상 첫날 결제 (1개월 요금 포함).', 'सम्झौताको पहिलो दिनको भुक्तानी (पहिलो महिना सहित)।'], 'Day-1 payment + follow-on payments of one contract.': ['계약 하나의 첫날 결제 + 이후 청구액.', 'एक सम्झौताको पहिलो भुक्तानी + पछिका भुक्तानी।'],
  'Share of installs that are former customers coming back (same phone). Every home has the same price, so units = revenue share.': ['설치 중 예전 고객이 돌아온 비율 (같은 전화번호). 모든 집 가격이 같아서 대수 비율 = 매출 비율.', 'फर्किएका पुराना ग्राहकको हिस्सा (उही फोन)। सबै घरको मूल्य उही, त्यसैले इकाइ = आम्दानी हिस्सा।'],
  'Installs with a buyer PAN (businesses) ÷ all installs; the rest is B2C.': ['구매자 PAN이 있는 설치 (사업체) ÷ 전체 설치. 나머지는 B2C.', 'खरिदकर्ता PAN भएका जडान (व्यवसाय) ÷ सबै जडान; बाँकी B2C।'], 'Every home is on the monthly contract — no cash sales.': ['모든 집이 월 계약 — 현금 판매 없음.', 'सबै घर मासिक सम्झौतामा — नगद बिक्री छैन।'], 'Pokhara only.': ['포카라만.', 'पोखरा मात्र।'],
  'No 0–10 answers yet — ask it on the check-in call ("How likely to recommend KORA to family or friends?").': ['아직 0~10 답이 없어요 — 확인 통화 때 물어보세요 (「가족이나 친구에게 KORA를 추천할 가능성은?」).', 'अझै ०–१० जवाफ छैन — चेक-इन कलमा सोध्नुहोस् («परिवार वा साथीलाई KORA सिफारिस गर्ने सम्भावना?»)।'],
  'Does not apply: no agent or shop network.': ['해당 없음: 대리점·가게 판매망 없음.', 'लागू हुँदैन: एजेन्ट वा पसल सञ्जाल छैन।'], 'Needs the bank balance — not in the app.': ['은행 잔고가 필요해요 — 앱에 없음.', 'बैंक मौज्दात चाहिन्छ — एपमा छैन।'],
  'Installs by channel': ['경로별 설치', 'माध्यमअनुसार जडान'], 'none — has left': ['없음 — 해지함', 'छैन — छोडिसके'], 'No more bills — has left': ['더 청구 없음 — 해지함', 'थप बिल छैन — छोडिसके'], 'Paid ahead after leaving': ['해지 뒤 미리 낸 돈', 'छोडेपछिको अग्रिम भुक्तानी'], 'no bills 2–36 due in this period': ['이 기간에 2~36회차 청구 없음', 'यो अवधिमा बिल २–३६ छैन'], 'nothing outstanding': ['미수 채권 없음', 'बाँकी प्राप्य छैन'], 'empty bar = no bills due that month': ['빈 막대 = 그 달 청구 없음', 'खाली पट्टी = त्यो महिना बिल छैन'], 'Mark it on the charts?': ['차트에 표시할까요?', 'चार्टमा देखाउने?'], 'Empty = price changes, campaigns, demos / events and stock arrivals are marked on the time charts; other kinds are not.': ['비우면 = 가격 변경·캠페인·시연/행사·입고는 시간 차트에 표시, 나머지는 표시 안 함.', 'खाली = मूल्य परिवर्तन, अभियान, डेमो/कार्यक्रम र स्टक आगमन चार्टमा देखिन्छ; अरू देखिँदैन।'], 'Price change': ['가격 변경', 'मूल्य परिवर्तन'], Campaign: ['캠페인', 'अभियान'], 'Prices set by the contract: day 1 4,900 · bills 2–13 1,400 · then 1,100': ['계약으로 가격 확정: 첫날 4,900 · 2~13회차 1,400 · 그 뒤 1,100', 'सम्झौताले मूल्य तोकियो: पहिलो दिन ४,९०० · बिल २–१३ मा १,४०० · त्यसपछि १,१००'], 'No installs in the period': ['기간 안 설치 없음', 'अवधिमा जडान छैन'], '⬇️ KPI table (CSV) for the grant report': ['⬇️ 그랜트 보고용 KPI 표 (CSV)', '⬇️ अनुदान रिपोर्टका लागि KPI तालिका (CSV)'],
  'How likely to recommend KORA to family or friends? (0–10)': ['가족이나 친구에게 KORA를 추천할 가능성은? (0~10)', 'परिवार वा साथीलाई KORA सिफारिस गर्ने सम्भावना कति? (०–१०)'], 'Ask it word for word — grant reports use this score (NPS). Skip if you did not ask.': ['문장 그대로 물어보세요 — 그랜트 보고에 이 점수(NPS)를 써요. 안 물었으면 비워 두세요.', 'शब्दशः सोध्नुहोस् — अनुदान रिपोर्टमा यो स्कोर (NPS) प्रयोग हुन्छ। नसोधे खाली छोड्नुहोस्।'],
  period: ['기간', 'अवधि'], 'share of outstanding': ['미수 채권 중 비율', 'बाँकी प्राप्यको हिस्सा'], 'each month · %': ['달마다 · %', 'हरेक महिना · %'], 'Cash receipts': ['받은 현금', 'नगद प्राप्ति'], 'Receivables at risk': ['위험 채권', 'जोखिममा प्राप्य'], '>30 days unpaid': ['30일 넘게 미납', '३० दिनभन्दा बढी नतिरेको'], '>90 days': ['90일 넘게', '९० दिनभन्दा बढी'], '>180 days': ['180일 넘게', '१८० दिनभन्दा बढी'],
  'paid <70 % since install': ['설치 후 70% 미만 납부', 'जडानदेखि <७०% तिरेको'], 'paid <50 %': ['50% 미만 납부', '<५०% तिरेको'], '>30 days': ['30일 넘게', '३० दिनभन्दा बढी'], 'no 0–10 answers yet': ['아직 0~10 답 없음', 'अझै ०–१० जवाफ छैन'],
  'CGAP key thresholds: 30 days unpaid and under 50 % paid since activation. The two overlap — do not add them up.': ['CGAP 핵심 기준: 30일 미납, 개통 후 50% 미만 납부. 둘이 겹치니 더하지 마세요.', 'CGAP मुख्य सीमा: ३० दिन नतिरेको र सुरुदेखि ५०% भन्दा कम तिरेको। दुवै खप्टिन्छन् — नजोड्नुहोस्।'],
});
P.unshift(
  [/^Cash for bills 2–36 received in the period ÷ bills 2–36 due in the period \(day-1 4,900 left out, as CGAP leaves out deposits; free referral months left out of both\)\. ([\d,]+) ÷ ([\d,]+)\.$/, '기간 안에 받은 2~36회차 현금 ÷ 기간 안에 도래한 2~36회차 청구 (첫날 4,900은 뺌 — CGAP도 선납금을 뺌. 추천 무료달은 양쪽에서 뺌). $1 ÷ $2.', 'अवधिमा पाएको बिल २–३६ को नगद ÷ अवधिमा पर्ने बिल २–३६ (पहिलो दिनको ४,९०० बाहेक; रेफरल निःशुल्क महिना दुवैतिर बाहेक)। $1 ÷ $2।'],
  [/^Homes that left in the period without the device coming back \((\d+)\): unpaid \+ contract left at leaving ÷ outstanding receivables today \((.+) CGAP uses the period average\)\.$/, '기간 안에 기기 회수 없이 떠난 집 ($1): 미납 + 떠날 때 남은 계약 ÷ 오늘 미수 채권 ($2 CGAP는 기간 평균을 씀).', 'अवधिमा उपकरण फिर्ता नभई छोडेका घर ($1): नतिरेको + छोड्दा बाँकी सम्झौता ÷ आजको प्राप्य ($2 CGAP ले अवधि औसत प्रयोग गर्छ)।'],
  [/^Homes that left in the period with the device back \((\d+)\): unpaid \+ contract left at leaving ÷ outstanding receivables today \((.+) period average in CGAP\)\.$/, '기간 안에 기기를 돌려받고 떠난 집 ($1): 미납 + 떠날 때 남은 계약 ÷ 오늘 미수 채권 ($2 CGAP는 기간 평균).', 'अवधिमा उपकरण फिर्ता गरी छोडेका घर ($1): नतिरेको + छोड्दा बाँकी सम्झौता ÷ आजको प्राप्य ($2 CGAP मा अवधि औसत)।'],
  [/^Every contract is (\d+) months\.$/, '모든 계약이 $1개월.', 'हरेक सम्झौता $1 महिनाको।'],
  [/^All payments received in the period \(day-1 ([\d,]+) \+ follow-on ([\d,]+) \+ other\), VAT incl\.; referral credits are not cash\.$/, '기간 안에 받은 모든 결제 (첫날 $1 + 이후 $2 + 기타), VAT 포함. 추천 크레딧은 현금 아님.', 'अवधिमा पाएका सबै भुक्तानी (पहिलो दिन $1 + पछिका $2 + अन्य), VAT सहित; रेफरल क्रेडिट नगद होइन।'],
  [/^Expenses "(.+)" paid in the period ÷ cash receipts\. Cash basis: a device order lands in one month\.$/, (m) => `기간 안에 낸 지출 「${m[1]}」 ÷ 받은 현금. 현금 기준: 기기 주문은 한 달에 몰려요.`, (m) => `अवधिमा तिरेका खर्च «${m[1]}» ÷ नगद। नगद आधार: उपकरण अर्डर एकै महिनामा पर्छ।`],
  [/^Sales \((.+)\) \+ servicing \((.+)\) \+ other variable \((.+)\) ÷ cash receipts\.$/, '판매 ($1) + 서비스 ($2) + 기타 변동비 ($3) ÷ 받은 현금.', 'बिक्री ($1) + सेवा ($2) + अन्य परिवर्ती ($3) ÷ नगद।'],
  [/^Bills 2–(\d+) in the contract: 12 × ([\d,]+) \+ (\d+) × ([\d,]+) \(includes the ([\d,]+) refundable deposit\)\.$/, '계약상 2~$1회차: 12 × $2 + $3 × $4 (돌려주는 보증금 $5 포함).', 'सम्झौताका बिल २–$1: १२ × $2 + $3 × $4 (फिर्ता हुने धरौटी $5 सहित)।'],
  [/^Goods expenses in the period ÷ homes installed in the period \((\d+)\)\. Lumpy: devices are bought in batches\.$/, '기간 안 원가 지출 ÷ 기간 안 설치 ($1). 들쭉날쭉: 기기는 한꺼번에 사요.', 'अवधिको सामान खर्च ÷ अवधिमा जडान ($1)। उपकरण थोकमा किनिन्छ।'],
  [/^Homes installed in the period \((\d+)\) − devices taken back from leavers in the period \((\d+)\)\.$/, '기간 안 설치 ($1) − 기간 안 해지 집에서 돌려받은 기기 ($2).', 'अवधिमा जडान ($1) − अवधिमा छोड्नेबाट फिर्ता उपकरण ($2)।'],
  [/^% 9–10 − % 0–6 from (\d+) answers to the 0–10 question on calls in the period\.$/, '기간 안 통화의 0~10 질문 답 $1개에서 9~10 비율 − 0~6 비율.', 'अवधिका कलमा ०–१० प्रश्नका $1 जवाफबाट % ९–१० − % ०–६।'],
  [/^(\S+) → (\S+) · (\d+) homes installed · cash NPR ([\d,]+)$/, '$1 → $2 · 설치 $3집 · 받은 현금 NPR $4', '$1 → $2 · $3 घर जडान · नगद रु. $4'], [/^(\S+) → (\S+) · FY (\S+) · (\d+) homes installed · cash NPR ([\d,]+)$/, '$1 → $2 · 회계연도 $3 · 설치 $4집 · 받은 현금 NPR $5', '$1 → $2 · आ.व. $3 · $4 घर जडान · नगद रु. $5'],
  [/^bills 2–36 · (\S+) → (\S+)$/, '2~36회차 · $1 → $2', 'बिल २–३६ · $1 → $2'], [/^of NPR (\S+) outstanding$/, '미수 채권 NPR $1 중', 'बाँकी रु. $1 मध्ये'], [/^(\d+) homes installed$/, '설치 $1집', '$1 घर जडान'], [/^(\d+) answers$/, '답 $1개', '$1 जवाफ'], [/^(\d+) answers · 🔴 fewer than 30$/, '답 $1개 · 🔴 30개 미만', '$1 जवाफ · 🔴 ३० भन्दा कम'],
  [/^(\d+) · (\d+)%$/, '$1 · $2%', '$1 · $2%'],
  [/^Expense lines are mapped to CGAP cost lines as a first guess \(🔴\) — check with the CA before sending: goods = (.+) · servicing = (.+) · sales = (.+)\.$/, '지출 항목을 CGAP 비용 줄에 첫 추정으로 대응시켰어요 (🔴) — 보내기 전에 CA와 확인: 원가 = $1 · 서비스 = $2 · 판매 = $3.', 'खर्च लाइनलाई CGAP लागतमा पहिलो अनुमानले मिलाइएको छ (🔴) — पठाउनुअघि CA सँग जाँच्नुहोस्: सामान = $1 · सेवा = $2 · बिक्री = $3।'],
);
// v0.8 #9 sales stage days (2026-09-29)
Object.assign(W, {
  'Sales stage days': ['영업 단계별 걸린 날', 'बिक्री चरणका दिन'], 'lead → first payment': ['리드 → 첫 입금', 'लिड → पहिलो भुक्तानी'], 'Lead → first payment': ['리드 → 첫 입금', 'लिड → पहिलो भुक्तानी'],
  'Lead → demo': ['리드 → 시연', 'लिड → डेमो'], 'Demo → signed': ['시연 → 계약', 'डेमो → सम्झौता'], 'Signed → installed': ['계약 → 설치', 'सम्झौता → जडान'], 'Installed → first payment': ['설치 → 첫 입금', 'जडान → पहिलो भुक्तानी'],
  'median days': ['중앙값 (일)', 'मध्यिका दिन'], 'no matched homes yet': ['아직 연결된 집 없음', 'अझै जोडिएको घर छैन'], 'Paid on install day': ['설치 당일 입금', 'जडान दिनमै भुक्तानी'], 'Leads stuck': ['멈춘 리드', 'अड्किएका लिड'], '14+ days in a stage': ['한 단계에 14일 넘게', 'एउटै चरणमा १४+ दिन'],
  'The journey': ['고객 여정', 'यात्रा'], 'median days per step': ['단계별 중앙값 (일)', 'चरणअनुसार मध्यिका दिन'], 'Each step': ['단계별', 'हरेक चरण'], 'last 12 months': ['최근 12개월', 'पछिल्लो १२ महिना'], Step: ['단계', 'चरण'], Median: ['중앙값', 'मध्यिका'], Slowest: ['가장 느림', 'सबैभन्दा ढिलो'], 'Over target': ['목표 넘김', 'लक्ष्यभन्दा बढी'], 'Target 🔴': ['목표 🔴', 'लक्ष्य 🔴'],
  'Over target = homes slower than the target (🔴 first guesses: lead → demo 7 days · demo → signed 7 · signed → installed 5 · installed → paid same day).': ['목표 넘김 = 목표보다 느린 집 (🔴 첫 추정: 리드 → 시연 7일 · 시연 → 계약 7일 · 계약 → 설치 5일 · 설치 → 입금 당일).', 'लक्ष्यभन्दा बढी = लक्ष्यभन्दा ढिलो घर (🔴 पहिलो अनुमान: लिड → डेमो ७ दिन · डेमो → सम्झौता ७ · सम्झौता → जडान ५ · जडान → भुक्तानी उही दिन)।'],
  'No lead is stuck 🏖️': ['멈춘 리드 없음 🏖️', 'कुनै लिड अड्किएको छैन 🏖️'], 'How long each step took': ['단계마다 걸린 날', 'हरेक चरणमा लागेको समय'], homes: ['가구', 'घर'], 'same day': ['당일', 'उही दिन'], '1–3 days': ['1~3일', '१–३ दिन'], '4–7 days': ['4~7일', '४–७ दिन'], '8–14 days': ['8~14일', '८–१४ दिन'], '15+ days': ['15일+', '१५+ दिन'],
  'How long homes take from first contact to the first payment (installs of the last 12 months). A home is matched to its lead by the convert button or the same phone number. Targets are first guesses (🔴).': ['첫 연락부터 첫 입금까지 걸린 날 (최근 12개월 설치). 집과 리드는 「설치」 전환 버튼이나 같은 전화번호로 연결해요. 목표는 첫 추정 (🔴).', 'पहिलो सम्पर्कदेखि पहिलो भुक्तानीसम्म कति दिन (पछिल्लो १२ महिनाका जडान)। घर र लिड convert बटन वा उही फोनले जोडिन्छ। लक्ष्य पहिलो अनुमान (🔴)।'],
  'Homes with a lead': ['리드가 있는 집', 'लिड भएका घर'], None: ['없음', 'छैन'], 'open ›': ['열기 ›', 'खोल्नुहोस् ›'], 'Message sent': ['메시지 보냄', 'सन्देश पठाइयो'], 'No message': ['메시지 안 보냄', 'सन्देश नपठाएको'], 'Deposit starts': ['보증금 시작', 'धरौटी सुरु'], 'deposit starts': ['보증금 시작', 'धरौटी सुरु'], '+ Deposit starts': ['+ 보증금 시작', '+ धरौटी सुरु'], 'Nobody home': ['아무도 없음 (허탕)', 'घरमा कोही छैन'], median: ['중앙값', 'मध्यिका'], '✓ Customer': ['✓ 고객', '✓ ग्राहक'], 'Grey / yellow pill = days in this stage (yellow = stuck 14+ days).': ['회색·노랑 표시 = 이 단계에 머문 날 (노랑 = 14일 이상 멈춤).', 'खैरो / पहेंलो = यो चरणका दिन (पहेंलो = १४+ दिन अड्कियो)।'],
});
P.unshift(
  [/^([\d.]+) days?$/, '$1일', '$1 दिन'], [/^([\d.]+) d$/, '$1일', '$1 दि.'], [/^(\d+) days in this stage$/, '이 단계에 $1일', 'यो चरणमा $1 दिन'], [/^([\d.]+) days? in this stage$/, '이 단계에 $1일', 'यो चरणमा $1 दिन'],
  [/^Median days per step · (\d+) of (\d+) homes installed in the last 12 months could be matched to a lead \(by the convert link or the same phone\)\.$/, '단계별 중앙값 · 최근 12개월 설치 $2집 중 $1집이 리드와 연결됨 (전환 링크 또는 같은 전화번호).', 'चरणअनुसार मध्यिका · पछिल्लो १२ महिनाका $2 मध्ये $1 घर लिडसँग जोडिए (convert वा उही फोन)।'],
  [/^(\d+) homes with a lead$/, '리드 있는 집 $1곳', 'लिड भएका $1 घर'], [/^target (\d+) 🔴$/, '목표 $1 🔴', 'लक्ष्य $1 🔴'], [/^(\d+) of (\d+) homes$/, '$2집 중 $1집', '$2 मध्ये $1 घर'], [/^(\d+) open leads$/, '진행 중 리드 $1', '$1 खुला लिड'], [/^Leads stuck · (\d+)$/, '멈춘 리드 · $1', 'अड्किएका लिड · $1'], [/^follow up (\S+)$/, '후속 $1', 'फलो-अप $1'],
);
// v0.8 #8 billing moves (2026-09-29)
Object.assign(W, {
  'Billing moves': ['월 청구 이동', 'मासिक बिल परिवर्तन'], 'new · left · month 14': ['신규 · 해지 · 14개월차', 'नयाँ · छोडे · १४ औं महिना'], 'Recurring billing': ['매달 청구액', 'मासिक नियमित बिल'], Change: ['변화', 'परिवर्तन'], 'vs month before': ['지난달 대비', 'अघिल्लो महिनासँग'],
  'Lost to leavers': ['해지로 잃음', 'छोड्नेले गुमेको'], 'this month': ['이번 달', 'यो महिना'], 'Month-14 step': ['14개월차 감소', '१४ औं महिनाको घटाइ'], 'none without the deposit': ['보증금 빼면 없음', 'धरौटी बिना छैन'],
  'NPR a month': ['월 NPR', 'मासिक रु.'], 'With deposit': ['보증금 포함', 'धरौटीसहित'], 'Subscription only': ['구독료만', 'सदस्यता मात्र'], Start: ['시작', 'सुरु'], 'New homes': ['신규', 'नयाँ घर'], 'Came back': ['재가입', 'फर्किए'], 'Price up': ['가격 인상', 'मूल्य बढ्यो'], 'Month 14': ['14개월차', '१४ औं महिना'], End: ['끝', 'अन्त्य'],
  'With deposit = what homes are billed (1,400 in months 1–13). The deposit part is held, not earned — "Subscription only" shows revenue.': ['보증금 포함 = 집에 청구하는 금액 (1~13개월 1,400). 보증금은 맡아 둔 돈이지 번 돈이 아니에요 — 매출은 「구독료만」에서 보세요.', 'धरौटीसहित = घरलाई बिल गरिने रकम (१–१३ महिना १,४००)। धरौटी राखिएको हो, कमाइ होइन — आम्दानी «सदस्यता मात्र» मा हेर्नुहोस्।'],
  'With deposit = what homes are billed: 1,100 in the install month (inside the 4,900), 1,400 for bills 2–13, then 1,100. The deposit part is held, not earned — "Subscription only" shows revenue. Paused homes still count (the ledger keeps billing them).': ['보증금 포함 = 집에 청구하는 금액: 설치 달 1,100 (4,900 안에 포함), 2~13회차 1,400, 그 뒤 1,100. 보증금은 맡아 둔 돈이지 번 돈이 아니에요 — 매출은 「구독료만」에서 보세요. 일시정지 집도 들어가요 (장부가 계속 청구해서).', 'धरौटीसहित = घरलाई बिल गरिने रकम: जडान महिना १,१०० (४,९०० भित्र), बिल २–१३ मा १,४००, त्यसपछि १,१००। धरौटी राखिएको हो, कमाइ होइन — आम्दानी «सदस्यता मात्र» मा। रोकिएका घर पनि गनिन्छन् (खाताले बिल गर्छ)।'],
  'Start + new + came back + deposit starts − left − month 14 = end. Install month = 1,100 (inside the 4,900), bills 2–13 = 1,400, then 1,100. The deposit part is held, not earned (G-1 §1-2).': ['시작 + 신규 + 재가입 + 보증금 시작 − 해지 − 14개월차 = 끝. 설치 달 = 1,100 (4,900 안), 2~13회차 = 1,400, 그 뒤 1,100. 보증금은 맡아 둔 돈이지 번 돈이 아니에요 (G-1 §1-2).', 'सुरु + नयाँ + फर्किए + धरौटी सुरु − छोडे − १४ औं महिना = अन्त्य। जडान महिना = १,१०० (४,९०० भित्र), बिल २–१३ = १,४००, त्यसपछि १,१००। धरौटी राखिएको हो, कमाइ होइन (G-1 §1-2)।'],
  'Subscription only = 1,100 a home (VAT incl.) — the month-14 step disappears because it is only the deposit ending.': ['구독료만 = 집당 1,100 (VAT 포함) — 14개월차 감소는 보증금이 끝나는 것뿐이라 사라져요.', 'सदस्यता मात्र = घरको १,१०० (VAT सहित) — १४ औं महिनाको घटाइ धरौटी सकिएको मात्र भएकाले हराउँछ।'],
  'Month-14 steps coming': ['다가오는 14개월차 감소', 'आउने १४ औं महिनाका घटाइ'], 'known in advance': ['미리 알 수 있음', 'पहिल्यै थाहा'], 'Planned, not lost: the deposit part (300) ends after 12 months.': ['잃는 게 아니라 예정된 것: 보증금 몫(300)이 12개월 뒤 끝나요.', 'गुमेको होइन, योजना अनुसार: धरौटी (३००) १२ महिनापछि सकिन्छ।'],
  'No home reaches month 14 in the next 6 months': ['앞으로 6개월 안에 14개월차 되는 집 없음', 'आउँदा ६ महिनामा कुनै घर १४ औं महिनामा पुग्दैन'], 'Moves per month': ['월별 이동', 'मासिक परिवर्तन'], 'tap a month': ['달을 누르세요', 'महिना थिच्नुहोस्'],
  new: ['신규', 'नयाँ'], 'came back': ['재가입', 'फर्किए'], left: ['해지', 'छोडे'], 'month-14 step': ['14개월차 감소', '१४ औं महिनाको घटाइ'], net: ['순변화', 'खुद'],
  '+ New': ['+ 신규', '+ नयाँ'], '+ Came back': ['+ 재가입', '+ फर्किए'], '− Left': ['− 해지', '− छोडे'], '− Month 14': ['− 14개월차', '− १४ औं महिना'], 'Net change': ['순변화', 'खुद परिवर्तन'],
  'Recurring billing each month (VAT incl.) and why it moved: new homes, homes that came back (same phone as a home that left), homes that left, and the month-14 step (1,400 → 1,100 when the 300 deposit part ends — planned, not lost).': ['매달 청구액(VAT 포함)과 움직인 이유: 신규, 재가입(해지한 집과 같은 전화번호), 해지, 14개월차 감소(보증금 300이 끝나 1,400 → 1,100 — 잃는 게 아니라 예정된 것).', 'मासिक नियमित बिल (VAT सहित) र किन बदलियो: नयाँ घर, फर्किएका (छोडेको घरकै फोन), छोडेका, र १४ औं महिना (धरौटी ३०० सकिँदा १,४०० → १,१०० — योजना अनुसार)।'],
  'Start + new + came back − left − month 14 = end. The deposit part is held, not earned (G-1 §1-2).': ['시작 + 신규 + 재가입 − 해지 − 14개월차 = 끝. 보증금은 맡아 둔 돈이지 번 돈이 아니에요 (G-1 §1-2).', 'सुरु + नयाँ + फर्किए − छोडे − १४ औं महिना = अन्त्य। धरौटी राखिएको हो, कमाइ होइन (G-1 §1-2)।'],
  'Money rights needed.': ['돈 권한이 필요해요.', 'पैसाको अधिकार चाहिन्छ।'],
});
P.unshift(
  [/^(\d+) homes?$/, '$1가구', '$1 घर'], [/^(\d+) homes? · VAT incl\.$/, '$1가구 · VAT 포함', '$1 घर · VAT सहित'], [/^(\d+) homes? · 1,400 → 1,100$/, '$1가구 · 1,400 → 1,100', '$1 घर · १,४०० → १,१००'],
  [/^From (.+) to (.+)$/, (m) => `${T(m[1])} → ${T(m[2])}`, (m) => `${T(m[1])} → ${T(m[2])}`], [/^(\d+) homes · −([\d,]+)$/, '$1가구 · −$2', '$1 घर · −$2'],
);
// v0.8 #7 on my way + nobody home (2026-09-29) — 🔴 Nepali needs Tara's check
Object.assign(W, {
  'Nobody home': ['아무도 없음 (허탕)', 'घरमा कोही छैन'], 'Gate locked / no access': ['대문 잠김 · 못 들어감', 'गेट बन्द / पस्न पाइएन'], 'Asked to come another day': ['다른 날 와 달라고 함', 'अर्को दिन आउन भने'],
  'Could not find the house': ['집을 못 찾음', 'घर भेटिएन'], 'Refused the visit': ['방문 거절', 'भ्रमण अस्वीकार'],
  'What happened?': ['무슨 일이었나요?', 'के भयो?'], 'Minutes you waited or called': ['기다리거나 전화한 시간 (분)', 'पर्खेको वा फोन गरेको मिनेट'], 'Try again on': ['다시 갈 날', 'फेरि जाने दिन'],
  'The visit stays owed — this date becomes the next visit. After saving, send the "sorry we missed you" message from the customer page.': ['방문은 아직 남은 일이에요 — 이 날짜가 다음 방문이 돼요. 저장한 뒤 고객 화면에서 「못 뵈어 죄송해요」 메시지를 보내세요.', 'भ्रमण अझै बाँकी छ — यो मिति अर्को भ्रमण हुन्छ। सेभपछि ग्राहक पेजबाट «भेट्न नसकेकोमा माफ गर्नुहोस्» सन्देश पठाउनुहोस्।'],
  'What happened at the door?': ['문 앞에서 무슨 일이었나요?', 'ढोकामा के भयो?'], 'When will you try again? The visit is still owed.': ['언제 다시 가나요? 방문은 아직 남아 있어요.', 'फेरि कहिले जाने? भ्रमण अझै बाँकी छ।'], 'Pick a day after the visit.': ['방문 다음 날짜를 고르세요.', 'भ्रमणपछिको दिन छान्नुहोस्।'], 'Check the minutes (0–240).': ['분을 확인하세요 (0~240).', 'मिनेट जाँच्नुहोस् (०–२४०)।'],
  'On my way': ['가는 중', 'आउँदैछु'], 'Arriving in about': ['도착까지 약', 'करिब यति समयमा पुग्छु'], 'Marked "on my way" — it is saved with the visit': ['「가는 중」 표시함 — 방문 기록에 같이 저장돼요', '«आउँदैछु» चिनो लाग्यो — भ्रमणसँगै सेभ हुन्छ'],
  'Nobody home today': ['오늘 아무도 없었음', 'आज घरमा कोही थिएन'], 'Sorry we missed you': ['못 뵈어 죄송해요', 'भेट्न नसकेकोमा माफ'], 'Nobody home at a visit': ['방문 때 아무도 없음', 'भ्रमणमा घरमा कोही थिएन'],
  'Wasted trips': ['허탕 분석', 'खेर गएका यात्रा'], 'nobody home': ['아무도 없음', 'घरमा कोही छैन'], Trips: ['출동', 'यात्रा'], 'With "on my way"': ['「가는 중」 보냄', '«आउँदैछु» पठाएको'], 'with "on my way"': ['「가는 중」 보냄', '«आउँदैछु» पठाएको'], Without: ['안 보냄', 'नपठाएको'], without: ['안 보냄', 'नपठाएको'],
  'Minutes waited': ['기다린 시간 (분)', 'पर्खेको मिनेट'], '🔴 Fewer than 30 trips on one side — too early to say whether the message helps.': ['🔴 한쪽이 30번 미만 — 메시지 효과를 말하기엔 일러요.', '🔴 एकातिर ३० भन्दा कम यात्रा — सन्देशले काम गर्छ भन्न चाँडो।'],
  'What happened': ['무슨 일이었나', 'के भयो'], 'By person': ['사람별', 'व्यक्तिअनुसार'], Rate: ['비율', 'दर'], 'Latest nobody-home trips': ['최근 허탕', 'पछिल्ला खेर गएका यात्रा'], 'None 🏖️': ['없음 🏖️', 'छैन 🏖️'], 'Nobody-home trips: none 🏖️': ['허탕 없음 🏖️', 'खेर गएको यात्रा छैन 🏖️'], 'No trips': ['출동 없음', 'यात्रा छैन'],
  'message sent': ['메시지 보냄', 'सन्देश पठाइयो'], 'no message': ['메시지 안 보냄', 'सन्देश नपठाएको'], 'Trips wasted': ['허탕 횟수', 'खेर गएका यात्रा'], 'Homes missed 2+ times': ['2번 넘게 허탕 친 집', '२+ पटक भेटिएन'], 'call before the next try': ['다음에 가기 전에 전화', 'अर्को पटक जानुअघि फोन'], rate: ['비율', 'दर'],
  'Does the message help?': ['메시지가 효과 있나?', 'सन्देशले काम गर्छ?'], '% nobody home': ['허탕 %', '% कोही छैन'], 'By tole': ['동네별', 'टोलअनुसार'], 'Not enough trips yet (3+ per tole)': ['아직 출동이 적어요 (동네당 3번 이상)', 'अझै कम यात्रा (टोलमा ३+)'],
  'Nobody home per month': ['월별 허탕', 'मासिक खेर गएका यात्रा'], 'Rate per month': ['월별 비율', 'मासिक दर'], '🔴 Fewer than 30 trips on one side — too early to say.': ['🔴 한쪽이 30번 미만 — 말하기엔 일러요.', '🔴 एकातिर ३० भन्दा कम — भन्न चाँडो।'],
  'Same homes are not compared — busy homes may get the message more often.': ['같은 집끼리 비교한 게 아니에요 — 바쁜 집에 메시지를 더 자주 보냈을 수 있어요.', 'उही घर तुलना होइन — व्यस्त घरलाई सन्देश धेरै गएको हुन सक्छ।'],
  'WhatsApp messages': ['WhatsApp 메시지', 'WhatsApp सन्देश'], 'On my way — English': ['가는 중 — 영어', 'आउँदैछु — अङ्ग्रेजी'], 'On my way — Nepali': ['가는 중 — 네팔어', 'आउँदैछु — नेपाली'], 'Sorry we missed you — English': ['못 뵈어 죄송해요 — 영어', 'भेट्न नसकेकोमा माफ — अङ्ग्रेजी'], 'Sorry we missed you — Nepali': ['못 뵈어 죄송해요 — 네팔어', 'भेट्न नसकेकोमा माफ — नेपाली'],
  "Words in {braces} are filled in: {name} first name · {tech} who is going · {eta} minutes · {time} when you were there · {retry} next try. Empty = the default text. 🔴 The Nepali default needs Tara's check.": ['{괄호} 안 단어는 자동으로 채워져요: {name} 이름 · {tech} 가는 사람 · {eta} 분 · {time} 간 시각 · {retry} 다시 갈 날. 비우면 기본 문구. 🔴 네팔어 기본 문구는 Tara 확인 필요.', '{कोष्ठक} का शब्द आफैं भरिन्छन्: {name} नाम · {tech} जाने व्यक्ति · {eta} मिनेट · {time} पुगेको समय · {retry} फेरि जाने दिन। खाली = पूर्वनिर्धारित। 🔴 नेपाली पाठ Tara ले जाँच्नुपर्छ।'],
  'Last 90 days. A trip = a completed visit or "nobody home". "On my way" = the WhatsApp was sent before leaving (🛵 on the customer page or the route) — it is saved with the visit.': ['최근 90일. 출동 = 끝낸 방문 또는 「아무도 없음」. 「가는 중」 = 출발 전에 WhatsApp을 보냄 (고객 화면이나 동선의 🛵) — 방문 기록에 같이 저장돼요.', 'पछिल्लो ९० दिन। यात्रा = सकिएको भ्रमण वा «कोही छैन»। «आउँदैछु» = निस्कनुअघि WhatsApp पठाइएको (ग्राहक पेज वा रुटको 🛵) — भ्रमणसँगै सेभ हुन्छ।'],
});
P.unshift(
  [/^(NPR [\d,]+) — to pay back$/, '$1 — 돌려줄 돈', '$1 — फिर्ता दिनुपर्ने'], [/^(\d+) min$/, '$1분', '$1 मिनेट'], [/^\((\d+) d\)$/, '($1일)', '($1 दि.)'], [/^last (\d{4}-\d{2}-\d{2})$/, '마지막 $1', 'पछिल्लो $1'], [/^sent (\d{2}:\d{2})$/, '$1 보냄', '$1 मा पठाइयो'], [/^trying again (\S+)$/, '$1 다시 감', '$1 फेरि जाने'], [/^try again (\S+)$/, '$1 다시 감', '$1 फेरि जाने'],
  [/^trying again — nobody home on (\S+)$/, '다시 가는 중 — $1 아무도 없었음', 'फेरि जाँदै — $1 मा कोही थिएन'], [/^nobody home (\d+) times? in (\d+) days$/, '$2일 동안 $1번 아무도 없음', '$2 दिनमा $1 पटक कोही थिएन'],
  [/^(\d+) of (\d+) trips$/, '출동 $2번 중 $1번', '$2 यात्रामध्ये $1'], [/^([\d.]+%|—) of (\d+) trips$/, '출동 $2번 중 $1', '$2 यात्रामध्ये $1'], [/^(\d+) trips$/, '출동 $1번', '$1 यात्रा'], [/^(\d+) minutes waited$/, '기다린 시간 $1분', '$1 मिनेट पर्खियो'],
  [/^without: ([\d.]+%|—)$/, '안 보냄: $1', 'नपठाएको: $1'], [/^Homes missed twice or more · (\d+)$/, '2번 넘게 허탕 친 집 · $1', '२+ पटक भेटिएनन् · $1'], [/^(\d+) times$/, '$1번', '$1 पटक'], [/^\((\d+)\)$/, '($1)', '($1)'],
);
// v0.8 review fixes (2026-09-28)
Object.assign(W, {
  repairs: ['수리', 'मर्मत'], Week: ['주', 'हप्ता'], 'holidays that week': ['그 주 휴일', 'त्यो हप्ताको बिदा'], '🏠 No “how to find the house”': ['🏠 「집 찾는 법」이 비어 있어요', '🏠 «घर कसरी भेट्ने» छैन'],
  'Order qty': ['주문량', 'अर्डर संख्या'], 'Left on': ['해지일', 'छोडेको मिति'], Now: ['지금', 'अहिले'], 'Only for people who see every customer.': ['모든 고객을 보는 사람만 볼 수 있어요.', 'सबै ग्राहक हेर्न पाउनेलाई मात्र।'],
});
P.unshift(
  [/^the next 8 weeks are over in (\d+) weeks? already — see the chart$/, '앞 8주 중 $1주가 벌써 넘침 — 그래프 보세요', 'आउँदा ८ मध्ये $1 हप्ता अहिले नै बढी — चार्ट हेर्नुहोस्'],
  [/^order ((?:\w+, )+\w+) now$/, '$1 지금 주문', '$1 अहिले अर्डर'], [/^\+(\d+) new$/, '+$1 신규', '+$1 नयाँ'], [/^late since (\S+)$/, '$1부터 늦음', '$1 देखि ढिलो'],
  [/^(PP|CTO|UF|UV|Spin-down) runs out around (\S+)$/, '$1 $2쯤 다 떨어짐', '$1 $2 तिर सकिन्छ'],
  [/^(\d+) \(guess\)$/, '$1 (추정)', '$1 (अनुमान)'], [/^(\d+) \(technician names without Jun\)$/, '$1 (Jun 뺀 기사 이름 수)', '$1 (Jun बाहेकका प्राविधिक)'],
  [/^([^:]+): ((?:\d+ (?:waiting|refused)|not opened|old app|storage not|opened in Safari|phone storage).*)$/, (m) => `${m[1]}: ${m[2].split(' · ').map((x) => T(x)).join(' · ')}`, (m) => `${m[1]}: ${m[2].split(' · ').map((x) => T(x)).join(' · ')}`],
);
// final security audit (2026-09-29)
Object.assign(W, {
  'A saved payment can only be changed by Jun — tell him what is wrong.': ['저장된 수금은 Jun만 고칠 수 있어요 — 뭐가 틀렸는지 Jun에게 알려 주세요.', 'सेभ भएको भुक्तानी Jun ले मात्र बदल्न सक्नुहुन्छ — के गलत छ उहाँलाई भन्नुहोस्।'],
  'Admin (Jun) has every right and cannot be changed. Everyone else: pick a preset, then switch single rights. Areas only tidy their screens — they are not a security wall. The server checks who may write money, expenses, new customers and approvals — but every staff account can read the shared records (rights and areas decide what the screens show).': ['관리자(Jun)는 모든 권한이 있고 바꿀 수 없어요. 다른 사람은 기본 묶음을 고른 뒤 권한을 하나씩 켜고 끄세요. 담당 동네는 화면만 줄여줄 뿐 보안 장치가 아니에요. 돈·지출·신규 고객·승인은 서버가 누가 쓸 수 있는지 한 번 더 확인해요 — 하지만 직원 계정은 누구나 공유 기록을 읽을 수 있어요(권한·동네는 화면에 무엇이 보일지만 정해요).', 'एडमिन (Jun) सँग सबै अधिकार छ र बदलिँदैन। अरूका लागि सेट छानेर एक-एक अधिकार खोल्नुहोस्। क्षेत्रले स्क्रिन मात्र मिलाउँछ — सुरक्षा होइन। पैसा, खर्च, नयाँ ग्राहक र स्वीकृति कसले लेख्न पाउँछ सर्भरले जाँच्छ — तर हरेक कर्मचारी खाताले साझा रेकर्ड पढ्न सक्छ (अधिकार र क्षेत्रले स्क्रिनमा के देखिन्छ मात्र तय गर्छ)।'],
  'Tap again to block — their phone is wiped the next time it opens online': ['한 번 더 누르면 차단 — 그 폰이 다음에 인터넷에 연결된 채 열릴 때 회사 데이터가 지워져요', 'फेरि थिच्दा ब्लक — उनको फोन अर्को पटक अनलाइनमा खुल्दा डाटा मेटिन्छ'],
});
P.unshift([/^Not a KORA backup file: (.*)$/, 'KORA 백업 파일이 아니에요: $1', 'KORA ब्याकअप फाइल होइन: $1']);

// v0.9 #1 payment chase + promise to pay (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Payment chase': ['돈 받으러 연락', 'भुक्तानी ताकेता'], 'Home visit': ['집 방문', 'घर भ्रमण'], 'In person': ['직접 만남', 'प्रत्यक्ष भेट'],
  Talked: ['통화함', 'कुरा भयो'], 'No answer': ['안 받음', 'फोन उठेन'], 'Phone off': ['전화 꺼짐', 'फोन बन्द'], 'Wrong number': ['번호 틀림', 'गलत नम्बर'],
  How: ['방법', 'कसरी'], 'Did you reach them?': ['통화가 됐나요?', 'सम्पर्क भयो?'], 'They will pay by': ['낼 날짜', 'तिर्ने मिति'],
  'Only if they gave a day. Until then the home waits in “Promised”; if the money is not in by that day it comes back as “Promise broken”.': ['날짜를 말했을 때만 적어요. 그날까지는 「약속함」에서 기다리고, 그날까지 돈이 안 들어오면 「약속 어김」으로 올라와요.', 'मिति दिएमा मात्र। त्यो दिनसम्म «वाचा गरेको» मा पर्खन्छ; पैसा नआए «वाचा तोडियो» मा फर्किन्छ।'],
  'Amount promised (NPR)': ['내겠다고 한 금액 (NPR)', 'वाचा गरेको रकम (NPR)'], 'Empty = any payment counts.': ['비우면 = 얼마든 들어오면 지킨 걸로 봐요.', 'खाली = जुनसुकै भुक्तानी गने हुन्छ।'],
  'The pay-by day cannot be before the call.': ['낼 날짜가 통화한 날보다 앞일 수 없어요.', 'तिर्ने मिति फोन गरेको दिनभन्दा अघि हुन सक्दैन।'], 'Amount cannot be negative.': ['금액은 마이너스일 수 없어요.', 'रकम ऋणात्मक हुन सक्दैन।'],
  'Promise broken — call or visit now': ['약속 어김 — 지금 전화하거나 방문', 'वाचा तोडियो — अहिले फोन वा भ्रमण'], 'Promised — wait until their day': ['약속함 — 그날까지 기다림', 'वाचा गरेको — त्यो दिनसम्म पर्खनुहोस्'],
  '📝 = log a call or visit about the money (who answered, the day they will pay). A home that gave a day waits in “Promised” until then.': ['📝 = 돈 문제로 한 전화·방문을 기록 (누가 받았나, 언제 내겠다고 했나). 날짜를 말한 집은 그날까지 「약속함」에서 기다려요.', '📝 = पैसाबारे फोन वा भ्रमण लेख्नुहोस् (कसले उठायो, कहिले तिर्छन्)। मिति दिएको घर त्यो दिनसम्म «वाचा गरेको» मा पर्खन्छ।'],
  'Last 90 days': ['지난 90일', 'पछिल्लो ९० दिन'], 'Log chase': ['연락 기록', 'ताकेता लेख्नुहोस्'], 'Log a payment chase': ['돈 받으러 한 연락 기록', 'भुक्तानी ताकेता लेख्नुहोस्'],
  kept: ['지킴', 'पालना'], 'paid late': ['늦게 냄', 'ढिलो तिर्यो'], broken: ['어김', 'तोडियो'], waiting: ['기다림', 'पर्खँदै'],
  'A promise to pay can be at most (days after the call)': ['낼 날짜 약속은 최대 (통화 후 며칠)', 'तिर्ने वाचा बढीमा (फोनपछि कति दिन)'],
  '🔴 A later day only gets a warning — the call still saves. G-1 has no rule for this yet.': ['🔴 더 늦은 날짜는 경고만 나오고 저장은 돼요. G-1에는 아직 이 규칙이 없어요.', '🔴 पछिको मितिमा चेतावनी मात्र — सेभ हुन्छ। G-1 मा अझै यो नियम छैन।'],
  'Broke a payment promise': ['돈 약속 어김', 'भुक्तानी वाचा तोड्यो'],
});
P.unshift(
  [/^promise broken \((\S+)\)$/, '약속 어김 ($1)', 'वाचा तोडियो ($1)'], [/^promised by (\S+)$/, '$1까지 내기로 함', '$1 सम्म तिर्ने वाचा'],
  [/^promised to pay by (\S+) — not paid$/, '$1까지 내기로 했는데 안 냄', '$1 सम्म तिर्ने भनेको — तिरेन'],
  [/^(\d+) tr(?:y|ies)$/, '$1번 연락', '$1 पटक सम्पर्क'], [/^last: (.+)$/, (m) => `마지막: ${T(m[1])}`, (m) => `पछिल्लो: ${T(m[1])}`],
  [/^answered (\S+)$/, '받은 비율 $1', 'उठाएको $1'], [/^promises kept (\S+) \((\d+) of (\d+)\)$/, '약속 지킨 비율 $1 ($3건 중 $2건)', 'वाचा पालना $1 ($3 मध्ये $2)'],
  [/^(\d+) payment promise\(s\) broken$/, '돈 약속 어긴 집 $1곳', '$1 भुक्तानी वाचा तोडियो'], [/^More than (\d+) days away — agree an earlier day or a home visit \(Settings → Collections\)\.$/, '$1일보다 멀어요 — 더 이른 날이나 집 방문으로 정하세요 (설정 → 수금).', '$1 दिनभन्दा टाढा — छिटो मिति वा घर भ्रमण तय गर्नुहोस् (सेटिङ → असुली)।'],
  [/^told (.+)$/, '$1에게 말함', '$1 लाई भने'], [/^(NPR [\d,]+) promised$/, '$1 약속', '$1 वाचा'], [/^(NPR [\d,]+) paid by then$/, '그날까지 $1 냄', 'त्यो दिनसम्म $1 तिर्यो'],
  [/^Payment contacts \((\d+)\)$/, '돈 연락 기록 ($1)', 'भुक्तानी सम्पर्क ($1)'],
);

// v0.9 #2 pause / restart history (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Paused from': ['정지 시작일', 'रोकेको मिति'], 'Why paused': ['정지 이유', 'किन रोकियो'], 'Restarted on': ['다시 켠 날', 'फेरि सुरु गरेको मिति'],
  'Away / house empty': ['집 비움 · 멀리 감', 'बाहिर / घर खाली'], 'Money trouble': ['돈 문제', 'पैसाको समस्या'], 'Waiting for repair': ['수리 기다림', 'मर्मत पर्खँदै'], 'Moving soon': ['곧 이사', 'चाँडै सर्दै'],
  'Empty is fine for a home that was paused before this box existed.': ['이 칸이 생기기 전에 정지한 집은 비워 둬도 돼요.', 'यो बाकस आउनुअघि रोकिएको घरमा खाली राखे हुन्छ।'],
  'The planned restart day (optional). Billing does not stop while paused — no policy yet (🔴 Jun decides).': ['다시 켤 예정일 (선택). 정지 중에도 청구는 멈추지 않아요 — 아직 정책이 없어요 (🔴 Jun이 정함).', 'फेरि सुरु गर्ने मिति (ऐच्छिक)। रोकिँदा पनि बिल रोकिँदैन — अझै नीति छैन (🔴 Jun ले तय गर्ने)।'],
  'When did it stop?': ['언제 멈췄나요?', 'कहिले रोकियो?'], 'Choose why.': ['이유를 고르세요.', 'कारण छान्नुहोस्।'], 'Cannot be before the pause starts.': ['정지 시작일보다 앞일 수 없어요.', 'रोकेको मितिभन्दा अघि हुन सक्दैन।'], 'Cannot be before the pause started.': ['정지 시작일보다 앞일 수 없어요.', 'रोकेको मितिभन्दा अघि हुन सक्दैन।'],
  "Each pause is one line in the home's history (customer → ✏️ Edit → status). Billing does not stop while paused — no policy yet (🔴 Jun decides).": ['정지할 때마다 그 집 이력에 한 줄씩 남아요 (고객 → ✏️ 수정 → 상태). 정지 중에도 청구는 멈추지 않아요 — 아직 정책이 없어요 (🔴 Jun이 정함).', 'हरेक रोकाइ घरको इतिहासमा एक लाइन हुन्छ (ग्राहक → ✏️ सम्पादन → स्थिति)। रोकिँदा पनि बिल रोकिँदैन — अझै नीति छैन (🔴 Jun ले तय गर्ने)।'],
  'Paused now': ['지금 정지 중', 'अहिले रोकिएको'], 'Past the restart day': ['다시 켤 날 지남', 'सुरु गर्ने मिति नाघ्यो'], 'Pauses ended · 12 months': ['끝난 정지 · 12개월', 'सकिएका रोकाइ · १२ महिना'], 'Days paused · average / median': ['정지 일수 · 평균 / 중앙값', 'रोकिएका दिन · औसत / मध्य'],
  'Ended by leaving': ['해지로 끝남', 'छोडेर सकियो'], Why: ['이유', 'किन'], 'Ended pauses · 12 months': ['끝난 정지 · 12개월', 'सकिएका रोकाइ · १२ महिना'], restarted: ['다시 켬', 'फेरि सुरु'], 'restart day passed': ['다시 켤 날 지남', 'सुरु गर्ने मिति नाघ्यो'], 'Not given': ['안 적음', 'दिइएन'], 'still paused': ['아직 정지 중', 'अझै रोकिएको'], '⏸ paused': ['⏸ 정지 중', '⏸ रोकिएको'],
});
P.unshift([/^since (\S+)$/, '$1부터', '$1 देखि'], [/^restart (\S+)$/, '$1 다시 켤 예정', '$1 मा फेरि सुरु'], [/^restart day passed (\S+)$/, '다시 켤 날 지남 ($1)', 'सुरु गर्ने मिति नाघ्यो ($1)'], [/^Pauses \((\d+)\)$/, '정지 이력 ($1)', 'रोकाइ ($1)'], [/^(\d+) paused home\(s\) past their restart day$/, '다시 켤 날이 지난 정지 집 $1곳', 'सुरु गर्ने मिति नाघेका $1 रोकिएका घर']);

// v0.9 #3 contract events (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Contract event': ['계약 일', 'सम्झौता घटना'], 'Contract events': ['계약 일', 'सम्झौता घटना'], 'Notice to end': ['해지 통지', 'अन्त्य सूचना'], 'Transfer to a new holder': ['명의 승계', 'नयाँ धनीमा सार्ने'], 'Lost or stolen': ['분실·도난', 'हराएको वा चोरी'],
  'Date we were told': ['우리가 들은 날', 'हामीलाई भनेको मिति'], 'How they told us': ['어떻게 알렸나', 'कसरी भने'], SMS: ['문자', 'SMS'], Letter: ['편지', 'पत्र'],
  'Draft §2.14: WhatsApp, SMS or a phone call count as notice.': ['계약 초안 §2.14: WhatsApp·문자·전화도 통지로 인정돼요.', 'मस्यौदा §2.14: ह्वाट्सएप, SMS वा फोन सूचना मानिन्छ।'],
  'They want to end on': ['끝내고 싶은 날', 'अन्त्य गर्न चाहेको मिति'], 'Main reason': ['주된 이유', 'मुख्य कारण'], 'New holder — name': ['새 명의자 — 이름', 'नयाँ धनी — नाम'], 'New holder — mobile': ['새 명의자 — 휴대폰', 'नयाँ धनी — मोबाइल'],
  'Relation to the old holder': ['이전 명의자와 관계', 'पुरानो धनीसँग नाता'], 'House sold': ['집 팔림', 'घर बिक्री'], 'Tenant changed': ['세입자 바뀜', 'भाडावाल फेरियो'], 'Death in the family': ['가족 사망', 'परिवारमा मृत्यु'], 'Within the family': ['가족 안에서', 'परिवारभित्र'],
  Deposit: ['보증금', 'धरौटी'], 'Carried over to the new holder': ['새 명의자에게 넘김', 'नयाँ धनीलाई सारियो'], 'Refunded — new deposit': ['돌려주고 새로 받음', 'फिर्ता — नयाँ धरौटी'], 'Not decided': ['안 정함', 'तय भएन'],
  'New holder signed the agreement?': ['새 명의자가 계약서에 서명했나요?', 'नयाँ धनीले सम्झौतामा सही गर्नुभयो?'], 'Lost or stolen on': ['잃어버린 날', 'हराएको मिति'], 'Whose fault': ['누구 잘못', 'कसको गल्ती'],
  'Customer negligence': ['고객 과실', 'ग्राहकको लापरबाही'], 'Not the customer — police report': ['고객 잘못 아님 — 경찰 신고', 'ग्राहकको होइन — प्रहरी रिपोर्ट'], 'Not known yet': ['아직 모름', 'अझै थाहा छैन'], 'Police report no.': ['경찰 신고 번호', 'प्रहरी रिपोर्ट नं.'],
  'Settlement the customer pays (NPR)': ['고객이 낼 정산 금액 (NPR)', 'ग्राहकले तिर्ने मिलान रकम (NPR)'], 'Settled on': ['정산한 날', 'मिलान मिति'], 'Photos (the message, police report…)': ['사진 (메시지·경찰 신고서…)', 'फोटो (सन्देश, प्रहरी रिपोर्ट…)'],
  "Draft §2.5(b): negligence → replacement cost; police report and not their fault → a reasonable settlement. 🔴 The amount is Jun's call.": ['계약 초안 §2.5(b): 고객 과실 → 교체비 · 경찰 신고하고 고객 잘못 아님 → 합리적 합의. 🔴 금액은 Jun이 정해요.', 'मस्यौदा §2.5(b): लापरबाही → बदल्ने खर्च; प्रहरी रिपोर्ट र ग्राहकको गल्ती होइन → उचित मिलान। 🔴 रकम Jun ले तय गर्ने।'],
  '🔴 Draft §2.11 (transfer / succession) is still [TBC] with the lawyer — this only records it. Saving puts the new name and phone on the customer; the old ones stay in this record.': ['🔴 계약 초안 §2.11(승계)은 아직 변호사 [TBC] — 여기선 기록만 해요. 저장하면 고객 이름·전화가 새 명의자로 바뀌고, 옛 이름·전화는 이 기록에 남아요.', '🔴 मस्यौदा §2.11 (सार्ने / उत्तराधिकार) अझै वकिलसँग [TBC] — यहाँ लेख्ने मात्र। सेभ गर्दा ग्राहकमा नयाँ नाम र फोन हुन्छ; पुरानो यही रेकर्डमा रहन्छ।'],
  'When do they want to end?': ['언제 끝내고 싶어 하나요?', 'कहिले अन्त्य गर्न चाहन्छन्?'], 'Choose the main reason.': ['주된 이유를 고르세요.', 'मुख्य कारण छान्नुहोस्।'], 'Cannot be before the notice.': ['통지일보다 앞일 수 없어요.', 'सूचनाभन्दा अघि हुन सक्दैन।'],
  "Enter the new holder's name.": ['새 명의자 이름을 적으세요.', 'नयाँ धनीको नाम लेख्नुहोस्।'], 'Enter a 10-digit mobile number starting with 9.': ['9로 시작하는 10자리 휴대폰 번호를 적으세요.', '९ बाट सुरु हुने १० अंकको मोबाइल नम्बर लेख्नुहोस्।'], 'Choose what happens to the deposit.': ['보증금을 어떻게 할지 고르세요.', 'धरौटीको के हुन्छ छान्नुहोस्।'],
  'When was it lost?': ['언제 잃어버렸나요?', 'कहिले हरायो?'], 'Choose one.': ['하나 고르세요.', 'एउटा छान्नुहोस्।'], 'Cannot be after the day we were told.': ['우리가 들은 날보다 뒤일 수 없어요.', 'हामीलाई भनेको दिनभन्दा पछि हुन सक्दैन।'],
  '📜 Contract': ['📜 계약', '📜 सम्झौता'], 'Start recovery': ['회수 시작', 'फिर्ता सुरु'], Settle: ['정산', 'मिलान'], 'To do': ['할 일', 'गर्नुपर्ने'], All: ['전체', 'सबै'], 'Nothing open 🏖️': ['열린 일 없음 🏖️', 'केही बाँकी छैन 🏖️'], 'No contract events yet': ['계약 일 아직 없음', 'अझै सम्झौता घटना छैन'], 'New contract event': ['새 계약 일', 'नयाँ सम्झौता घटना'],
  'Notice to end · transfer to a new holder · lost or stolen — following the customer agreement working draft (2026-09-03, still with the lawyer).': ['해지 통지 · 명의 승계 · 분실·도난 — 고객 계약서 초안(2026-09-03, 변호사 검토 중)을 따라요.', 'अन्त्य सूचना · नयाँ धनीमा सार्ने · हराएको वा चोरी — ग्राहक सम्झौता मस्यौदा (2026-09-03, वकिलसँग) अनुसार।'],
  'notice · transfer · lost': ['통지 · 승계 · 분실', 'सूचना · सार्ने · हराएको'], 'e.g. son, new owner, tenant': ['예: 아들, 새 집주인, 세입자', 'जस्तै छोरा, नयाँ धनी, भाडावाल'], 'device lost or stolen — not settled': ['기기 분실·도난 — 정산 안 됨', 'उपकरण हराएको वा चोरी — मिलान भएन'], 'before 36 months': ['36개월 전', '३६ महिनाअघि'], 'after 36 months · deposit back with the unit (draft §2.2)': ['36개월 후 · 기기가 돌아오면 보증금 환불 (초안 §2.2)', '३६ महिनापछि · उपकरणसँग धरौटी फिर्ता (मस्यौदा §2.2)'], 'told us late (draft §2.5(b))': ['늦게 알림 (초안 §2.5(b))', 'ढिलो भने (मस्यौदा §2.5(b))'],
});
P.unshift([/^ending on (\S+) — book the recovery$/, '$1에 끝남 — 회수 예약', '$1 मा अन्त्य — फिर्ता बुक गर्नुहोस्'], [/^ending (\S+)$/, '$1 끝남', '$1 अन्त्य'], [/^settled (\S+)$/, '$1 정산', '$1 मिलान'],
  [/^before 36 months · deposit paid (NPR [\d,]+) is kept \(draft §2\.2\)$/, '36개월 전 · 낸 보증금 $1 몰취 (초안 §2.2)', '३६ महिनाअघि · तिरेको धरौटी $1 राखिन्छ (मस्यौदा §2.2)'],
  [/^Less than 30 days' notice \(draft §2\.2\) — earliest end (\S+)\.$/, '30일 전 통지가 아니에요 (초안 §2.2) — 가장 빠른 종료일 $1.', '३० दिनभन्दा कम सूचना (मस्यौदा §2.2) — सबैभन्दा छिटो अन्त्य $1।'],
  [/^Told us after (\d+) days — the draft asks for (\d+) \(§2\.5\(b\)\)\.$/, '$1일 뒤에 알렸어요 — 초안은 $2일 안 (§2.5(b)).', '$1 दिनपछि भने — मस्यौदाले $2 दिन भन्छ (§2.5(b))।'],
  [/^(\d+) home\(s\) ending soon — book the recovery$/, '곧 끝나는 집 $1곳 — 회수 예약', 'चाँडै अन्त्य हुने $1 घर — फिर्ता बुक गर्नुहोस्'], [/^(\d+) lost or stolen device\(s\) not settled$/, '정산 안 된 분실·도난 기기 $1대', 'मिलान नभएका हराएका वा चोरी $1 उपकरण'],
  [/^Contract events \((\d+)\)$/, '계약 일 ($1)', 'सम्झौता घटना ($1)'], [/^(\d+) to do$/, '할 일 $1건', '$1 गर्नुपर्ने'],
  [/^month (\S+) · minimum ends (\S+)$/, '$1개월째 · 최소 기간 끝 $2', '$1 औं महिना · न्यूनतम अवधि $2 मा सकिन्छ'], [/^Draft §2\.2: the deposit paid so far \((NPR [\d,]+)\) is kept\.$/, '초안 §2.2: 지금까지 낸 보증금($1)은 돌려주지 않아요.', 'मस्यौदा §2.2: अहिलेसम्म तिरेको धरौटी ($1) फिर्ता हुँदैन।'],
  [/^The unit comes back within 7 days — by (\S+)\.$/, '기기는 7일 안에 회수 — $1까지.', 'उपकरण ७ दिनभित्र फिर्ता — $1 सम्म।'], [/^30 days' notice — earliest end (\S+)\.$/, '30일 전 통지 — 가장 빠른 종료일 $1.', '३० दिनको सूचना — सबैभन्दा छिटो अन्त्य $1।'],
  [/^The deposit \((NPR [\d,]+)\) is refunded with the unit back in working order\.$/, '기기가 정상으로 돌아오면 보증금($1)을 돌려줘요.', 'उपकरण ठीक अवस्थामा फर्केपछि धरौटी ($1) फिर्ता हुन्छ।'],
  [/^Draft §2\.5\(b\): the customer tells us within (\d+) days\.$/, '초안 §2.5(b): 고객은 $1일 안에 알려야 해요.', 'मस्यौदा §2.5(b): ग्राहकले $1 दिनभित्र भन्नुपर्छ।'], [/^Saving marks the device (\S+) as “Lost \/ stolen”\.$/, '저장하면 기기 $1이(가) 「분실·도난」으로 표시돼요.', 'सेभ गर्दा उपकरण $1 «हराएको / चोरी» हुन्छ।']);
Object.assign(W, {
  'Before 36 months': ['36개월 전', '३६ महिनाअघि'], 'The unit comes back within 7 days.': ['기기는 7일 안에 회수.', 'उपकरण ७ दिनभित्र फिर्ता।'], 'The install fee and the months served are not refunded.': ['설치비와 지난 달 구독료는 돌려주지 않아요.', 'जडान शुल्क र बितेका महिनाको शुल्क फिर्ता हुँदैन।'],
  '🔴 [TBC] what happens to the part of the deposit not paid yet.': ['🔴 [TBC] 아직 안 낸 보증금 부분은 어떻게 할지 — 변호사 답 전.', '🔴 [TBC] अझै नतिरेको धरौटीको भाग के हुन्छ — वकिलको जवाफ बाँकी।'],
  '[TBC] what happens to the part of the deposit not paid yet.': ['[TBC] 아직 안 낸 보증금 부분은 어떻게 할지 — 변호사 답 전.', '[TBC] अझै नतिरेको धरौटीको भाग के हुन्छ — वकिलको जवाफ बाँकी।'],
  'After 36 months — draft §2.2:': ['36개월 후 — 초안 §2.2:', '३६ महिनापछि — मस्यौदा §2.2:'], "30 days' notice.": ['30일 전 통지.', '३० दिनको सूचना।'],
});

// v0.9 #4 sign-up screening (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Sign-up screening': ['가입 심사', 'दर्ता जाँच'], 'Sign-up screenings': ['가입 심사', 'दर्ता जाँच'], 'before an install': ['설치 전에', 'जडान अघि'], Screenings: ['가입 심사', 'दर्ता जाँच'], 'sign-up checks': ['가입 전 확인', 'दर्ता जाँच'],
  Home: ['집', 'घर'], 'Water & money': ['물·돈', 'पानी र पैसा'], Checks: ['확인', 'जाँच'],
  '🔴 First-guess rules (G-1 has no sign-up rule yet) — the verdict only advises; you decide at the end.': ['🔴 첫 추정 규칙이에요(G-1에 가입 규칙이 아직 없어요) — 판정은 참고일 뿐, 마지막에 사람이 정해요.', '🔴 पहिलो अनुमानका नियम (G-1 मा दर्ता नियम छैन) — नतिजा सल्लाह मात्र; अन्त्यमा तपाईं तय गर्नुहुन्छ।'],
  'Own house or rent?': ['자가예요, 세 살아요?', 'आफ्नै घर कि भाडा?'], 'Own house': ['자가', 'आफ्नै घर'], Renting: ['세입', 'भाडामा'], 'Landlord agreed to the unit?': ['집주인이 정수기 설치에 동의했나요?', 'घरधनीले उपकरणमा सहमति दिनुभयो?'],
  'Years living in this house': ['이 집에 산 햇수', 'यो घरमा बसेको वर्ष'], 'Will they stay here 36 months?': ['36개월 동안 여기 살 건가요?', '३६ महिना यहीँ बस्नुहुन्छ?'], 'Not sure': ['잘 모름', 'थाहा छैन'],
  'Drinking water now': ['지금 마시는 물', 'अहिले पिउने पानी'], 'Spent on drinking water a month (NPR)': ['한 달 식수 지출 (NPR)', 'महिनामा पिउने पानी खर्च (NPR)'], 'Main income': ['주 수입원', 'मुख्य आम्दानी'], 'Only the kind — do not ask the amount.': ['종류만 — 금액은 묻지 마세요.', 'प्रकार मात्र — रकम नसोध्नुहोस्।'],
  Salary: ['월급', 'तलब'], 'Business / shop': ['장사·가게', 'व्यापार / पसल'], 'Money from abroad': ['해외 송금', 'विदेशबाट पैसा'], Farming: ['농사', 'खेती'], 'Daily work': ['일당', 'दैनिक काम'],
  'Second phone (family)': ['두 번째 전화 (가족)', 'दोस्रो फोन (परिवार)'], 'Whose is it': ['누구 번호', 'कसको हो'], 'Citizenship card / ID seen?': ['시민증·신분증 봤나요?', 'नागरिकता / परिचयपत्र हेर्नुभयो?'],
  'Tick only — do not write the number or photograph it.': ['확인만 — 번호를 적거나 사진 찍지 마세요.', 'टिक मात्र — नम्बर नलेख्नुहोस्, फोटो नखिच्नुहोस्।'], 'Power point near the tap?': ['수도꼭지 근처에 콘센트가 있나요?', 'धारा नजिक बिजुलीको प्वाल छ?'], 'A tap the unit can use?': ['정수기에 쓸 수도꼭지가 있나요?', 'उपकरणले प्रयोग गर्न सक्ने धारा छ?'],
  'Your decision': ['내 결정', 'तपाईंको निर्णय'], 'Go ahead': ['진행', 'अगाडि बढ्ने'], Wait: ['대기', 'पर्खने'], 'Say no': ['거절', 'नभन्ने'],
  '✅ Pass': ['✅ 통과', '✅ पास'], '🟡 Check first': ['🟡 먼저 확인', '🟡 पहिले जाँच'], '🔴 Hold': ['🔴 보류', '🔴 रोक्ने'], Pass: ['통과', 'पास'], Check: ['확인', 'जाँच'], Hold: ['보류', 'रोक्ने'],
  'renting — the landlord has not agreed': ['세입 — 집주인 동의 없음', 'भाडा — घरधनीको सहमति छैन'], 'no power point near the tap': ['꼭지 근처 콘센트 없음', 'धारा नजिक बिजुली छैन'], 'no tap for the unit': ['쓸 수도꼭지 없음', 'उपकरणका लागि धारा छैन'],
  'will not stay 36 months': ['36개월 못 삶', '३६ महिना बस्दैनन्'], 'not sure they will stay 36 months': ['36개월 살지 모름', '३६ महिना बस्ने निश्चित छैन'], 'only one phone number': ['전화번호 하나뿐', 'एउटा मात्र फोन'], 'ID not seen': ['신분증 안 봄', 'परिचयपत्र हेरिएन'],
  'renting here less than a year': ['여기 세 산 지 1년 안 됨', 'यहाँ भाडामा एक वर्षभन्दा कम'], 'well / borehole water — hardness and arsenic can be high': ['우물·관정 물 — 경도·비소가 높을 수 있음', 'इनार / बोरिङको पानी — कडापन र आर्सेनिक बढी हुन सक्छ'],
  'First-guess rules — you decide below.': ['첫 추정 규칙 — 아래에서 직접 정하세요.', 'पहिलो अनुमानका नियम — तल तपाईं तय गर्नुहोस्।'], 'Choose your decision.': ['결정을 고르세요.', 'निर्णय छान्नुहोस्।'], '10-digit mobile starting with 9.': ['9로 시작하는 10자리 휴대폰 번호.', '९ बाट सुरु हुने १० अंकको मोबाइल।'],
  'The rules say hold — write why you go ahead in the notes.': ['규칙상 보류예요 — 진행하는 이유를 메모에 적으세요.', 'नियमले रोक्न भन्छ — किन अगाडि बढ्ने, नोटमा लेख्नुहोस्।'],
  'No sign-up screening for this phone yet — do one first (🔎 New → Sign-up screening), or save anyway.': ['이 번호로 가입 심사를 아직 안 했어요 — 먼저 하세요 (🔎 새 기록 → 가입 심사), 아니면 그냥 저장.', 'यो फोनको दर्ता जाँच भएको छैन — पहिले गर्नुहोस् (🔎 नयाँ → दर्ता जाँच), नभए पनि सेभ गर्नुहोस्।'],
  'Warn when an install has no screening?': ['심사 없이 설치하면 경고할까요?', 'जाँच बिना जडान गर्दा चेतावनी दिने?'], 'No — screening is optional': ['아니요 — 심사는 선택', 'होइन — जाँच ऐच्छिक'], 'Yes — warn before saving the install': ['예 — 설치 저장 전에 경고', 'हो — जडान सेभ गर्नुअघि चेतावनी'],
  '🔴 The screening rules are first guesses (G-1 has none yet) — they only advise.': ['🔴 심사 규칙은 첫 추정이에요(G-1에 아직 없음) — 참고만 해요.', '🔴 जाँचका नियम पहिलो अनुमान हुन् (G-1 मा छैन) — सल्लाह मात्र।'],
  '🔴 First-guess rules (G-1 has none yet) — the verdict advises, the person decides. Tap one to edit.': ['🔴 첫 추정 규칙(G-1에 아직 없음) — 판정은 참고, 결정은 사람. 누르면 수정.', '🔴 पहिलो अनुमानका नियम (G-1 मा छैन) — नतिजा सल्लाह, निर्णय मान्छेको। थिचेर सम्पादन।'],
  Verdict: ['판정', 'नतिजा'], Screened: ['심사함', 'जाँचिएको'], 'Became customers': ['고객이 됨', 'ग्राहक बने'], 'Ever 7+ days late': ['7일 넘게 밀린 적 있음', 'कहिल्यै ७+ दिन ढिलो'],
  '🔴 Fewer than 30 screened customers — too early to say whether the rules pick the right homes.': ['🔴 심사한 고객이 30명 미만 — 규칙이 맞는 집을 고르는지 판단하기엔 일러요.', '🔴 ३० भन्दा कम जाँचिएका ग्राहक — नियमले सही घर छान्छ कि भन्न छिटो।'],
  'No screenings yet': ['심사 아직 없음', 'अझै जाँच छैन'], 'e.g. husband, son abroad': ['예: 남편, 해외에 있는 아들', 'जस्तै श्रीमान्, विदेशमा छोरा'], 'New screening': ['새 심사', 'नयाँ जाँच'], Screen: ['심사', 'जाँच'], Screening: ['가입 심사', 'दर्ता जाँच'], '🔎 Sign-up screening': ['🔎 가입 심사', '🔎 दर्ता जाँच'],
});

// v0.9 #5 proof of visit (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Customer signature': ['고객 서명', 'ग्राहकको हस्ताक्षर'], 'Signed by (name)': ['서명한 사람 (이름)', 'हस्ताक्षर गर्ने (नाम)'], 'Sign here with a finger': ['여기에 손가락으로 서명', 'यहाँ औँलाले हस्ताक्षर गर्नुहोस्'], Erase: ['지우기', 'मेटाउनुहोस्'],
  'No signature — why?': ['서명 없음 — 왜?', 'हस्ताक्षर छैन — किन?'], 'Customer not at home (someone else there)': ['고객 없음 (다른 사람 있음)', 'ग्राहक घरमा छैन (अरू कोही छ)'], 'No time': ['시간 없음', 'समय छैन'], 'Phone problem': ['폰 문제', 'फोनको समस्या'],
  'Proof we were there — the customer signs with a finger (saved like a photo). No signature → say why.': ['우리가 갔다는 증거 — 고객이 손가락으로 서명해요 (사진처럼 저장). 서명이 없으면 이유를 고르세요.', 'हामी त्यहाँ गएको प्रमाण — ग्राहकले औँलाले हस्ताक्षर गर्छन् (फोटो जस्तै सेभ)। हस्ताक्षर नभए कारण भन्नुहोस्।'],
  'Proof of the install — the customer signs with a finger (saved like a photo). No signature → say why.': ['설치 증거 — 고객이 손가락으로 서명해요 (사진처럼 저장). 서명이 없으면 이유를 고르세요.', 'जडानको प्रमाण — ग्राहकले औँलाले हस्ताक्षर गर्छन् (फोटो जस्तै सेभ)। हस्ताक्षर नभए कारण भन्नुहोस्।'],
  'No signature — ask the customer to sign, or say why.': ['서명이 없어요 — 고객에게 서명을 받거나 이유를 고르세요.', 'हस्ताक्षर छैन — ग्राहकलाई हस्ताक्षर गराउनुहोस् वा कारण भन्नुहोस्।'],
  'Proof of visit': ['방문 증빙', 'भ्रमण प्रमाण'], 'signatures · 30 days': ['서명 · 30일', 'हस्ताक्षर · ३० दिन'], 'Customer signed': ['고객 서명함', 'ग्राहकले हस्ताक्षर गर्नुभयो'], 'With a saved spot': ['저장 위치 있음', 'सेभ गरिएको ठाउँ सहित'], 'No signature, no reason': ['서명도 이유도 없음', 'हस्ताक्षर र कारण दुवै छैन'],
  'No signature — why': ['서명 없음 — 이유', 'हस्ताक्षर छैन — कारण'], 'By person': ['사람별', 'व्यक्तिअनुसार'], 'no reason': ['이유 없음', 'कारण छैन'], 'No finished jobs in 30 days': ['30일 동안 끝난 작업 없음', '३० दिनमा सकिएको काम छैन'],
  'Last 30 days · finished visits and installs · signed = the customer signed on the phone (saved like a photo) · 📍 = the saved spot.': ['지난 30일 · 끝난 방문과 설치 · 서명 = 고객이 폰에 서명 (사진처럼 저장) · 📍 = 저장한 위치.', 'पछिल्लो ३० दिन · सकिएका भ्रमण र जडान · हस्ताक्षर = ग्राहकले फोनमा हस्ताक्षर (फोटो जस्तै) · 📍 = सेभ गरिएको ठाउँ।'],
  'Ask for a signature before saving a finished visit?': ['끝난 방문을 저장하기 전에 서명을 요구할까요?', 'सकिएको भ्रमण सेभ गर्नुअघि हस्ताक्षर माग्ने?'], 'No — the signature is optional': ['아니요 — 서명은 선택', 'होइन — हस्ताक्षर ऐच्छिक'], 'Yes — warn when there is no signature and no reason': ['예 — 서명도 이유도 없으면 경고', 'हो — हस्ताक्षर र कारण नभए चेतावनी'],
  "🔴 First guess — decide after Tara has tried it on real visits.": ['🔴 첫 추정 — Tara가 실제 방문에서 써 본 뒤 정하세요.', '🔴 पहिलो अनुमान — Tara ले वास्तविक भ्रमणमा प्रयोग गरेपछि तय गर्नुहोस्।'],
});
P.unshift([/^(\d+) of (\d+) signed$/, '$2건 중 $1건 서명', '$2 मध्ये $1 हस्ताक्षर']);

// v0.9 #6 supplier claims (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Supplier claim': ['공급사 청구', 'आपूर्तिकर्ता दाबी'], 'Supplier claims': ['공급사 청구', 'आपूर्तिकर्ता दाबी'], 'defect → replace or credit': ['불량 → 교체·크레딧', 'बिग्रिएको → फेर्ने वा क्रेडिट'], 'defects → PI': ['불량 → PI', 'बिग्रिएको → PI'],
  'PI / order no.': ['PI·주문 번호', 'PI / अर्डर नं.'], Device: ['기기', 'उपकरण'], Part: ['부품', 'पार्ट'], 'Device serial': ['기기 시리얼', 'उपकरण सिरियल'], 'How many': ['몇 개', 'कति'],
  'Broken in transit': ['운송 중 파손', 'ढुवानीमा फुटेको'], 'Does not work': ['작동 안 함', 'चल्दैन'], Leak: ['누수', 'चुहावट'], 'Missing part': ['부품 빠짐', 'पार्ट छुटेको'], 'Found on': ['발견한 날', 'भेटिएको मिति'], 'Which PI rule': ['어떤 PI 조건', 'कुन PI नियम'],
  'On arrival (PI 7 · 14 days)': ['입고 때 (PI 7 · 14일)', 'आइपुग्दा (PI 7 · १४ दिन)'], 'After install (PI 4 · 30 days)': ['설치 후 (PI 4 · 30일)', 'जडानपछि (PI 4 · ३० दिन)'], 'Goods arrived on': ['물건 도착일', 'सामान आएको मिति'], 'Installed on': ['설치한 날', 'जडान मिति'],
  'Claim sent on': ['청구 보낸 날', 'दाबी पठाएको मिति'], 'Supplier reply': ['공급사 답', 'आपूर्तिकर्ताको जवाफ'], Replaced: ['교체됨', 'फेरियो'], Credited: ['크레딧', 'क्रेडिट'], 'Credit (USD)': ['크레딧 (USD)', 'क्रेडिट (USD)'],
  'Taken off an order already?': ['이미 주문에서 뺐나요?', 'अर्डरबाट घटाइसकियो?'], 'Photos (serial label, the fault, the box)': ['사진 (시리얼 라벨·고장 부위·상자)', 'फोटो (सिरियल लेबल, बिग्रिएको भाग, बाकस)'],
  'Fill in the date above — the deadline comes from it.': ['위 날짜를 넣으세요 — 기한이 거기서 나와요.', 'माथि मिति भर्नुहोस् — म्याद त्यसैबाट आउँछ।'], 'PI 4: 30 days after install': ['PI 4: 설치 후 30일', 'PI 4: जडानपछि ३० दिन'], 'PI 7: 14 days after arrival': ['PI 7: 도착 후 14일', 'PI 7: आइपुगेपछि १४ दिन'],
  'Found after the deadline — ask anyway, but the PI does not promise it.': ['기한 지나서 발견 — 그래도 요청은 하되, PI가 보장하진 않아요.', 'म्याद नाघेर भेटियो — माग्नुहोस्, तर PI ले ग्यारेन्टी गर्दैन।'],
  'What is wrong?': ['뭐가 문제예요?', 'के बिग्रियो?'], 'Which PI rule?': ['어떤 PI 조건이에요?', 'कुन PI नियम?'], 'Enter the serial (the supplier asks for it).': ['시리얼을 적으세요 (공급사가 요구해요).', 'सिरियल लेख्नुहोस् (आपूर्तिकर्ताले माग्छ)।'], 'Which part?': ['어떤 부품?', 'कुन पार्ट?'],
  'When did the goods arrive?': ['물건이 언제 도착했나요?', 'सामान कहिले आयो?'], 'When was it installed?': ['언제 설치했나요?', 'कहिले जडान भयो?'], 'Check the number (1–500).': ['숫자를 확인하세요 (1–500).', 'संख्या जाँच्नुहोस् (१–५००)।'], 'How much credit (USD)?': ['크레딧이 얼마예요 (USD)?', 'कति क्रेडिट (USD)?'],
  'Add photos — the supplier asks for the serial label and the fault.': ['사진을 넣으세요 — 공급사가 시리얼 라벨과 고장 부위를 요구해요.', 'फोटो थप्नुहोस् — आपूर्तिकर्ताले सिरियल लेबल र बिग्रिएको भाग माग्छ।'],
  'Claim to supplier': ['공급사에 청구', 'आपूर्तिकर्तालाई दाबी'], 'PI TQ-PI-20260808: condition 7 — inspect within 14 days of arrival · condition 4 — faulty within 30 days of install = replaced or credited.': ['PI TQ-PI-20260808: 조건 7 — 도착 후 14일 안 검수 · 조건 4 — 설치 후 30일 안 불량 = 교체 또는 크레딧.', 'PI TQ-PI-20260808: सर्त 7 — आइपुगेको १४ दिनभित्र जाँच · सर्त 4 — जडानको ३० दिनभित्र बिग्रिए फेर्ने वा क्रेडिट।'],
  'Credit to take off the next order': ['다음 주문에서 뺄 크레딧', 'अर्को अर्डरबाट घटाउने क्रेडिट'], 'e.g. UV lamp, 1/2" to 1/4" adapter': ['예: UV 램프, 1/2"→1/4" 어댑터', 'जस्तै UV बत्ती, 1/2" देखि 1/4" एडाप्टर'], 'Open claims': ['열린 청구', 'खुला दाबी'], 'No claims yet': ['청구 아직 없음', 'अझै दाबी छैन'], 'New claim': ['새 청구', 'नयाँ दाबी'], 'not sent — deadline passed': ['안 보냄 — 기한 지남', 'पठाइएन — म्याद नाघ्यो'],
});
P.unshift([/^Claim by (\S+)$/, '$1까지 청구', '$1 सम्म दाबी'], [/^claim by (\S+)$/, '$1까지 청구', '$1 सम्म दाबी'], [/^sent (\S+)$/, '$1 보냄', '$1 पठाइयो'], [/^credit USD ([\d.]+)$/, '크레딧 USD $1', 'क्रेडिट USD $1'], [/^(\d+) day\(s\) left to send it\.$/, '보낼 날이 $1일 남았어요.', 'पठाउन $1 दिन बाँकी।'],
  [/^Past the PI deadline \((\S+)\) — save anyway if you will still ask\.$/, 'PI 기한($1)이 지났어요 — 그래도 요청할 거면 그냥 저장.', 'PI म्याद ($1) नाघ्यो — माग्ने भए सेभ गर्नुहोस्।'], [/^(\d+) supplier claim\(s\) to send — PI deadline$/, '보낼 공급사 청구 $1건 — PI 기한', 'पठाउनुपर्ने $1 आपूर्तिकर्ता दाबी — PI म्याद'], [/^(\d+) open$/, '$1건 열림', '$1 खुला']);

// v0.9 #7 parts & tools (🔴 Nepali = draft for Tara)
Object.assign(W, {
  Tool: ['공구', 'औजार'], 'who has it · repairs': ['누가 가졌나 · 수리', 'कोसँग छ · मर्मत'], Person: ['사람', 'व्यक्ति'], 'Signed receipt': ['서명한 수령증', 'हस्ताक्षर गरिएको रसिद'],
  'Installs and filter changes are subtracted automatically. Issue = a person takes parts for the day, Return = brings back what is left (G-1 §5-3).': ['설치와 필터 교체는 자동으로 빠져요. 지급 = 그날 쓸 부품을 가져감, 반납 = 남은 걸 돌려줌 (G-1 §5-3).', 'जडान र फिल्टर फेर्दा आफैँ घट्छ। जारी = दिनभरिको पार्ट लैजाने, फिर्ता = बाँकी ल्याउने (G-1 §5-3)।'],
  'Who takes or brings back the parts?': ['누가 부품을 가져가거나 돌려주나요?', 'पार्ट कसले लैजान्छ वा फर्काउँछ?'], 'Parts used (one each)': ['쓴 부품 (각 1개)', 'प्रयोग गरेका पार्ट (एक-एक)'], 'Counted off stock. Two of the same → write it below.': ['재고에서 빠져요. 같은 게 2개면 아래에 적으세요.', 'मौज्दातबाट घट्छ। एउटै दुई भए तल लेख्नुहोस्।'],
  'Parts came from': ['부품 출처', 'पार्ट कहाँबाट'], 'my bag': ['내 가방', 'मेरो झोला'], shelf: ['선반(창고)', 'र्‍याक (गोदाम)'], 'My bag = issued to me this morning (G-1 §5-3). Shelf = taken straight from stock.': ['내 가방 = 오늘 아침 지급받은 것 (G-1 §5-3). 선반 = 창고에서 바로 가져온 것.', 'मेरो झोला = आज बिहान पाएको (G-1 §5-3)। र्‍याक = सिधै गोदामबाट।'],
  'Other parts / extra quantity': ['다른 부품 · 추가 수량', 'अन्य पार्ट / थप संख्या'], 'e.g. TDS meter, drill, pipe cutter': ['예: TDS 측정기, 드릴, 파이프 커터', 'जस्तै TDS मिटर, ड्रिल, पाइप कटर'], 'Serial / mark': ['시리얼·표시', 'सिरियल / चिन्ह'], 'Bought on': ['산 날', 'किनेको मिति'], 'Cost (NPR)': ['값 (NPR)', 'मूल्य (NPR)'],
  'Who has it': ['누가 가지고 있나', 'कोसँग छ'], Office: ['사무실', 'कार्यालय'], State: ['상태', 'अवस्था'], OK: ['정상', 'ठीक'], 'Needs repair': ['수리 필요', 'मर्मत चाहिन्छ'], Broken: ['고장', 'बिग्रियो'], Lost: ['분실', 'हरायो'], 'How it happened': ['어떻게 된 일', 'कसरी भयो'],
  'Normal use (company pays)': ['정상 사용 (회사 부담)', 'सामान्य प्रयोग (कम्पनीले तिर्ने)'], 'Carelessness (person pays half · G-1 §5-3)': ['부주의 (본인 절반 부담 · G-1 §5-3)', 'लापरबाही (व्यक्तिले आधा तिर्ने · G-1 §5-3)'], 'Repair or replacement cost (NPR)': ['수리·교체 비용 (NPR)', 'मर्मत वा फेर्ने खर्च (NPR)'],
  'Last checked / calibrated': ['마지막 점검·보정일', 'पछिल्लो जाँच / क्यालिब्रेसन'], 'For meters (TDS, flow): the day it was checked against a known value.': ['측정기(TDS·유량)용: 기준값으로 확인한 날.', 'मिटर (TDS, फ्लो): ज्ञात मानसँग जाँचेको दिन।'], 'Name the tool.': ['공구 이름을 적으세요.', 'औजारको नाम लेख्नुहोस्।'], 'How did it happen? (G-1 §5-3)': ['어떻게 된 일인가요? (G-1 §5-3)', 'कसरी भयो? (G-1 §5-3)'],
  '🔩 Parts': ['🔩 부품', '🔩 पार्ट'], Shelf: ['선반', 'र्‍याक'], order: ['주문', 'अर्डर'], '🧰 Tools': ['🧰 공구', '🧰 औजार'], With: ['가진 사람', 'कोसँग'], 'Last check': ['점검일', 'पछिल्लो जाँच'], 'Staff pays': ['직원 부담', 'कर्मचारीले तिर्ने'], 'No tools recorded yet': ['공구 기록 아직 없음', 'अझै औजार छैन'],
  'Add a tool': ['공구 추가', 'औजार थप्नुहोस्'], 'Parts list (one per line)': ['부품 목록 (한 줄에 하나)', 'पार्ट सूची (एक लाइनमा एक)'], 'Empty = the PI spare lines (🟡 TQ-PI-20260808). A renamed part starts a new stock line.': ['비우면 = PI 예비품 줄 (🟡 TQ-PI-20260808). 이름을 바꾸면 재고 줄이 새로 시작돼요.', 'खाली = PI का स्पेयर लाइन (🟡 TQ-PI-20260808)। नाम फेरे नयाँ मौज्दात लाइन सुरु हुन्छ।'],
  'Order more when the shelf has fewer than': ['선반에 이보다 적으면 주문', 'र्‍याकमा यति भन्दा कम भए अर्डर'], 'A negative number = used from the bag with no issue record — record the morning issue (G-1 §5-3).': ['음수 = 지급 기록 없이 가방에서 씀 — 아침 지급을 기록하세요 (G-1 §5-3).', 'ऋणात्मक = जारी रेकर्ड बिना झोलाबाट प्रयोग — बिहानको जारी लेख्नुहोस् (G-1 §5-3)।'],
  'UV lamp 6W': ['UV 램프 6W', 'UV बत्ती 6W'], 'UV quartz sleeve': ['UV 석영관', 'UV क्वार्ट्ज स्लिभ'], 'UV ballast 6W': ['UV 안정기 6W', 'UV ब्यालास्ट 6W'], Pump: ['펌프', 'पम्प'], '1/4" quick fitting': ['1/4" 퀵피팅', '1/4" क्विक फिटिङ'], '3/8" fitting / adapter': ['3/8" 피팅·어댑터', '3/8" फिटिङ / एडाप्टर'], '1/4" inline ball valve': ['1/4" 인라인 볼밸브', '1/4" इनलाइन बल भल्भ'], 'Angle valve': ['앵글밸브', 'एङ्गल भल्भ'], 'O-ring set': ['O링 세트', 'O-रिङ सेट'], 'Tubing 1/4" (m)': ['1/4" 튜브 (m)', '1/4" ट्युब (m)'],
});
P.unshift([/^(In|Out|Adjustment|Disposal|Issue|Return) (-?[\d.]+) × (.+)$/, (m) => `${T(m[1])} ${m[2]} × ${T(m[3])}`, (m) => `${T(m[1])} ${m[2]} × ${T(m[3])}`], [/^Part: (.+)$/, (m) => `부품: ${T(m[1])}`, (m) => `पार्ट: ${T(m[1])}`], [/^(\d+) part\(s\) below (\d+) on the shelf$/, '선반에 $2개 미만인 부품 $1종', 'र्‍याकमा $2 भन्दा कम $1 पार्ट'],
  [/^Shelf = in − out − issued \+ returned − used from the shelf\. Order more below (\d+) \(🔴 first guess · Settings\)\. G-1 §5-3: issue in the morning, return in the evening — both signed\.$/, '선반 = 입고 − 출고 − 지급 + 반납 − 선반에서 바로 쓴 것. $1개 미만이면 주문 (🔴 첫 추정 · 설정). G-1 §5-3: 아침에 지급, 저녁에 반납 — 둘 다 서명.', 'र्‍याक = आएको − गएको − जारी + फिर्ता − र्‍याकबाट प्रयोग। $1 भन्दा कम भए अर्डर (🔴 पहिलो अनुमान · सेटिङ)। G-1 §5-3: बिहान जारी, साँझ फिर्ता — दुवै हस्ताक्षर।']);

// v0.9 #8 deputy admin + handover (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'If Jun cannot work': ['Jun이 일을 못 할 때', 'Jun काम गर्न नसक्दा'], 'handover page': ['인계 페이지', 'हस्तान्तरण पृष्ठ'], '🆘 If Jun cannot work': ['🆘 Jun이 일을 못 할 때', '🆘 Jun काम गर्न नसक्दा'],
  'One page to print and keep with the paper vault. No passwords in this app — they are on paper.': ['인쇄해서 종이 금고와 같이 두는 한 장. 이 앱엔 비밀번호가 없어요 — 종이에 있어요.', 'छापेर कागजी तिजोरीसँग राख्ने एक पाना। यो एपमा पासवर्ड छैन — कागजमा छ।'],
  'Who runs the app': ['앱을 누가 운영하나', 'एप कसले चलाउँछ'], Admin: ['관리자', 'प्रशासक'], 'Deputy admin': ['대리 관리자', 'सहायक प्रशासक'], 'none yet — Staff page → ⭐ Make deputy admin': ['아직 없음 — 직원 화면 → ⭐ 대리 관리자로', 'अझै छैन — कर्मचारी पृष्ठ → ⭐ सहायक प्रशासक बनाउनुहोस्'],
  'The deputy has every right: money OKs (not their own), staff accounts (not the deputy), the change log, backups, dispatch. Only Jun: settings and choosing the deputy.': ['대리 관리자는 모든 권한이 있어요: 돈 승인(자기 건 제외) · 직원 계정(대리 제외) · 변경 기록 · 백업 · 배정. Jun만: 설정, 대리 지정.', 'सहायकसँग सबै अधिकार: पैसा स्वीकृति (आफ्नो बाहेक), कर्मचारी खाता (सहायक बाहेक), परिवर्तन लग, ब्याकअप, खटाइ। Jun मात्र: सेटिङ र सहायक छान्ने।'],
  Backups: ['백업', 'ब्याकअप'], 'Last backup': ['마지막 백업', 'पछिल्लो ब्याकअप'], 'Backup page → Excel + JSON (photos optional). Keep one copy off this computer.': ['백업 화면 → 엑셀 + JSON (사진 선택). 한 부는 이 컴퓨터 밖에 두세요.', 'ब्याकअप पृष्ठ → एक्सेल + JSON (फोटो ऐच्छिक)। एक प्रति यो कम्प्युटर बाहिर राख्नुहोस्।'],
  'The server (Firebase)': ['서버 (Firebase)', 'सर्भर (Firebase)'], Project: ['프로젝트', 'प्रोजेक्ट'], 'While Jun can: Firebase console → Project settings → Users and permissions → add the deputy’s Google account as Owner. Without that nobody else can change the server rules or the billing account.': ['Jun이 할 수 있을 때: Firebase 콘솔 → 프로젝트 설정 → 사용자 및 권한 → 대리 관리자의 Google 계정을 소유자로 추가. 그게 없으면 아무도 서버 규칙이나 결제 계정을 못 바꿔요.', 'Jun ले सक्दा: Firebase कन्सोल → प्रोजेक्ट सेटिङ → प्रयोगकर्ता र अनुमति → सहायकको Google खाता Owner थप्नुहोस्। नत्र अरू कसैले सर्भर नियम वा बिलिङ फेर्न सक्दैन।'],
  'Website and code': ['웹사이트와 코드', 'वेबसाइट र कोड'], 'Domain koracarenepal.com — the renewal date is in the calendar. The app code and its history are backed up on Jun’s Mac (Documents → kora-care → product → software).': ['도메인 koracarenepal.com — 갱신일은 달력에 있어요. 앱 코드와 이력은 Jun 맥북에 백업돼 있어요 (문서 → kora-care → product → software).', 'डोमेन koracarenepal.com — नवीकरण मिति पात्रोमा छ। एपको कोड र इतिहास Jun को म्याकमा ब्याकअप छ (Documents → kora-care → product → software)।'],
  'People to call': ['연락할 사람', 'फोन गर्ने मान्छे'], 'Jun: add the CA, lawyer, supplier and bank contacts in Settings → Handover.': ['Jun: 설정 → 인계에 CA·변호사·공급사·은행 연락처를 넣어 두세요.', 'Jun: सेटिङ → हस्तान्तरणमा CA, वकिल, आपूर्तिकर्ता र बैंकको सम्पर्क राख्नुहोस्।'],
  'Coming deadlines · 60 days': ['다가오는 기한 · 60일', 'आउँदा म्याद · ६० दिन'], Passwords: ['비밀번호', 'पासवर्ड'], 'Never typed into this app or into a chat. Jun keeps them on paper in his vault — ask him where, now, while he can answer.': ['이 앱이나 채팅에 절대 적지 않아요. Jun이 종이로 금고에 보관해요 — 답할 수 있을 때 어디 있는지 지금 물어보세요.', 'यो एप वा च्याटमा कहिल्यै लेखिँदैन। Jun ले कागजमा तिजोरीमा राख्छन् — उहाँले जवाफ दिन सक्दा अहिले नै सोध्नुहोस्।'],
  'Jun’s notes': ['Jun 메모', 'Jun का नोट'], 'Handover checked': ['인계 점검일', 'हस्तान्तरण जाँच'], 'Checked today': ['오늘 점검함', 'आज जाँचियो'], Print: ['인쇄', 'छाप्नुहोस्'],
  'Handover (if Jun cannot work)': ['인계 (Jun이 일을 못 할 때)', 'हस्तान्तरण (Jun काम गर्न नसक्दा)'], 'People to call (one per line)': ['연락할 사람 (한 줄에 하나)', 'फोन गर्ने मान्छे (एक लाइनमा एक)'], 'Notes for the deputy': ['대리 관리자에게 남길 메모', 'सहायकका लागि नोट'], '🚫 No passwords here — they stay on paper.': ['🚫 여기엔 비밀번호를 적지 마세요 — 종이에만.', '🚫 यहाँ पासवर्ड नलेख्नुहोस् — कागजमा मात्र।'],
  'Only Jun (admin) changes settings — the deputy can read them.': ['설정은 Jun(관리자)만 바꿔요 — 대리 관리자는 볼 수만 있어요.', 'सेटिङ Jun (प्रशासक) ले मात्र फेर्छन् — सहायकले हेर्न मात्र सक्छ।'], 'Only Jun changes settings': ['설정은 Jun만 바꿔요', 'सेटिङ Jun ले मात्र फेर्छन्'], 'Only Jun picks the deputy': ['대리는 Jun만 정해요', 'सहायक Jun ले मात्र छान्छन्'],
  '⭐ Make deputy admin': ['⭐ 대리 관리자로', '⭐ सहायक प्रशासक बनाउनुहोस्'], '⭐ Remove deputy admin': ['⭐ 대리 관리자 해제', '⭐ सहायक प्रशासक हटाउनुहोस्'], '⭐ Deputy admin set': ['⭐ 대리 관리자 지정됨', '⭐ सहायक प्रशासक तोकियो'], 'Deputy removed': ['대리 해제됨', 'सहायक हटाइयो'], 'Handover checked today': ['오늘 인계 점검함', 'आज हस्तान्तरण जाँचियो'],
  'Your own account — Jun changes it.': ['내 계정이에요 — Jun이 바꿔요.', 'तपाईंकै खाता — Jun ले फेर्छन्।'], 'Only Jun and the deputy manage accounts.': ['계정은 Jun과 대리 관리자만 관리해요.', 'खाता Jun र सहायकले मात्र व्यवस्थापन गर्छन्।'],
  'every right; runs things when Jun cannot (Emergency handover page). Cannot approve their own money actions.': ['모든 권한 · Jun이 못 할 때 운영 (비상 인계 페이지). 자기 돈 작업은 승인 못 해요.', 'सबै अधिकार; Jun नसक्दा चलाउँछन् (आपत्कालीन हस्तान्तरण पृष्ठ)। आफ्नो पैसा काम स्वीकृत गर्न सक्दैनन्।'],
});

// v0.9 #9 payroll (🔴 Nepali = draft for Tara)
Object.assign(W, {
  Payroll: ['급여', 'तलब'], 'SSF · TDS · payslips': ['SSF · 원천세 · 급여명세서', 'SSF · TDS · तलबपर्ची'], '💼 Payroll': ['💼 급여', '💼 तलब'], 'Staff pay': ['직원 급여', 'कर्मचारी तलब'], Job: ['직무', 'काम'], 'e.g. field technician': ['예: 현장 기사', 'जस्तै फिल्ड प्राविधिक'],
  'Basic salary a month (NPR)': ['월 기본급 (NPR)', 'मासिक आधारभूत तलब (NPR)'], 'Allowances a month (NPR)': ['월 수당 (NPR)', 'मासिक भत्ता (NPR)'], 'In the Social Security Fund (SSF)?': ['사회보장기금(SSF) 가입?', 'सामाजिक सुरक्षा कोष (SSF) मा?'],
  '🟡 11% from the salary + 20% from the company, on the basic salary.': ['🟡 기본급 기준 — 월급에서 11% + 회사가 20%.', '🟡 आधारभूत तलबमा — तलबबाट ११% + कम्पनीबाट २०%।'], 'Started on': ['시작일', 'सुरु मिति'], 'Still working here?': ['아직 일하나요?', 'अझै काम गर्दै?'], 'Enter the basic salary.': ['기본급을 적으세요.', 'आधारभूत तलब लेख्नुहोस्।'], 'Check the amount.': ['금액을 확인하세요.', 'रकम जाँच्नुहोस्।'],
  'Payroll is off (Settings → Staff on payroll?). No salaries before the work permit.': ['급여 기능이 꺼져 있어요 (설정 → 급여 있음?). 근로허가 전엔 급여 없음.', 'तलब बन्द छ (सेटिङ → तलबमा कर्मचारी?)। काम अनुमति अघि तलब छैन।'],
  "Nepali month · 🟡 SSF 11% + 20% on the basic salary (Embassy seminar slides) · 🔴 TDS only from the CA's table in Settings · a payslip is not a tax filing — the CA checks.": ['네팔력 달 · 🟡 SSF 기본급의 11% + 20% (대사관 세미나 자료) · 🔴 원천세는 설정에 넣은 CA 표로만 · 급여명세서는 세금 신고가 아니에요 — CA가 확인.', 'नेपाली महिना · 🟡 आधारभूत तलबमा SSF ११% + २०% (दूतावास सेमिनार) · 🔴 TDS सेटिङको CA तालिकाबाट मात्र · तलबपर्ची कर विवरण होइन — CA ले जाँच्छ।'],
  '🏖️ Dashain month — bonus suggested': ['🏖️ 다사인 달 — 보너스 제안', '🏖️ दशैं महिना — बोनस सुझाव'], "🔴 No tax table yet — ask the CA for this year's TDS table and type it in Settings → Payroll. TDS shows as —.": ['🔴 세율표가 아직 없어요 — CA에게 올해 원천세 표를 받아 설정에 넣으세요. 원천세는 — 로 보여요.', '🔴 कर तालिका छैन — CA सँग यो वर्षको TDS तालिका लिएर सेटिङमा राख्नुहोस्। TDS — देखिन्छ।'],
  Basic: ['기본급', 'आधारभूत'], Allowance: ['수당', 'भत्ता'], Bonus: ['보너스', 'बोनस'], Gross: ['총액', 'कुल'], 'SSF 11%': ['SSF 11%', 'SSF ११%'], TDS: ['원천세', 'TDS'], 'Net pay': ['실수령', 'खुद तलब'], 'SSF 20% (company)': ['SSF 20% (회사)', 'SSF २०% (कम्पनी)'], 'Company cost': ['회사 부담 총액', 'कम्पनीको खर्च'], min: ['최저', 'न्यूनतम'], saved: ['저장됨', 'सेभ भयो'], Total: ['합계', 'जम्मा'],
  'No staff pay yet — add a person below.': ['직원 급여 정보가 없어요 — 아래에서 추가하세요.', 'कर्मचारी तलब छैन — तल थप्नुहोस्।'], 'Save this month + expenses': ['이번 달 저장 + 지출 기록', 'यो महिना सेभ + खर्च'], 'Payroll CSV (for the CA)': ['급여대장 CSV (CA용)', 'तलब CSV (CA का लागि)'], 'Print payslips': ['급여명세서 인쇄', 'तलबपर्ची छाप्नुहोस्'], 'Add a person': ['사람 추가', 'व्यक्ति थप्नुहोस्'],
  'TDS table from the CA (one line per bracket: yearly amount up to, rate %; last line: rest, rate %)': ['CA가 준 원천세 표 (한 줄에 한 구간: 연간 금액 상한, 세율 %; 마지막 줄: rest, 세율 %)', 'CA को TDS तालिका (एक लाइनमा एक: वार्षिक रकमसम्म, दर %; अन्तिम: rest, दर %)'], '🔴 Empty = TDS shows as — on the Payroll page.': ['🔴 비우면 = 급여 화면에 원천세가 — 로 보여요.', '🔴 खाली = तलब पृष्ठमा TDS — देखिन्छ।'],
});
P.unshift([/^💼 (\d+) payslip\(s\) saved \+ expenses$/, '💼 급여명세서 $1건 저장 + 지출 기록', '💼 $1 तलबपर्ची सेभ + खर्च'], [/^Below the minimum wage NPR ([\d,]+) \(🟡\) — check with the CA\.$/, '최저임금 NPR $1 미만 (🟡) — CA와 확인하세요.', 'न्यूनतम तलब NPR $1 भन्दा कम (🟡) — CA सँग जाँच्नुहोस्।'],
  [/^🟡 Someone is below the minimum wage NPR ([\d,]+) \(Embassy seminar slides — check the current figure\)\. G-1 §5-2 says ([\d,]+)–([\d,]+) for field staff — \[conflict\], Jun decides\.$/, '🟡 최저임금 NPR $1 미만인 사람이 있어요 (대사관 세미나 자료 — 현재 금액 확인). G-1 §5-2는 현장 직원 $2–$3 — [충돌], Jun이 정함.', '🟡 कोही न्यूनतम तलब NPR $1 भन्दा कम (दूतावास सेमिनार — हालको रकम जाँच्नुहोस्)। G-1 §5-2 ले फिल्ड कर्मचारी $2–$3 भन्छ — [विरोधाभास], Jun ले तय गर्ने।'],
  [/^🟡 Minimum wage NPR ([\d,]+) \(Embassy seminar slides — check the current figure\)\. G-1 §5-2 says ([\d,]+)–([\d,]+) for field staff \[conflict\]\.$/, '🟡 최저임금 NPR $1 (대사관 세미나 자료 — 현재 금액 확인). G-1 §5-2는 현장 직원 $2–$3 [충돌].', '🟡 न्यूनतम तलब NPR $1 (दूतावास सेमिनार — हालको रकम जाँच्नुहोस्)। G-1 §5-2 ले फिल्ड कर्मचारी $2–$3 [विरोधाभास]।']);

// v0.9 #10 raw-water vials (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Raw-water vial': ['원수 바이알', 'कच्चा पानी भायल'], 'Raw-water vials': ['원수 바이알', 'कच्चा पानी भायल'], 'E. coli check (PoC)': ['대장균 확인 (PoC)', 'इ. कोलाई जाँच (PoC)'], 'E. coli · PoC': ['대장균 · PoC', 'इ. कोलाई · PoC'], 'Raw-water vial (PoC)': ['원수 바이알 (PoC)', 'कच्चा पानी भायल (PoC)'],
  '🚨 Our own check — never tell the customer the water is safe or unsafe from it. Every second install (about 25 homes), spread over water sources.': ['🚨 우리 판단용이에요 — 이걸로 고객에게 물이 안전하다·위험하다고 말하지 마세요. 두 집에 한 집꼴(약 25집), 물 종류별로 고르게.', '🚨 हाम्रो आफ्नै जाँच — यसबाट ग्राहकलाई पानी सुरक्षित वा असुरक्षित नभन्नुहोस्। हरेक दोस्रो जडान (करिब २५ घर), पानीको स्रोतअनुसार।'],
  'Vial filled from the kitchen tap before connecting?': ['정수기 연결 전에 부엌 꼭지 물을 바이알에 받았나요?', 'जोड्नुअघि भान्साको धाराबाट भायल भर्नुभयो?'], 'Filled on': ['받은 날', 'भरेको मिति'], 'Read on': ['읽은 날', 'पढेको मिति'], Colour: ['색', 'रङ'], 'Photo of the vial': ['바이알 사진', 'भायलको फोटो'],
  'Kitchen tap, before the unit is connected. Keep the vial warm (35 °C pocket incubator).': ['부엌 꼭지 물, 정수기 연결 전. 바이알은 따뜻하게 (35 °C 주머니 배양기).', 'भान्साको धारा, उपकरण जोड्नुअघि। भायल तातो राख्नुहोस् (३५ °C खल्ती इन्क्युबेटर)।'],
  'Blue = E. coli · pink = coliforms · no change = none seen. 🚨 Our own check — never tell the customer the water is safe or unsafe from it.': ['파랑 = 대장균 · 분홍 = 대장균군 · 변화 없음 = 안 보임. 🚨 우리 판단용 — 고객에게 물이 안전하다·위험하다고 말하지 마세요.', 'निलो = इ. कोलाई · गुलाबी = कोलिफर्म · परिवर्तन छैन = देखिएन। 🚨 हाम्रो जाँच मात्र — ग्राहकलाई सुरक्षित/असुरक्षित नभन्नुहोस्।'],
  'Blue — E. coli': ['파랑 — 대장균', 'निलो — इ. कोलाई'], 'Pink — coliforms': ['분홍 — 대장균군', 'गुलाबी — कोलिफर्म'], 'No change': ['변화 없음', 'परिवर्तन छैन'], 'Spoiled — redo': ['망침 — 다시', 'बिग्रियो — फेरि'],
  'When did you read it?': ['언제 읽었나요?', 'कहिले पढ्नुभयो?'], 'Cannot be before the vial was filled.': ['바이알 받은 날보다 앞일 수 없어요.', 'भायल भरेको दिनभन्दा अघि हुन सक्दैन।'], 'Read the water vial': ['원수 바이알 읽기', 'पानीको भायल पढ्नुहोस्'], Read: ['읽기', 'पढ्नुहोस्'], 'Read so far': ['읽은 수', 'पढिएका'], 'E. coli': ['대장균', 'इ. कोलाई'], Share: ['비율', 'हिस्सा'],
  '🚨 Our own check only — never tell a customer the water is safe or unsafe from it; only a lab result is said out loud. Every second install in the PoC (about 25 homes).': ['🚨 우리 판단용일 뿐 — 이걸로 고객에게 물이 안전하다·위험하다고 말하지 마세요. 소리 내 말하는 건 실험실 결과뿐. PoC 때 두 집에 한 집꼴(약 25집).', '🚨 हाम्रो जाँच मात्र — ग्राहकलाई सुरक्षित/असुरक्षित नभन्नुहोस्; प्रयोगशालाको नतिजा मात्र भनिन्छ। PoC मा हरेक दोस्रो जडान (करिब २५ घर)।'],
  'Vials filled': ['받은 바이알', 'भरिएका भायल'], 'E. coli (blue)': ['대장균 (파랑)', 'इ. कोलाई (निलो)'], 'Coliforms (pink)': ['대장균군 (분홍)', 'कोलिफर्म (गुलाबी)'], 'Waiting to be read': ['아직 안 읽음', 'पढ्न बाँकी'],
  'Dry-season results — the monsoon can differ. Areas with fewer than 5 read vials cannot be compared.': ['건기 결과예요 — 우기엔 다를 수 있어요. 읽은 바이알이 5개 미만인 지역은 비교할 수 없어요.', 'सुक्खा मौसमको नतिजा — वर्षामा फरक हुन सक्छ। ५ भन्दा कम पढिएका भायल भएका क्षेत्र तुलना गर्न मिल्दैन।'],
  '🔬 ENPHO test candidates': ['🔬 ENPHO 시험 후보', '🔬 ENPHO परीक्षणका उम्मेदवार'], 'None yet — needs blue (E. coli), municipal water and an install within 30 days (PI condition 4).': ['아직 없음 — 파랑(대장균) + 시 수돗물 + 설치 30일 안(PI 조건 4)이어야 해요.', 'अझै छैन — निलो (इ. कोलाई), नगरको धारा र ३० दिनभित्रको जडान चाहिन्छ (PI सर्त ४)।'],
  'By water source': ['물 종류별', 'पानीको स्रोतअनुसार'], 'By area': ['지역별', 'क्षेत्रअनुसार'], few: ['적음', 'थोरै'], Vials: ['바이알', 'भायल'], 'not read yet': ['아직 안 읽음', 'अझै पढिएन'], 'No vials yet': ['바이알 아직 없음', 'अझै भायल छैन'], 'New vial': ['새 바이알', 'नयाँ भायल'],
  'How many homes to test in the PoC': ['PoC 때 시험할 집 수', 'PoC मा जाँच्ने घर संख्या'],
});
P.unshift([/^(\d+) \(every second install\)$/, '$1 (두 집에 한 집꼴)', '$1 (हरेक दोस्रो जडान)'], [/^(\d+) water vial\(s\) to read$/, '읽을 원수 바이알 $1개', 'पढ्नुपर्ने $1 पानी भायल'], [/^filled (\S+)$/, '$1 받음', '$1 भरियो'], [/^test by (\S+)$/, '$1까지 시험', '$1 सम्म परीक्षण'], [/^95% range (\S+)–(\S+)$/, '95% 범위 $1–$2', '९५% दायरा $1–$2'], [/^(\d+) filled · PoC$/, '$1개 받음 · PoC', '$1 भरियो · PoC']);

// v0.9 review fixes (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Still leaving?': ['아직 해지하나요?', 'अझै छोड्दै?'], Withdrawn: ['철회', 'फिर्ता लिइयो'], 'Withdrawn = they changed their mind — the reminder stops.': ['철회 = 마음을 바꿈 — 알림이 멈춰요.', 'फिर्ता = मन फेरे — सम्झना रोकिन्छ।'],
  'Tap a part once for each one used (tap again = 2). − takes one off. Counted off stock.': ['쓴 개수만큼 부품을 누르세요 (두 번 = 2개). − 는 하나 빼기. 재고에서 빠져요.', 'प्रयोग गरेजति पार्ट थिच्नुहोस् (दुई पटक = २)। − ले एउटा घटाउँछ। मौज्दातबाट घट्छ।'],
  'Already saved — saved payslips are not rewritten': ['이미 저장됨 — 저장한 명세서는 다시 안 써요', 'पहिल्यै सेभ — सेभ गरेका तलबपर्ची फेरि लेखिँदैन'],
  'Ask Jun to add the name to Settings → technician names': ['Jun에게 설정 → 기사 이름에 추가해 달라고 하세요', 'Jun लाई सेटिङ → प्राविधिक नाममा थप्न भन्नुहोस्'],
  '🔴 The tax table has no "rest" line — income above the last bracket would be taxed at 0. Add the last line from the CA.': ['🔴 세율표에 「rest」 줄이 없어요 — 마지막 구간을 넘는 소득이 0으로 계산돼요. CA 표의 마지막 줄을 넣으세요.', '🔴 कर तालिकामा «rest» लाइन छैन — अन्तिम तहभन्दा माथिको आम्दानीमा कर ० हुन्छ। CA को अन्तिम लाइन थप्नुहोस्।'],
  'Saved lines keep the numbers they were saved with (a later pay change does not rewrite them).': ['저장한 줄은 저장할 때 숫자 그대로예요 (나중에 급여를 바꿔도 다시 안 써요).', 'सेभ गरिएका लाइन सेभ गर्दाकै अंकमा रहन्छन् (पछि तलब फेरे पनि बदलिँदैन)।'],
});

// v0.9.1 (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Jun set 30% on 2026-09-29 — 🔴 the lawyer still checks whether it holds (draft §2.2).': ['30%는 Jun 결정(2026-09-29) — 🔴 유효한지는 변호사가 확인 중(초안 §2.2).', '३०% Jun को निर्णय (२०२६-०९-२९) — 🔴 मान्य हुन्छ कि हुँदैन वकिलले हेर्दैछन् (मस्यौदा §2.2)।'],
  "Empty = the Inland Revenue table for 2083/84 (🟢, single = couple). SSF members pay no 1% band. Type the CA's table here to replace it.": ['비워 두면 국세청 2083/84 세율표(🟢 · 미혼 = 부부). SSF 가입자는 1% 구간 면제. CA 표를 넣으면 그걸 써요.', 'खाली = आन्तरिक राजस्व विभागको २०८३/८४ तालिका (🟢 · एकल = दम्पती)। SSF सदस्यलाई १% तह लाग्दैन। CA को तालिका लेखे त्यही प्रयोग हुन्छ।'],
  "Nepali month · 🟢 SSF 11% + 20% on the basic salary (SSF procedure §25) · 🟢 TDS from the Inland Revenue 2083/84 table unless the CA's is in Settings · a payslip is not a tax filing — the CA checks.": ['네팔력 달 · 🟢 SSF 기본급의 11% + 20%(SSF 운영절차 §25) · 🟢 TDS = 국세청 2083/84 세율표(설정에 CA 표가 있으면 그것) · 급여명세서는 세금 신고가 아니에요 — CA가 확인.', 'नेपाली महिना · 🟢 आधारभूत तलबमा SSF ११% + २०% (SSF कार्यविधि §25) · 🟢 TDS = आन्तरिक राजस्व २०८३/८४ तालिका (सेटिङमा CA को भए त्यही) · तलबपर्ची कर विवरण होइन — CA ले जाँच्छ।'],
  '🟢 Tax = the Inland Revenue table for 2083/84 (single = couple) · SSF members pay no 1% band · the CA can replace it in Settings.': ['🟢 세금 = 국세청 2083/84 세율표(미혼 = 부부) · SSF 가입자는 1% 구간 면제 · 설정에서 CA 표로 바꿀 수 있어요.', '🟢 कर = आन्तरिक राजस्व २०८३/८४ तालिका (एकल = दम्पती) · SSF सदस्यलाई १% तह लाग्दैन · सेटिङमा CA को तालिकाले बदल्न सकिन्छ।'],
  '🛑 Stop at 2–3 blue homes — that is enough to pick the ENPHO test home (Jun 2026-09-29). If none turn blue, test anyway: it then shows only that the water out meets the standard.': ['🛑 파란 집 2~3곳이 나오면 멈춰요 — ENPHO 시험 집 고르기엔 충분해요(Jun 2026-09-29). 하나도 안 나오면 그냥 시험: 그땐 「나오는 물이 기준 충족」만 보여줘요.', '🛑 २–३ नीलो घर भेटिएपछि रोक्नुहोस् — ENPHO परीक्षणको घर छान्न पुग्छ (Jun २०२६-०९-२९)। कुनै नीलो नभए पनि परीक्षण गर्नुहोस्: त्यसले बाहिर आउने पानी मापदण्डमा छ भन्ने मात्र देखाउँछ।'],
  'SSF Act §4(4): 25 days': ['SSF법 §4(4): 25일', 'SSF ऐन §4(4): २५ दिन'], '§90(1): 25 days': ['§90(1): 25일', '§90(1): २५ दिन'], 'e-TDS · §90(1): 25 days': ['e-TDS · §90(1): 25일', 'e-TDS · §90(1): २५ दिन'], /* v0.16.0 (8) payroll on by default → the TDS line shows */
});
P.unshift(
  [/^Early-ending charge \(30% of the subscription still to come\): (\d+) months left → (NPR [\d,]+)$/, '조기해지 위약금(남은 구독료의 30%): 남은 $1개월 → $2', 'चाँडै अन्त्य शुल्क (बाँकी सदस्यताको ३०%): बाँकी $1 महिना → $2'],
  [/^Deposit paid so far (NPR [\d,]+) is used first → the customer pays (NPR [\d,]+) more\.$/, '지금까지 낸 보증금 $1을 먼저 쓰고 → 고객이 $2 더 내요.', 'अहिलेसम्म तिरेको धरौटी $1 पहिले प्रयोग → ग्राहकले $2 थप तिर्छ।'],
  [/^Deposit paid so far (NPR [\d,]+) is used first → (NPR [\d,]+) goes back to the customer\.$/, '지금까지 낸 보증금 $1을 먼저 쓰고 → $2은 고객에게 돌려줘요.', 'अहिलेसम्म तिरेको धरौटी $1 पहिले प्रयोग → $2 ग्राहकलाई फिर्ता।'],
);

Object.assign(W, { 'Yes, leaving': ['네, 해지해요', 'हो, छोड्दै'] }); // 🔴 Nepali = draft for Tara

// v0.9.4 login (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Remember my email': ['이메일 기억하기', 'मेरो इमेल सम्झनुहोस्'],
  'Keep me signed in on this phone': ['이 폰에서 로그인 유지', 'यो फोनमा साइन इन राखिराख्नुहोस्'],
  'The app never stores your password. Let the phone save it (iPhone: Passwords).': ['앱은 비밀번호를 저장하지 않아요. 폰이 저장하게 하세요 (아이폰: 암호).', 'एपले पासवर्ड राख्दैन। फोनलाई सेभ गर्न दिनुहोस् (iPhone: Passwords)।'],
});
// v0.10 — Jun rules 2026-09-29 (🔴 Nepali = draft for Tara)
Object.assign(W, {
  'Empty = the skipped bill day + 1 month − 1 day. At most 1 month (Jun 2026-09-29).': ['비우면 = 건너뛴 청구일 + 1개월 − 1일. 최대 1개월 (Jun 2026-09-29).', 'खाली = छुटेको बिल मिति + १ महिना − १ दिन। बढीमा १ महिना (Jun २०२६-०९-२९)।'],
  'Back within 15 days of that bill day → that bill is charged. Either way it is the one pause for 12 months.': ['그 청구일부터 15일 안에 돌아오면 → 그 달은 청구해요. 어느 쪽이든 12개월에 한 번 쓰는 정지예요.', 'त्यो बिल मितिदेखि १५ दिनभित्र फर्के → त्यो बिल लाग्छ। जे भए पनि १२ महिनामा एक पटकको रोक हो।'],
  'Collect the cartridges at the start · fit new ones at the restart visit.': ['시작할 때 카트리지 회수 · 재개 방문 때 새것으로 교체.', 'सुरुमा कार्ट्रिज फिर्ता लिनुहोस् · फेरि सुरु गर्दा नयाँ राख्नुहोस्।'],
  '✅ All pause rules met (Jun 2026-09-29).': ['✅ 정지 규칙을 모두 충족해요 (Jun 2026-09-29).', '✅ रोकका सबै नियम पुगे (Jun २०२६-०९-२९)।'],
  'Money trouble is not a pause — it goes to collections (§2.7).': ['돈 문제는 정지가 아니에요 — 미납 절차로 가요 (§2.7).', 'पैसाको समस्या रोक होइन — बक्यौता प्रक्रियामा जान्छ (§2.7)।'],
  'Waiting for our repair is not a pause — the repair-delay credit covers it.': ['우리 수리를 기다리는 건 정지가 아니에요 — 수리 지연 감면으로 처리해요.', 'हाम्रो मर्मत कुर्नु रोक होइन — मर्मत ढिलाइ छुटले समेट्छ।'],
  'Only "away / house empty" is a pause.': ['「집 비움」만 정지예요.', '«घर खाली» मात्र रोक हो।'],
  'Whose fault was it?': ['누구 탓이었나요?', 'कसको गल्ती थियो?'], 'Our unit / our work': ['우리 기기 / 우리 작업', 'हाम्रो उपकरण / हाम्रो काम'], 'No — power, water supply or the customer': ['아님 — 정전·단수·고객', 'होइन — बिजुली, पानी आपूर्ति वा ग्राहक'],
  'Billing goes on. Not fixed within 7 days of the report → every day from the report comes off the next bill (Jun 2026-09-29).': ['청구는 계속돼요. 신고 후 7일 안에 못 고치면 → 신고한 날부터 매일치가 다음 청구서에서 빠져요 (Jun 2026-09-29).', 'बिल जारी रहन्छ। उजुरीको ७ दिनभित्र नबने → उजुरीको दिनदेखि हरेक दिनको रकम अर्को बिलबाट घट्छ (Jun २०२६-०९-२९)।'],
  'Moving abroad (proof seen)?': ['해외 이주 (증빙 확인)?', 'विदेश सर्दै (प्रमाण देखियो)?'], 'Jun 2026-09-29: moving abroad with proof → the early-ending charge is halved (🔴 the lawyer words the proof).': ['Jun 2026-09-29: 증빙 있는 해외 이주 → 조기해지 위약금 절반 (🔴 증빙 문구는 변호사).', 'Jun २०२६-०९-२९: प्रमाणसहित विदेश सर्दा → चाँडै अन्त्य शुल्क आधा (🔴 प्रमाणको शब्द वकिलले)।'],
  'Unit on the wall or on a stand?': ['벽에 달아요, 거치대에 둬요?', 'उपकरण भित्तामा कि स्ट्यान्डमा?'], Stand: ['거치대', 'स्ट्यान्ड'], Wall: ['벽', 'भित्ता'],
  "Wall = drilling. Renting + wall needs the landlord's written OK (Civil Code §396(1)).": ['벽 = 구멍 뚫기. 셋집 + 벽이면 집주인 서면 동의가 필요해요 (민법 §396(1)).', 'भित्ता = प्वाल पार्ने। भाडा + भित्ता भए घरधनीको लिखित सहमति चाहिन्छ (मुलुकी देवानी संहिता §396(1))।'],
  'Landlord agreed in writing?': ['집주인 서면 동의?', 'घरधनीको लिखित सहमति?'], 'Landlord — name': ['집주인 — 이름', 'घरधनी — नाम'], 'Landlord — mobile': ['집주인 — 휴대폰', 'घरधनी — मोबाइल'],
  'Months the money usually comes': ['돈이 보통 들어오는 달', 'पैसा प्रायः आउने महिना'], 'e.g. Baisakh, Kartik': ['예: 바이사크, 카르틱', 'जस्तै: वैशाख, कार्तिक'], 'For the bill day — not a reason to hold.': ['청구일 정하는 데만 써요 — 보류 사유 아님.', 'बिल मितिका लागि मात्र — रोक्ने कारण होइन।'],
  'First-day 4,900 in cash on the install day?': ['설치 날 첫날 4,900 현금?', 'जडान दिन पहिलो दिनको ४,९०० नगद?'], 'No = hold. The first day is not split, owed or waived (Jun 2026-09-29).': ['아니오 = 보류. 첫날 금액은 나누거나 외상·면제하지 않아요 (Jun 2026-09-29).', 'होइन = रोक्नुहोस्। पहिलो दिनको रकम टुक्र्याइँदैन, बाँकी राखिँदैन वा छुट हुँदैन (Jun २०२६-०९-२९)।'],
  'Referee — name · relation · phone': ['추천인 — 이름 · 관계 · 번호', 'सिफारिसकर्ता — नाम · नाता · फोन'], 'a neighbour, ward person or relative': ['이웃, 와드 사람, 친척', 'छिमेकी, वडाका व्यक्ति वा नातेदार'], 'Needed when there is only one phone, or renting here under a year.': ['전화가 하나뿐이거나 이 셋집에 1년 미만일 때 필요해요.', 'एउटा मात्र फोन भए वा यहाँ एक वर्षभन्दा कम भाडामा बसे चाहिन्छ।'],
  'Consent form signed?': ['동의서 서명?', 'सहमति पत्रमा सही?'], 'Needed before we tell a family number or referee about a late bill (Privacy Act §12).': ['미납을 가족 번호나 추천인에게 알리기 전에 필요해요 (개인정보법 §12).', 'ढिलो बिलबारे परिवार वा सिफारिसकर्तालाई भन्नुअघि चाहिन्छ (गोपनीयता ऐन §12)।'],
  'Check call made by': ['확인 전화한 사람', 'जाँच फोन गर्ने'], 'someone other than the seller — usually Tara': ['판매자가 아닌 사람 — 보통 타라', 'बेच्ने बाहेक अरू — प्रायः तारा'], 'Check call on': ['확인 전화 날짜', 'जाँच फोन मिति'],
  'cannot pay the first-day 4,900 in cash': ['첫날 4,900 현금을 못 냄', 'पहिलो दिनको ४,९०० नगद तिर्न सक्दैन'], 'renting + wall mounting — no written landlord consent': ['셋집 + 벽 설치 — 집주인 서면 동의 없음', 'भाडा + भित्तामा जडान — घरधनीको लिखित सहमति छैन'], 'renting — write the landlord name and phone + moving plans': ['셋집 — 집주인 이름·번호 + 이사 계획 적기', 'भाडा — घरधनीको नाम र फोन + सर्ने योजना लेख्नुहोस्'],
  'only one phone number — add a family number or a referee': ['전화 하나뿐 — 가족 번호나 추천인 추가', 'एउटा मात्र फोन — परिवारको नम्बर वा सिफारिसकर्ता थप्नुहोस्'], 'ID not seen — it must be seen by the install day (or no install)': ['신분증 못 봄 — 설치일까지 봐야 해요 (아니면 설치 안 함)', 'परिचयपत्र हेरिएन — जडान दिनसम्म हेर्नुपर्छ (नत्र जडान हुँदैन)'], 'renting here less than a year — add a referee': ['이 셋집 1년 미만 — 추천인 추가', 'यहाँ एक वर्षभन्दा कम भाडामा — सिफारिसकर्ता थप्नुहोस्'], 'no check call yet by someone other than the seller': ['판매자 아닌 사람의 확인 전화가 아직 없음', 'बेच्ने बाहेक अरूले अझै जाँच फोन गरेको छैन'],
  'ID not seen at the screening — see the ID before installing (hold).': ['심사 때 신분증을 못 봤어요 — 설치 전에 신분증을 보세요 (보류).', 'जाँचमा परिचयपत्र हेरिएन — जडानअघि हेर्नुहोस् (रोक्नुहोस्)।'],
  "Each pause is one line in the home's history (customer → ✏️ Edit → status). The first bill day after the start is skipped (one month) · back within 15 days → that bill is charged · rules: Jun 2026-09-29.": ['정지마다 이 집 이력에 한 줄씩 남아요 (고객 → ✏️ 수정 → 상태). 시작 뒤 첫 청구일을 건너뛰어요 (한 달) · 15일 안에 돌아오면 → 그 달은 청구 · 규칙: Jun 2026-09-29.', 'हरेक रोक घरको इतिहासमा एक लाइन हुन्छ (ग्राहक → ✏️ सम्पादन → स्थिति)। सुरुपछिको पहिलो बिल मिति छुट्छ (एक महिना) · १५ दिनभित्र फर्के → त्यो बिल लाग्छ · नियम: Jun २०२६-०९-२९।'],
  '🛠️ Late repairs': ['🛠️ 늦은 수리', '🛠️ ढिलो मर्मत'], 'Jun 2026-09-29: billing goes on; a breakdown, leak or water-quality problem not fixed within 7 days of the report → every day from the report comes off the next bill (1,100 ÷ 30 a day). Not our fault (power, water supply, the customer) → nothing.': ['Jun 2026-09-29: 청구는 계속. 고장·누수·수질 문제를 신고 후 7일 안에 못 고치면 → 신고일부터 매일치(하루 1,100 ÷ 30)가 다음 청구서에서 빠져요. 우리 탓이 아니면(정전·단수·고객) → 없음.', 'Jun २०२६-०९-२९: बिल जारी रहन्छ; बिग्रिएको, चुहावट वा पानीको गुणस्तर समस्या उजुरीको ७ दिनभित्र नबने → उजुरीको दिनदेखि हरेक दिन (दिनको १,१०० ÷ ३०) अर्को बिलबाट घट्छ। हाम्रो गल्ती नभए (बिजुली, पानी आपूर्ति, ग्राहक) → केही छैन।'],
  'still open': ['아직 진행 중', 'अझै खुला'], given: ['넣음', 'दिइयो'], 'No late repairs': ['늦은 수리 없음', 'ढिलो मर्मत छैन'], 'Service credit': ['수리 지연 감면', 'सेवा छुट'], 'service credit — no cash': ['수리 지연 감면 — 현금 아님', 'सेवा छुट — नगद होइन'], 'referral credit — no cash': ['추천 크레딧 — 현금 아님', 'रेफरल क्रेडिट — नगद होइन'], 'water smells since the rain': ['비 온 뒤로 물에서 냄새가 남', 'पानी परेदेखि पानी गनाउँछ'], 'no water coming out — pump not running': ['물이 안 나옴 — 펌프가 안 돎', 'पानी आउँदैन — पम्प चलेको छैन'], 'leak under the sink — their own pipe': ['싱크대 밑 누수 — 고객 쪽 배관', 'सिंकमुनि चुहावट — उहाँकै पाइप'], 'UV light off': ['UV 램프 꺼짐', 'UV बत्ती बन्द'], 'customer not found': ['고객을 못 찾음', 'ग्राहक भेटिएन'], 'pump replaced (part waited)': ['펌프 교체 (부품 대기)', 'पम्प फेरियो (पार्ट कुर्नुपर्‍यो)'],
});
P.unshift(
  [/^(⚠️ )?Pauses start 6 months after the install — from (\S+)\.$/, '$1설치 6개월 뒤부터 정지할 수 있어요 — $2부터.', '$1जडानको ६ महिनापछि मात्र रोक्न मिल्छ — $2 देखि।'],
  [/^(⚠️ )?One pause in 12 months — the last one started (\S+) \(next from (\S+)\)\.$/, '$112개월에 한 번 — 지난번은 $2에 시작 (다음은 $3부터).', '$1१२ महिनामा एक पटक — पछिल्लो $2 मा सुरु (अर्को $3 देखि)।'],
  [/^(⚠️ )?(NPR [\d,]+) overdue — it must be 0 before the pause starts \(it can be paid at the cartridge pickup\)\.$/, '$1$2 미납 — 정지 시작 전에 0이어야 해요 (카트리지 회수 때 내도 돼요).', '$1$2 बक्यौता — रोक सुरु हुनुअघि ० हुनुपर्छ (कार्ट्रिज लिँदा तिर्न मिल्छ)।'],
  [/^(⚠️ )?A pause is at most 1 month — until (\S+)\.$/, '$1정지는 최대 1개월 — $2까지.', '$1रोक बढीमा १ महिना — $2 सम्म।'],
  [/^Skipped bill: (\S+) · paused until (\S+)$/, '건너뛰는 청구일: $1 · 정지 끝: $2', 'छुट्ने बिल: $1 · रोक $2 सम्म'],
  [/^Settlement \(Jun 2026-09-29\): early-ending charge (NPR [\d,]+) \+ the unit's value (NPR [\d,]+) − deposit paid (NPR [\d,]+) = (NPR -?[\d,]+)$/, '정산 (Jun 2026-09-29): 조기해지 위약금 $1 + 기기 잔존가 $2 − 낸 보증금 $3 = $4', 'हिसाब (Jun २०२६-०९-२९): चाँडै अन्त्य शुल्क $1 + उपकरणको बाँकी मूल्य $2 − तिरेको धरौटी $3 = $4'],
  [/^⏸️ Skipped bill days \(paused\): (.+)$/, '⏸️ 정지로 건너뛴 청구일: $1', '⏸️ रोकका कारण छुटेका बिल मिति: $1'],
  [/^(\d+) paused home\(s\) restart within 7 days — message them and book the refit visit$/, '정지 중인 $1집이 7일 안에 재개 — 연락하고 재장착 방문 잡기', '$1 रोकिएका घर ७ दिनभित्र फेरि सुरु — सन्देश पठाउनुहोस् र जडान भ्रमण मिलाउनुहोस्'],
  [/^(\d+) repair\(s\) open over 7 days — the credit grows each day$/, '수리 $1건이 7일 넘게 진행 중 — 감면이 매일 늘어요', '$1 मर्मत ७ दिनभन्दा बढी खुला — छुट दिनदिनै बढ्छ'],
  [/^(\d+) late repair\(s\) — give the credit$/, '늦은 수리 $1건 — 감면 넣기', '$1 ढिलो मर्मत — छुट दिनुहोस्'],
  [/^Give (NPR [\d,]+)$/, '$1 감면 넣기', '$1 छुट दिनुहोस्'],
  [/^🛠️ (NPR [\d,]+) comes off the next bill$/, '🛠️ 다음 청구서에서 $1 빠져요', '🛠️ अर्को बिलबाट $1 घट्छ'],
);

// v0.10.1 — demo / practice: who you practise as · start over · the living world (🔴 Nepali = draft for Tara)
Object.assign(W, {
  PRACTICE: ['연습', 'अभ्यास'], 'Change who you are': ['누구로 볼지 바꾸기', 'को भएर हेर्ने बदल्नुहोस्'], '👤 Practise as': ['👤 누구로 연습할까', '👤 को भएर अभ्यास गर्ने'],
  'One set of data for all three — what one saves, the others see (like the real server).': ['세 사람이 같은 데이터를 써요 — 한 사람이 저장하면 다른 사람도 봐요 (진짜 서버처럼).', 'तीनै जनाको एउटै डाटा — एकले सेभ गरेको अरूले पनि देख्छन् (साँचो सर्भरजस्तै)।'],
  'Admin — everything': ['관리자 — 전부', 'एडमिन — सबै'],
  'Deputy admin · office — every home, money OKs, service credits (not the settings)': ['대리 관리자 · 사무실 — 모든 집, 돈 승인, 수리 지연 감면 (설정은 X)', 'सहायक एडमिन · अफिस — सबै घर, पैसा स्वीकृति, सेवा छुट (सेटिङ बाहेक)'],
  "Technician — only his homes and today's route · visits, installs, cash": ['기사 — 자기 담당 집과 오늘 동선만 · 방문, 설치, 현금', 'प्राविधिक — आफ्नै घर र आजको रुट मात्र · भ्रमण, जडान, नगद'],
  '🗑️ Start over': ['🗑️ 처음부터 다시', '🗑️ फेरि सुरुदेखि'], 'Start over': ['처음부터 다시', 'फेरि सुरुदेखि'],
  'Fake data made again from today · every practice record deleted.': ['오늘 기준으로 가짜 데이터를 새로 만들어요 · 연습 기록은 전부 지워져요.', 'आजबाट नक्कली डाटा फेरि बन्छ · अभ्यासका सबै रेकर्ड मेटिन्छन्।'],
  'Tap again — delete every practice record': ['한 번 더 누르면 — 연습 기록 전부 삭제', 'फेरि थिच्नुहोस् — अभ्यासका सबै रेकर्ड मेटाउने'],
  'kept the promise from the chase call': ['독촉 전화 때 한 약속을 지킴', 'ताकेता फोनमा गरेको वाचा पूरा गर्‍यो'],
  'water tastes different since yesterday': ['어제부터 물맛이 달라요', 'हिजोदेखि पानीको स्वाद फरक छ'], 'no water coming out': ['물이 안 나와요', 'पानी आउँदैन'],
  'wants to move the unit to the other wall': ['기기를 다른 벽으로 옮기고 싶어 함', 'उपकरण अर्को भित्तामा सार्न चाहनुहुन्छ'], 'UV light blinking': ['UV 램프가 깜빡여요', 'UV बत्ती झिम्किन्छ'], 'drip from the filter housing': ['필터 하우징에서 물이 떨어져요', 'फिल्टर हाउसिङबाट पानी चुहिन्छ'],
  'Referral: 1 month free (off bill 2)': ['추천: 1개월 무료 (2회차에서 빠짐)', 'सिफारिस: १ महिना नि:शुल्क (दोस्रो बिलबाट घट्छ)'], '1 month free (off bill 2)': ['1개월 무료 (2회차에서 빠짐)', '१ महिना नि:शुल्क (दोस्रो बिलबाट घट्छ)'], 'G-1 §4: new customer — 1 month free (taken off bill 2)': ['G-1 §4: 새 고객 — 1개월 무료 (2회차에서 빠짐)', 'G-1 §4: नयाँ ग्राहक — १ महिना नि:शुल्क (दोस्रो बिलबाट घट्छ)'],
  'water tastes different': ['물맛이 달라요', 'पानीको स्वाद फरक छ'], 'small leak under the tap': ['수도꼭지 밑에 조금 새요', 'धारामुनि अलिकति चुहिन्छ'], 'water flow slow since yesterday': ['어제부터 물이 약하게 나와요', 'हिजोदेखि पानी बिस्तारै आउँछ'], 'wants a second tap': ['꼭지를 하나 더 달고 싶어 함', 'अर्को धारा थप्न चाहनुहुन्छ'],
});
P.unshift(
  [/^(Since you last looked|Just now): payments (\d+) · repair requests (\d+) · new leads (\d+)$/, (m) => `${m[1] === 'Just now' ? '방금' : '지난번 이후'}: 결제 ${m[2]} · 수리 요청 ${m[3]} · 새 리드 ${m[4]}`, (m) => `${m[1] === 'Just now' ? 'भर्खरै' : 'पछिल्लो पटकदेखि'}: भुक्तानी ${m[2]} · मर्मत अनुरोध ${m[3]} · नयाँ लिड ${m[4]}`],
  [/^neighbour of (.+) \(customer (KC-[A-Z0-9-]+)\) — saw the unit there$/, '$1 이웃 (고객 $2) — 그 집에서 기기를 봄', '$1 को छिमेकी (ग्राहक $2) — त्यहाँ उपकरण देखे'],
);

// ---- v0.11 (2026-09-30): calmer phone · one day-7 call · special comment · P/A vial · drag-to-order · no internal document codes on screen. 🔴 Nepali = Claude draft, Tara to check.
Object.assign(W, {
  'Every day': ['매일', 'हरेक दिन'], 'Sales': ['영업', 'बिक्री'], 'Sometimes': ['가끔', 'कहिलेकाहीँ'], 'Help': ['도움말', 'सहयोग'], 'Devices & stock': ['기기·재고', 'उपकरण र स्टक'],
  'Usually filled from the sign-up screening.': ['보통 가입 심사에서 받은 값이 들어옵니다.', 'सामान्यतया साइन-अप जाँचबाट भरिन्छ।'],
  'Special comment': ['특이사항', 'विशेष टिप्पणी'], 'e.g. dog in the yard': ['예: 마당에 개', 'जस्तै: आँगनमा कुकुर'], 'call before coming': ['오기 전 전화', 'आउनुअघि फोन गर्ने'], 'landlord must be present': ['집주인 입회', 'घरधनी उपस्थित हुनुपर्ने'],
  'Take cash (only Tara)': ['현금 받기 (타라만)', 'नगद लिने (तारा मात्र)'],
  'day-7 calls': ['7일 전화', '७ दिने कल'],
  '👆 Tap pins to order': ['👆 핀 눌러 순서 정하기', '👆 क्रम मिलाउन पिन थिच्नुहोस्'], '✋ Your own order · tap the pins': ['✋ 직접 정한 순서 · 핀을 누르세요', '✋ आफ्नै क्रम · पिन थिच्नुहोस्'], '👆 Tap pins to re-order': ['👆 핀 눌러 다시 정하기', '👆 फेरि क्रम मिलाउन पिन थिच्नुहोस्'], '👆 Tap the pins in the order you want to visit': ['👆 갈 순서대로 핀을 누르세요', '👆 जाने क्रममा पिन थिच्नुहोस्'], '✋ Order set': ['✋ 순서 정해짐', '✋ क्रम मिल्यो'], '✋ Order kept': ['✋ 순서 유지', '✋ क्रम राखियो'],
  'Came through a referral — 1 month free (off bill 2)': ['추천받고 가입 — 1개월 무료 (2회차에서 차감)', 'सिफारिसबाट आएको — १ महिना निःशुल्क (बिल २ बाट)'], 'apply once · comes off bill 2': ['한 번만 적용 · 2회차에서 빠짐', 'एक पटक लागू · बिल २ बाट घट्छ'], '3 months after their install · apply once': ['그 집 설치 3개월 뒤 · 한 번만 적용', 'उनको जडानको ३ महिनापछि · एक पटक'],
  'Money': ['돈', 'पैसा'], 'Field & customers': ['현장·고객', 'फिल्ड र ग्राहक'], 'System & office': ['시스템·사무', 'प्रणाली र कार्यालय'],
  'Screen first': ['먼저 심사하기', 'पहिले जाँच'],
  'restored': ['복원됨', 'पुनर्स्थापित'], 'Start fresh': ['새로 시작', 'नयाँ सुरु'], 'Draft removed': ['초안 삭제됨', 'ड्राफ्ट हटाइयो'], '📝 Draft kept — open the same form again to continue': ['📝 초안 보관됨 — 같은 폼을 다시 열면 이어집니다', '📝 ड्राफ्ट राखियो — जारी राख्न उही फारम फेरि खोल्नुहोस्'],
  'Search name · KC code · phone': ['이름 · KC 코드 · 전화 검색', 'नाम · KC कोड · फोन खोज्नुहोस्'], '☁️ Load from server': ['☁️ 서버에서 불러오기', '☁️ सर्भरबाट ल्याउनुहोस्'], 'Loading…': ['불러오는 중…', 'लोड हुँदैछ…'], 'Loaded': ['불러옴', 'लोड भयो'],
  '📍 Save my location as this house': ['📍 내 위치를 이 집으로 저장', '📍 मेरो स्थान यो घरको रूपमा सेभ'], 'Getting location…': ['위치 찾는 중…', 'स्थान लिँदैछ…'],
  'No location saved — tap “Get location now” at the door. Without it the house is missing from the map and the route.': ['위치가 없습니다 — 문 앞에서 「지금 위치 저장」을 누르세요. 없으면 지도와 동선에서 이 집이 빠집니다.', 'स्थान सेभ छैन — ढोकामा “अहिले स्थान लिनुहोस्” थिच्नुहोस्। नभए नक्सा र रुटमा यो घर देखिँदैन।'],
  'Due at this house': ['이 집에 예정된 것', 'यो घरमा बाँकी'], 'no filter due': ['기한 된 필터 없음', 'कुनै फिल्टर बाँकी छैन'], 'Last visit': ['지난 방문', 'पछिल्लो भ्रमण'], 'No completed visit yet': ['완료된 방문 없음', 'अहिलेसम्म पूरा भ्रमण छैन'],
  '⋯ More': ['⋯ 더 보기', '⋯ थप'], '⋯ Less': ['⋯ 접기', '⋯ कम'],
  'already recorded': ['이미 기록됨', 'पहिले नै दर्ता'],
  'Keep it on for a work phone — off means the app cannot open offline after iPhone closes it.': ['업무폰이면 켜 두세요 — 끄면 아이폰이 앱을 닫은 뒤 오프라인에서 열 수 없습니다.', 'काम गर्ने फोनमा अन राख्नुहोस् — अफ भए iPhone ले एप बन्द गरेपछि अफलाइनमा खुल्दैन।'],
  '📵 Offline — the map tiles cannot load. The stop list still works.': ['📵 오프라인 — 지도 타일을 못 받습니다. 방문 목록은 됩니다.', '📵 अफलाइन — नक्सा लोड हुँदैन। सूची चल्छ।'], 'D7': ['7일 전화', '७ दिने कल'], 'Day-7 call': ['7일 전화', '७ दिने कल'], 'day-7 call': ['7일 전화', '७ दिने कल'], 'The day-7 call': ['설치 7일 뒤 전화', '७ दिने कल'], 'follow-up': ['후속 전화', 'फलो-अप'], 'payment chase': ['수금 독촉', 'भुक्तानी ताकेता'],
  '📞 day-7 call overdue': ['📞 7일 전화 밀림', '📞 ७ दिने कल ढिलो'], '📞 Log a call': ['📞 전화 기록', '📞 कल दर्ता'], '📝 Log': ['📝 기록', '📝 दर्ता'],
  'One call 7 days after the install: is the water fine, anything to fix, would a neighbour like a demo?': ['설치 7일 뒤 전화 한 통: 물은 괜찮은지, 고칠 건 없는지, 이웃도 시연을 볼지.', 'जडानको ७ दिनपछि एक कल: पानी ठीक छ, केही मिलाउनुपर्छ, छिमेकीले डेमो हेर्न चाहन्छन्?'],
  'One call 7 days after every install — Tara calls or WhatsApps the home.': ['설치마다 7일 뒤 전화 한 통 — 타라가 전화하거나 WhatsApp을 보냅니다.', 'हरेक जडानको ७ दिनपछि एक कल — तारा फोन वा WhatsApp गर्छिन्।'],
  '• Is the water fine? Anything to fix? (a fault found early is a cheap one)': ['• 물은 괜찮은가요? 고칠 게 있나요? (일찍 찾은 고장은 싸게 끝납니다)', '• पानी ठीक छ? केही मिलाउनुपर्छ? (चाँडै भेटिएको समस्या सस्तो हुन्छ)'],
  '• The home feels looked after — that is what keeps it with us.': ['• 「관리받는다」는 느낌이 고객을 남게 합니다.', '• घरले हेरचाह भएको महसुस गर्छ — त्यसैले हामीसँग रहन्छ।'],
  '• Would a neighbour or relative like a demo?': ['• 이웃이나 친척도 시연을 볼까요?', '• छिमेकी वा नातेदारले डेमो हेर्न चाहन्छन्?'],
  'Log it under New → Check-in call. No other routine calls: the monthly visits cover the rest. A late bill is chased from Collections, not from here.': ['새 기록 → 안부 전화에 기록합니다. 다른 정기 전화는 없습니다 — 나머지는 월 방문이 맡습니다. 밀린 요금은 여기가 아니라 수금에서 챙깁니다.', 'नयाँ → चेक-इन कलमा दर्ता गर्नुहोस्। अरू नियमित कल छैन — बाँकी मासिक भ्रमणले हेर्छ। ढिलो बिल संकलनबाट ताकेता गरिन्छ।'],
  'Breakdowns': ['고장', 'बिग्रेको'], '5. Day-1 payment NPR 4,900 by QR — the install is not finished before it is confirmed.': ['5. 첫날 NPR 4,900은 QR로 — 입금 확인 전엔 설치가 끝난 게 아닙니다.', '५. पहिलो दिन NPR ४,९०० QR बाट — पुष्टि नभएसम्म जडान सकिएको मानिँदैन।'],
  'Reminder 3 days before': ['3일 전 알림', '३ दिनअघि रिमाइन्डर'], 'on the day': ['당일', 'त्यही दिन'], '3 days late: Tara calls': ['3일 밀림: 타라 전화', '३ दिन ढिलो: तारा फोन'], '7 days late: home visit': ['7일 밀림: 가정 방문', '७ दिन ढिलो: घर भ्रमण'],
  'the reminder goes out 3 days before — this is the last easy chance': ['알림은 3일 전에 나갑니다 — 지금이 마지막 쉬운 기회', 'रिमाइन्डर ३ दिनअघि जान्छ — यो अन्तिम सजिलो मौका हो'],
  'Late 7+ days — home visit': ['7일 이상 밀림 — 가정 방문', '७+ दिन ढिलो — घर भ्रमण'],
  'Reply within 2 hours in office hours': ['근무시간엔 2시간 안에 답', 'कार्यालय समयमा २ घण्टाभित्र जवाफ'], 'Office hours → reply within 2 h, visit same or next day.': ['근무시간 → 2시간 안에 답, 당일이나 다음 날 방문.', 'कार्यालय समय → २ घण्टाभित्र जवाफ, त्यही वा भोलिपल्ट भ्रमण।'],
  'Grouped by tole so one day covers one area. Monthly for 6 months after install, then every 3 months; filter dues pull a visit earlier.': ['하루에 한 동네를 돌도록 톨별로 묶었습니다. 설치 후 6개월은 매달, 그 뒤 3개월마다; 필터 기한이 오면 방문이 당겨집니다.', 'एक दिनमा एक क्षेत्र ढाक्न टोलअनुसार समूहबद्ध। जडानपछि ६ महिना मासिक, त्यसपछि हरेक ३ महिना; फिल्टरको म्याद आए भ्रमण अघि सर्छ।'],
  'Measure before installing.': ['설치 전에 잽니다.', 'जडान गर्नुअघि नाप्नुहोस्।'], '30–80 normal': ['30–80 정상', '३०–८० सामान्य'], '20–30 low (pump needed)': ['20–30 낮음 (펌프 필요)', '२०–३० कम (पम्प चाहिन्छ)'], '<20 very low': ['<20 매우 낮음', '<२० धेरै कम'], '>80 needs a reducer': ['>80 감압밸브 필요', '>८० रिड्युसर चाहिन्छ'],
  'All must be ticked. Flow and water source are required.': ['전부 체크해야 합니다. 유량과 원수는 필수.', 'सबै टिक हुनुपर्छ। प्रवाह र पानीको स्रोत अनिवार्य।'],
  'The UV lamp is safe at 1.2 L/min or less.': ['UV 램프는 1.2 L/min 이하에서 안전합니다.', 'UV बत्ती १.२ L/min वा कममा सुरक्षित छ।'],
  'The monthly bill falls on this same day every month.': ['월 요금은 매달 이 날짜에 청구됩니다.', 'मासिक बिल हरेक महिना यही दिन आउँछ।'],
  'Day 1 = NPR 4,900 (install fee incl. first month). Do not finish the install before the payment is confirmed.': ['첫날 = NPR 4,900 (설치비, 첫 달 포함). 입금 확인 전엔 설치를 마치지 마세요.', 'पहिलो दिन = NPR ४,९०० (जडान शुल्क, पहिलो महिना सहित)। भुक्तानी पुष्टि नभई जडान नसक्नुहोस्।'],
  'Device as installed': ['설치된 기기', 'जडान भएको उपकरण'], 'TDS meter (raw vs purified)': ['TDS 측정기 (원수 vs 정수)', 'TDS मिटर (कच्चा vs शुद्ध)'], 'signed contract.': ['서명한 계약서.', 'हस्ताक्षरित सम्झौता।'],
  'Filter change: old filter': ['필터 교체: 헌 필터', 'फिल्टर परिवर्तन: पुरानो फिल्टर'], 'device after': ['교체 후 기기', 'पछिको उपकरण'], 'TDS after. Repair: fault close-up': ['교체 후 TDS. 수리: 고장 부위 클로즈업', 'पछिको TDS। मर्मत: खराबीको नजिकको फोटो'], 'working after.': ['수리 후 작동 모습.', 'पछि चलिरहेको।'],
  '1 month free for both — the new home off bill 2, the referrer after 3 months.': ['둘 다 1개월 무료 — 새 고객은 2회차에서, 추천인은 3개월 뒤.', 'दुवैलाई १ महिना निःशुल्क — नयाँ घरलाई बिल २ बाट, सिफारिसकर्तालाई ३ महिनापछि।'],
  'New customer — 1 month free (taken off bill 2)': ['새 고객 — 1개월 무료 (2회차에서 차감)', 'नयाँ ग्राहक — १ महिना निःशुल्क (बिल २ बाट घटाइने)'], 'referral reward': ['추천 보상', 'सिफारिस पुरस्कार'],
  'Empty = the skipped bill day + 1 month − 1 day. At most 1 month.': ['비우면 = 건너뛴 청구일 + 1개월 − 1일. 최대 1개월.', 'खाली = छोडिएको बिल दिन + १ महिना − १ दिन। बढीमा १ महिना।'],
  'Booking intervals are a guide — decide by what you see. PP brown/black → replace now.': ['예약 주기는 참고용 — 눈으로 보고 정합니다. PP 갈색/검정 → 지금 교체.', 'बुकिङ अन्तराल मार्गदर्शन मात्र — देखेको आधारमा निर्णय। PP खैरो/कालो → अहिले फेर्ने।'],
  'Booking intervals (PP 4 / monsoon 3': ['예약 주기 (PP 4 / 몬순 3', 'बुकिङ अन्तराल (PP ४ / मनसुन ३'],
  'One old filter back for each new one.': ['새 필터 하나당 헌 필터 하나 회수.', 'हरेक नयाँको बदला एक पुरानो फिल्टर फिर्ता।'], 'Required to complete a visit.': ['방문 완료에 필요합니다.', 'भ्रमण पूरा गर्न आवश्यक।'],
  'My bag = issued to me this morning. Shelf = taken straight from stock.': ['내 가방 = 오늘 아침 지급받은 것. 선반 = 재고에서 바로 꺼낸 것.', 'मेरो झोला = आज बिहान दिइएको। शेल्फ = स्टकबाट सिधै लिएको।'],
  'Full pipe sanitisation every 3 months.': ['3개월마다 배관 전체 소독.', 'हरेक ३ महिनामा पूरा पाइप सफाइ।'],
  'Required to complete. Suggested: monthly for 6 months after install, then every 3 months.': ['완료에 필요합니다. 권장: 설치 후 6개월은 매달, 그 뒤 3개월마다.', 'पूरा गर्न आवश्यक। सुझाव: जडानपछि ६ महिना मासिक, त्यसपछि हरेक ३ महिना।'],
  'Billing goes on. Not fixed within 7 days of the report → every day from the report comes off the next bill.': ['청구는 계속됩니다. 신고 후 7일 안에 못 고치면 → 신고일부터 하루씩 다음 요금에서 뺍니다.', 'बिलिङ जारी रहन्छ। रिपोर्टको ७ दिनभित्र नमिले → रिपोर्टको दिनदेखि हरेक दिन अर्को बिलबाट घट्छ।'],
  'Installs and filter changes are subtracted automatically. Issue = a person takes parts for the day, Return = brings back what is left.': ['설치·필터 교체는 자동으로 차감됩니다. 지급 = 하루치 부품을 가져감, 반납 = 남은 걸 돌려줌.', 'जडान र फिल्टर परिवर्तन स्वतः घट्छ। Issue = दिनभरका पार्ट लगिने, Return = बाँकी फिर्ता।'],
  "Wall = drilling. Renting + wall needs the landlord's written OK.": ['벽 = 타공. 셋집 + 벽 설치는 집주인 서면 동의 필요.', 'भित्ता = ड्रिलिङ। भाडा + भित्ता जडानमा घरधनीको लिखित स्वीकृति चाहिन्छ।'],
  'No = hold. The first day is not split, owed or waived.': ['아니오 = 보류. 첫날 금액은 나누거나 외상·면제하지 않습니다.', 'होइन = रोक्ने। पहिलो दिनको रकम बाँडिँदैन, उधारो वा मिनाहा हुँदैन।'],
  'Needed before we tell a family number or referee about a late bill.': ['밀린 요금을 가족 번호나 보증인에게 알리기 전에 필요합니다.', 'ढिलो बिलबारे परिवारको नम्बर वा सिफारिसकर्तालाई भन्नुअघि चाहिन्छ।'],
  'Carelessness (person pays half)': ['부주의 (본인 절반 부담)', 'लापरवाही (व्यक्तिले आधा तिर्ने)'],
  'Settings). Issue in the morning, return in the evening — both signed.': ['설정). 아침에 지급, 저녁에 반납 — 둘 다 서명.', 'सेटिङ)। बिहान दिने, बेलुका फिर्ता — दुवैमा हस्ताक्षर।'],
  'Kitchen tap, before the unit is connected. Keep the vial indoors at room temperature and read it after 2 days.': ['기기 연결 전 부엌 수도꼭지에서. 바이알은 실내 상온에 두고 2일 뒤 읽습니다.', 'उपकरण जोड्नुअघि भान्साको धाराबाट। भायल घरभित्र सामान्य तापक्रममा राखेर २ दिनपछि हेर्नुहोस्।'],
  'Black — faecal contamination': ['검정 — 분변 오염', 'कालो — दिसाजन्य प्रदूषण'], 'Black = faecal contamination': ['검정 = 분변 오염', 'कालो = दिसाजन्य प्रदूषण'], 'Turned black': ['검게 변함', 'कालो भयो'], 'P/A check (PoC)': ['P/A 검사 (PoC)', 'P/A जाँच (PoC)'],
  'no change = none seen. 🚨 Our own check — never tell the customer the water is safe or unsafe from it.': ['변화 없음 = 안 보임. 🚨 우리 확인용 — 이걸로 고객에게 물이 안전하다·위험하다 말하지 마세요.', 'परिवर्तन छैन = केही देखिएन। 🚨 हाम्रो आफ्नै जाँच — यसबाट ग्राहकलाई पानी सुरक्षित/असुरक्षित नभन्नुहोस्।'],
  '🛑 Stop at 2–3 black vials — that is enough to pick the ENPHO test home. If none turn black, test anyway: it then shows only that the water out meets the standard.': ['🛑 검은 바이알 2–3개면 멈춤 — ENPHO 시험 집을 고르기엔 충분합니다. 하나도 안 검어지면 그래도 시험: 그땐 「나오는 물이 기준을 충족한다」까지만 보여줍니다.', '🛑 २–३ कालो भायलमा रोक्नुहोस् — ENPHO परीक्षण घर छान्न पर्याप्त। कुनै कालो नभए पनि परीक्षण गर्नुहोस्: त्यसले निस्किएको पानी मापदण्डमा छ भन्ने मात्र देखाउँछ।'],
  'Real days between changes, across all households. The booking intervals are first values; PoC data decides the final ones.': ['모든 가구의 실제 교체 간격(일). 예약 주기는 첫 값이고, PoC 데이터가 최종값을 정합니다.', 'सबै घरको वास्तविक परिवर्तन अन्तराल (दिन)। बुकिङ अन्तराल पहिलो मान हो; PoC डाटाले अन्तिम तय गर्छ।'],
  'Start + new + came back + deposit starts − left − month 14 = end. Install month = 1,100 (inside the 4,900), bills 2–13 = 1,400, then 1,100. The deposit part is held, not earned.': ['시작 + 신규 + 복귀 + 보증금 시작 − 해지 − 14개월차 = 끝. 설치 달 = 1,100(4,900 안에 포함), 2–13회차 = 1,400, 그 뒤 1,100. 보증금 몫은 맡아둔 돈이지 수익이 아닙니다.', 'सुरु + नयाँ + फर्किएको + धरौटी सुरु − छोडेको − महिना १४ = अन्त्य। जडान महिना = १,१०० (४,९०० भित्र), बिल २–१३ = १,४००, त्यसपछि १,१००। धरौटी अंश राखिएको हो, कमाइ होइन।'],
  'statement → payments': ['입금내역 → 결제', 'स्टेटमेन्ट → भुक्तानी'],
  'Upload the bank/Fonepay CSV → match rows to customers by KC code, phone, or a unique amount → create payments. Nothing is saved until you tap Create.': ['은행/Fonepay CSV 올리기 → KC 코드·전화·고유 금액으로 고객과 매칭 → 결제 생성. 「만들기」를 누르기 전엔 아무것도 저장되지 않습니다.', 'बैंक/Fonepay CSV अपलोड → KC कोड, फोन वा अद्वितीय रकमले ग्राहकसँग मिलाउने → भुक्तानी बनाउने। Create नथिचेसम्म केही सेभ हुँदैन।'],
  'Saturdays and the official 2083 public holidays (Home Ministry + Gandaki notices) are already in the calendar. Add only your own extra days off. Used for the calendar and the breakdown reply clock.': ['토요일과 2083년 공식 공휴일(내무부 + 간다키 고시)은 이미 달력에 있습니다. 우리만의 추가 휴무일만 넣으세요. 달력과 고장 응답 시계에 쓰입니다.', 'शनिबार र २०८३ का आधिकारिक सार्वजनिक बिदा (गृह मन्त्रालय + गण्डकी सूचना) पात्रोमा छँदैछन्। आफ्नै थप बिदा मात्र थप्नुहोस्। पात्रो र बिग्रेको जवाफ घडीमा प्रयोग हुन्छ।'],
  'name': ['이름', 'नाम'],
  'Hold ☰ and drag a stop to where you want it': ['☰를 꾹 누른 채 원하는 자리로 끌어다 놓기', '☰ थिचिराखेर चाहेको ठाउँमा तान्नुहोस्'], 'Hold and drag': ['꾹 눌러 끌기', 'थिचेर तान्नुहोस्'],
});
P.unshift(
  [/^Installation booked (\d{4}-\d{2}-\d{2})$/, '설치 예약 $1', 'जडान बुक $1'],
  [/^🧾 Receipt saved · (R-[\w-]+)$/, '🧾 영수증 저장됨 · $1', '🧾 रसिद सेभ · $1'],
  [/^🔧 Visit saved · (\d{4}-\d{2}-\d{2})$/, '🔧 방문 저장됨 · $1', '🔧 भ्रमण सेभ · $1'],
  [/^📅 Tomorrow · (\d{4}-\d{2}-\d{2})$/, '📅 내일 · $1', '📅 भोलि · $1'],
  [/^📌 (\d+) events? on this chart$/, '📌 이 차트의 사건 $1건', '📌 यो चार्टका घटना $1'],
  [/^(\d+) late$/, '$1 연체', '$1 ढिलो'], [/^Brought (.+) — referrer's 50% off a bill$/, '$1 데려옴 — 추천인 청구 50% 할인', '$1 ल्याउनुभयो — रेफर गर्नेलाई एक बिलमा ५०% छुट'], [/^(\d+)% of this board$/, '이 보드의 $1%', 'यो बोर्डको $1%'], [/^(\d+) open$/, '열린 $1개', 'खुला $1'],
  [/^(PP|CTO|UF|UV|Spin-down) (\d+)mo → (\d+)mo \((\d+) changes\)$/, '$1 $2개월 → $3개월 (교체 $4번)', '$1 $2 महिना → $3 महिना ($4 पटक फेरियो)'], [/^(PP|CTO|UF|UV|Spin-down) (\d+)mo \((\d+) changes\)$/, '$1 $2개월 (교체 $3번)', '$1 $2 महिना ($3 पटक फेरियो)'],
  [/^Switch on only when installs slow down\. NPR ([\d,]+) per neighbour who stays past month 3\.$/, '설치가 느려질 때만 켬. 3개월 넘게 남은 이웃 한 집당 NPR $1.', 'जडान सुस्त हुँदा मात्र खोल्नुहोस्। ३ महिनाभन्दा बढी रहने छिमेकी एकको NPR $1।'],
  [/^e\.g\. (.+)$/, '예: $1', 'जस्तै: $1'], /* v0.16: a typed example (a name) stays as it is */
  [/^(\d+) homes? · tap 💬 to send the notice$/, '$1집 · 💬 눌러 예고 보내기', '$1 घर · 💬 थिचेर सूचना'],
  [/^To collect · (\d+) late$/, '받을 돈 · 연체 $1', 'उठाउने · $1 ढिला'],
  [/^([\d,]+) left$/, '$1 남음', '$1 बाँकी'],
  [/^Sanitise · (.+)$/, '소독 · $1', 'सफाइ · $1'],
  [/^Homes by tole · (\d+) with a job today$/, '동네별 집 · 오늘 일 있는 집 $1', 'टोलअनुसार घर · आज काम भएका $1'],
  [/^(\d+) more waiting behind the top 10$/, '상위 10 뒤에 $1집 대기', 'शीर्ष १० पछि $1 घर पर्खाइमा'],
  [/^💬 sent (\d{1,2}:\d{2}(?: ?[AP]M)?)$/i, '💬 보냄 $1', '💬 पठाइयो $1'],
  [/^Brought (.+) — referrer's 1 month free$/, '$1 데려옴 — 추천인 1개월 무료', '$1 ल्याउनुभयो — सिफारिसकर्ताको १ महिना निःशुल्क'],
  [/^Screening: (Pass|Check|Hold)$/, (m) => '심사: ' + ({ Pass: '통과', Check: '확인', Hold: '보류' })[m[1]], (m) => 'जाँच: ' + ({ Pass: 'पास', Check: 'जाँच', Hold: 'रोक' })[m[1]]],
  [/^#(\d+) · tap the next stop \((\d+) left\)$/, '#$1 · 다음 집을 누르세요 ($2 남음)', '#$1 · अर्को घर थिच्नुहोस् ($2 बाँकी)'],
  [/^👆 (\d+) picked · done$/, '👆 $1개 찍음 · 끝내기', '👆 $1 छानियो · सकियो'],
  [/^Draft from (.+) restored$/, '$1 초안 복원됨', '$1 को ड्राफ्ट पुनर्स्थापित'],
  [/^🟢 Saved( \(\+\d+ photo\))? — sending now$/, '🟢 저장됨$1 — 지금 보내는 중', '🟢 सेभ भयो$1 — पठाउँदैछ'],
  [/^⚠️ (\d+) record\(s\) not sent yet — they will be deleted from this phone\. Tap again to sign out anyway$/, '⚠️ 아직 못 보낸 기록 $1건 — 로그아웃하면 이 폰에서 삭제됩니다. 그래도 로그아웃하려면 다시 누르세요', '⚠️ $1 रेकर्ड पठाइएको छैन — यो फोनबाट मेटिनेछ। जे भए पनि साइन आउट गर्न फेरि थिच्नुहोस्'],
  [/^(Last visit) (\d{4}-\d{2}-\d{2})/, '지난 방문 $2', 'पछिल्लो भ्रमण $2'],
  [/^Overdue (NPR [\d,]+) — ask for it while you are there$/, '연체 $1 — 간 김에 받으세요', 'बाँकी $1 — त्यहाँ हुँदा माग्नुहोस्'],
  [/^📍 Location saved \(±(\d+) m\)$/, '📍 위치 저장됨 (±$1 m)', '📍 स्थान सेभ (±$1 m)'],
  [/^📞 (\d+) day-7 call\(s\) overdue$/, '📞 7일 전화 $1건 밀림', '📞 ७ दिने कल $1 ढिलो'],
  [/^📋 (\d+) request\(s\) past the reply time$/, '📋 답 기한 지난 요청 $1건', '📋 जवाफ समय नाघेका $1 अनुरोध'],
  [/^Shelf = in − out − issued \+ returned − used from the shelf\. Order more below (\d+) \(🔴 first guess$/, '선반 = 입고 − 출고 − 지급 + 반납 − 선반에서 씀. $1 아래면 추가 주문 (🔴 첫 추정', 'शेल्फ = भित्र − बाहिर − दिइएको + फिर्ता − शेल्फबाट प्रयोग। $1 भन्दा कम भए थप अर्डर (🔴 पहिलो अनुमान'],
);

W['tick all'] = ['전부 선택', 'सबै छान्नुहोस्'];
W['📝 Memo'] = ['📝 메모', '📝 मेमो']; W['📝 Memo ·'] = ['📝 메모 ·', '📝 मेमो ·']; W['Memo — stays on this phone'] = ['메모 — 이 폰에만 저장', 'मेमो — यो फोनमा मात्र']; W['Saved on this phone'] = ['이 폰에 저장됨', 'यो फोनमा सेभ']; W['Anything — it is saved as you type'] = ['아무거나 — 쓰는 대로 저장돼요', 'जे पनि — लेख्दै गर्दा सेभ हुन्छ'];
W['🎁 Referral card'] = ['🎁 추천 카드', '🎁 सिफारिस कार्ड']; W['🧪 Visit report'] = ['🧪 방문 리포트', '🧪 भ्रमण रिपोर्ट']; W['Making the picture…'] = ['그림 만드는 중…', 'फोटो बनाउँदै…'];
W['🧾 Image receipt'] = ['🧾 이미지 영수증', '🧾 फोटो रसिद']; W['📤 Share → WhatsApp'] = ['📤 공유 → WhatsApp', '📤 सेयर → WhatsApp']; W['⬇️ Save image'] = ['⬇️ 이미지 저장', '⬇️ फोटो सेभ'];
W['Share → choose WA Business → the customer'] = ['공유 → WA Business 선택 → 고객', 'सेयर → WA Business छान्नुहोस् → ग्राहक']; W['Save, then send it from WhatsApp'] = ['저장한 뒤 WhatsApp에서 보내세요', 'सेभ गरेर WhatsApp बाट पठाउनुहोस्'];
W['Making the receipt…'] = ['영수증 만드는 중…', 'रसिद बनाउँदै…']; W['Could not make the image'] = ['이미지를 못 만들었어요', 'फोटो बनाउन सकिएन']; W['✅ Shared'] = ['✅ 공유됨', '✅ सेयर भयो'];
W['Sharing not available here — save the image'] = ['여기선 공유가 안 돼요 — 이미지를 저장하세요', 'यहाँ सेयर मिल्दैन — फोटो सेभ गर्नुहोस्']; W['Share cancelled'] = ['공유 취소됨', 'सेयर रद्द']; W['Company WhatsApp number'] = ['회사 WhatsApp 번호', 'कम्पनीको WhatsApp नम्बर'];
W['🧾 Receipt → WhatsApp'] = ['🧾 영수증 → WhatsApp', '🧾 रसिद → WhatsApp']; W['📨 Visit note → WhatsApp'] = ['📨 방문 메모 → WhatsApp', '📨 भ्रमण नोट → WhatsApp']; W['🏠 Installed card → WhatsApp'] = ['🏠 설치 완료 카드 → WhatsApp', '🏠 जडान कार्ड → WhatsApp'];
W['📨 Visit note'] = ['📨 방문 메모', '📨 भ्रमण नोट'];
/* v0.16.0 (5) desk cards to send · WhatsApp Web — 🔴 ne draft */ W['💬 WhatsApp Web'] = ['💬 WhatsApp 웹', '💬 WhatsApp वेब']; W['Mark as sent'] = ['보냄 표시', 'पठाइयो भनी चिन्ह']; W['✓ Sent'] = ['✓ 보냄', '✓ पठाइयो']; W['↩ Not sent'] = ['↩ 안 보냄', '↩ पठाइएन']; W['Saves the picture and opens the customer chat in WhatsApp Web → drag the picture in'] = ['그림을 저장하고 WhatsApp 웹에서 이 고객 채팅을 엽니다 → 그림을 끌어다 놓으세요', 'फोटो सेभ गरी WhatsApp वेबमा ग्राहकको च्याट खोल्छ → फोटो तानेर राख्नुहोस्']; W['⬇️ Saved · drag the picture into the chat'] = ['⬇️ 저장됨 · 그림을 채팅에 끌어다 놓으세요', '⬇️ सेभ भयो · फोटो च्याटमा तानेर राख्नुहोस्']; W['Pop-up blocked — allow pop-ups for this site, then tap again'] = ['팝업이 막혔어요 — 이 사이트 팝업을 허용하고 다시 누르세요', 'पप-अप रोकियो — यो साइटका लागि पप-अप खोलेर फेरि थिच्नुहोस्']; W['Practice: made-up numbers, so no chat was opened'] = ['연습판: 가짜 번호라 채팅은 안 열었어요', 'अभ्यास: नक्कली नम्बर भएकाले च्याट खोलिएन']; W['✓ Marked as sent'] = ['✓ 보냄으로 표시함', '✓ पठाइयो भनी चिन्ह लगाइयो']; W['Marked as not sent'] = ['안 보냄으로 되돌림', 'नपठाइएको भनी फर्काइयो']; W['📨 Cards to send'] = ['📨 보낼 카드', '📨 पठाउनुपर्ने कार्ड']; W['last 14 days'] = ['최근 14일', 'पछिल्लो १४ दिन']; W['today + yesterday'] = ['오늘 + 어제', 'आज + हिजो']; W['Not a Nepal number — fine for a test or a foreign phone (WhatsApp still works).'] = ['네팔 번호가 아니에요 — 시험용이나 외국 번호면 괜찮아요(WhatsApp은 돼요).', 'नेपाली नम्बर होइन — परीक्षण वा विदेशी फोन भए ठीक छ (WhatsApp चल्छ)।']; W['🖼 Card'] = ['🖼 카드', '🖼 कार्ड']; W['Nothing to send'] = ['보낼 것 없음', 'पठाउनुपर्ने केही छैन']; W['🧾 Receipt'] = ['🧾 영수증', '🧾 रसिद']; W['🎁 Credit note'] = ['🎁 크레딧 노트', '🎁 क्रेडिट नोट']; W['Sent marks are kept on this computer only'] = ['보냄 표시는 이 컴퓨터에만 남아요', 'पठाइएको चिन्ह यो कम्प्युटरमा मात्र रहन्छ'];
 W['🏠 Installed card'] = ['🏠 설치 완료 카드', '🏠 जडान कार्ड']; W['Then the receipt below.'] = ['다음은 아래 영수증.', 'त्यसपछि तलको रसिद।']; W['Installed'] = ['설치 완료', 'जडान भयो'];
W['🗂️ Photo timeline'] = ['🗂️ 사진 타임라인', '🗂️ फोटो समयरेखा']; W['(ours · not sent)'] = ['(내부용 · 고객에게 안 감)', '(हाम्रो · पठाइँदैन)'];
W['Filter interval from real data'] = ['필터 주기 = 실측값', 'फिल्टर अवधि = वास्तविक डाटा']; W['Yes — once a filter has 5+ real changes, use the observed average'] = ['예 — 실제 교체 5건 넘으면 실측 평균 사용', 'हो — ५+ वास्तविक परिवर्तनपछि औसत प्रयोग']; W['No — always the E-2 booking interval'] = ['아니오 — 항상 E-2 기본 주기', 'होइन — सधैं E-2 अवधि'];
W['💬 Confirm date'] = ['💬 날짜 확인', '💬 मिति पक्का']; W['confirm with the customer'] = ['고객에게 확인', 'ग्राहकसँग पक्का गर्नुहोस्']; W['confirm 3 days before'] = ['3일 전에 확인', '३ दिन अघि पक्का']; W['💬 Notice'] = ['💬 예고', '💬 सूचना']; W['✓ sent'] = ['✓ 보냄', '✓ पठाइयो']; W['Nothing planned for tomorrow'] = ['내일 예정 없음', 'भोलि केही छैन']; W['no phone'] = ['전화 없음', 'फोन छैन'];
Object.assign(W, { 'Practice — saved on this phone only': ['연습 — 이 폰에만 저장', 'अभ्यास — यो फोनमा मात्र सेभ'], 'PRACTICE — NOT SENT TO THE SERVER': ['연습용 — 서버로 안 보냄', 'अभ्यास — सर्भरमा पठाइँदैन'] });

const D2 = {}; for (const [en, [ko, ne]] of Object.entries(W)) { D2[en.trim()] = { ko, ne }; }

function tr1(t) {
  const hit = D2[t]; if (hit) return hit[cur];
  for (const [re, ko, ne] of P) { const m = t.match(re); if (m) { const r = cur === 'ko' ? ko : ne; return typeof r === 'function' ? r(m) : t.replace(re, r); } }
  return null;
}
// exact → strip leading/trailing symbols (emoji, bullets, arrows) → pattern → split on " · "
const memo = new Map();
export function T(s) {
  if (cur === 'en' || s === null || s === undefined) return s;
  const str = String(s); const key = cur + '\u0000' + str; if (memo.has(key)) return memo.get(key);
  const r = T0(str); if (memo.size > 20000) memo.clear(); memo.set(key, r); return r;
}
function T0(str) {
  const t = str.trim(); if (!t) return str;
  let out = tr1(t);
  if (out === null) {
    const m = t.match(/^([^\p{L}\p{N}#+/]*)(.*?)([^\p{L}\p{N})%.!?]*)$/u);
    if (m && m[2] && (m[1] || m[3])) { const mid = tr1(m[2]); if (mid !== null) out = m[1] + mid + m[3]; }
  }
  if (out === null && t.includes(' · ')) { let any = false; const parts = t.split(' · ').map((p) => { const x = T(p); if (x !== p) any = true; return x; }); if (any) out = parts.join(' · '); }
  if (out === null) { if (window.__kfMiss && /[A-Za-z]{2}/.test(t)) window.__kfMiss.set(t, (window.__kfMiss.get(t) || 0) + 1); return str; }
  return str.replace(t, out);
}
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'PRE', 'CODE']);
const orig = new WeakMap(); // text node → its English source, so switching back to English restores it
const skipNode = (n) => { const p = n.parentElement; return !p || SKIP.has(p.tagName) || !!p.closest('[data-noi18n], .diag, .leaflet-control-attribution'); };
function doNode(n) {
  if (skipNode(n)) return;
  const src = orig.has(n) ? orig.get(n) : n.nodeValue; if (!src || !src.trim()) return;
  if (!orig.has(n)) orig.set(n, src);
  const nv = cur === 'en' ? src : T(src); if (nv !== n.nodeValue) n.nodeValue = nv;
}
function doAttrs(el) {
  if (el.closest('[data-noi18n]')) return; // e.g. message templates: the placeholder is the text itself
  for (const a of ['placeholder', 'title']) {
    if (!el.hasAttribute(a)) continue; const k = 'data-en-' + a;
    if (!el.hasAttribute(k)) el.setAttribute(k, el.getAttribute(a));
    const src = el.getAttribute(k); const nv = cur === 'en' ? src : T(src); if (nv !== el.getAttribute(a)) el.setAttribute(a, nv);
  }
}
export function translateDom(root) {
  if (!root) return;
  if (root.nodeType === 3) { doNode(root); return; }
  if (root.nodeType !== 1) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
  for (const n of nodes) doNode(n);
  if (root.hasAttribute('placeholder') || root.hasAttribute('title')) doAttrs(root);
  root.querySelectorAll('[placeholder],[title]').forEach(doAttrs);
  if (obs) obs.takeRecords(); // our own edits must not come back as "new English"
}
// Translate anything that appears later (toasts, drawers, sheets, async parts) without touching the render code.
let obs = null, busy = false;
function watch() {
  if (obs) obs.disconnect();
  if (cur === 'en') return;
  obs = new MutationObserver((muts) => {
    if (busy) return; busy = true;
    try {
      for (const m of muts) {
        if (m.type === 'characterData') { const n = m.target; if (!skipNode(n)) { orig.set(n, n.nodeValue); doNode(n); } }
        else m.addedNodes.forEach((n) => translateDom(n));
      }
      obs.takeRecords();
    } finally { busy = false; }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
export function setLang(l, remember = true) {
  cur = ['en', 'ko', 'ne'].includes(l) ? l : 'en';
  document.documentElement.lang = cur;
  if (remember) { try { localStorage.setItem('kfp_lang', JSON.stringify(cur)); } catch (e) {} }
  watch();
  translateDom(document.body);
}
export function initLang(defaultLang) {
  let l = null; try { l = JSON.parse(localStorage.getItem('kfp_lang')); } catch (e) {}
  setLang(l || defaultLang || 'en', false);
}
export const langSegHtml = () => `<span class="lang-seg" data-noi18n>${LANGS.map(([k, l]) => `<button data-lang="${k}" class="${cur === k ? 'on' : ''}">${l}</button>`).join('')}</span>`;
export const dictSize = () => Object.keys(W).length + P.length;
