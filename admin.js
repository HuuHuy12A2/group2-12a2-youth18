const WORKER_URL = "https://media-upload-api.contactwithus12a2.workers.dev";

let submissions = [];
let selectedSubmissionId = null;
let adminPasswordValue = "";

// HỆ THỐNG CACHE LƯU TRỮ DỮ LIỆU ĐÃ CHỈNH SỬA
const submissionCache = {}; 

// DOM ELEMENTS
const loginSection = document.getElementById("loginSection");
const adminSection = document.getElementById("adminSection");
const loginForm = document.getElementById("loginForm");
const adminPassword = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const submissionList = document.getElementById("submissionList");
const pendingCount = document.getElementById("pendingCount");
const emptyReview = document.getElementById("emptyReview");
const reviewContent = document.getElementById("reviewContent");
const mediaPreview = document.getElementById("mediaPreview");
const reviewType = document.getElementById("reviewType");
const reviewStatus = document.getElementById("reviewStatus");
const submissionSize = document.getElementById("submissionSize");
const submissionId = document.getElementById("submissionId");
const reviewFileName = document.getElementById("reviewFileName");
const tagEditor = document.getElementById("tagEditor");
const newTagInput = document.getElementById("newTagInput");
const addTagButton = document.getElementById("addTagButton");
const analysisResult = document.getElementById("analysisResult");
const rejectButton = document.getElementById("rejectButton");
const approveButton = document.getElementById("approveButton");
const approveAllButton = document.getElementById("approveAllButton");

// NEW DOM ELEMENTS
const toastContainer = document.getElementById("toastContainer");
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");
const progressWrapper = document.getElementById("progressWrapper");
const progressText = document.getElementById("progressText");
const progressBarFill = document.getElementById("progressBarFill");

// EVENT LISTENERS
loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
addTagButton.addEventListener("click", handleAddTag);
approveAllButton.addEventListener("click", handleApproveAll);
newTagInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); handleAddTag(); } });
reviewFileName.addEventListener("input", handleFileNameChange);
rejectButton.addEventListener("click", handleReject);
approveButton.addEventListener("click", handleApprove);

/* ================= HỆ THỐNG THÔNG BÁO & XÁC NHẬN MỚI ================= */

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Kích hoạt animation trượt vào
    requestAnimationFrame(() => toast.classList.add("show"));
    
    // Trượt ra và xóa sau 3.5s
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

function showConfirm(message) {
    return new Promise((resolve) => {
        confirmMessage.textContent = message;
        confirmModal.classList.remove("hidden");
        
        const cleanup = (result) => {
            confirmModal.classList.add("hidden");
            resolve(result);
        };
        
        // Xoá event cũ nếu có để tránh bị double click
        const newOk = confirmOk.cloneNode(true);
        const newCancel = confirmCancel.cloneNode(true);
        confirmOk.replaceWith(newOk);
        confirmCancel.replaceWith(newCancel);
        
        newOk.addEventListener("click", () => cleanup(true));
        newCancel.addEventListener("click", () => cleanup(false));
    });
}

/* ================= CACHE MANAGEMENT ================= */

function saveToCache(id) {
    const name = reviewFileName.value.trim();
    // Lấy tag hiện tại đang hiển thị trên giao diện
    const tags = getCurrentDisplayedTags();
    submissionCache[id] = { name, tags };
}

function getEffectiveData(submission) {
    // Ưu tiên lấy từ Cache, nếu không có thì lấy data gốc
    if (submissionCache[submission.id]) {
        return submissionCache[submission.id];
    }
    return { 
        name: submission.name, 
        tags: Array.isArray(submission.tags) ? [...submission.tags] : [] 
    };
}

function getCurrentDisplayedTags() {
    const tags = [];
    tagEditor.querySelectorAll(".tag-item span:first-child").forEach(el => {
        tags.push(el.textContent);
    });
    return tags;
}

/* ================= CORE LOGIC ================= */

async function handleLogin(event) {
    event.preventDefault();
    const password = adminPassword.value.trim();
    if (!password) { loginMessage.textContent = "Vui lòng nhập mật khẩu."; return; }
    loginMessage.textContent = ""; 

    try {  
        adminPasswordValue = password;  
        await loadSubmissions();  
        loginSection.classList.add("hidden");  
        adminSection.classList.remove("hidden");  
    } catch (error) {  
        adminPasswordValue = "";  
        loginMessage.textContent = error.message;  
    }
}

function handleLogout() {
    adminPasswordValue = "";
    submissions = [];
    selectedSubmissionId = null;
    adminPassword.value = "";
    loginMessage.textContent = "";
    adminSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
    clearReview();
}

async function loadSubmissions() {
    const response = await fetch(`${WORKER_URL}/submissions`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${adminPasswordValue}` }
    });

    const data = await parseResponse(response);  
    if (!response.ok) throw new Error(data.error || "Không thể tải danh sách đóng góp.");  
    
    submissions = Array.isArray(data.submissions) ? data.submissions : [];  
    renderSubmissionList();  

    if (selectedSubmissionId) {  
        const selected = submissions.find(item => item.id === selectedSubmissionId);  
        if (selected) renderReview(selected);  
        else { selectedSubmissionId = null; clearReview(); }  
    }
}

function renderSubmissionList() {
    pendingCount.textContent = `${submissions.length} bài chờ duyệt`;
    submissionList.innerHTML = "";  

    if (submissions.length === 0) {  
        submissionList.innerHTML = "<p style='padding:16px;color:#9ca3af'>Không có bài chờ duyệt.</p>";  
        clearReview();  
        return;  
    }  

    submissions.forEach(submission => {  
        const button = document.createElement("button");  
        button.type = "button";  
        button.className = "submission-item";  
        if (submission.id === selectedSubmissionId) button.classList.add("active");  

        const title = document.createElement("span");  
        title.className = "submission-item-title";  
        // Hiển thị tên từ cache nếu có
        const cachedData = submissionCache[submission.id];
        title.textContent = cachedData ? cachedData.name : submission.name;  

        const info = document.createElement("span");  
        info.className = "submission-item-info";  
        const type = document.createElement("span");  
        type.textContent = submission.type.toUpperCase();  
        const status = document.createElement("span");  
        status.textContent = "PENDING";  
        info.append(type, status);  
        button.append(title, info);  

        button.addEventListener("click", () => selectSubmission(submission.id));  
        submissionList.appendChild(button);
    });
}

async function selectSubmission(id) {
    // Lưu thay đổi của mục hiện tại vào cache trước khi chuyển
    if (selectedSubmissionId) {
        saveToCache(selectedSubmissionId);
    }

    const submission = submissions.find(item => item.id === id);
    if (!submission) return;
    selectedSubmissionId = id;
    renderSubmissionList(); // Cập nhật lại danh sách (highlight)
    renderReview(submission);
}

function renderReview(submission) {
    emptyReview.classList.add("hidden");
    reviewContent.classList.remove("hidden");

    submissionId.textContent = submission.id;  
    submissionSize.textContent = `Kích thước: ${formatFileSize(submission.size)}`;  
    reviewType.textContent = submission.type.toUpperCase();  
    reviewStatus.textContent = submission.status.toUpperCase();  

    // Load từ Cache nếu có, không thì load từ data gốc
    const effectiveData = getEffectiveData(submission);
    reviewFileName.value = effectiveData.name;

    // Gắn data tạm thời vào submission để hàm renderTags hoạt động đúng
    submission._tempTags = effectiveData.tags; 

    renderMediaPreview(submission);  
    renderTags(submission);  
    renderAnalysis(submission.analysis || []);
}

function renderMediaPreview(submission) {
    mediaPreview.innerHTML = "";
    const previewUrl = `${WORKER_URL}/preview?id=${encodeURIComponent(submission.id)}`;
    
    if (submission.type === "image") {
        const image = document.createElement("img");
        image.src = previewUrl; image.alt = submission.name; image.loading = "lazy";
        mediaPreview.appendChild(image); return;
    }
    if (submission.type === "video") {
        const video = document.createElement("video");
        video.src = previewUrl; video.controls = true; video.preload = "metadata";
        mediaPreview.appendChild(video); return;
    }
    mediaPreview.innerHTML = "<p>Không xác định được loại media.</p>";
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Không xác định";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderTags(submission) {
    tagEditor.innerHTML = "";
    // Ưu tiên lấy tag từ _tempTags (đã load từ cache)
    const tags = submission._tempTags || (Array.isArray(submission.tags) ? submission.tags : []);
    
    tags.forEach((tag, index) => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag-item";

        const text = document.createElement("span");  
        text.textContent = tag;  

        const removeButton = document.createElement("button");  
        removeButton.type = "button";  
        removeButton.className = "remove-tag";  
        removeButton.textContent = "×";  

        removeButton.addEventListener("click", () => {  
            tags.splice(index, 1);  
            saveToCache(submission.id); // Lưu ngay vào cache khi xoá
            renderTags(submission);  
        });  

        tagElement.append(text, removeButton);  
        tagEditor.appendChild(tagElement);  
    });
}

function handleAddTag() {
    const submission = getSelectedSubmission();
    if (!submission) return;  

    const tag = newTagInput.value.trim();  
    if (!tag) return;  

    const tags = submission._tempTags || [];
    
    const exists = tags.some(item => normalizeTag(item) === normalizeTag(tag));  
    if (exists) { newTagInput.value = ""; return; }  

    tags.push(tag);  
    newTagInput.value = "";  
    saveToCache(submission.id); // Lưu ngay vào cache khi thêm
    renderTags(submission);
}

function handleFileNameChange() {
    const submission = getSelectedSubmission();
    if (!submission) return;  
    
    submission._tempTags = getCurrentDisplayedTags(); // Cập nhật lại tags hiện tại

    // Lưu ngay vào cache khi gõ tên
    saveToCache(submission.id);

    if (typeof TagEngine !== "undefined") {  
        const analysis = TagEngine.analyzeFileName(reviewFileName.value.trim());  
        submission.analysis = analysis;  
        renderAnalysis(analysis);  
    }
}

function renderAnalysis(analysis) {
    analysisResult.innerHTML = "";
    if (!Array.isArray(analysis) || analysis.length === 0) {  
        analysisResult.innerHTML = "<p style='color:#9ca3af'>Không có dữ liệu phân tích.</p>";  
        return;  
    }  

    analysis.forEach(item => {  
        const element = document.createElement("div");  
        element.className = `analysis-item analysis-${item.status}`;  
        const keyword = document.createElement("strong");  
        keyword.textContent = item.keyword || "";  
        element.appendChild(keyword);  

        if (item.status === "matched") {  
            element.append(Object.assign(document.createElement("span"), { textContent: "→" }), Object.assign(document.createElement("span"), { textContent: item.tag || "" }));  
        } else if (item.status === "suggestion") {  
            element.appendChild(Object.assign(document.createElement("span"), { textContent: "Có thể là:" }));  
            if (Array.isArray(item.suggestions)) {  
                item.suggestions.forEach(suggestion => {  
                    const button = document.createElement("button");  
                    button.type = "button";  
                    button.className = "suggestion-tag";  
                    button.textContent = `${suggestion.name} (${Math.round(suggestion.score * 100)}%)`;  
                    button.addEventListener("click", () => applySuggestedTag(item.keyword, suggestion.name));  
                    element.appendChild(button);  
                });  
            }  
        } else if (item.status === "new") {  
            element.appendChild(Object.assign(document.createElement("span"), { textContent: `Tag mới: ${item.tag || ""}` }));  
        }  
        analysisResult.appendChild(element);  
    });
}

function applySuggestedTag(keyword, tag) {
    const submission = getSelectedSubmission();
    if (!submission) return;  

    const tags = submission._tempTags || [];
    if (!tags.some(item => normalizeTag(item) === normalizeTag(tag))) {  
        tags.push(tag);  
        saveToCache(submission.id);
        renderTags(submission);
    }
}

/* ================= ACTIONS (REJECT, APPROVE, APPROVE ALL) ================= */

async function handleReject() {
    const submission = getSelectedSubmission();
    if (!submission) return;  

    const confirmed = await showConfirm(`Bạn có chắc muốn từ chối và xóa "${submission.name}"?`);  
    if (!confirmed) return;  

    setReviewButtonsDisabled(true);  
    try {  
        const response = await fetch(`${WORKER_URL}/reject`, {  
            method: "POST",  
            headers: { "Authorization": `Bearer ${adminPasswordValue}`, "Content-Type": "application/json" },  
            body: JSON.stringify({ id: submission.id })  
        });  
        const data = await parseResponse(response);  
        if (!response.ok) throw new Error(data.error || "Không thể từ chối bài gửi.");  

        delete submissionCache[submission.id]; // Xoá cache
        selectedSubmissionId = null;  
        await loadSubmissions();  
        clearReview();  
        showToast(data.message || "Đã từ chối và xóa file tạm.", "success");  
    } catch (error) {  
        showToast(error.message, "error");  
    } finally {  
        setReviewButtonsDisabled(false);  
    }
}

async function handleApprove() {
    const submission = getSelectedSubmission();
    if (!submission) return;  

    // Lấy dữ liệu cuối cùng (ưu tiên cache)
    const data = getEffectiveData(submission);

    if (!data.name) { showToast("Tên file không được để trống.", "error"); return; }  
    if (!Array.isArray(data.tags) || data.tags.length === 0) { showToast("Phải có ít nhất một tag.", "error"); return; }  

    const confirmed = await showConfirm(`Xác nhận duyệt "${data.name}"?`);  
    if (!confirmed) return;  

    setReviewButtonsDisabled(true);  
    try {  
        const response = await fetch(`${WORKER_URL}/approve`, {  
            method: "POST",  
            headers: { "Authorization": `Bearer ${adminPasswordValue}`, "Content-Type": "application/json" },  
            body: JSON.stringify({ id: submission.id, name: data.name, tags: data.tags })  
        });  
        const dataRes = await parseResponse(response);  
        if (!response.ok) throw new Error(dataRes.error || "Không thể duyệt bài gửi.");  

        delete submissionCache[submission.id]; // Xoá cache
        selectedSubmissionId = null;  
        await loadSubmissions();  
        clearReview();  
        showToast(dataRes.message || "Đã duyệt thành công.", "success");  
    } catch (error) {  
        showToast(error.message, "error");  
    } finally {  
        setReviewButtonsDisabled(false);  
    }
}

async function handleApproveAll() {
    if (submissions.length === 0) {
        showToast("Không có bài nào để duyệt.", "info");
        return;
    }

    const confirmed = await showConfirm(`Xác nhận duyệt TẤT CẢ ${submissions.length} bài đang chờ? Quá trình sẽ chạy tự động.`);
    if (!confirmed) return;

    setReviewButtonsDisabled(true);
    progressWrapper.classList.remove("hidden");
    
    let successCount = 0;
    const total = submissions.length;

    for (let i = 0; i < total; i++) {
        const sub = submissions[i];
        const data = getEffectiveData(sub); // Lấy data cache hoặc gốc

        // Cập nhật thanh tiến trình
        const percent = Math.round(((i + 1) / total) * 100);
        progressText.textContent = `Đang duyệt: ${i + 1}/${total} - ${data.name}`;
        progressBarFill.style.width = `${percent}%`;

        // Kiểm tra dữ liệu tối thiểu
        if (!data.name || !Array.isArray(data.tags) || data.tags.length === 0) {
            showToast(`Bỏ qua "${sub.id}" do thiếu tên hoặc tag.`, "error");
            continue; // Bỏ qua bài lỗi và qua bài tiếp theo
        }

        try {
            const response = await fetch(`${WORKER_URL}/approve`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${adminPasswordValue}`, "Content-Type": "application/json" },
                body: JSON.stringify({ id: sub.id, name: data.name, tags: data.tags })
            });
            
            const resData = await parseResponse(response);
            if (!response.ok) throw new Error(resData.error || "Lỗi API");
            
            successCount++;
        } catch (error) {
            showToast(`Lỗi duyệt "${data.name}": ${error.message}`, "error");
            // Dừng quá trình ngay khi gặp lỗi mạng/API để tránh duyệt sai
            setReviewButtonsDisabled(false);
            progressWrapper.classList.add("hidden");
            return; 
        }
    }

    // Hoàn thành
    progressWrapper.classList.add("hidden");
    selectedSubmissionId = null;
    
    // Xoá toàn bộ cache đã duyệt
    submissions.forEach(sub => delete submissionCache[sub.id]);
    
    await loadSubmissions();
    clearReview();
    showToast(`Hoàn tất! Đã duyệt thành công ${successCount}/${total} bài.`, "success");
    setReviewButtonsDisabled(false);
}

/* ================= UTILS ================= */

function getSelectedSubmission() {
    return submissions.find(submission => submission.id === selectedSubmissionId);
}

function normalizeTag(tag) {
    return String(tag || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function setReviewButtonsDisabled(disabled) {
    approveButton.disabled = disabled;
    rejectButton.disabled = disabled;
    addTagButton.disabled = disabled;
    approveAllButton.disabled = disabled;
}

async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};  
    try { return JSON.parse(text); }  
    catch { return { error: text }; }
}

function clearReview() {
    emptyReview.classList.remove("hidden");
    reviewContent.classList.add("hidden");
    mediaPreview.innerHTML = "";
    tagEditor.innerHTML = "";
    analysisResult.innerHTML = "";
    submissionId.textContent = "";
    reviewFileName.value = "";
}