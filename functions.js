/*===== toggle mở thu nội dung =====*/
const toggles = document.querySelectorAll(".toggle");
toggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
        e.preventDefault();
        const content = this.previousElementSibling;
        content.classList.toggle("expanded");
        this.textContent = content.classList.contains("expanded")
            ? "Thu gọn"
            : "Xem thêm";
    });
});

/*===== nút home =====*/
const homeBtn = document.getElementById("homeBtn"); window.addEventListener("scroll", () => {
    if (window.scrollY > 200 ) {
        homeBtn.style.display = "flex";
        homeBtn.style.opacity = "1";
    }
    else {
        homeBtn.style.opacity = "0";
        setTimeout(() => homeBtn.style.display = "none", 200);
    }
});
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/*===== thanh điều hướng (mobile) =====*/
const navibar = document.getElementById("navibar"); window.addEventListener("scroll",() => {
    if (window.scrollY > 120) {
        navibar.classList.add("scrolled");
    }
    else {
        navibar.classList.remove("scrolled")
    }
});
function toggleMenu() {
    document.getElementById("navibar").classList.toggle("show");
}

const menu = document.querySelector(".menu");
const navi = document.querySelectorAll(".navi");
function toggleMenu() {
    navibar.classList.toggle("show");
    menu.textContent = navibar.classList.contains("show") ? "✖" : "☰";
}
navi.forEach(link => {
    link.addEventListener("click", () => {
        navibar.classList.remove("show");
        menu.textContent = "☰";
    });
});
document.addEventListener("click", (e) => {
    if (
        !navibar.contains(e.target) &&
        !menu.contains(e.target)
    ) {
        navibar.classList.remove("show");
        menu.textContent = "☰";
    }
});

/*===== theme toggole =====*/
const theme = document.getElementById("themeToggle");

theme.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");

    if (document.body.classList.contains("dark-theme")) {
        theme.textContent = "☀️";
        localStorage.setItem("theme", "dark");
    }
    else {
        theme.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
});

/* Giữ trạng thái khi reload */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-theme");
  theme.textContent = "☀️";
}

/*===== random quotes =====*/
const studentItems = document.querySelectorAll(".student-list li");
const studentNames = Array.from(studentItems).map(li => li.textContent);
function getRandomName() {
    return studentNames[Math.floor(Math.random() * studentNames.length)];
}
const quotes = [
    () => `${getRandomName()} lên bảng nào, học bài chưa em.`,
    () => `${getRandomName()} ơi.`,
    "Số 15 ơi, cậu là người đặc biệt á:3",
    "Ba năm chỉ là bắt đầu của hành trình dài phía trước.",
    "Thanh xuân là thứ đẹp nhất mà chúng ta từng có.",
    "Cảm ơn vì đã là một phần của tuổi 18.",
    "12A2, một thời để nhớ.",
    "Ba năm không dài, nhưng đủ biến người lạ thành 'đồng bọn'.",
    "Chúng ta từng hứa sẽ học chăm hơn... từ tuần sau.",
    "Tuổi 18: chưa già để tiếc nuối, chẳng trẻ để vô tư.",
    "Đi học vì tương lai, ở lại vì bạn bè.",
    "Kỉ niệm nhiều đến mức phải thi lại mới nhớ hết.",
    "Lớp mình không hoàn hảo, nhưng hoàn cảnh đưa đẩy nên thành huyền thoại.",
    "Ơ kìa, đừng khóc chứ!",
    "MƯỜI điểm!",
    "Thanh xuân giống bài kiểm tra 15 phút-trôi qua nhanh mà chưa kịp chuẩn bị.",
    "Thanh xuân là khi ta cười nhiều hơn khóc... và khóc vì Toán Lý Hóa.",
    "Ba năm đủ để nhớ tên nhau, và nhớ cả những lần bị gọi lên bảng.",
    "Nếu thời gian quay lại, chắc mình vẫn chọn ngồi đúng chỗ cũ và cùng người ấy.",
    "Học hành có thể quên, nhưng trò nghịch thì nhớ mãi.",
    "Chúng ta rồi sẽ khác đi, nhưng hi vọng vẫn cười như ngày hôm nay.",
    "Cảm ơn vì đã cùng lớn lên - dù lớn hơi chậm.",
    "Thanh xuân là quãng thời gian ta vừa sợ kiểm tra miệng, vừa sợ một ngày không còn được gọi tên.",
    "Thanh xuân là khi ta giận nhau vì chuyện nhỏ xíu, rồi lại làm hòa bằng một ly trà sữa.",
    "Chúng ta đếm từng ngày ra trường, không ngờ sau này lại đếm từng ngày để nhớ.",
    "Cấp ba dạy ta nhiều thứ:Toán, Văn, Lý, Sử,... và cả cách để thương một người nhưng không dám nói.",
    "Hóa ra điều khó nhất không phải là bài kiểm tra cuối cùng mà là nói lời tạm biệt.",
    "Lấy thanh xuân đầu tư vào HDPE thì ngon luôn!",
    "Ước gì mùa đông đến đây để đóng băng thời gian này lại cùng những kỉ niệm khó phai nhòa.",
    "Thời gian trôi nhanh khiến thanh xuân tuột mất như mất người mãi mãi.",
];

const quoteText = document.querySelector(".quote-text");
function changeQuote() {
    quoteText.classList.add("fade");
    setTimeout(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        quoteText.textContent = typeof randomQuote === "function" 
        ? randomQuote() : randomQuote;
        quoteText.classList.remove("fade");
    }, 500);
}
changeQuote();
setInterval(changeQuote,30000);

/*===== thanks popup =====*/
const form = document.querySelector("form");
const thanksPopup = document.getElementById("thanks-popup");

form.addEventListener("submit", function(e) {
    e.preventDefault();

    emailjs.sendForm(
        "service_HuuHuy111",
        "template_kusufs9",
        form
    )
    .then(() => {
        form.reset();
        showPopup();
    })
    .catch(() => {
        alert("Có lỗi xảy ra.");
    });
});

function showPopup() {
    thanksPopup.classList.remove("hide");
    thanksPopup.classList.add("show");

    setTimeout(() => {
        thanksPopup.classList.remove("show");
        thanksPopup.classList.add("hide");
    }, 4000);
}

/*===== popup gallery =====*/
const popup = document.getElementById("galleryPopup");
const openBtn = document.getElementById("openGallery");
const closeBtn = document.querySelector(".close-btn");
const container = document.querySelector(".media-container");
const totalCount = document.getElementById("totalCount");
const filterContent = document.querySelector(".filter-content");
const filterBox = document.querySelector(".filter");
const toggleFilterBtn = document.querySelector(".toggle-filter");

let mediaData = [];
let filteredData = [];
let activeTags = [];
let loaded = 0;
let scale = 1;
let isDragging = false;
let startX, startY;
let currentX = 0;
let currentY = 0;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const batchSize = 20;

/* ================= LOAD JSON ================= */
async function loadMedia() {
    const res = await fetch("data/media.json");
    const data = await res.json();

    mediaData = data.map((m, i) => ({
        id: i,
        type: m.type,
        src: m.src,
        tags: Array.isArray(m.tags) ? m.tags : []
    }));
    renderTags();
    applyFilter();
}
loadMedia();

/* ================= TAG RENDER ================= */
function renderTags() {
    const tagMap = {};
    mediaData.forEach(m => {
        m.tags.forEach(t => {
            tagMap[t] = (tagMap[t] || 0) + 1;
        });
    });
    const sorted = Object.keys(tagMap)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    sorted.forEach(tag => {
        const btn = document.createElement("button");
        btn.className = "tag-btn";
        btn.dataset.tag = tag;
        btn.textContent = `${tag} (${tagMap[tag]})`;
        filterContent.appendChild(btn);
    });
}

/* ================= FILTER AND ================= */
function applyFilter() {
    if (activeTags.length === 0) {
        filteredData = [...mediaData];
    } else {
        filteredData = mediaData.filter(m =>
            activeTags.every(t => m.tags.includes(t))
        );
    }
    resetGallery();
}

/* ================= RESET ================= */
function resetGallery() {
    container.innerHTML = "";
    loaded = 0;
    totalCount.textContent = `Tổng: ${filteredData.length} media`;
    renderBatch();
}

/* ================= RENDER BATCH ================= */
function renderBatch() {
    if(loaded >= filteredData.length) return;
    const next = filteredData.slice(loaded, loaded + batchSize);
    next.forEach((m,i) => {
        const wrapper = document.createElement("div");
        wrapper.className= "media-item";
        wrapper.dataset.index = loaded + i;
        let el;
        if (m.type === "image") {
            el = document.createElement("img");
            el.src = m.src;
            el.loading = "lazy";
        }
        else if (m.type === "video") {
            el = document.createElement("video");
            el.controls = true;
            el.preload = "none";
          const source = document.createElement("source");
          source.src = m.src;
          source.type = "video/mp4";
          el.appendChild(source);
        }
        else {
            return;
        }
        wrapper.appendChild(el);
        container.appendChild(wrapper);
    });
    loaded += next.length;
}
/* ================= INFINITE SCROLL ================= */
const gallery = document.querySelector(".gallery");

gallery.addEventListener("scroll", () => {
    if (gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 200) {
        if (loaded < filteredData.length) {
            renderBatch();
        }
    }
});

/* ================= FILTER CLICK ================= */
document.addEventListener("click", e => {
    if (e.target.classList.contains("tag-btn")) {

        const clickedBtn = e.target;
        const tag = clickedBtn.dataset.tag;
        const allBtns = document.querySelectorAll(".tag-btn");

        if (tag === "all") {
            // Reset tất cả tag
            activeTags = [];

            allBtns.forEach(btn => btn.classList.remove("active"));
            clickedBtn.classList.add("active");
        } else {

            // Bỏ active khỏi nút "Tất cả"
            document.querySelector('[data-tag="all"]').classList.remove("active");

            // Toggle tag trong mảng
            if (activeTags.includes(tag)) {
                activeTags = activeTags.filter(t => t !== tag);
                clickedBtn.classList.remove("active");
            } else {
                activeTags.push(tag);
                clickedBtn.classList.add("active");
            }

            // Nếu không còn tag nào → bật lại "Tất cả"
            if (activeTags.length === 0) {
                document.querySelector('[data-tag="all"]').classList.add("active");
            }
        }

        applyFilter();
    }
});

/* ================= MOBILE FILTER TOGGLE ================= */
toggleFilterBtn.onclick = () => {
    filterBox.classList.toggle("open");
};

/* ================= POPUP ================= */
openBtn.onclick = e => {
    e.preventDefault();
    popup.classList.add("show");
    document.body.classList.add("lock");
};
function closeViewer() {
    viewer.classList.remove("show");
    stopVideos();
}
function closePopup() {
    closeViewer();
    popup.classList.remove("show");
    document.body.classList.remove("lock");
}
closeBtn.onclick = closePopup;
popup.addEventListener("click", (e) => {
    if (e.target === popup) {
        closePopup();
    }
});

/* ================= STOP VIDEO ================= */
function stopVideos() {
    document.querySelectorAll("video").forEach(v => {
        v.pause();
        v.currentTime = 0;
    });
}

/* ================= VIEWER ================= */
const viewer = document.querySelector(".viewer");
const viewerContent = document.querySelector(".viewer-content");
let currentIndex = 0;
container.addEventListener("click", e => {
    const item = e.target.closest(".media-item");
    if (!item) return;
    currentIndex = Number(item.dataset.index);
    openViewer(currentIndex);
});
function openViewer(i) {
    viewer.classList.add("show");
    renderViewer(i);
    resetZoom();
}
function renderViewer(i) {
    viewerContent.innerHTML= "";
    if (i < 0 || i >= filteredData.length) return;
    const m = filteredData[i];
    if (!m || !m.src) return;
    let el;
    if (m.type === "image") {
        el = document.createElement("img");
        el.src = m.src;
    }
    else if (m.type === "video") {
        el = document.createElement("video");
        el.controls = true;
        const source = document.createElement("source");
        source.src = m.src;
        source.type = "video/mp4";
        el.appendChild(source);
    }
    if (el) {
        el.classList.add(".viewer-content");
        el.draggable = false;
        el.addEventListener("dragstart", e => e.preventDefault());
    }
    viewerContent.appendChild(el);
}

/*=========zoom viewer==========*/
viewer.addEventListener("wheel", e => {
    const media = viewer.querySelector(".viewer-content");
    if (!media) return;
    e.preventDefault();
    const zoomSpeed = 0.1;
    if (e.deltaY < 0) {
        scale += zoomSpeed;
    }
    else {
        scale -= zoomSpeed;
    }
    scale = Math.max(1, Math.min(scale, 5));
    media.style.transform =`translate(${currentX}px, ${currentY}px) scale(${scale})`;
}, { passive: false });

/*======== dragg ========*/
viewerContent.addEventListener("mousedown", e => {
    const media = viewer.querySelector(".viewer-content");
    if (!media) return;
    if (scale <= 1) return; 
    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;
    viewerContent.style.cursor = "grabbing";
});
window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const media = viewer.querySelector(".viewer-content");
    if (!media) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    media.style.transform =`translate(${currentX}px, ${currentY}px) scale(${scale})`;
});
window.addEventListener("mouseup", () => {
    isDragging = false;
    viewerContent.style.cursor = "grab";
});


/*======== reset zoom bằng double click ========*/
viewer.addEventListener("dblclick", () => {
    const media = viewer.querySelector(".viewer-content");
    if (!media) return;
    media.style.transition = "transform 0.35s cubic-bezier(.22,.61,.36,1)";
    scale = 1;
    currentX = 0;
    currentY = 0;
    media.style.transform = "translate(0px, 0px) scale(1)";
    setTimeout(() => {
        media.style.transition = "none";
    }, 350);
});

/*=========close viewer========*/
document.querySelector(".viewer-close").onclick = () => viewer.classList.remove("show");
viewer.addEventListener("click", (e) => {
    if (e.target === viewer) {
        closeViewer();
        resetZoom();
    }
});

document.querySelector(".next").onclick = () => {
    if (currentIndex < filteredData.length - 1) {
        currentIndex++;
        renderViewer(currentIndex);
    }
};
document.querySelector(".prev").onclick = () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderViewer(currentIndex);
    }
};
/*========== reset zoom viewer =========*/
function resetZoom() {
    zoomScale = 1;
    currentX = 0;
    currentY = 0;
    const media = viewer.querySelector(".viewer-content");
    if (media) {
        media.style.transform = "translate(0px, 0px) scale(1)";
        media.style.transformOrigin = "center center";
    }
    viewer.style.cursor = "zoom-in";

}

