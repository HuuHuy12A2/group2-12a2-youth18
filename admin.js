const WORKER_URL = "https://media-upload-api.contactwithus12a2.workers.dev";

let submissions = [];
let selectedSubmissionId = null;
let adminPasswordValue = "";

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

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
addTagButton.addEventListener("click", handleAddTag);
newTagInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        handleAddTag();
    }
});
reviewFileName.addEventListener("input", handleFileNameChange);
rejectButton.addEventListener("click", handleReject);
approveButton.addEventListener("click", handleApprove);

async function handleLogin(event) {
    event.preventDefault();
    const password = adminPassword.value.trim();

    if (!password) {
        loginMessage.textContent = "Vui lòng nhập mật khẩu.";
        return;
    }

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
    const response = await fetch(
        `${WORKER_URL}/submissions`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${adminPasswordValue}`
            }
        }
    );

    const data = await parseResponse(response);

    if (!response.ok) {
        throw new Error(data.error || "Không thể tải danh sách đóng góp.");
    }

    submissions = Array.isArray(data.submissions)
        ? data.submissions
        : [];

    renderSubmissionList();

    if (selectedSubmissionId) {
        const selected = submissions.find(
            item => item.id === selectedSubmissionId
        );

        if (selected) {
            renderReview(selected);
        } else {
            selectedSubmissionId = null;
            clearReview();
        }
    }
}

function renderSubmissionList() {
    pendingCount.textContent =
        `${submissions.length} bài chờ duyệt`;

    submissionList.innerHTML = "";

    if (submissions.length === 0) {
        submissionList.innerHTML =
            "<p style='padding:16px;color:#9ca3af'>Không có bài chờ duyệt.</p>";
        clearReview();
        return;
    }

    submissions.forEach(submission => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "submission-item";

        if (submission.id === selectedSubmissionId) {
            button.classList.add("active");
        }

        const title = document.createElement("span");
        title.className = "submission-item-title";
        title.textContent = submission.name;

        const info = document.createElement("span");
        info.className = "submission-item-info";

        const type = document.createElement("span");
        type.textContent = submission.type.toUpperCase();

        const status = document.createElement("span");
        status.textContent = "PENDING";

        info.append(type, status);
        button.append(title, info);

        button.addEventListener("click", () => {
            selectSubmission(submission.id);
        });

        submissionList.appendChild(button);
    });
}

async function selectSubmission(id) {
    const submission = submissions.find(
        item => item.id === id
    );
    if (!submission) {
        return;
    }
    selectedSubmissionId = id;
    renderSubmissionList();
    renderReview(submission);
}

function renderReview(submission) {
    emptyReview.classList.add("hidden");
    reviewContent.classList.remove("hidden");

    submissionId.textContent = submission.id;
    submissionSize.textContent = `Kích thước: ${formatFileSize(submission.size)}`;
    reviewType.textContent = submission.type.toUpperCase();
    reviewStatus.textContent = submission.status.toUpperCase();

    reviewFileName.value = submission.name;

    renderMediaPreview(submission);
    renderTags(submission);
    renderAnalysis(submission.analysis || []);
}

function renderMediaPreview(submission) {
    mediaPreview.innerHTML = "";
    const previewUrl = `${WORKER_URL}/preview?id=${encodeURIComponent(submission.id)}`;
    if (submission.type === "image") {
        const image = document.createElement("img");
        image.src = previewUrl;
        image.alt = submission.name;
        image.loading = "lazy";
        mediaPreview.appendChild(image);
        return;
    }
    if (submission.type === "video") {
        const video = document.createElement("video");
        video.src = previewUrl;
        video.controls = true;
        video.preload = "metadata";
        mediaPreview.appendChild(video);
        return;
    }
    const message = document.createElement("p");
    message.textContent = "Không xác định được loại media.";
    mediaPreview.appendChild(message);
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return "Không xác định";
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderTags(submission) {
    tagEditor.innerHTML = "";
    if (!Array.isArray(submission.tags)) {
        submission.tags = [];
    }
    submission.tags.forEach((tag, index) => {
        const tagElement = document.createElement("span");
        tagElement.className = "tag-item";

        const text = document.createElement("span");
        text.textContent = tag;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-tag";
        removeButton.textContent = "×";

        removeButton.addEventListener("click", () => {
            submission.tags.splice(index, 1);
            renderTags(submission);
        });

        tagElement.append(text, removeButton);
        tagEditor.appendChild(tagElement);
    });
}

function handleAddTag() {
    const submission = getSelectedSubmission();

    if (!submission) {
        return;
    }

    const tag = newTagInput.value.trim();

    if (!tag) {
        return;
    }

    if (!Array.isArray(submission.tags)) {
        submission.tags = [];
    }

    const exists = submission.tags.some(
        item => normalizeTag(item) === normalizeTag(tag)
    );

    if (exists) {
        newTagInput.value = "";
        return;
    }

    submission.tags.push(tag);
    newTagInput.value = "";

    renderTags(submission);
}

function handleFileNameChange() {
    const submission = getSelectedSubmission();

    if (!submission) {
        return;
    }

    submission.name = reviewFileName.value.trim();

    if (typeof TagEngine !== "undefined") {
        const analysis = TagEngine.analyzeFileName(
            submission.name
        );

        submission.analysis = analysis;
        renderAnalysis(analysis);
    }
}

function renderAnalysis(analysis) {
    analysisResult.innerHTML = "";

    if (!Array.isArray(analysis) || analysis.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "Không có dữ liệu phân tích.";
        empty.style.color = "#9ca3af";
        analysisResult.appendChild(empty);
        return;
    }

    analysis.forEach(item => {
        const element = document.createElement("div");
        element.className =
            `analysis-item analysis-${item.status}`;

        const keyword = document.createElement("strong");
        keyword.textContent = item.keyword || "";

        element.appendChild(keyword);

        if (item.status === "matched") {
            const arrow = document.createElement("span");
            arrow.textContent = "→";

            const tag = document.createElement("span");
            tag.textContent = item.tag || "";

            element.append(arrow, tag);
        }

        if (item.status === "suggestion") {
            const label = document.createElement("span");
            label.textContent = "Có thể là:";

            element.appendChild(label);

            if (Array.isArray(item.suggestions)) {
                item.suggestions.forEach(suggestion => {
                    const button =
                        document.createElement("button");

                    button.type = "button";
                    button.className = "suggestion-tag";
                    button.textContent =
                        `${suggestion.name} (${Math.round(
                            suggestion.score * 100
                        )}%)`;

                    button.addEventListener("click", () => {
                        applySuggestedTag(
                            item.keyword,
                            suggestion.name
                        );
                    });

                    element.appendChild(button);
                });
            }
        }

        if (item.status === "new") {
            const label = document.createElement("span");
            label.textContent =
                `Tag mới: ${item.tag || ""}`;

            element.appendChild(label);
        }

        analysisResult.appendChild(element);
    });
}

function applySuggestedTag(keyword, tag) {
    const submission = getSelectedSubmission();

    if (!submission) {
        return;
    }

    if (!Array.isArray(submission.tags)) {
        submission.tags = [];
    }

    const exists = submission.tags.some(
        item => normalizeTag(item) === normalizeTag(tag)
    );

    if (!exists) {
        submission.tags.push(tag);
    }

    renderTags(submission);
}

async function handleReject() {
    const submission = getSelectedSubmission();

    if (!submission) {
        return;
    }

    const confirmed = window.confirm(
        `Bạn có chắc muốn từ chối và xóa "${submission.name}"?`
    );

    if (!confirmed) {
        return;
    }

    setReviewButtonsDisabled(true);

    try {
        const response = await fetch(
            `${WORKER_URL}/reject`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${adminPasswordValue}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: submission.id
                })
            }
        );

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.error || "Không thể từ chối bài gửi."
            );
        }

        selectedSubmissionId = null;
        await loadSubmissions();
        clearReview();

        window.alert(
            data.message || "Đã từ chối và xóa file tạm."
        );
    } catch (error) {
        window.alert(error.message);
    } finally {
        setReviewButtonsDisabled(false);
    }
}

async function handleApprove() {
    const submission = getSelectedSubmission();

    if (!submission) {
        return;
    }

    const name = reviewFileName.value.trim();

    if (!name) {
        window.alert("Tên file không được để trống.");
        return;
    }

    if (!Array.isArray(submission.tags) ||
        submission.tags.length === 0) {
        window.alert("Phải có ít nhất một tag.");
        return;
    }

    const confirmed = window.confirm(
        `Xác nhận duyệt "${name}"?`
    );

    if (!confirmed) {
        return;
    }

    setReviewButtonsDisabled(true);

    try {
        const response = await fetch(
            `${WORKER_URL}/approve`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${adminPasswordValue}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: submission.id,
                    name,
                    tags: submission.tags
                })
            }
        );

        const data = await parseResponse(response);

        if (!response.ok) {
            throw new Error(
                data.error || "Không thể duyệt bài gửi."
            );
        }

        selectedSubmissionId = null;
        await loadSubmissions();
        clearReview();

        window.alert(
            data.message || "Đã duyệt thành công."
        );
    } catch (error) {
        window.alert(error.message);
    } finally {
        setReviewButtonsDisabled(false);
    }
}

function getSelectedSubmission() {
    return submissions.find(
        submission => submission.id === selectedSubmissionId
    );
}

function normalizeTag(tag) {
    return String(tag || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}

function setReviewButtonsDisabled(disabled) {
    approveButton.disabled = disabled;
    rejectButton.disabled = disabled;
    addTagButton.disabled = disabled;
}

async function parseResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: text
        };
    }
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