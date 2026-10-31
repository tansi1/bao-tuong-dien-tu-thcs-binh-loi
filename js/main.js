
const API = "/api";

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Có lỗi xảy ra");
  }
  return data;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderText(container, text) {
  container.replaceChildren();
  for (const line of text.split(/\n\s*\n/)) {
    container.append(element("p", "", line));
  }
}

function renderPosts(posts) {
  const articles = document.getElementById("articleList");
  const poems = document.getElementById("poemList");
  articles.replaceChildren();
  poems.replaceChildren();

  for (const post of posts) {
    const card = element("article", "card");
    card.append(element("h3", "", post.title));

    if (post.type === "poem") {
      const poem = element("p", "", post.content);
      card.append(poem);
      poems.append(card);
    } else {
      const preview = element(
        "p", "preview", post.content.slice(0, 200) + "..."
      );
      const button = element("button", "btn", "Đọc bài viết");
      button.onclick = () => openArticle(post);
      card.append(preview, button);
      articles.append(card);
    }
  }
}

function openArticle(post) {
  document.getElementById("dialogTitle").textContent = post.title;
  document.getElementById("dialogContent").textContent = post.content;
  document.getElementById("articleDialog").showModal();
}

function renderPhotos(photos) {
  const gallery = document.getElementById("gallery");
  gallery.replaceChildren();

  for (const photo of photos) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = photo.caption || "Ảnh kỷ niệm";
    img.loading = "lazy";
    figure.append(img, element("figcaption", "", photo.caption));
    gallery.append(figure);
  }
}

function renderWishes(wishes) {
  const list = document.getElementById("wishList");
  list.replaceChildren();

  for (const wish of wishes) {
    const card = element("div", "wish-card");
    card.append(
      element("strong", "", "🌷 " + wish.name),
      element("p", "", wish.message)
    );
    list.append(card);
  }
}

async function loadWebsite() {
  try {
    const data = await request(API + "/public");

    document.getElementById("siteTitle").textContent =
      data.site.title;
    document.getElementById("siteSubtitle").textContent =
      data.site.subtitle;

    renderText(
      document.getElementById("introduction"),
      data.site.introduction
    );

    renderPosts(data.posts);
    renderPhotos(data.photos);
    renderWishes(data.wishes);
  } catch (error) {
    alert("Không tải được nội dung: " + error.message);
  }
}

document.getElementById("closeDialog").onclick = () => {
  document.getElementById("articleDialog").close();
};

document.getElementById("wishForm").onsubmit = async (event) => {
  event.preventDefault();

  const status = document.getElementById("wishStatus");
  const name = document.getElementById("studentName").value.trim();
  const message = document.getElementById("wishMessage").value.trim();

  if (!name || !message) return;

  try {
    await request(API + "/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message })
    });

    status.textContent =
      "Đã gửi lời chúc! Lời chúc sẽ hiển thị sau khi được duyệt.";
    event.target.reset();
  } catch (error) {
    status.textContent = error.message;
  }
};

loadWebsite();
