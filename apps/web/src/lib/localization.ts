import type { SeniorProfile } from "@tap/shared";

export interface HubCopy {
  greeting: string;
  subtitle: string;
  askTitle: string;
  askBody: string;
  placeholder: string;
  listen: string;
  listening: string;
  stop: string;
  makePlan: string;
  quickTitle: string;
  quickRequests: string[];
  planTitle: string;
  planIntro: string;
  places: string;
  placesDetail: string;
  transport: string;
  transportDetail: string;
  contact: string;
  contactDetail: string;
  fallback: string;
  fallbackDetail: string;
  confirmNote: string;
  editProfile: string;
  logout: string;
  profileReady: string;
  voiceUnavailable: string;
  voiceError: string;
  typeRequest: string;
  newRequest: string;
  trustedOne: string;
  trustedMany: string;
  deleteData: string;
  deleteQuestion: string;
  cancel: string;
  delete: string;
  deleting: string;
  deleteError: string;
}

const english: HubCopy = {
  greeting: "Good to see you",
  subtitle: "What would make today a little easier?",
  askTitle: "Tell TAP what you need",
  askBody: "Speak naturally or type a request. TAP will organize the next steps.",
  placeholder: "For example: I want to go shopping this afternoon…",
  listen: "Speak",
  listening: "Listening…",
  stop: "Stop listening",
  makePlan: "Make my plan",
  quickTitle: "Or start with one of these",
  quickRequests: ["I want to go shopping", "Help me plan an appointment", "I want to visit a friend"],
  planTitle: "Your plan",
  planIntro: "TAP organized your request into a few clear steps.",
  places: "Find the best options",
  placesDetail: "Look for nearby choices that match your preferences and schedule.",
  transport: "Check how to get there",
  transportDetail: "Compare the transportation options you are comfortable using.",
  contact: "Prepare trusted-contact help",
  contactDetail: "Prepare a message, but only send it after you approve it.",
  fallback: "Keep backup choices ready",
  fallbackDetail: "If the first choice does not work, show the next best option.",
  confirmNote: "Nothing is booked, shared, or sent without your approval.",
  editProfile: "Profile",
  logout: "Log out",
  profileReady: "Personalized for you",
  voiceUnavailable: "Voice input is not available in this browser. You can still type your request.",
  voiceError: "I couldn't hear that clearly. Please try again or type your request.",
  typeRequest: "Please tell TAP what you would like help with.",
  newRequest: "Start a new request",
  trustedOne: "trusted person",
  trustedMany: "trusted people",
  deleteData: "Delete profile data",
  deleteQuestion: "Delete all saved profile answers?",
  cancel: "Cancel",
  delete: "Delete",
  deleting: "Deleting…",
  deleteError: "Your profile could not be deleted yet. Please try again.",
};

const copies: Record<string, Partial<HubCopy>> = {
  Spanish: {
    greeting: "Qué gusto verte", subtitle: "¿Qué haría tu día un poco más fácil?", askTitle: "Dile a TAP lo que necesitas", askBody: "Habla con naturalidad o escribe una solicitud. TAP organizará los próximos pasos.", placeholder: "Por ejemplo: Quiero ir de compras esta tarde…", listen: "Hablar", listening: "Escuchando…", stop: "Dejar de escuchar", makePlan: "Crear mi plan", quickTitle: "O comienza con una opción", quickRequests: ["Quiero ir de compras", "Ayúdame a planear una cita", "Quiero visitar a un amigo"], planTitle: "Tu plan", planIntro: "TAP organizó tu solicitud en pasos claros.", places: "Encontrar las mejores opciones", placesDetail: "Buscar opciones cercanas que coincidan con tus preferencias y horario.", transport: "Revisar cómo llegar", transportDetail: "Comparar las formas de transporte que te resultan cómodas.", contact: "Preparar ayuda de un contacto", contactDetail: "Preparar un mensaje y enviarlo solamente después de tu aprobación.", fallback: "Tener alternativas listas", fallbackDetail: "Si la primera opción no funciona, mostrar la siguiente mejor.", confirmNote: "Nada se reserva, comparte ni envía sin tu aprobación.", editProfile: "Perfil", logout: "Cerrar sesión", profileReady: "Personalizado para ti", voiceUnavailable: "La entrada por voz no está disponible en este navegador. Aún puedes escribir.", voiceError: "No pude oírte con claridad. Inténtalo de nuevo o escribe tu solicitud.", typeRequest: "Dile a TAP con qué necesitas ayuda.", newRequest: "Empezar otra solicitud", trustedOne: "persona de confianza", trustedMany: "personas de confianza", deleteData: "Eliminar datos del perfil", deleteQuestion: "¿Eliminar todas las respuestas guardadas?", cancel: "Cancelar", delete: "Eliminar", deleting: "Eliminando…", deleteError: "No pudimos eliminar tu perfil. Inténtalo de nuevo.",
  },
  Chinese: {
    greeting: "很高兴见到您", subtitle: "今天需要 TAP 帮您做什么？", askTitle: "告诉 TAP 您的需要", askBody: "您可以自然地说话或输入请求，TAP 会整理下一步。", placeholder: "例如：我今天下午想去购物……", listen: "说话", listening: "正在聆听……", stop: "停止聆听", makePlan: "制定计划", quickTitle: "或从这里开始", quickRequests: ["我想去购物", "帮我安排一个预约", "我想去看朋友"], planTitle: "您的计划", planIntro: "TAP 已将您的请求整理成清晰步骤。", places: "寻找最佳选择", transport: "查看交通方式", contact: "准备联系可信任的人", fallback: "准备备用选择", confirmNote: "未经您的同意，不会预订、分享或发送任何内容。", editProfile: "个人资料", logout: "退出", profileReady: "为您个性化", newRequest: "开始新请求",
  },
  Tagalog: {
    greeting: "Mabuti at nandito ka", subtitle: "Ano ang makapagpapadali sa araw mo?", askTitle: "Sabihin sa TAP ang kailangan mo", placeholder: "Halimbawa: Gusto kong mamili mamayang hapon…", listen: "Magsalita", listening: "Nakikinig…", stop: "Itigil", makePlan: "Gawin ang plano", quickTitle: "O pumili dito", quickRequests: ["Gusto kong mamili", "Tulungan akong magplano ng appointment", "Gusto kong bumisita sa kaibigan"], planTitle: "Ang plano mo", places: "Hanapin ang pinakamahusay na pagpipilian", transport: "Tingnan kung paano pumunta", contact: "Ihanda ang tulong ng pinagkakatiwalaang tao", fallback: "Maghanda ng ibang pagpipilian", confirmNote: "Walang ibu-book, ibabahagi, o ipapadala nang walang pahintulot mo.", editProfile: "Profile", logout: "Mag-log out", profileReady: "Para sa iyo", newRequest: "Bagong kahilingan",
  },
  Vietnamese: {
    greeting: "Rất vui được gặp bạn", subtitle: "Điều gì sẽ giúp hôm nay dễ dàng hơn?", askTitle: "Hãy cho TAP biết bạn cần gì", placeholder: "Ví dụ: Tôi muốn đi mua sắm chiều nay…", listen: "Nói", listening: "Đang nghe…", stop: "Dừng nghe", makePlan: "Lập kế hoạch", quickTitle: "Hoặc bắt đầu ở đây", quickRequests: ["Tôi muốn đi mua sắm", "Giúp tôi lên lịch hẹn", "Tôi muốn thăm một người bạn"], planTitle: "Kế hoạch của bạn", places: "Tìm lựa chọn tốt nhất", transport: "Kiểm tra cách di chuyển", contact: "Chuẩn bị trợ giúp từ người tin cậy", fallback: "Chuẩn bị lựa chọn dự phòng", confirmNote: "Không có gì được đặt, chia sẻ hoặc gửi khi chưa có sự đồng ý của bạn.", editProfile: "Hồ sơ", logout: "Đăng xuất", profileReady: "Được cá nhân hóa cho bạn", newRequest: "Bắt đầu yêu cầu mới",
  },
  Korean: {
    greeting: "다시 만나 반가워요", subtitle: "오늘 무엇을 도와드릴까요?", askTitle: "TAP에게 필요한 것을 말해 주세요", placeholder: "예: 오늘 오후에 쇼핑하고 싶어요…", listen: "말하기", listening: "듣고 있어요…", stop: "듣기 중지", makePlan: "계획 만들기", quickTitle: "또는 여기에서 시작하세요", quickRequests: ["쇼핑하러 가고 싶어요", "약속 계획을 도와주세요", "친구를 방문하고 싶어요"], planTitle: "나의 계획", places: "가장 좋은 선택 찾기", transport: "이동 방법 확인", contact: "신뢰 연락처 도움 준비", fallback: "대안 준비", confirmNote: "승인 없이는 예약, 공유 또는 전송되지 않습니다.", editProfile: "프로필", logout: "로그아웃", profileReady: "나에게 맞춤 설정", newRequest: "새 요청 시작",
  },
  Arabic: {
    greeting: "سعداء برؤيتك", subtitle: "ما الذي يجعل يومك أسهل؟", askTitle: "أخبر TAP بما تحتاجه", placeholder: "مثال: أريد الذهاب للتسوق بعد الظهر…", listen: "تحدث", listening: "جارٍ الاستماع…", stop: "إيقاف الاستماع", makePlan: "أنشئ خطتي", quickTitle: "أو ابدأ بأحد هذه الخيارات", quickRequests: ["أريد الذهاب للتسوق", "ساعدني في التخطيط لموعد", "أريد زيارة صديق"], planTitle: "خطتك", places: "العثور على أفضل الخيارات", transport: "التحقق من وسيلة الوصول", contact: "تجهيز مساعدة جهة اتصال موثوقة", fallback: "تجهيز خيارات بديلة", confirmNote: "لن يتم حجز أو مشاركة أو إرسال أي شيء دون موافقتك.", editProfile: "الملف الشخصي", logout: "تسجيل الخروج", profileReady: "مخصص لك", newRequest: "بدء طلب جديد",
  },
  Hindi: {
    greeting: "आपसे मिलकर अच्छा लगा", subtitle: "आज आपका दिन कैसे आसान बनाया जा सकता है?", askTitle: "TAP को बताएं कि आपको क्या चाहिए", placeholder: "उदाहरण: मैं आज दोपहर खरीदारी करना चाहता हूँ…", listen: "बोलें", listening: "सुन रहा है…", stop: "सुनना बंद करें", makePlan: "मेरी योजना बनाएं", quickTitle: "या इनमें से शुरू करें", quickRequests: ["मैं खरीदारी करना चाहता हूँ", "मुलाकात की योजना बनाने में मदद करें", "मैं एक दोस्त से मिलना चाहता हूँ"], planTitle: "आपकी योजना", places: "सबसे अच्छे विकल्प खोजें", transport: "वहाँ पहुँचने का तरीका देखें", contact: "विश्वसनीय संपर्क की मदद तैयार करें", fallback: "दूसरे विकल्प तैयार रखें", confirmNote: "आपकी अनुमति के बिना कुछ भी बुक, साझा या भेजा नहीं जाएगा।", editProfile: "प्रोफ़ाइल", logout: "लॉग आउट", profileReady: "आपके लिए बनाया गया", newRequest: "नया अनुरोध शुरू करें",
  },
};

export const speechLocales: Record<string, string> = {
  English: "en-US", Spanish: "es-US", Chinese: "zh-CN", Tagalog: "fil-PH",
  Vietnamese: "vi-VN", Korean: "ko-KR", Arabic: "ar-SA", Hindi: "hi-IN",
};

export function getHubCopy(language: SeniorProfile["preferredLanguage"]): HubCopy {
  return { ...english, ...(copies[language] ?? {}) };
}

export function getTextDirection(language: string) {
  return language === "Arabic" ? "rtl" : "ltr";
}

