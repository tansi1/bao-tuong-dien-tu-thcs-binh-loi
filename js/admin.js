
const API = "/api";
let state = null;

const $ = id => document.getElementById(id);

async function request(path, options = {}) {
  const response = await fetch(API + path, {
    credentials: "same-origin",
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) showLogin();
    throw new Error(data.error || "Thao tác thất bại");
  }
  return data;
}

async function sendJSON(path, method, data) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

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
  $("adminStatus").textContent = message;
}

function makeButton(label, callback, danger = false) {
  const button = document.createElement("button");
  button.textContent = label;
  if (danger) button.className = "danger";
  button.onclick = callback;
  return button;
}

function makeItem(title, text) {
  const item = document.createElement("div");
  item.className = "item";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  item.append(heading, paragraph);
  return item;
}

async function loadAdmin() {
  state = await request("/admin/state");
  showDashboard();

  $("title").value = state.site.title;
  $("subtitle").value = state.site.subtitle;
  $("introduction").value = state.site.introduction;

  renderPosts();
  renderPhotos();
  renderWishes();
}

function renderPosts() {
  const box = $("postManager");
  box.replaceChildren();

  state.posts.forEach(post => {
    const item = makeItem(
      (post.type === "poem" ? "Thơ: " : "Bài viết: ") + post.title,
      post.content.slice(0, 180)
    );

    item.append(
      makeButton("Sửa", async () => {
        const title = prompt("Tiêu đề:", post.title);
        if (title === null) return;

        const content = prompt("Nội dung:", post.content);
        if (content === null) return;

        try {
          await sendJSON(
            "/admin/posts/" + post.id, "PUT",
            { title, content, type: post.type }
          );
          await loadAdmin();
          status("Đã cập nhật tác phẩm.");
        } catch (e) { alert(e.message); }
      }),
      makeButton("Xóa", async () => {
        if (!confirm("Bạn chắc chắn muốn xóa?")) return;
        try {
          await request("/admin/posts/" + post.id, {
            method: "DELETE"
          });
          await loadAdmin();
          status("Đã xóa tác phẩm.");
        } catch (e) { alert(e.message); }
      }, true)
    );

    box.append(item);
  });
}

function renderPhotos() {
  const box = $("photoManager");
  box.replaceChildren();

  state.photos.forEach(photo => {
    const item = document.createElement("div");
    item.className = "item";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = photo.caption || "Ảnh kỷ niệm";

    const caption = document.createElement("p");
    caption.textContent = photo.caption;

    const del = makeButton("Xóa ảnh", async () => {
      if (!confirm("Xóa ảnh này?")) return;

      try {
        await request("/admin/photos/" + photo.id, {
          method: "DELETE"
        });
        await loadAdmin();
      } catch (e) { alert(e.message); }
    }, true);

    item.append(img, caption, del);
    box.append(item);
  });
}

function renderWishes() {
  const box = $("wishManager");
  box.replaceChildren();

  const pending = state.wishes.filter(
    wish => wish.status === "pending"
  );

  const approved = state.wishes.filter(
    wish => wish.status === "approved"
  );

  const heading1 = document.createElement("h3");
  heading1.textContent = "Chờ duyệt (" + pending.length + ")";
  box.append(heading1);

  function addWish(wish) {
    const item = makeItem(wish.name, wish.message);

    if (wish.status === "pending") {
      item.append(makeButton("Duyệt", () =>
        updateWish(wish.id, "approved")
      ));
      item.append(makeButton("Từ chối", () =>
        updateWish(wish.id, "rejected")
      , true));
    } else {
      item.append(makeButton("Gỡ lời chúc", () =>
        updateWish(wish.id, "rejected")
      , true));
    }

    item.append(makeButton("Xóa", async () => {
      if (!confirm("Xóa vĩnh viễn lời chúc này?")) return;
      try {
        await request("/admin/wishes/" + wish.id, {
          method: "DELETE"
        });
        await loadAdmin();
      } catch (e) { alert(e.message); }
    }, true));

    box.append(item);
  }

  pending.forEach(addWish);

  const heading2 = document.createElement("h3");
  heading2.textContent = "Đã duyệt (" + approved.length + ")";
  box.append(heading2);
  approved.forEach(addWish);
}

async function updateWish(id, newStatus) {
  try {
    await sendJSON("/admin/wishes/" + id, "PATCH", {
      status: newStatus
    });
    await loadAdmin();
    status("Đã cập nhật trạng thái lời chúc.");
  } catch (e) { alert(e.message); }
}

$("loginForm").onsubmit = async event => {
  event.preventDefault();
  try {
    await sendJSON("/login", "POST", {
      password: $("password").value
    });
    $("password").value = "";
    $("loginStatus").textContent = "";
    await loadAdmin();
  } catch (e) {
    $("loginStatus").textContent = e.message;
  }
};

$("logoutBtn").onclick = async () => {
  try {
    await request("/logout", { method: "POST" });
  } finally {
    showLogin();
  }
};

$("siteForm").onsubmit = async event => {
  event.preventDefault();

  try {
    await sendJSON("/admin/site", "PUT", {
      title: $("title").value,
      subtitle: $("subtitle").value,
      introduction: $("introduction").value
    });
    await loadAdmin();
    status("Đã lưu thông tin website.");
  } catch (e) { alert(e.message); }
};

$("postForm").onsubmit = async event => {
  event.preventDefault();

  try {
    await sendJSON("/admin/posts", "POST", {
      type: $("postType").value,
      title: $("postTitle").value,
      content: $("postContent").value
    });
    event.target.reset();
    await loadAdmin();
    status("Đã thêm tác phẩm mới.");
  } catch (e) { alert(e.message); }
};

$("photoForm").onsubmit = async event => {
  event.preventDefault();

  const form = new FormData();
  form.append("image", $("photoFile").files[0]);
  form.append("caption", $("photoCaption").value);

  try {
    await request("/admin/photos", {
      method: "POST",
      body: form
    });
    event.target.reset();
    await loadAdmin();
    status("Đã tải ảnh lên.");
  } catch (e) { alert(e.message); }
};

loadAdmin().catch(() => showLogin());
