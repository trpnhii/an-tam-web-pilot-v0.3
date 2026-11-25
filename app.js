"use strict";

const $ = (id) => document.getElementById(id);
const story = $("story");
const linkInput = $("linkInput");
const phoneInput = $("phoneInput");
const screenshot = $("screenshot");
const resultCard = $("resultCard");
const feedbackCard = $("feedbackCard");

const demos = {
  police: "Có người gọi cho tôi tự xưng là công an. Họ nói tôi liên quan đến một vụ án, phải chuyển tiền ngay để kiểm tra và không được nói với con cái.",
  bank: "Có người tự xưng là nhân viên ngân hàng nói tài khoản của tôi sắp bị khóa. Họ yêu cầu tôi đọc mã OTP và bấm vào một đường link để xác minh.",
  family: "Có người gọi nói con tôi đang gặp tai nạn và cần chuyển tiền viện phí ngay. Họ nói phải giữ bí mật vì tình hình rất khẩn cấp."
};

const rules = [
  { id: "urgency", label: "Có dấu hiệu thúc ép hoặc yêu cầu hành động gấp", words: ["ngay", "khẩn cấp", "gấp", "lập tức", "trong 5 phút", "trong 10 phút", "sắp bị khóa", "cắt điện"] },
  { id: "secrecy", label: "Có yêu cầu giữ bí mật hoặc không nói với người thân", words: ["không được nói", "đừng nói", "giữ bí mật", "không kể", "không báo cho"] },
  { id: "authority", label: "Người liên hệ tự xưng là cơ quan hoặc tổ chức có thẩm quyền", words: ["công an", "cảnh sát", "tòa án", "toà án", "viện kiểm sát", "ngân hàng", "bộ công an", "điện lực", "thuế", "bảo hiểm"] },
  { id: "payment", label: "Có yêu cầu chuyển tiền hoặc cung cấp thông tin tài chính", words: ["chuyển tiền", "chuyển khoản", "otp", "mã xác thực", "mật khẩu", "số tài khoản", "mã pin", "quét qr", "thanh toán", "viện phí"] },
  { id: "linkapp", label: "Có yêu cầu mở link, cài ứng dụng hoặc chia sẻ màn hình", words: ["bấm link", "đường link", "link", "cài ứng dụng", "cài app", "tải ứng dụng", "apk", "điều khiển điện thoại", "chia sẻ màn hình"] },
  { id: "family", label: "Tình huống người thân gặp nạn được dùng để tạo áp lực", words: ["tai nạn", "cấp cứu", "bệnh viện", "bắt cóc", "con tôi", "cháu tôi", "người nhà"] }
];

const cases = [
  { icon: "🏛", title: "Mạo danh cơ quan nhà nước", summary: "Người gọi tự xưng công an hoặc tòa án, yêu cầu chuyển tiền để điều tra và giữ bí mật.", demo: "police" },
  { icon: "◉", title: "Ngân hàng yêu cầu OTP", summary: "Người liên hệ báo tài khoản sắp bị khóa, gửi link lạ hoặc yêu cầu đọc mã OTP.", demo: "bank" },
  { icon: "♡", title: "Người thân gặp nạn", summary: "Cuộc gọi tạo tình huống khẩn cấp, gây hoảng sợ và yêu cầu chuyển tiền ngay.", demo: "family" }
];

let currentResult = null;
let selectedImageUrl = "";

function normalize(text) { return text.toLocaleLowerCase("vi-VN").normalize("NFC"); }

function classifyScenario(text) {
  const value = normalize(text);
  if (["công an", "cảnh sát", "tòa án", "toà án", "viện kiểm sát"].some((word) => value.includes(word))) return "Mạo danh cơ quan nhà nước";
  if (["ngân hàng", "otp", "tài khoản", "chuyển khoản"].some((word) => value.includes(word))) return "Ngân hàng hoặc thanh toán đáng ngờ";
  if (["tai nạn", "bệnh viện", "cấp cứu", "con tôi", "cháu tôi"].some((word) => value.includes(word))) return "Khẩn cấp liên quan người thân";
  if (["điện lực", "cắt điện", "quét qr"].some((word) => value.includes(word))) return "Mạo danh dịch vụ thiết yếu";
  return "Tình huống đáng ngờ khác";
}

function inspectLink(rawLink) {
  if (!rawLink.trim()) return [];
  const findings = [];
  const value = rawLink.trim();
  if (!/^https:\/\//i.test(value)) findings.push("Đường link không dùng kết nối HTTPS");
  if (/bit\.ly|tinyurl|t\.co|cutt\.ly|goo\.gl/i.test(value)) findings.push("Đường link đã được rút gọn nên khó kiểm tra nơi dẫn tới");
  if (/\d{1,3}(\.\d{1,3}){3}/.test(value)) findings.push("Đường link dùng địa chỉ số thay vì tên miền dễ nhận biết");
  if (/xn--|@/.test(value)) findings.push("Đường link có cấu trúc tên miền bất thường");
  return findings;
}

function inspectPhone(rawPhone) {
  if (!rawPhone.trim()) return [];
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 12) return ["Số điện thoại có độ dài bất thường"];
  return ["Số điện thoại chưa được xác minh là kênh chính thức"];
}

function analyzeSituation() {
  const text = story.value.trim();
  const link = linkInput.value.trim();
  const phone = phoneInput.value.trim();
  const hasImage = Boolean(screenshot.files && screenshot.files[0]);
  const error = $("formError");
  if (!text && !link && !phone && !hasImage) {
    error.textContent = "Bác hãy kể lại tình huống hoặc thêm ít nhất một đường link, số điện thoại hay ảnh chụp màn hình.";
    error.classList.remove("hidden"); story.focus(); return;
  }
  error.classList.add("hidden");
  const normalized = normalize(text);
  const hits = rules.filter((rule) => rule.words.some((word) => normalized.includes(word)));
  const extraFindings = [...inspectLink(link), ...inspectPhone(phone)];
  if (hasImage) extraFindings.push("Có ảnh chụp màn hình cần được người hoặc công cụ có khả năng đọc ảnh kiểm tra thêm");
  const score = Math.min(6, hits.length + Math.min(extraFindings.length, 2));
  let level = "Cần kiểm tra thêm", className = "uncertain", icon = "?";
  let action = "Chưa làm theo yêu cầu. Hãy tự liên hệ tổ chức hoặc người thân bằng số đã lưu từ trước để xác minh.";
  if (score >= 3 || hits.some((hit) => hit.id === "payment") && hits.some((hit) => ["urgency", "secrecy", "authority"].includes(hit.id))) {
    level = "Rủi ro cao"; className = "high"; icon = "!";
    action = "Dừng lại ngay. Chưa chuyển tiền, chưa cung cấp OTP hoặc mật khẩu, và chưa mở link hay cài ứng dụng.";
  } else if (score === 0 && text.length >= 25) {
    level = "Ít dấu hiệu trong mô tả"; className = "lower"; icon = "✓";
    action = "Vẫn nên xác minh độc lập trước khi chuyển tiền hoặc chia sẻ thông tin nhạy cảm.";
  }
  currentResult = { level, score, scenario: classifyScenario(`${text} ${link}`), action, signals: [...hits.map((hit) => hit.label), ...extraFindings], summary: text || `Thông tin cần kiểm tra: ${link || phone || "ảnh chụp màn hình"}`, timestamp: new Date().toISOString() };
  renderResult(currentResult, className, icon);
}

function renderResult(result, className, icon) {
  const banner = $("riskBanner");
  banner.classList.remove("high", "lower");
  if (className !== "uncertain") banner.classList.add(className);
  $("riskIcon").textContent = icon; $("riskLevel").textContent = result.level; $("riskScore").textContent = `${result.score} dấu hiệu`;
  $("mainAction").textContent = result.action; $("scenarioLabel").textContent = result.scenario; $("signalsList").replaceChildren();
  const signals = result.signals.length ? result.signals : ["Chưa nhận thấy đủ dấu hiệu từ nội dung hiện có. Điều này không đảm bảo tình huống là an toàn."];
  signals.forEach((signal) => { const item = document.createElement("li"); item.textContent = signal; $("signalsList").appendChild(item); });
  resultCard.classList.remove("hidden"); feedbackCard.classList.remove("hidden");
  setTimeout(() => resultCard.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

function useDemo(name) { story.value = demos[name]; $("checker").scrollIntoView({ behavior: "smooth", block: "start" }); story.focus(); }

function renderCases() {
  const grid = $("caseGrid"); grid.replaceChildren();
  cases.forEach((item) => {
    const article = document.createElement("article"); article.className = "case-card";
    const icon = document.createElement("span"); icon.className = "case-icon"; icon.setAttribute("aria-hidden", "true"); icon.textContent = item.icon;
    const title = document.createElement("h3"); title.textContent = item.title;
    const summary = document.createElement("p"); summary.textContent = item.summary;
    const button = document.createElement("button"); button.type = "button"; button.className = "text-button"; button.textContent = "Thử tình huống này"; button.addEventListener("click", () => useDemo(item.demo));
    article.append(icon, title, summary, button); grid.appendChild(article);
  });
}

function resetChecker() {
  story.value = ""; linkInput.value = ""; phoneInput.value = ""; removeImage(); resultCard.classList.add("hidden"); feedbackCard.classList.add("hidden"); currentResult = null;
  $("checker").scrollIntoView({ behavior: "smooth", block: "start" }); story.focus();
}

function removeImage() {
  screenshot.value = ""; if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl); selectedImageUrl = ""; $("imagePreview").removeAttribute("src"); $("imagePreviewWrap").classList.add("hidden"); $("fileLabel").textContent = "Chọn ảnh từ thiết bị";
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = $("micButton"), status = $("speechStatus"), label = $("micText");
  if (!SpeechRecognition) { button.disabled = true; label.textContent = "Trình duyệt chưa hỗ trợ"; status.textContent = "Bác có thể nhập bằng bàn phím"; return; }
  const recognition = new SpeechRecognition(); recognition.lang = "vi-VN"; recognition.interimResults = true; recognition.continuous = false; let listening = false;
  recognition.onstart = () => { listening = true; button.classList.add("listening"); label.textContent = "Đang nghe..."; status.textContent = "Không đọc OTP, mật khẩu hoặc số tài khoản"; };
  recognition.onresult = (event) => { let transcript = ""; for (let index = event.resultIndex; index < event.results.length; index += 1) transcript += event.results[index][0].transcript; story.value = transcript.trim(); };
  recognition.onerror = () => { status.textContent = "Không nhận được giọng nói. Bác có thể nhập bằng bàn phím."; };
  recognition.onend = () => { listening = false; button.classList.remove("listening"); label.textContent = "Bấm để nói"; status.textContent = "Nói tự nhiên bằng tiếng Việt"; };
  button.addEventListener("click", () => listening ? recognition.stop() : recognition.start());
}

function speakResult() {
  if (!currentResult) return;
  if (!("speechSynthesis" in window)) { window.alert("Trình duyệt này chưa hỗ trợ đọc thành tiếng."); return; }
  window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(`${currentResult.level}. ${currentResult.action}`); utterance.lang = "vi-VN"; utterance.rate = localStorage.getItem("antam_slow_speech") === "false" ? 1 : .82; window.speechSynthesis.speak(utterance);
}

function applySettings() {
  document.body.classList.toggle("large-text", localStorage.getItem("antam_large_text") === "true");
  document.body.classList.toggle("high-contrast", localStorage.getItem("antam_high_contrast") === "true");
}

function openSettings() {
  $("contactName").value = localStorage.getItem("antam_contact_name") || ""; $("contactPhone").value = localStorage.getItem("antam_contact_phone") || "";
  $("largeText").checked = localStorage.getItem("antam_large_text") === "true"; $("highContrast").checked = localStorage.getItem("antam_high_contrast") === "true"; $("slowSpeech").checked = localStorage.getItem("antam_slow_speech") !== "false"; $("settingsDialog").showModal();
}

function saveSettings() {
  localStorage.setItem("antam_contact_name", $("contactName").value.trim()); localStorage.setItem("antam_contact_phone", $("contactPhone").value.trim()); localStorage.setItem("antam_large_text", String($("largeText").checked)); localStorage.setItem("antam_high_contrast", String($("highContrast").checked)); localStorage.setItem("antam_slow_speech", String($("slowSpeech").checked)); applySettings(); $("settingsDialog").close();
}

function buildShareText() {
  const contact = localStorage.getItem("antam_contact_name") || "người thân tin cậy";
  const message = `An Tâm nhận thấy tình huống này ở mức: ${currentResult.level}.\n\nTóm tắt: ${currentResult.summary}\n\nKhuyến nghị: ${currentResult.action}\n\nNhờ ${contact} giúp xác minh trước khi tôi hành động.`;
  return { contact, message };
}

function openShareDialog() {
  if (!currentResult) return; const { contact, message } = buildShareText(); $("shareRecipient").textContent = `Người nhận: ${contact}`; $("shareMessage").textContent = message; $("shareConsent").checked = false; $("shareError").classList.add("hidden"); $("shareDialog").showModal();
}

function requireConsent() {
  if ($("shareConsent").checked) return true; $("shareError").textContent = "Bác cần xác nhận đồng ý trước khi chia sẻ."; $("shareError").classList.remove("hidden"); return false;
}

function sendMessage() {
  if (!requireConsent()) return; const phone = (localStorage.getItem("antam_contact_phone") || "").replace(/[^\d+]/g, "");
  if (!phone) { $("shareError").textContent = "Chưa có số điện thoại người thân. Hãy thêm số trong phần Cài đặt."; $("shareError").classList.remove("hidden"); return; }
  const { message } = buildShareText(); window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
}

async function copyMessage() {
  if (!requireConsent()) return; const { message } = buildShareText();
  try { await navigator.clipboard.writeText(message); $("copyMessage").textContent = "Đã sao chép"; setTimeout(() => { $("copyMessage").textContent = "Sao chép nội dung"; }, 1800); }
  catch { $("shareError").textContent = "Trình duyệt không cho phép sao chép tự động. Bác có thể chọn nội dung ở phía trên để sao chép."; $("shareError").classList.remove("hidden"); }
}

function feedbackRows() { try { return JSON.parse(localStorage.getItem("antam_pilot_feedback") || "[]"); } catch { return []; } }

function saveFeedback(event) {
  event.preventDefault(); const understood = $("understood").value, chosenAction = $("chosenAction").value, reuse = $("reuse").value; if (!understood || !chosenAction || !reuse || !currentResult) return;
  const rows = feedbackRows(); rows.push({ timestamp: new Date().toISOString(), scenario: currentResult.scenario, risk_level: currentResult.level, signal_count: currentResult.score, understood, chosen_action: chosenAction, reuse, note: $("feedbackNote").value.trim() }); localStorage.setItem("antam_pilot_feedback", JSON.stringify(rows)); $("feedbackStatus").textContent = `Đã lưu phản hồi trên thiết bị. Tổng số phản hồi: ${rows.length}.`; $("feedbackForm").reset();
}

function exportFeedback() {
  const rows = feedbackRows(); if (!rows.length) { $("feedbackStatus").textContent = "Chưa có phản hồi nào để xuất."; return; }
  const headers = ["timestamp", "scenario", "risk_level", "signal_count", "understood", "chosen_action", "reuse", "note"], escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n"); const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `an-tam-pilot-feedback-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

$("analyzeButton").addEventListener("click", analyzeSituation);
$("fillDemo").addEventListener("click", () => useDemo("police"));
document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => useDemo(button.dataset.demo)));
$("restart").addEventListener("click", resetChecker); $("readResult").addEventListener("click", speakResult); $("officialCheck").addEventListener("click", () => $("officialDialog").showModal()); $("trustedShare").addEventListener("click", openShareDialog); $("openSettings").addEventListener("click", openSettings); $("saveSettings").addEventListener("click", saveSettings); $("sendMessage").addEventListener("click", sendMessage); $("copyMessage").addEventListener("click", copyMessage); $("removeImage").addEventListener("click", removeImage); $("feedbackForm").addEventListener("submit", saveFeedback); $("exportCsv").addEventListener("click", exportFeedback);
screenshot.addEventListener("change", () => { const file = screenshot.files && screenshot.files[0]; if (!file) return removeImage(); if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl); selectedImageUrl = URL.createObjectURL(file); $("imagePreview").src = selectedImageUrl; $("imagePreviewWrap").classList.remove("hidden"); $("fileLabel").textContent = file.name; });

renderCases(); setupSpeechRecognition(); applySettings();
