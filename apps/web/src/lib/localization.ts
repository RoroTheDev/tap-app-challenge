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

const copies: Record<string, HubCopy> = {
  Spanish: {
    greeting: "Qué gusto verte", subtitle: "¿Qué haría tu día un poco más fácil?", askTitle: "Dile a TAP lo que necesitas", askBody: "Habla con naturalidad o escribe una solicitud. TAP organizará los próximos pasos.", placeholder: "Por ejemplo: Quiero ir de compras esta tarde…", listen: "Hablar", listening: "Escuchando…", stop: "Dejar de escuchar", makePlan: "Crear mi plan", quickTitle: "O comienza con una opción", quickRequests: ["Quiero ir de compras", "Ayúdame a planear una cita", "Quiero visitar a un amigo"], planTitle: "Tu plan", planIntro: "TAP organizó tu solicitud en pasos claros.", places: "Encontrar las mejores opciones", placesDetail: "Buscar opciones cercanas que coincidan con tus preferencias y horario.", transport: "Revisar cómo llegar", transportDetail: "Comparar las formas de transporte que te resultan cómodas.", contact: "Preparar ayuda de un contacto", contactDetail: "Preparar un mensaje y enviarlo solamente después de tu aprobación.", fallback: "Tener alternativas listas", fallbackDetail: "Si la primera opción no funciona, mostrar la siguiente mejor.", confirmNote: "Nada se reserva, comparte ni envía sin tu aprobación.", editProfile: "Perfil", logout: "Cerrar sesión", profileReady: "Personalizado para ti", voiceUnavailable: "La entrada por voz no está disponible en este navegador. Aún puedes escribir.", voiceError: "No pude oírte con claridad. Inténtalo de nuevo o escribe tu solicitud.", typeRequest: "Dile a TAP con qué necesitas ayuda.", newRequest: "Empezar otra solicitud", trustedOne: "persona de confianza", trustedMany: "personas de confianza", deleteData: "Eliminar datos del perfil", deleteQuestion: "¿Eliminar todas las respuestas guardadas?", cancel: "Cancelar", delete: "Eliminar", deleting: "Eliminando…", deleteError: "No pudimos eliminar tu perfil. Inténtalo de nuevo.",
  },
  Chinese: {
    greeting: "很高兴见到您", subtitle: "今天需要 TAP 帮您做什么？", askTitle: "告诉 TAP 您的需要", askBody: "您可以自然地说话或输入请求，TAP 会整理下一步。", placeholder: "例如：我今天下午想去购物……", listen: "说话", listening: "正在聆听……", stop: "停止聆听", makePlan: "制定计划", quickTitle: "或从这里开始", quickRequests: ["我想去购物", "帮我安排一个预约", "我想去看朋友"], planTitle: "您的计划", planIntro: "TAP 已将您的请求整理成清晰步骤。", places: "寻找最佳选择", placesDetail: "寻找符合您的偏好和时间安排的附近选项。", transport: "查看交通方式", transportDetail: "比较您觉得舒适的交通方式。", contact: "准备联系可信任的人", contactDetail: "准备消息，并仅在您同意后发送。", fallback: "准备备用选择", fallbackDetail: "如果第一个选择不可行，显示下一个最佳选择。", confirmNote: "未经您的同意，不会预订、分享或发送任何内容。", editProfile: "个人资料", logout: "退出", profileReady: "为您个性化", voiceUnavailable: "此浏览器不支持语音输入。您仍然可以输入请求。", voiceError: "没有听清楚。请重试或输入您的请求。", typeRequest: "请告诉 TAP 您需要什么帮助。", newRequest: "开始新请求", trustedOne: "位可信任的人", trustedMany: "位可信任的人", deleteData: "删除个人资料", deleteQuestion: "删除所有已保存的个人资料答案？", cancel: "取消", delete: "删除", deleting: "正在删除……", deleteError: "暂时无法删除您的个人资料。请重试。",
  },
  Tagalog: {
    greeting: "Mabuti at nandito ka", subtitle: "Ano ang makapagpapadali sa araw mo?", askTitle: "Sabihin sa TAP ang kailangan mo", askBody: "Magsalita nang natural o i-type ang iyong kahilingan. Aayusin ng TAP ang mga susunod na hakbang.", placeholder: "Halimbawa: Gusto kong mamili mamayang hapon…", listen: "Magsalita", listening: "Nakikinig…", stop: "Itigil", makePlan: "Gawin ang plano", quickTitle: "O pumili dito", quickRequests: ["Gusto kong mamili", "Tulungan akong magplano ng appointment", "Gusto kong bumisita sa kaibigan"], planTitle: "Ang plano mo", planIntro: "Inayos ng TAP ang iyong kahilingan sa malinaw na mga hakbang.", places: "Hanapin ang pinakamahusay na pagpipilian", placesDetail: "Maghanap ng malalapit na pagpipiliang tugma sa iyong kagustuhan at oras.", transport: "Tingnan kung paano pumunta", transportDetail: "Ihambing ang mga paraang komportable kang gamitin.", contact: "Ihanda ang tulong ng pinagkakatiwalaang tao", contactDetail: "Maghanda ng mensahe at ipadala lamang pagkatapos ng pahintulot mo.", fallback: "Maghanda ng ibang pagpipilian", fallbackDetail: "Kung hindi maaari ang una, ipakita ang susunod na pinakamahusay.", confirmNote: "Walang ibu-book, ibabahagi, o ipapadala nang walang pahintulot mo.", editProfile: "Profile", logout: "Mag-log out", profileReady: "Para sa iyo", voiceUnavailable: "Hindi available ang voice input sa browser na ito. Maaari ka pa ring mag-type.", voiceError: "Hindi ko iyon narinig nang malinaw. Subukan muli o i-type ang kahilingan.", typeRequest: "Sabihin sa TAP kung ano ang maitutulong nito.", newRequest: "Bagong kahilingan", trustedOne: "pinagkakatiwalaang tao", trustedMany: "pinagkakatiwalaang tao", deleteData: "Burahin ang profile data", deleteQuestion: "Burahin ang lahat ng naka-save na sagot?", cancel: "Kanselahin", delete: "Burahin", deleting: "Binubura…", deleteError: "Hindi pa mabura ang iyong profile. Subukan muli.",
  },
  Vietnamese: {
    greeting: "Rất vui được gặp bạn", subtitle: "Điều gì sẽ giúp hôm nay dễ dàng hơn?", askTitle: "Hãy cho TAP biết bạn cần gì", askBody: "Hãy nói tự nhiên hoặc nhập yêu cầu. TAP sẽ sắp xếp các bước tiếp theo.", placeholder: "Ví dụ: Tôi muốn đi mua sắm chiều nay…", listen: "Nói", listening: "Đang nghe…", stop: "Dừng nghe", makePlan: "Lập kế hoạch", quickTitle: "Hoặc bắt đầu ở đây", quickRequests: ["Tôi muốn đi mua sắm", "Giúp tôi lên lịch hẹn", "Tôi muốn thăm một người bạn"], planTitle: "Kế hoạch của bạn", planIntro: "TAP đã sắp xếp yêu cầu của bạn thành các bước rõ ràng.", places: "Tìm lựa chọn tốt nhất", placesDetail: "Tìm các lựa chọn gần đây phù hợp với sở thích và lịch trình của bạn.", transport: "Kiểm tra cách di chuyển", transportDetail: "So sánh các phương tiện mà bạn cảm thấy thoải mái khi sử dụng.", contact: "Chuẩn bị trợ giúp từ người tin cậy", contactDetail: "Chuẩn bị tin nhắn và chỉ gửi sau khi bạn đồng ý.", fallback: "Chuẩn bị lựa chọn dự phòng", fallbackDetail: "Nếu lựa chọn đầu tiên không phù hợp, hiển thị lựa chọn tốt tiếp theo.", confirmNote: "Không có gì được đặt, chia sẻ hoặc gửi khi chưa có sự đồng ý của bạn.", editProfile: "Hồ sơ", logout: "Đăng xuất", profileReady: "Được cá nhân hóa cho bạn", voiceUnavailable: "Trình duyệt này không hỗ trợ nhập bằng giọng nói. Bạn vẫn có thể nhập yêu cầu.", voiceError: "Tôi chưa nghe rõ. Vui lòng thử lại hoặc nhập yêu cầu.", typeRequest: "Hãy cho TAP biết bạn muốn được giúp gì.", newRequest: "Bắt đầu yêu cầu mới", trustedOne: "người tin cậy", trustedMany: "người tin cậy", deleteData: "Xóa dữ liệu hồ sơ", deleteQuestion: "Xóa tất cả câu trả lời đã lưu?", cancel: "Hủy", delete: "Xóa", deleting: "Đang xóa…", deleteError: "Chưa thể xóa hồ sơ của bạn. Vui lòng thử lại.",
  },
  Korean: {
    greeting: "다시 만나 반가워요", subtitle: "오늘 무엇을 도와드릴까요?", askTitle: "TAP에게 필요한 것을 말해 주세요", askBody: "자연스럽게 말하거나 요청을 입력하세요. TAP이 다음 단계를 정리합니다.", placeholder: "예: 오늘 오후에 쇼핑하고 싶어요…", listen: "말하기", listening: "듣고 있어요…", stop: "듣기 중지", makePlan: "계획 만들기", quickTitle: "또는 여기에서 시작하세요", quickRequests: ["쇼핑하러 가고 싶어요", "약속 계획을 도와주세요", "친구를 방문하고 싶어요"], planTitle: "나의 계획", planIntro: "TAP이 요청을 명확한 단계로 정리했습니다.", places: "가장 좋은 선택 찾기", placesDetail: "선호도와 일정에 맞는 가까운 옵션을 찾습니다.", transport: "이동 방법 확인", transportDetail: "편하게 이용할 수 있는 교통수단을 비교합니다.", contact: "신뢰 연락처 도움 준비", contactDetail: "메시지를 준비하고 승인한 후에만 보냅니다.", fallback: "대안 준비", fallbackDetail: "첫 번째 옵션이 안 되면 다음으로 좋은 옵션을 보여 줍니다.", confirmNote: "승인 없이는 예약, 공유 또는 전송되지 않습니다.", editProfile: "프로필", logout: "로그아웃", profileReady: "나에게 맞춤 설정", voiceUnavailable: "이 브라우저에서는 음성 입력을 사용할 수 없습니다. 요청을 입력할 수 있습니다.", voiceError: "명확하게 듣지 못했습니다. 다시 말하거나 요청을 입력하세요.", typeRequest: "TAP에게 필요한 도움을 알려 주세요.", newRequest: "새 요청 시작", trustedOne: "신뢰하는 사람", trustedMany: "신뢰하는 사람", deleteData: "프로필 데이터 삭제", deleteQuestion: "저장된 프로필 답변을 모두 삭제할까요?", cancel: "취소", delete: "삭제", deleting: "삭제 중…", deleteError: "아직 프로필을 삭제할 수 없습니다. 다시 시도하세요.",
  },
  Arabic: {
    greeting: "سعداء برؤيتك", subtitle: "ما الذي يجعل يومك أسهل؟", askTitle: "أخبر TAP بما تحتاجه", askBody: "تحدث بشكل طبيعي أو اكتب طلبك. سيرتب TAP الخطوات التالية.", placeholder: "مثال: أريد الذهاب للتسوق بعد الظهر…", listen: "تحدث", listening: "جارٍ الاستماع…", stop: "إيقاف الاستماع", makePlan: "أنشئ خطتي", quickTitle: "أو ابدأ بأحد هذه الخيارات", quickRequests: ["أريد الذهاب للتسوق", "ساعدني في التخطيط لموعد", "أريد زيارة صديق"], planTitle: "خطتك", planIntro: "رتب TAP طلبك في خطوات واضحة.", places: "العثور على أفضل الخيارات", placesDetail: "البحث عن خيارات قريبة تناسب تفضيلاتك وجدولك.", transport: "التحقق من وسيلة الوصول", transportDetail: "مقارنة وسائل النقل التي تشعر بالراحة في استخدامها.", contact: "تجهيز مساعدة جهة اتصال موثوقة", contactDetail: "تجهيز رسالة وإرسالها فقط بعد موافقتك.", fallback: "تجهيز خيارات بديلة", fallbackDetail: "إذا لم ينجح الخيار الأول، عرض أفضل خيار تالٍ.", confirmNote: "لن يتم حجز أو مشاركة أو إرسال أي شيء دون موافقتك.", editProfile: "الملف الشخصي", logout: "تسجيل الخروج", profileReady: "مخصص لك", voiceUnavailable: "الإدخال الصوتي غير متاح في هذا المتصفح. لا يزال بإمكانك الكتابة.", voiceError: "لم أسمع ذلك بوضوح. حاول مرة أخرى أو اكتب طلبك.", typeRequest: "أخبر TAP بما تريد المساعدة فيه.", newRequest: "بدء طلب جديد", trustedOne: "شخص موثوق", trustedMany: "أشخاص موثوقون", deleteData: "حذف بيانات الملف", deleteQuestion: "حذف جميع إجابات الملف المحفوظة؟", cancel: "إلغاء", delete: "حذف", deleting: "جارٍ الحذف…", deleteError: "تعذر حذف ملفك الآن. حاول مرة أخرى.",
  },
  Hindi: {
    greeting: "आपसे मिलकर अच्छा लगा", subtitle: "आज आपका दिन कैसे आसान बनाया जा सकता है?", askTitle: "TAP को बताएं कि आपको क्या चाहिए", askBody: "स्वाभाविक रूप से बोलें या अपना अनुरोध लिखें। TAP अगले कदम व्यवस्थित करेगा।", placeholder: "उदाहरण: मैं आज दोपहर खरीदारी करना चाहता हूँ…", listen: "बोलें", listening: "सुन रहा है…", stop: "सुनना बंद करें", makePlan: "मेरी योजना बनाएं", quickTitle: "या इनमें से शुरू करें", quickRequests: ["मैं खरीदारी करना चाहता हूँ", "मुलाकात की योजना बनाने में मदद करें", "मैं एक दोस्त से मिलना चाहता हूँ"], planTitle: "आपकी योजना", planIntro: "TAP ने आपके अनुरोध को साफ़ चरणों में व्यवस्थित किया है।", places: "सबसे अच्छे विकल्प खोजें", placesDetail: "आपकी पसंद और समय के अनुसार पास के विकल्प खोजें।", transport: "वहाँ पहुँचने का तरीका देखें", transportDetail: "उन परिवहन विकल्पों की तुलना करें जिनका उपयोग आपको सहज लगता है।", contact: "विश्वसनीय संपर्क की मदद तैयार करें", contactDetail: "संदेश तैयार करें और आपकी अनुमति के बाद ही भेजें।", fallback: "दूसरे विकल्प तैयार रखें", fallbackDetail: "यदि पहला विकल्प काम न करे, तो अगला सबसे अच्छा विकल्प दिखाएं।", confirmNote: "आपकी अनुमति के बिना कुछ भी बुक, साझा या भेजा नहीं जाएगा।", editProfile: "प्रोफ़ाइल", logout: "लॉग आउट", profileReady: "आपके लिए बनाया गया", voiceUnavailable: "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। आप अपना अनुरोध लिख सकते हैं।", voiceError: "मैं साफ़ नहीं सुन पाया। फिर से कोशिश करें या अनुरोध लिखें।", typeRequest: "TAP को बताएं कि आपको किस मदद की ज़रूरत है।", newRequest: "नया अनुरोध शुरू करें", trustedOne: "विश्वसनीय व्यक्ति", trustedMany: "विश्वसनीय लोग", deleteData: "प्रोफ़ाइल डेटा हटाएं", deleteQuestion: "सभी सहेजे गए प्रोफ़ाइल उत्तर हटाएं?", cancel: "रद्द करें", delete: "हटाएं", deleting: "हटाया जा रहा है…", deleteError: "अभी आपका प्रोफ़ाइल नहीं हटाया जा सका। फिर कोशिश करें।",
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

