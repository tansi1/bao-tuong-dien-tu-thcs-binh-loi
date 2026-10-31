
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.SESSION_SECRET;

if (!PASSWORD || PASSWORD.length < 12 ||
    !SECRET || SECRET.length < 32) {
  console.error(
    "Cần đặt ADMIN_PASSWORD (ít nhất 12 ký tự) " +
    "và SESSION_SECRET (ít nhất 32 ký tự)."
  );
  process.exit(1);
}

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_FILE = path.join(DATA_DIR, "site.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const defaultData = {
  site: {
    title: "Nét Mực Tri Ân",
    subtitle: "Chào mừng Ngày Nhà giáo Việt Nam 20/11/2026",
    introduction:
      "Kính gửi quý thầy cô thân yêu!\n\n" +
      "Tháng Mười Một lại về, mang theo những cảm xúc " +
      "thân thương dưới mái trường THCS Bình Lợi.\n\n" +
      "Với chủ đề Nét Mực Tri Ân, chúng em xin gửi " +
      "đến thầy cô những bài thơ, trang viết và những " +
      "lời chúc chân thành nhất.\n\n" +
      "Kính chúc quý thầy cô luôn mạnh khỏe, " +
      "hạnh phúc và thành công."
  },
  posts: [
    {
      id: "sample-1",
      type: "article",
      title: "Người gieo những mùa xanh",
      content:
        "Có những người không gieo hạt trên cánh đồng, " +
        "nhưng lại gieo ước mơ trong tâm hồn biết bao " +
        "thế hệ. Đó là những người thầy, người cô " +
        "kính yêu của chúng em."
    },
    {
      id: "sample-2",
      type: "poem",
      title: "Lời Cảm Ơn",
      content:
        "Em gom nắng sớm ban mai\n" +
        "Gửi vào trang vở một vài lời thương\n" +
        "Cảm ơn cô đã dẫn đường\n" +
        "Cảm ơn thầy những yêu thương mỗi ngày."
    }
  ],
  photos: [],
  wishes: []
};

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(
    DATA_FILE, JSON.stringify(defaultData, null, 2)
  );
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  const temp = DATA_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
}

function id() {
  return crypto.randomUUID();
}

function validText(value, max) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= max;
}

function isValidPost(body) {
  return ["article", "poem"].includes(body.type) &&
    validText(body.title, 150) &&
    validText(body.content, 20000);
}

function bad(res, error, status = 400) {
  return res.status(status).json({ error });
}

function safeEqual(a, b) {
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

// Cookie đăng nhập có chữ ký HMAC và hạn dùng 8 giờ.
function sign(value) {
  return crypto.createHmac("sha256", SECRET)
    .update(value).digest("hex");
}

function createToken() {
  const expiry = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${expiry}.${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

function checkToken(token) {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const payload = parts[0] + "." + parts[1];
  const expiry = Number(parts[0]);

  return Number.isFinite(expiry) &&
    expiry > Date.now() &&
    safeEqual(parts[2], sign(payload));
}

function cookieToken(req) {
  const cookies = req.headers.cookie || "";
  const entry = cookies.split(";").map(x => x.trim())
    .find(x => x.startsWith("admin_token="));

  return entry ? entry.slice("admin_token=".length) : "";
}

const isProduction = process.env.NODE_ENV === "production";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000
  };
}

function adminOnly(req, res, next) {
  if (!checkToken(cookieToken(req))) {
    return bad(res, "Chưa đăng nhập quản trị.", 401);
  }
  next();
}

function writeOnlySameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");
  const host = req.get("host");

  if (origin && new URL(origin).host !== host) {
    return bad(res, "Yêu cầu không hợp lệ.", 403);
  }
  next();
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use("/api", writeOnlySameOrigin);

app.use("/css", express.static(path.join(ROOT, "css")));
app.use("/js", express.static(path.join(ROOT, "js")));
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/", (req, res) =>
  res.sendFile(path.join(ROOT, "index.html"))
);

app.get("/admin.html", (req, res) =>
  res.sendFile(path.join(ROOT, "admin.html"))
);

// Giới hạn thử đăng nhập trong bộ nhớ
const loginAttempts = new Map();

app.post("/api/login", (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  let attempt = loginAttempts.get(ip);

  if (!attempt || now > attempt.until) {
    attempt = { count: 0, until: now + 15 * 60 * 1000 };
  }

  if (attempt.count >= 10) {
    return bad(res, "Thử lại sau 15 phút.", 429);
  }

  if (!safeEqual(String(req.body.password || ""), PASSWORD)) {
    attempt.count++;
    loginAttempts.set(ip, attempt);
    return bad(res, "Mật khẩu không chính xác.", 401);
  }

  loginAttempts.delete(ip);
  res.cookie("admin_token", createToken(), cookieOptions());
  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("admin_token", cookieOptions());
  res.json({ success: true });
});

// Nội dung công khai
app.get("/api/public", (req, res) => {
  const data = readData();
  res.json({
    site: data.site,
    posts: data.posts,
    photos: data.photos,
    wishes: data.wishes.filter(w => w.status === "approved")
  });
});

// Lời chúc học sinh
const wishAttempts = new Map();

app.post("/api/wishes", (req, res) => {
  const { name, message } = req.body;

  if (!validText(name, 80) || !validText(message, 500)) {
    return bad(res, "Vui lòng nhập tên và lời chúc hợp lệ.");
  }

  const now = Date.now();
  const key = req.ip;
  const last = wishAttempts.get(key) || 0;

  if (now - last < 30000) {
    return bad(res, "Vui lòng đợi 30 giây trước khi gửi tiếp.", 429);
  }

  wishAttempts.set(key, now);

  const data = readData();
  data.wishes.unshift({
    id: id(),
    name: name.trim(),
    message: message.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  });
  saveData(data);

  res.status(201).json({ success: true });
});

// Tất cả API quản trị đều yêu cầu đăng nhập
app.use("/api/admin", adminOnly);

app.get("/api/admin/state", (req, res) => {
  res.json(readData());
});

app.put("/api/admin/site", (req, res) => {
  const { title, subtitle, introduction } = req.body;

  if (!validText(title, 120) ||
      !validText(subtitle, 200) ||
      !validText(introduction, 10000)) {
    return bad(res, "Thông tin website không hợp lệ.");
  }

  const data = readData();
  data.site = {
    title: title.trim(),
    subtitle: subtitle.trim(),
    introduction: introduction.trim()
  };
  saveData(data);
  res.json({ success: true });
});

// Quản lý bài viết và thơ
app.post("/api/admin/posts", (req, res) => {
  if (!isValidPost(req.body)) {
    return bad(res, "Nội dung tác phẩm không hợp lệ.");
  }

  const data = readData();
  const post = {
    id: id(),
    type: req.body.type,
    title: req.body.title.trim(),
    content: req.body.content.trim()
  };

  data.posts.unshift(post);
  saveData(data);
  res.status(201).json(post);
});

app.put("/api/admin/posts/:id", (req, res) => {
  if (!isValidPost(req.body)) {
    return bad(res, "Nội dung tác phẩm không hợp lệ.");
  }

  const data = readData();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return bad(res, "Không tìm thấy tác phẩm.", 404);

  post.type = req.body.type;
  post.title = req.body.title.trim();
  post.content = req.body.content.trim();

  saveData(data);
  res.json(post);
});

app.delete("/api/admin/posts/:id", (req, res) => {
  const data = readData();
  const before = data.posts.length;
  data.posts = data.posts.filter(p => p.id !== req.params.id);

  if (before === data.posts.length) {
    return bad(res, "Không tìm thấy tác phẩm.", 404);
  }

  saveData(data);
  res.json({ success: true });
});

// Tải hình ảnh
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename(req, file, cb) {
    cb(null, id() + ".upload");
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!["image/jpeg", "image/png", "image/webp"]
      .includes(file.mimetype)) {
      return cb(new Error("Chỉ nhận JPG, PNG hoặc WebP."));
    }
    cb(null, true);
  }
});

app.post("/api/admin/photos",
  upload.single("image"), (req, res) => {
    if (!req.file) return bad(res, "Chưa chọn ảnh.");

    const buffer = fs.readFileSync(req.file.path);
    let ext;

    if (buffer.subarray(0, 3).toString("hex") === "ffd8ff") {
      ext = ".jpg";
    } else if (
      buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
    ) {
      ext = ".png";
    } else if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      ext = ".webp";
    }

    if (!ext) {
      fs.unlinkSync(req.file.path);
      return bad(res, "Tệp không phải ảnh hợp lệ.");
    }

    const filename = id() + ext;
    fs.renameSync(req.file.path, path.join(UPLOAD_DIR, filename));

    const photo = {
      id: id(),
      url: "/uploads/" + filename,
      caption: String(req.body.caption || "").slice(0, 150)
    };

    const data = readData();
    data.photos.unshift(photo);
    saveData(data);
    res.status(201).json(photo);
  }
);

app.delete("/api/admin/photos/:id", (req, res) => {
  const data = readData();
  const photo = data.photos.find(p => p.id === req.params.id);
  if (!photo) return bad(res, "Không tìm thấy ảnh.", 404);

  data.photos = data.photos.filter(p => p.id !== req.params.id);
  saveData(data);

  const file = path.join(UPLOAD_DIR, path.basename(photo.url));
  if (fs.existsSync(file)) fs.unlinkSync(file);

  res.json({ success: true });
});

// Duyệt lời chúc
app.patch("/api/admin/wishes/:id", (req, res) => {
  if (!["approved", "rejected", "pending"]
    .includes(req.body.status)) {
    return bad(res, "Trạng thái không hợp lệ.");
  }

  const data = readData();
  const wish = data.wishes.find(w => w.id === req.params.id);

  if (!wish) return bad(res, "Không tìm thấy lời chúc.", 404);

  wish.status = req.body.status;
  saveData(data);
  res.json(wish);
});

app.delete("/api/admin/wishes/:id", (req, res) => {
  const data = readData();
  const before = data.wishes.length;
  data.wishes = data.wishes.filter(w => w.id !== req.params.id);

  if (before === data.wishes.length) {
    return bad(res, "Không tìm thấy lời chúc.", 404);
  }

  saveData(data);
  res.json({ success: true });
});

// Xử lý lỗi tải ảnh
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({
    error: err.message || "Yêu cầu không hợp lệ."
  });
});

app.listen(PORT, () => {
  console.log(`Website: http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
});
