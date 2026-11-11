
/* ==========================================
   NÉT MỰC TRI ÂN - THCS BÌNH LỢI
   PHIÊN BẢN GITHUB PAGES
   KHÔNG CẦN BACKEND / ADMIN
========================================== */

const DATA_URL = "./data/site.json";

/* ==========================================
   1. HÀM HỖ TRỢ
========================================== */

function createElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

/* ==========================================
   2. TẢI DỮ LIỆU TỪ JSON
========================================== */

async function loadWebsite() {
  try {
    const response = await fetch(DATA_URL, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        "Không tìm thấy data/site.json"
      );
    }

    const data = await response.json();

    // Thông tin trang chủ
    if (data.site) {
      const title = document.getElementById("siteTitle");
      const subtitle = document.getElementById("siteSubtitle");
      const intro = document.getElementById("introduction");

      if (title && data.site.title) {
        title.textContent = data.site.title;
      }

      if (subtitle && data.site.subtitle) {
        subtitle.textContent = data.site.subtitle;
      }

      if (intro) {
        intro.replaceChildren();

        const paragraphs = String(
          data.site.introduction || ""
        ).split(/\n\s*\n/);

        paragraphs.forEach(text => {
          if (text.trim()) {
            intro.appendChild(
              createElement("p", "", text.trim())
            );
          }
        });
      }
    }

    renderPosts(data.posts || []);
    renderPhotos(data.photos || []);
    renderArtworks(data.artworks || []);
    renderWishes(data.wishes || []);

    console.log("Đã tải dữ liệu báo tường.");

  } catch (error) {
    console.error("Lỗi tải dữ liệu:", error);

    const intro = document.getElementById("introduction");
    if (intro) {
      intro.textContent =
        "Nội dung đang được cập nhật.";
    }
  }
}

/* ==========================================
   3. BÀI VĂN VÀ BÀI THƠ
========================================== */

function renderPosts(posts) {
  const articles = document.getElementById("articleList");
  const poems = document.getElementById("poemList");

  if (!articles || !poems) return;

  articles.replaceChildren();
  poems.replaceChildren();

  posts.forEach(post => {
    const card = createElement("article", "card");

    card.appendChild(
      createElement("h3", "", post.title || "")
    );

    const content = String(post.content || "");

    if (post.type === "poem") {
      const poem = createElement("p", "", content);
      poem.style.whiteSpace = "pre-line";
      card.appendChild(poem);
      poems.appendChild(card);
    } else {
      const preview = createElement(
        "p",
        "preview",
        content.slice(0, 200) +
          (content.length > 200 ? "..." : "")
      );

      const button = createElement(
        "button",
        "btn",
        "Đọc bài viết"
      );

      button.type = "button";
      button.onclick = () => openArticle(post);

      card.append(preview, button);
      articles.appendChild(card);
    }
  });
}

function openArticle(post) {
  const dialog = document.getElementById("articleDialog");
  if (!dialog) return;

  document.getElementById("dialogTitle").textContent =
    post.title || "";

  const content = document.getElementById("dialogContent");
  content.textContent = post.content || "";
  content.style.whiteSpace = "pre-line";

  dialog.showModal();
}

/* ==========================================
   4. THƯ VIỆN ẢNH
========================================== */

function renderPhotos(photos) {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  gallery.replaceChildren();

  photos.forEach(photo => {
    const figure = document.createElement("figure");
    const img = document.createElement("img");

    img.src = photo.url;
    img.alt = photo.caption || "Ảnh kỷ niệm";
    img.loading = "lazy";

    const caption = createElement(
      "figcaption",
      "",
      photo.caption || ""
    );

    figure.append(img, caption);
    gallery.appendChild(figure);
  });
}

/* ==========================================
   5. TRANH VẼ - THIỆP - POSTER
========================================== */

function renderArtworks(artworks) {
  const container = document.getElementById("artworkList");
  if (!container) return;

  container.replaceChildren();

  if (!artworks.length) {
    container.appendChild(
      createElement(
        "p",
        "artwork-empty",
        "Các tác phẩm sẽ được cập nhật tại đây."
      )
    );
    return;
  }

  artworks
    .filter(item => item.status !== "rejected")
    .forEach(item => {
      const figure = document.createElement("figure");

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.title || "Tác phẩm nghệ thuật";
      img.loading = "lazy";

      const title = createElement(
        "h3",
        "",
        item.title || ""
      );

      const author = createElement(
        "p",
        "",
        `${item.author || ""} - Lớp ${item.studentClass || ""}`
      );

      figure.append(img, title, author);
      container.appendChild(figure);
    });
}

/* ==========================================
   6. LỜI CHÚC CÓ SẴN
========================================== */

function renderWishes(wishes) {
  const container = document.getElementById("wishList");
  if (!container) return;

  container.replaceChildren();

  wishes
    .filter(wish => wish.status !== "rejected" &&
      wish.status !== "pending")
    .forEach(wish => {
      const card = createElement("div", "wish-card");

      card.append(
        createElement("strong", "", "🌷 " + wish.name),
        createElement("p", "", wish.message)
      );

      container.appendChild(card);
    });
}

/* ==========================================
   7. GÓC SÁNG TÁC - CHUYỂN TAB
========================================== */

function setupCreativeTabs() {
  const tabs = document.querySelectorAll(".creative-tab");
  const panels = document.querySelectorAll(".creative-panel");

  if (!tabs.length || !panels.length) return;

  function selectTab(name) {
    tabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    panels.forEach(panel => {
      panel.hidden = panel.id !== "creative-" + name;
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      selectTab(tab.dataset.tab);
    });
  });

  if (location.hash === "#goc-tho") {
    selectTab("tho");
  } else {
    selectTab("van");
  }

  window.addEventListener("hashchange", () => {
    if (location.hash === "#goc-tho") {
      selectTab("tho");
    }
  });
}

/* ==========================================
   8. SLIDESHOW TỰ ĐỘNG
========================================== */

function setupSlideshow() {
  const slideshow = document.querySelector(".hero-slideshow");
  if (!slideshow) return;

  if (slideshow.dataset.initialized === "true") return;
  slideshow.dataset.initialized = "true";

  const slides = [...slideshow.querySelectorAll(".slide")];
  const dotsContainer = slideshow.querySelector(".slide-dots");

  if (!slides.length || !dotsContainer) return;

  let current = 0;
  let timer = null;

  dotsContainer.replaceChildren();

  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slide-dot";
    dot.setAttribute("aria-label", `Ảnh ${index + 1}`);

    dot.onclick = () => {
      showSlide(index);
      startTimer();
    };

    dotsContainer.appendChild(dot);
  });

  const dots = [...dotsContainer.children];

  function showSlide(index) {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === current);
      slide.setAttribute(
        "aria-hidden",
        String(i !== current)
      );
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === current);
    });
  }

  function stopTimer() {
    clearTimeout(timer);
    timer = null;
  }

  function startTimer() {
    stopTimer();

    if (slides.length < 2 || document.hidden) return;

    timer = setTimeout(() => {
      showSlide(current + 1);
      startTimer();
    }, 5000);
  }

  slideshow.querySelector(".slide-prev")
    ?.addEventListener("click", () => {
      showSlide(current - 1);
      startTimer();
    });

  slideshow.querySelector(".slide-next")
    ?.addEventListener("click", () => {
      showSlide(current + 1);
      startTimer();
    });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  showSlide(0);
  startTimer();
}

/* ==========================================
   9. KHỞI ĐỘNG WEBSITE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("closeDialog")
    ?.addEventListener("click", () => {
      document.getElementById("articleDialog")?.close();
    });

  // GitHub Pages không có API để nhận lời chúc
  const wishForm = document.getElementById("wishForm");

  if (wishForm) {
    wishForm.hidden = true;
  }

  setupSlideshow();
  setupCreativeTabs();
  loadWebsite();
});
