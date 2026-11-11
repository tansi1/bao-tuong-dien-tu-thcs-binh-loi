
/* ==========================================
   NÉT MỰC TRI ÂN - THCS BÌNH LỢI
   TRANG QUẢN TRỊ WEBSITE
========================================== */

const API = "/api";
let state = null;

const $ = (id) => document.getElementById(id);

/* ==========================================
   1. KẾT NỐI API
========================================== */

async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(API + endpoint, {
      credentials: "same-origin",
      ...options
    });
  } catch (error) {
    throw new Error("Không kết nối được máy chủ.");
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error(
      "Máy chủ không trả về JSON. " +
      "Hãy mở Admin bằng địa chỉ Node.js."
    );
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      showLogin();
    }

    throw new Error(
      data.error || "Thao tác thất bại."
    );
  }

  return data;
}

function sendJSON(endpoint, method, data) {
  return request(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

/* ==========================================
   2. GIAO DIỆN ĐĂNG NHẬP
========================================== */

function showLogin() {
  $("loginSection").hidden = false;
  $("dashboard").hidden = true;
  $("logoutBtn").hidden = true;
}

function showDashboard() {
  $("loginSection").hidden = true;
  $("dashboard").hidden = false;
  $("logoutBtn").hidden = false;
}

function status(message) {
  if ($("adminStatus")) {
    $("adminStatus").textContent = message;
  }
}

/* ==========================================
   3. CÁC THÀNH PHẦN DÙNG CHUNG
========================================== */

function makeButton(label, callback, danger = false) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;

  if (danger) {
    button.className = "danger";
  }

  button.addEventListener("click", callback);

  return button;
}

function makeItem(title, text = "") {
  const item = document.createElement("div");
  item.className = "item";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  item.append(heading, paragraph);

  return item;
}

/* ==========================================
   4. TẢI DỮ LIỆU QUẢN TRỊ
========================================== */

async function loadAdmin() {
  state = await request("/admin/state");

  state.posts = state.posts || [];
  state.photos = state.photos || [];
  state.artworks = state.artworks || [];
  state.wishes = state.wishes || [];

  showDashboard();

  $("title").value = state.site.title || "";
  $("subtitle").value = state.site.subtitle || "";
  $("introduction").value =
    state.site.introduction || "";

  renderPosts();
  renderPhotos();
  renderArtworks();
  renderWishes();
}

/* ==========================================
   5. QUẢN LÝ BÀI VIẾT VÀ THƠ
========================================== */

function renderPosts() {
  const box = $("postManager");
  if (!box) return;

  box.replaceChildren();

  state.posts.forEach((post) => {
    const prefix =
      post.type === "poem"
        ? "Thơ: "
        : "Bài viết: ";

    const item = makeItem(
      prefix + post.title,
      (post.content || "").slice(0, 180)
    );

    const editButton = makeButton(
      "Sửa",
      async () => {
        const title = prompt(
          "Tiêu đề:",
          post.title
        );

        if (title === null) return;

        const content = prompt(
          "Nội dung:",
          post.content
        );

        if (content === null) return;

        try {
          await sendJSON(
            "/admin/posts/" + post.id,
            "PUT",
            {
              title,
              content,
              type: post.type
            }
          );

          await loadAdmin();
          status("Đã cập nhật tác phẩm.");
        } catch (error) {
          alert(error.message);
        }
      }
    );

    const deleteButton = makeButton(
      "Xóa",
      async () => {
        if (!confirm("Bạn chắc chắn muốn xóa?")) {
          return;
        }

        try {
          await request(
            "/admin/posts/" + post.id,
            { method: "DELETE" }
          );

          await loadAdmin();
          status("Đã xóa tác phẩm.");
        } catch (error) {
          alert(error.message);
        }
      },
      true
    );

    item.append(editButton, deleteButton);
    box.appendChild(item);
  });
}

/* ==========================================
   6. QUẢN LÝ ALBUM ẢNH
========================================== */

function renderPhotos() {
  const box = $("photoManager");
  if (!box) return;

  box.replaceChildren();

  state.photos.forEach((photo) => {
    const item = document.createElement("div");
    item.className = "item";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = photo.caption || "Ảnh kỷ niệm";
    img.loading = "lazy";

    const caption = document.createElement("p");
    caption.textContent = photo.caption || "";

    const deleteButton = makeButton(
      "Xóa ảnh",
      async () => {
        if (!confirm("Xóa ảnh này?")) return;

        try {
          await request(
            "/admin/photos/" + photo.id,
            { method: "DELETE" }
          );

          await loadAdmin();
          status("Đã xóa ảnh.");
        } catch (error) {
          alert(error.message);
        }
      },
      true
    );

    item.append(img, caption, deleteButton);
    box.appendChild(item);
  });
}

/* ==========================================
   7. QUẢN LÝ TRANH VẼ - THIỆP - POSTER
========================================== */

function renderArtworks() {
  const box = $("adminArtworkList");
  if (!box) return;

  box.replaceChildren();

  if (state.artworks.length === 0) {
    const empty = document.createElement("p");

    empty.textContent =
      "Chưa có tác phẩm nghệ thuật nào.";

    box.appendChild(empty);
    return;
  }

  const typeNames = {
    drawing: "Tranh vẽ",
    card: "Thiệp 20/11",
    poster: "Poster"
  };

  state.artworks.forEach((artwork) => {
    const item = makeItem(
      artwork.title,
      "Tác giả: " +
        artwork.author +
        " | Lớp: " +
        artwork.studentClass +
        " | Loại: " +
        (typeNames[artwork.type] || artwork.type)
    );

    const img = document.createElement("img");

    img.src = artwork.url;
    img.alt = artwork.title;
    img.loading = "lazy";

    img.style.display = "block";
    img.style.width = "100%";
    img.style.maxWidth = "280px";
    img.style.height = "auto";
    img.style.borderRadius = "10px";
    img.style.margin = "15px 0";

    const deleteButton = makeButton(
      "Xóa tác phẩm",
      async () => {
        if (!confirm(
          "Bạn chắc chắn muốn xóa tác phẩm này?"
        )) {
          return;
        }

        try {
          await request(
            "/admin/artworks/" + artwork.id,
            { method: "DELETE" }
          );

          await loadAdmin();

          status("Đã xóa tác phẩm nghệ thuật.");
        } catch (error) {
          alert(error.message);
        }
      },
      true
    );

    item.append(img, deleteButton);
    box.appendChild(item);
  });
}

/* ==========================================
   8. XEM TRƯỚC TRANH VẼ
========================================== */

function setupArtworkPreview() {
  const fileInput = $("artworkImage");
  const preview = $("artworkPreview");

  if (!fileInput || !preview) return;

  let previewURL = null;

  function clearPreview() {
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }

    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  fileInput.addEventListener("change", () => {
    clearPreview();

    const file = fileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn hình ảnh hợp lệ.");
      fileInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng ảnh không vượt quá 5MB.");
      fileInput.value = "";
      return;
    }

    previewURL = URL.createObjectURL(file);

    preview.src = previewURL;
    preview.style.display = "block";
  });

  $("artworkForm")?.addEventListener(
    "reset",
    clearPreview
  );

  window.addEventListener(
    "beforeunload",
    clearPreview
  );
}

/* ==========================================
   9. ĐĂNG TÁC PHẨM NGHỆ THUẬT
========================================== */

function setupArtworkForm() {
  const form = $("artworkForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = $("artworkStatus");
    const file = $("artworkImage").files[0];

    if (!file) {
      message.textContent =
        "Vui lòng chọn hình ảnh tác phẩm.";
      return;
    }

    const formData = new FormData();

    formData.append(
      "title",
      $("artworkTitle").value.trim()
    );

    formData.append(
      "author",
      $("artworkAuthor").value.trim()
    );

    formData.append(
      "studentClass",
      $("artworkClass").value.trim()
    );

    formData.append(
      "type",
      $("artworkType").value
    );

    formData.append("image", file);

    const button = form.querySelector(
      'button[type="submit"]'
    );

    if (button) button.disabled = true;

    message.textContent =
      "Đang tải tác phẩm lên máy chủ...";

    try {
      await request("/admin/artworks", {
        method: "POST",
        body: formData
      });

      form.reset();

      await loadAdmin();

      message.textContent =
        "Đã đăng tác phẩm thành công!";

      status("Đã thêm tác phẩm nghệ thuật.");
    } catch (error) {
      message.textContent =
        "Không thể đăng tác phẩm: " +
        error.message;
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* ==========================================
   10. QUẢN LÝ LỜI CHÚC
========================================== */

function renderWishes() {
  const box = $("wishManager");
  if (!box) return;

  box.replaceChildren();

  const pending = state.wishes.filter(
    wish => wish.status === "pending"
  );

  const approved = state.wishes.filter(
    wish => wish.status === "approved"
  );

  const heading1 = document.createElement("h3");
  heading1.textContent =
    "Chờ duyệt (" + pending.length + ")";

  box.appendChild(heading1);

  function addWish(wish) {
    const item = makeItem(
      wish.name,
      wish.message
    );

    if (wish.status === "pending") {
      item.appendChild(
        makeButton("Duyệt", () => {
          updateWish(wish.id, "approved");
        })
      );

      item.appendChild(
        makeButton(
          "Từ chối",
          () => updateWish(wish.id, "rejected"),
          true
        )
      );
    } else {
      item.appendChild(
        makeButton(
          "Gỡ lời chúc",
          () => updateWish(wish.id, "rejected"),
          true
        )
      );
    }

    item.appendChild(
      makeButton(
        "Xóa",
        async () => {
          if (!confirm(
            "Xóa vĩnh viễn lời chúc này?"
          )) {
            return;
          }

          try {
            await request(
              "/admin/wishes/" + wish.id,
              { method: "DELETE" }
            );

            await loadAdmin();
            status("Đã xóa lời chúc.");
          } catch (error) {
            alert(error.message);
          }
        },
        true
      )
    );

    box.appendChild(item);
  }

  pending.forEach(addWish);

  const heading2 = document.createElement("h3");
  heading2.textContent =
    "Đã duyệt (" + approved.length + ")";

  box.appendChild(heading2);

  approved.forEach(addWish);
}

async function updateWish(id, newStatus) {
  try {
    await sendJSON(
      "/admin/wishes/" + id,
      "PATCH",
      { status: newStatus }
    );

    await loadAdmin();

    status("Đã cập nhật trạng thái lời chúc.");
  } catch (error) {
    alert(error.message);
  }
}

/* ==========================================
   11. ĐĂNG NHẬP ADMIN
========================================== */

function setupLoginForm() {
  $("loginForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      try {
        await sendJSON(
          "/login",
          "POST",
          {
            password: $("password").value
          }
        );

        $("password").value = "";
        $("loginStatus").textContent = "";

        await loadAdmin();
      } catch (error) {
        $("loginStatus").textContent =
          error.message;
      }
    }
  );
}

/* ==========================================
   12. ĐĂNG XUẤT
========================================== */

function setupLogout() {
  $("logoutBtn").addEventListener(
    "click",
    async () => {
      try {
        await request("/logout", {
          method: "POST"
        });
      } catch (error) {
        console.error(error.message);
      } finally {
        showLogin();
      }
    }
  );
}

/* ==========================================
   13. CẬP NHẬT THÔNG TIN WEBSITE
========================================== */

function setupSiteForm() {
  $("siteForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      try {
        await sendJSON(
          "/admin/site",
          "PUT",
          {
            title: $("title").value,
            subtitle: $("subtitle").value,
            introduction:
              $("introduction").value
          }
        );

        await loadAdmin();

        status("Đã lưu thông tin website.");
      } catch (error) {
        alert(error.message);
      }
    }
  );
}

/* ==========================================
   14. THÊM BÀI VIẾT HOẶC THƠ
========================================== */

function setupPostForm() {
  $("postForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      try {
        await sendJSON(
          "/admin/posts",
          "POST",
          {
            type: $("postType").value,
            title: $("postTitle").value,
            content: $("postContent").value
          }
        );

        event.target.reset();

        await loadAdmin();

        status("Đã thêm tác phẩm mới.");
      } catch (error) {
        alert(error.message);
      }
    }
  );
}

/* ==========================================
   15. TẢI ẢNH ALBUM
========================================== */

function setupPhotoForm() {
  $("photoForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const form = new FormData();

      form.append(
        "image",
        $("photoFile").files[0]
      );

      form.append(
        "caption",
        $("photoCaption").value
      );

      try {
        await request("/admin/photos", {
          method: "POST",
          body: form
        });

        event.target.reset();

        await loadAdmin();

        status("Đã tải ảnh lên Album.");
      } catch (error) {
        alert(error.message);
      }
    }
  );
}

/* ==========================================
   16. KHỞI ĐỘNG TRANG ADMIN
========================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupLoginForm();
    setupLogout();
    setupSiteForm();
    setupPostForm();
    setupPhotoForm();

    setupArtworkPreview();
    setupArtworkForm();

    try {
      await loadAdmin();
    } catch (error) {
      showLogin();
    }
  }
);
