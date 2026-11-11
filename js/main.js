
/* =========================================
   NÉT MỰC TRI ÂN - THCS BÌNH LỢI
   MAIN JAVASCRIPT
========================================= */

const API = "/api";

/* =========================================
   1. XỬ LÝ API
========================================= */

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    throw new Error(
      "Không thể kết nối máy chủ. Hãy kiểm tra backend Node.js."
    );
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "API không trả về JSON. " +
      "Hãy chạy website bằng server.js thay vì Live Server (5500). " +
      "Đường dẫn đang gọi: " + url
    );
  }

  let data;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Dữ liệu JSON từ máy chủ không hợp lệ.");
  }

  if (!response.ok) {
    throw new Error(
      data.error || `Lỗi máy chủ: ${response.status}`
    );
  }

  return data;
}

/* =========================================
   2. TẠO PHẦN TỬ HTML
========================================= */

function element(tag, className = "", text) {
  const el = document.createElement(tag);

  if (className) {
    el.className = className;
  }

  if (text !== undefined && text !== null) {
    el.textContent = String(text);
  }

  return el;
}

/* =========================================
   3. HIỂN THỊ LỜI NGỎ
========================================= */

function renderText(container, text) {
  if (!container) return;

  container.replaceChildren();

  const paragraphs = String(text || "").split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      container.appendChild(
        element("p", "", paragraph.trim())
      );
    }
  }
}

/* =========================================
   4. HIỂN THỊ BÀI VIẾT VÀ GÓC THƠ
========================================= */

function renderPosts(posts = []) {
  const articles = document.getElementById("articleList");
  const poems = document.getElementById("poemList");

  if (!articles || !poems) return;

  articles.replaceChildren();
  poems.replaceChildren();

  for (const post of posts) {
    const card = element("article", "card");

    const title = element("h3", "", post.title || "");
    card.appendChild(title);

    const content = String(post.content || "");

    if (post.type === "poem") {
      const poem = element("p", "", content);

      poem.style.whiteSpace = "pre-line";

      card.appendChild(poem);
      poems.appendChild(card);
    } else {
      const previewText =
        content.length > 200
          ? content.slice(0, 200) + "..."
          : content;

      const preview = element(
        "p",
        "preview",
        previewText
      );

      const button = element(
        "button",
        "btn",
        "Đọc bài viết"
      );

      button.type = "button";

      button.addEventListener("click", () => {
        openArticle(post);
      });

      card.append(preview, button);
      articles.appendChild(card);
    }
  }
}

/* =========================================
   5. XEM CHI TIẾT BÀI VIẾT
========================================= */

function openArticle(post) {
  const dialog = document.getElementById("articleDialog");
  const title = document.getElementById("dialogTitle");
  const content = document.getElementById("dialogContent");

  if (!dialog || !title || !content) return;

  title.textContent = post.title || "";
  content.textContent = post.content || "";

  content.style.whiteSpace = "pre-line";

  if (!dialog.open) {
    dialog.showModal();
  }
}

function setupArticleDialog() {
  const dialog = document.getElementById("articleDialog");
  const closeButton = document.getElementById("closeDialog");

  if (!dialog || !closeButton) return;

  closeButton.addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

/* =========================================
   6. HIỂN THỊ ALBUM ẢNH
========================================= */

function renderPhotos(photos = []) {
  const gallery = document.getElementById("gallery");

  if (!gallery) return;

  gallery.replaceChildren();

  for (const photo of photos) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");

    img.src = photo.url;
    img.alt = photo.caption || "Ảnh kỷ niệm";
    img.loading = "lazy";

    const caption = element(
      "figcaption",
      "",
      photo.caption || ""
    );

    figure.append(img, caption);
    gallery.appendChild(figure);
  }
}

/* =========================================
   7. HIỂN THỊ LỜI CHÚC
========================================= */

function renderWishes(wishes = []) {
  const list = document.getElementById("wishList");

  if (!list) return;

  list.replaceChildren();

  for (const wish of wishes) {
    const card = element("div", "wish-card");

    const name = element(
      "strong",
      "",
      "🌷 " + (wish.name || "")
    );

    const message = element(
      "p",
      "",
      wish.message || ""
    );

    card.append(name, message);
    list.appendChild(card);
  }
}

/* =========================================
   8. TẢI DỮ LIỆU WEBSITE
========================================= */

async function loadWebsite() {
  try {
    const data = await request(API + "/public");

    if (!data.site) {
      throw new Error(
        "Dữ liệu website thiếu thông tin site."
      );
    }

    const siteTitle = document.getElementById("siteTitle");
    const siteSubtitle = document.getElementById("siteSubtitle");
    const introduction = document.getElementById("introduction");

    if (siteTitle && data.site.title) {
      siteTitle.textContent = data.site.title;
    }

    if (siteSubtitle && data.site.subtitle) {
      siteSubtitle.textContent = data.site.subtitle;
    }

    renderText(
      introduction,
      data.site.introduction || ""
    );

    renderPosts(data.posts || []);
    renderPhotos(data.photos || []);
    renderWishes(data.wishes || []);

    console.log("Website đã tải dữ liệu thành công.");

  } catch (error) {
    console.error("Lỗi tải website:", error);

    const introduction = document.getElementById("introduction");

    if (introduction) {
      introduction.textContent =
        "Hiện chưa thể tải nội dung báo tường. " +
        "Vui lòng kiểm tra kết nối máy chủ.";
    }

    // Không dùng alert để tránh làm gián đoạn trang web.
  }
}

/* =========================================
   9. GỬI LỜI CHÚC
========================================= */

function setupWishForm() {
  const form = document.getElementById("wishForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const status = document.getElementById("wishStatus");

    const name = document
      .getElementById("studentName")
      .value.trim();

    const message = document
      .getElementById("wishMessage")
      .value.trim();

    if (!name || !message) {
      status.textContent =
        "Vui lòng nhập đầy đủ họ tên và lời chúc.";
      return;
    }

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
    }

    status.textContent = "Đang gửi lời chúc...";

    try {
      await request(API + "/wishes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name,
          message: message
        })
      });

      status.textContent =
        "💌 Đã gửi lời chúc thành công! " +
        "Lời chúc sẽ hiển thị sau khi được duyệt.";

      form.reset();

    } catch (error) {
      console.error(error);

      status.textContent =
        "Không thể gửi lời chúc: " + error.message;

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

/* =========================================
   10. SLIDESHOW TRANG CHỦ
========================================= */


/* ===================================
   SLIDESHOW - CHUYỂN ẢNH MƯỢT
=================================== */

function setupSlideshow() {
  const slideshow = document.querySelector(".hero-slideshow");
  if (!slideshow) return;

  // Ngăn khởi tạo slideshow nhiều lần
  if (slideshow.dataset.initialized === "true") return;
  slideshow.dataset.initialized = "true";

  const slides = Array.from(
    slideshow.querySelectorAll(".slide")
  );

  const dotsContainer = slideshow.querySelector(".slide-dots");
  const prevBtn = slideshow.querySelector(".slide-prev");
  const nextBtn = slideshow.querySelector(".slide-next");

  if (!slides.length || !dotsContainer) return;

  let currentIndex = 0;
  let timer = null;

  const INTERVAL = 5000;

  // Xóa các chấm cũ
  dotsContainer.innerHTML = "";

  // Tạo chấm mới
  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slide-dot";
    dot.setAttribute("aria-label", `Xem ảnh ${index + 1}`);

    dot.addEventListener("click", () => {
      goToSlide(index);
    });

    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(
    dotsContainer.querySelectorAll(".slide-dot")
  );

  // Hiển thị đúng một ảnh
  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const active = i === currentIndex;

      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  // Dừng bộ đếm cũ
  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  // Lên lịch chuyển ảnh tiếp theo
  function startTimer() {
    stopTimer();

    if (slides.length <= 1 || document.hidden) return;

    timer = setTimeout(() => {
      showSlide(currentIndex + 1);
      startTimer();
    }, INTERVAL);
  }

  // Chuyển ảnh thủ công
  function goToSlide(index) {
    showSlide(index);
    startTimer();
  }

  // Nút quay lại
  prevBtn?.addEventListener("click", () => {
    goToSlide(currentIndex - 1);
  });

  // Nút tiếp theo
  nextBtn?.addEventListener("click", () => {
    goToSlide(currentIndex + 1);
  });

  // Quản lý khi đổi tab trình duyệt
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  // Khởi tạo
  showSlide(0);
  startTimer();
}


/* =========================================
   11. KHỞI ĐỘNG WEBSITE
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupArticleDialog();
  setupWishForm();
  setupSlideshow();
  loadWebsite();
});

/* ===================================
   GÓC SÁNG TÁC - CHUYỂN TAB
=================================== */

function setupCreativeTabs() {
  const tabs = document.querySelectorAll(".creative-tab");
  const panels = document.querySelectorAll(".creative-panel");

  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.tab;

      tabs.forEach((item) => {
        const active = item === tab;

        item.classList.toggle("active", active);
        item.setAttribute(
          "aria-selected",
          String(active)
        );
      });

      panels.forEach((panel) => {
        panel.hidden =
          panel.id !== "creative-" + selected;
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupCreativeTabs();

  // Hỗ trợ đường dẫn #goc-tho cũ
  if (window.location.hash === "#goc-tho") {
    document.querySelector(
      '.creative-tab[data-tab="tho"]'
    )?.click();

    document.getElementById("baiviet")
      ?.scrollIntoView();
  }
});
