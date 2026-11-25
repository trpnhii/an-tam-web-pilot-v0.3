"use strict";

const $ = (id) => document.getElementById(id);

const APP_DEMOS = {
  police: "Có người gọi cho tôi tự xưng là công an. Họ nói tôi liên quan đến một vụ án, phải chuyển tiền ngay để kiểm tra và không được nói với con cái.",
  bank: "Có người tự xưng là nhân viên ngân hàng nói tài khoản của tôi sắp bị khóa. Họ yêu cầu tôi đọc mã OTP và bấm vào một đường link để xác minh.",
  family: "Có người gọi nói con tôi đang gặp tai nạn và cần chuyển tiền viện phí ngay. Họ nói phải giữ bí mật vì tình hình rất khẩn cấp.",
  delivery: "Tôi nhận tin nhắn nói bưu kiện đang bị giữ. Họ gửi một đường link và yêu cầu tôi đóng phí ngay để nhận hàng."
};

const APP_RULES = [
  { id: "urgency", label: "Họ thúc giục bác phải làm ngay", words: ["ngay", "khẩn cấp", "gấp", "lập tức", "trong 5 phút", "trong 10 phút", "sắp bị khóa", "cắt điện"] },
  { id: "secrecy", label: "Họ yêu cầu bác giữ bí mật", words: ["không được nói", "đừng nói", "giữ bí mật", "không kể", "không báo cho"] },
  { id: "authority", label: "Họ tự xưng là cơ quan hoặc tổ chức lớn", words: ["công an", "cảnh sát", "tòa án", "toà án", "viện kiểm sát", "ngân hàng", "bộ công an", "điện lực", "thuế", "bảo hiểm"] },
  { id: "payment", label: "Họ yêu cầu tiền, OTP hoặc thông tin tài chính", words: ["chuyển tiền", "chuyển khoản", "otp", "mã xác thực", "mật khẩu", "số tài khoản", "mã pin", "quét qr", "thanh toán", "viện phí", "đóng phí"] },
  { id: "linkapp", label: "Họ yêu cầu mở link hoặc cài ứng dụng lạ", words: ["bấm link", "đường link", "link", "cài ứng dụng", "cài app", "tải ứng dụng", "apk", "chia sẻ màn hình"] },
  { id: "family", label: "Họ dùng chuyện người thân gặp nạn để gây áp lực", words: ["tai nạn", "cấp cứu", "bệnh viện", "bắt cóc", "con tôi", "cháu tôi", "người nhà"] }
];

let appResult = null;
let appInstallPrompt = null;
let appListening = false;
let appRecognition = null;
let appTranscript = "";

function normalized(text) { return text.toLocaleLowerCase("vi-VN").normalize("NFC"); }

function appScenario(text) {
  const value = normalized(text);
  if (["công an", "cảnh sát", "tòa án", "toà án", "viện kiểm sát"].some((word) => value.includes(word))) return "Mạo danh cơ quan nhà nước";
  if (["ngân hàng", "otp", "tài khoản", "chuyển khoản"].some((word) => value.includes(word))) return "Ngân hàng hoặc thanh toán đáng ngờ";
  if (["tai nạn", "bệnh viện", "cấp cứu", "con tôi", "cháu tôi"].some((word) => value.includes(word))) return "Khẩn cấp liên quan người thân";
  if (["bưu kiện", "giao hàng", "đóng phí"].some((word) => value.includes(word))) return "Bưu kiện hoặc giao hàng đáng ngờ";
  return "Tình huống cần kiểm tra thêm";
}

function appLinkFindings(rawLink) {
  if (!rawLink.trim()) return [];
  const value = rawLink.trim();
  const findings = ["Đường link do người lạ cung cấp chưa được xác minh"];
  if (!/^https:\/\//i.test(value)) findings.push("Đường link không dùng kết nối HTTPS");
  if (/bit\.ly|tinyurl|t\.co|cutt\.ly|goo\.gl/i.test(value)) findings.push("Đường link đã được rút gọn nên khó biết nơi dẫn tới");
  if (/\d{1,3}(\.\d{1,3}){3}|xn--|@/.test(value)) findings.push("Đường link có cấu trúc bất thường");
  return findings;
}

function showAppScreen(name) {
  document.querySelectorAll(".app-screen").forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === name));
  document.querySelectorAll("[data-nav-screen]").forEach((button) => button.classList.toggle("active", button.dataset.navScreen === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openInputDialog(options = {}) {
  if (options.text !== undefined) $("appStory").value = options.text;
  if (options.extra) $("extraDetails").open = true;
  $("appInputError").classList.add("hidden");
  $("inputDialog").showModal();
  setTimeout(() => $("appStory").focus(), 100);
}

function analyzeAppSituation() {
  const text = $("appStory").value.trim();
  const link = $("appLink").value.trim();
  const phone = $("appPhone").value.trim();
  const hasImage = Boolean($("appScreenshot").files && $("appScreenshot").files[0]);
  const error = $("appInputError");
  if (!text && !link && !phone && !hasImage) {
    error.textContent = "Bác hãy kể lại tình huống hoặc thêm ảnh, link hay số điện thoại.";
    error.classList.remove("hidden");
    $("appStory").focus();
    return;
  }
  error.classList.add("hidden");
  const value = normalized(text);
  const hits = APP_RULES.filter((rule) => rule.words.some((word) => value.includes(word)));
  const extras = appLinkFindings(link);
  if (phone) extras.push("Số điện thoại gọi đến chưa được xác minh là số chính thức");
  if (hasImage) extras.push("Ảnh chụp cần được kiểm tra thêm; bản demo chưa tự đọc chữ trong ảnh");
  const score = Math.min(6, hits.length + Math.min(extras.length, 2));
  const paymentWithPressure = hits.some((hit) => hit.id === "payment") && hits.some((hit) => ["urgency", "secrecy", "authority"].includes(hit.id));
  let level = "Cần kiểm tra thêm", tone = "uncertain", symbol = "?";
  let action = "Chưa làm theo yêu cầu. Hãy tự gọi cho tổ chức hoặc người thân bằng số bác đã lưu từ trước.";
  if (score >= 3 || paymentWithPressure) {
    level = "Có dấu hiệu rủi ro cao";
    tone = "high";
    symbol = "!";
    action = "Dừng lại ngay. Chưa chuyển tiền, chưa đọc OTP, chưa bấm link và chưa cài ứng dụng.";
  } else if (score === 0 && text.length >= 25) {
    level = "Chưa thấy rõ dấu hiệu lừa đảo";
    tone = "lower";
    symbol = "✓";
    action = "Vẫn nên xác minh bằng số chính thức trước khi chuyển tiền hoặc chia sẻ thông tin riêng tư.";
  }
  appResult = {
    level, tone, symbol, score, action,
    scenario: appScenario(`${text} ${link}`),
    signals: [...hits.map((hit) => hit.label), ...extras],
    summary: text || `Thông tin cần kiểm tra: ${link || phone || "ảnh chụp màn hình"}`
  };
  $("inputDialog").close();
  renderAppResult();
}

function renderAppResult() {
  const status = $("appRiskStatus");
  status.classList.remove("uncertain", "lower");
  if (appResult.tone !== "high") status.classList.add(appResult.tone);
  $("appRiskSymbol").textContent = appResult.symbol;
  $("appResultTitle").textContent = appResult.level;
  $("appRiskCount").textContent = `${appResult.score} dấu hiệu đáng ngờ`;
  $("appSafeAction").textContent = appResult.action;
  $("appCaseType").textContent = appResult.scenario;
  $("appSignals").replaceChildren();
  const findings = appResult.signals.length ? appResult.signals : ["Chưa đủ thông tin để kết luận. Điều này không có nghĩa là tình huống chắc chắn an toàn."];
  findings.forEach((finding) => { const item = document.createElement("li"); item.textContent = finding; $("appSignals").appendChild(item); });
  showAppScreen("result");
}

function resetAppCheck() {
  appResult = null;
  $("appStory").value = "";
  $("appLink").value = "";
  $("appPhone").value = "";
  $("appScreenshot").value = "";
  $("appFileLabel").textContent = "Chọn ảnh trên điện thoại";
  showAppScreen("home");
}

function setupAppSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("appMicText").textContent = "Nhập tình huống";
    $("appMicStatus").textContent = "Trình duyệt chưa hỗ trợ nói";
    $("appMicButton").addEventListener("click", () => openInputDialog());
    return;
  }
  appRecognition = new SpeechRecognition();
  appRecognition.lang = "vi-VN";
  appRecognition.interimResults = true;
  appRecognition.continuous = false;
  appRecognition.onstart = () => {
    appListening = true;
    appTranscript = "";
    $("appMicButton").classList.add("listening");
    $("appMicText").textContent = "Đang nghe bác nói...";
    $("appMicStatus").textContent = "Bấm lại để dừng";
  };
  appRecognition.onresult = (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
    appTranscript = transcript.trim();
    $("appMicStatus").textContent = appTranscript || "Bác cứ nói tự nhiên";
  };
  appRecognition.onerror = () => {
    $("appMicStatus").textContent = "Chưa nghe rõ. Bác có thể nhập bằng chữ.";
  };
  appRecognition.onend = () => {
    appListening = false;
    $("appMicButton").classList.remove("listening");
    $("appMicText").textContent = "Bấm để nói";
    $("appMicStatus").textContent = "Bác nói bằng tiếng Việt";
    if (appTranscript) openInputDialog({ text: appTranscript });
  };
  $("appMicButton").addEventListener("click", () => appListening ? appRecognition.stop() : appRecognition.start());
}

function speakAppResult() {
  if (!appResult) return;
  if (!("speechSynthesis" in window)) { window.alert("Điện thoại này chưa hỗ trợ đọc kết quả."); return; }
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(`${appResult.level}. ${appResult.action}`);
  speech.lang = "vi-VN";
  speech.rate = localStorage.getItem("antam_slow_speech") === "false" ? 1 : .8;
  speechSynthesis.speak(speech);
}

function applyAppSettings() {
  document.body.classList.toggle("app-large-text", localStorage.getItem("antam_large_text") === "true");
  document.body.classList.toggle("app-high-contrast", localStorage.getItem("antam_high_contrast") === "true");
}

function openAppSettings() {
  $("appContactName").value = localStorage.getItem("antam_contact_name") || "";
  $("appContactPhone").value = localStorage.getItem("antam_contact_phone") || "";
  $("appLargeText").checked = localStorage.getItem("antam_large_text") === "true";
  $("appHighContrast").checked = localStorage.getItem("antam_high_contrast") === "true";
  $("appSlowSpeech").checked = localStorage.getItem("antam_slow_speech") !== "false";
  $("appSettingsDialog").showModal();
}

function saveAppSettings() {
  localStorage.setItem("antam_contact_name", $("appContactName").value.trim());
  localStorage.setItem("antam_contact_phone", $("appContactPhone").value.trim());
  localStorage.setItem("antam_large_text", String($("appLargeText").checked));
  localStorage.setItem("antam_high_contrast", String($("appHighContrast").checked));
  localStorage.setItem("antam_slow_speech", String($("appSlowSpeech").checked));
  applyAppSettings();
  $("appSettingsDialog").close();
}

function familyText() {
  const name = localStorage.getItem("antam_contact_name") || "người thân tin cậy";
  return { name, message: `An Tâm nhận thấy: ${appResult.level}.\n\nTóm tắt: ${appResult.summary}\n\nKhuyến nghị: ${appResult.action}\n\nNhờ ${name} giúp tôi xác minh trước khi hành động.` };
}

function openFamilyDialog() {
  if (!appResult) return;
  const { name, message } = familyText();
  $("familyRecipient").textContent = `Người nhận: ${name}`;
  $("familyMessage").textContent = message;
  $("familyConsent").checked = false;
  $("familyError").classList.add("hidden");
  $("familyDialog").showModal();
}

function familyAllowed() {
  if ($("familyConsent").checked) return true;
  $("familyError").textContent = "Bác cần đồng ý trước khi gửi nội dung.";
  $("familyError").classList.remove("hidden");
  return false;
}

function sendFamilyMessage() {
  if (!familyAllowed()) return;
  const phone = (localStorage.getItem("antam_contact_phone") || "").replace(/[^\d+]/g, "");
  if (!phone) {
    $("familyError").textContent = "Bác chưa lưu số người thân. Hãy thêm trong phần Cài đặt.";
    $("familyError").classList.remove("hidden");
    return;
  }
  window.location.href = `sms:${phone}?body=${encodeURIComponent(familyText().message)}`;
}

async function copyFamilyMessage() {
  if (!familyAllowed()) return;
  try {
    await navigator.clipboard.writeText(familyText().message);
    $("familyCopy").textContent = "Đã sao chép";
    setTimeout(() => { $("familyCopy").textContent = "Sao chép nội dung"; }, 1800);
  } catch {
    $("familyError").textContent = "Chưa sao chép được. Bác có thể giữ tay trên nội dung để sao chép.";
    $("familyError").classList.remove("hidden");
  }
}

function appIsStandalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }

function renderAppInstallHelp() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const steps = appInstallPrompt
    ? ["Bấm Cài ứng dụng bên dưới.", "Xác nhận trong cửa sổ của trình duyệt.", "Mở An Tâm từ màn hình chính."]
    : isIOS
      ? ["Mở trang này bằng Safari.", "Bấm nút Chia sẻ.", "Chọn Thêm vào Màn hình chính rồi bấm Thêm."]
      : ["Mở menu của trình duyệt.", "Chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.", "Xác nhận để tạo biểu tượng An Tâm."];
  const list = document.createElement("ol");
  steps.forEach((step) => { const item = document.createElement("li"); item.textContent = step; list.appendChild(item); });
  $("appInstallSteps").replaceChildren(list);
  $("confirmAppInstall").classList.toggle("hidden", !appInstallPrompt);
}

function setupAppInstall() {
  const button = $("installAppButton");
  if (!appIsStandalone()) button.classList.remove("hidden");
  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); appInstallPrompt = event; if (!appIsStandalone()) button.classList.remove("hidden"); });
  window.addEventListener("appinstalled", () => { appInstallPrompt = null; button.classList.add("hidden"); });
  button.addEventListener("click", () => { renderAppInstallHelp(); $("appInstallDialog").showModal(); });
  $("confirmAppInstall").addEventListener("click", async () => {
    if (!appInstallPrompt) return;
    appInstallPrompt.prompt();
    const choice = await appInstallPrompt.userChoice;
    appInstallPrompt = null;
    if (choice.outcome === "accepted") { button.classList.add("hidden"); $("appInstallDialog").close(); }
  });
}

function setupAppOffline() {
  const update = () => $("appOffline").classList.toggle("hidden", navigator.onLine);
  addEventListener("online", update);
  addEventListener("offline", update);
  update();
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}

document.querySelectorAll("[data-nav-screen]").forEach((button) => button.addEventListener("click", () => showAppScreen(button.dataset.navScreen)));
document.querySelectorAll("[data-app-demo]").forEach((button) => button.addEventListener("click", () => openInputDialog({ text: APP_DEMOS[button.dataset.appDemo] })));
$("openTextInput").addEventListener("click", () => openInputDialog());
$("openExtraInput").addEventListener("click", () => openInputDialog({ extra: true }));
$("helpStartCheck").addEventListener("click", () => { showAppScreen("home"); openInputDialog(); });
$("appAnalyze").addEventListener("click", analyzeAppSituation);
$("resultBackHome").addEventListener("click", resetAppCheck);
$("appReadResult").addEventListener("click", speakAppResult);
$("appAskFamily").addEventListener("click", openFamilyDialog);
$("appOfficialCheck").addEventListener("click", () => $("verifyDialog").showModal());
$("openAppSettings").addEventListener("click", openAppSettings);
$("saveAppSettings").addEventListener("click", saveAppSettings);
$("familySend").addEventListener("click", sendFamilyMessage);
$("familyCopy").addEventListener("click", copyFamilyMessage);
$("appScreenshot").addEventListener("change", () => { const file = $("appScreenshot").files && $("appScreenshot").files[0]; $("appFileLabel").textContent = file ? file.name : "Chọn ảnh trên điện thoại"; });

setupAppSpeech();
setupAppInstall();
setupAppOffline();
applyAppSettings();

const requestedDemo = new URLSearchParams(window.location.search).get("demo");
if (requestedDemo && APP_DEMOS[requestedDemo]) openInputDialog({ text: APP_DEMOS[requestedDemo] });
