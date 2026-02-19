# report.amzaiagent.com 上线步骤清单

按顺序做，做完一项打勾一项。

---

## 第一步：在 Cloud Run 创建新服务并部署

你有两种方式，**二选一**即可。

### 方式 A：从 GitHub 仓库部署（推荐，以后改代码 push 即可自动部署）

1. 打开 [Google Cloud Console](https://console.cloud.google.com) → **Cloud Run** → 点击 **「创建服务」**。
2. 选择 **「从仓库部署」**（或 "Continuously deploy from a repository"）。
3. 连接 **GitHub**（若未连过，按提示授权），选择仓库：**tony49279527/AMZ-AI-AQA**，分支选 **dev**。
4. **构建配置**：
   - 区域：**us-central1**
   - 服务名称：**report-system**
   - 构建类型：选 **Dockerfile**（仓库根目录已有 Dockerfile）
   - 若界面有「根目录」或「Context」：留空或填 `.`（表示仓库根就是项目）
5. 点击 **「创建」** 或 **「部署」**，等构建和部署完成（第一次可能要几分钟）。
6. 部署成功后记下服务 URL（形如 `https://report-system-xxxxx.run.app`），先浏览器打开确认能访问（可能是访问码页或 dashboard）。

### 方式 B：从本机用 gcloud 部署

在终端（已安装 gcloud 并登录）执行：

```bash
cd report-generation-system
git checkout dev
git pull myorigin dev

gcloud config set project 你的GCP项目ID
gcloud run deploy report-system \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated
```

按提示选择区域、允许未认证访问等，等部署完成。

---

## 第二步：配环境变量

1. Cloud Run → 点击服务 **report-system** → 顶部 **「编辑并部署新修订版本」**。
2. 展开 **「变量与密钥」**（或「Variables & Secrets」），添加以下变量（值按你的实际填）：

API_ACCESS_TOKEN：一串随机强 token（自己生成）。
NEXT_PUBLIC_API_ACCESS_TOKEN：与上面相同。
NEXT_PUBLIC_APP_URL：https://report.amzaiagent.com
OPENROUTER_API_KEY：你的 OpenRouter key。
LLM_BASE_URL：https://openrouter.ai/api/v1
LLM_MODEL：anthropic/claude-sonnet-4.5
OPENROUTER_HTTP_REFERER：https://report.amzaiagent.com

可选：NEXT_PUBLIC_SUPPORT_EMAIL、ACCESS_CODE（访问码，只发给付费用户）。

3. 保存并部署新修订版本（若只改变量，会很快）。

---

## 第三步：在 GCP 绑定子域名 report.amzaiagent.com

1. Cloud Run 左侧菜单 → **「Domain mappings」**（域名映射）。
2. 点击 **「添加映射」**。
3. 选择服务：**report-system**，区域：**us-central1**。
4. 域名：选 **amzaiagent.com**（若主站已用过，这里会显示已验证）；子域名填 **report**。
5. 保存后，页面会显示 **「需要在 DNS 里添加的记录」**（类型 + 名称 + 目标）。**不要关页面**，下一步要用到。

---

## 第四步：在 Cloudflare 添加 DNS 记录

1. 登录 **Cloudflare** → 选择站点 **amzaiagent.com** → **DNS** → **记录**。
2. **添加记录**：
   - 类型：按 GCP 显示的来（一般是 **CNAME**）
   - 名称：**report**
   - 目标：**照抄 GCP 域名映射页给出的值**（整段复制粘贴）
   - 代理状态：先选 **「仅 DNS」**（灰云）
3. 保存。

---

## 第五步：等 DNS 生效并访问

- 等 5～30 分钟（有时更快）。
- 浏览器打开 **https://report.amzaiagent.com**。
- 若你设置了 ACCESS_CODE，会先看到「请输入访问码」；输入正确后进入 dashboard。主站 amzaiagent.com 不受影响。

---

## 可选：报告持久化（避免重新部署后报告丢失）

1. GCP → **Cloud Storage** → 创建桶，例如名字：`你的项目ID-report-data`。
2. 在终端执行（把服务名、区域、桶名换成你的）：

```bash
gcloud run services update report-system \
  --region=us-central1 \
  --execution-environment=gen2 \
  --add-volume=name=reports-vol,type=cloud-storage,bucket=你的项目ID-report-data \
  --add-volume-mount=volume=reports-vol,mount-path=/app/content/reports
```

3. 若命令报错（例如区域或权限），可在 Cloud Run 控制台该服务的 **「卷」/「Volumes」** 里用界面添加 Cloud Storage 挂载，挂载路径填 **/app/content/reports**。

---

做完以上，report.amzaiagent.com 就上线了；以后代码更新推送到 **dev**，若你用的是「从仓库部署」，会自动重新构建并发布。
