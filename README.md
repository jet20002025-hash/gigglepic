# 一张图逗乐你（免费版部署：GitHub + Vercel + Cloudflare R2 + Neon）

Next.js 应用部署在 **Vercel**，图片存在 **Cloudflare R2**，元数据在 **Neon**（免费 PostgreSQL）。代码托管在 **GitHub**。

## 1. Neon（数据库）

1. 注册 [Neon](https://neon.tech)，新建项目。
2. 复制 **Connection string**（建议带 `sslmode=require`）。
3. 本地：复制 `.env.example` 为 `.env`，填入 `DATABASE_URL`。
4. 初始化表：

```bash
npx prisma migrate deploy
```

## 2. Cloudflare R2（图片存储）

1. Cloudflare 控制台 → **R2** → 创建 Bucket。
2. **公开访问**：为该 Bucket 绑定 **R2.dev 子域名**（或自定义域名），得到形如 `https://pub-xxxx.r2.dev` 的地址 → 填入 `R2_PUBLIC_BASE_URL`（不要末尾 `/`）。
3. **API 令牌**：R2 → 管理 R2 API 令牌 → 创建（需对本 Bucket 可读写）。
4. 记录：
   - Account ID（控制台首页右侧）
   - Access Key ID / Secret Access Key
   - Bucket 名称

将下列变量填入 Vercel 与本地 `.env`（上线必填）：

| 变量 | 说明 |
|------|------|
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret |
| `R2_BUCKET_NAME` | Bucket 名称 |
| `R2_PUBLIC_BASE_URL` | 公开访问域名，如 `https://pub-xxxx.r2.dev` |

### Google 登录（留言必填）

1. 打开 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **创建凭据** → **OAuth 客户端 ID** → 应用类型选 **Web**。
2. **已获授权的 JavaScript 来源**：`http://localhost:3000`、上线后再加 `https://<你的项目>.vercel.app`。
3. **已获授权的重定向 URI**：
   - 本地：`http://localhost:3000/api/auth/callback/google`
   - 上线：`https://<你的项目>.vercel.app/api/auth/callback/google`
4. 将客户端 ID / 密钥填入环境变量（本地 `.env` + Vercel）：

| 变量 | 说明 |
|------|------|
| `AUTH_SECRET` | 任意长随机串（用于加密会话 cookie） |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `AUTH_URL` | 站点根 URL，本地 `http://localhost:3000`，上线填 `https://xxx.vercel.app` |

部署新域名后，记得在 Google 控制台补上对应的来源与回调 URI。

### Google AdSense（变现）

1. 在 [Google AdSense](https://www.google.com/adsense) 提交站点并通过审核。
2. 在 AdSense 首页记下 **发布商 ID**（`ca-pub-xxxxxxxxxxxxxxxx`），填入环境变量 **`NEXT_PUBLIC_ADSENSE_CLIENT_ID`**（Vercel 与本地均需，以便浏览器加载广告脚本）。
3. **`/ads.txt`** 已由应用自动生成（同一路径），部署后访问 `https://你的域名/ads.txt` 应能看到一行 `google.com, pub-..., DIRECT, ...`。若仍是注释说明未配置 `NEXT_PUBLIC_ADSENSE_CLIENT_ID`。
4. 两种常见用法（二选一或同时使用）：
   - **自动广告**：仅在 AdSense 后台开启「自动广告」，可不配置下面的 slot；站点已加载官方 `adsbygoogle.js`。
   - **广告单元**：在 AdSense →「广告」→「按广告单元」创建展示广告，把 **广告单元 ID** 填到 **`NEXT_PUBLIC_ADSENSE_SLOT_BELOW_IMAGE`** / **`NEXT_PUBLIC_ADSENSE_SLOT_ABOVE_FOOTER`**（首页会插入两块可选展示位）。
5. 请遵守 [AdSense 计划政策](https://support.google.com/adsense/answer/48182)（无效点击、遮挡广告、激励点击等均会导致封号）。

## 3. GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# 在 GitHub 新建仓库后
git remote add origin https://github.com/<你>/<仓库>.git
git push -u origin main
```

## 4. Vercel

1. [Vercel](https://vercel.com) → Import GitHub 仓库。
2. **Environment Variables** 添加：`DATABASE_URL`、全部 `R2_*`、`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_URL`（生产域名）；接入广告后加上 `NEXT_PUBLIC_ADSENSE_CLIENT_ID` 及可选的两个 `NEXT_PUBLIC_ADSENSE_SLOT_*`。
3. Build 命令保持默认（`npm run build` 已包含 `prisma migrate deploy`）。
4. 首次部署成功后，数据库表会通过 migrate 自动创建。

## 本地开发

不配 R2 时，上传会写入 `public/uploads`（仅适合本机）；**Vercel 上必须配置 R2**，否则会返回错误提示。

### 方式 A：Docker 本地 Postgres（推荐）

```bash
docker compose up -d
# .env 中 DATABASE_URL 使用：
# postgresql://postgres:devdev@127.0.0.1:5433/yizhangtu?schema=public

npm install
npx prisma migrate deploy
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)，在页面底部「上传逗乐图」选择文件即可。

### 方式 B：Neon

把 Neon 连接串写入 `.env` 的 `DATABASE_URL`，然后：

```bash
npm install
npx prisma migrate deploy
npm run dev
```

### 命令行自测上传（需服务已启动）

```bash
curl -sS -X POST -F "file=@./某张图.png" http://localhost:3000/api/images/upload
```

成功时会返回 JSON，内含 `image.url`（本地一般为 `/uploads/文件名`）。

## 说明

- 随机图接口：`GET /api/images/random`
- 上传接口：`POST /api/images/upload`，表单字段名：`file`
- 某张图的留言：`GET /api/images/<图片id>/comments`（公开）、`POST` 同路径且 JSON `{ "body": "..." }`（需登录）
