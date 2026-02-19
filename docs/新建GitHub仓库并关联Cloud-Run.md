# 新建 GitHub 仓库并把当前项目推上去，再关联 Cloud Run

目标：当前代码在一个共享项目里、在 dev 分支；你新建一个**自己的** GitHub 仓库，把项目推过去，然后让 Cloud Run 从这个新仓库部署。

---

## 一、在 GitHub 上新建一个空仓库

1. 登录 GitHub → 右上角 **+** → **New repository**。
2. 填仓库名（例如 `amz-report-system` 或任意你喜欢的）。
3. 选 **Private** 或 Public，按你需要。
4. **不要**勾选 "Add a README"、"Add .gitignore"、"Choose a license"（保持空仓库）。
5. 点 **Create repository**。创建好后，记下仓库地址，例如：
   - `https://github.com/你的用户名/amz-report-system.git`
   - 或 SSH：`git@github.com:你的用户名/amz-report-system.git`

---

## 二、在本地把当前项目推到新仓库

在**当前项目**的根目录打开终端（若你的代码在「AMZ AQA」下的 `report-generation-system`，需要先确认是推整个「AMZ AQA」还是只推 `report-generation-system`；下面按**只推 report-generation-system 这个子项目**为例，这样新仓库就是报告系统本身）。

**情况 A：你本地就是 report-generation-system 这一个文件夹、且已经是 git 仓库**

```bash
cd /Users/liangxile/project/AMZ\ AQA\ /report-generation-system

# 当前分支切到 dev（你的代码在这里）
git checkout dev
git pull origin dev

# 添加你的新仓库为远程（名字随便，这里用 myorigin）
git remote add myorigin https://github.com/你的用户名/你的新仓库名.git

# 把 dev 推上去（第一次推送要设上游分支）
git push -u myorigin dev
```

以后有更新就：`git push myorigin dev`。

**情况 B：整个「AMZ AQA」是一个 git 仓库，report-generation-system 只是里面一个文件夹**

若你想新 GitHub 仓库里**只有报告系统**（没有上级 AMZ AQA 其它东西），需要先“拆”出 report-generation-system 再推：

```bash
cd /Users/liangxile/project/AMZ\ AQA\

# 只把 report-generation-system 目录复制出来，当成新仓库推（保留 git 历史可选）
# 方法：用 git subtree 或 新建文件夹 + 只复制 report-generation-system 内容

# 简单做法：在新目录克隆原仓库、只保留 report-generation-system、再推新仓库
mkdir -p ~/temp-report && cd ~/temp-report
git clone 你原来的仓库地址 --branch dev .
git filter-branch --subdirectory-filter report-generation-system -- --all
# 或使用 git filter-repo（更推荐，需先安装）
# 然后：
git remote add myorigin https://github.com/你的用户名/新仓库名.git
git push -u myorigin dev
```

若你觉得这样复杂，也可以**把整个「AMZ AQA」仓库**推到新仓库（新仓库里就带 report-generation-system 子目录），Cloud Run 部署时指定**根目录为 report-generation-system** 即可（见下文）。

**简单推荐**：若当前 `report-generation-system` 自己就是一个 git 仓库（里面有 .git），就用**情况 A**，直接 `git remote add myorigin 新仓库地址`，然后 `git push -u myorigin dev`。

---

## 三、Cloud Run 和 GitHub 新仓库关联（从仓库自动/手动部署）

两种常见方式。

### 方式 1：Cloud Run 控制台里「从仓库部署」

1. 打开 [Google Cloud Console](https://console.cloud.google.com) → **Cloud Run** → 点击 **「创建服务」**（或选已有服务后「编辑并部署新修订版本」）。
2. 选择 **「从仓库部署」**（或「Continuously deploy from a repository」），连接 **GitHub**。
3. 授权 Google 访问你的 GitHub，选中你**新建的那个仓库**，分支选 **dev**。
4. 构建配置：
   - **类型**：选「Dockerfile」或「源代码」（若选源代码，再选「Dockerfile」路径；若仓库根就是 report-generation-system，Dockerfile 在根目录；若仓库是整个 AMZ AQA，把**根目录**设为 `report-generation-system`，这样构建上下文才是报告系统）。
   - **区域**：us-central1（与主站一致）。
   - **服务名**：例如 `report-system`。
5. 保存后，GCP 会创建 **Cloud Build 触发器**，每次你 push 到 dev 会自动构建并部署（若未自动，可在 Cloud Build 里手动运行一次）。

### 方式 2：只用 Cloud Build 触发器 + 现有 Cloud Run 服务

1. **Cloud Build** → **触发器** → **创建触发器**。
2. 事件：**推送到分支**，仓库选你**新建的 GitHub 仓库**，分支填 **dev**。
3. 配置：类型选 **Docker**，镜像用项目里的 **Dockerfile**；若仓库根就是 report-generation-system，**构建上下文**用 `.`，**Dockerfile** 用 `./Dockerfile`；若仓库根是 AMZ AQA，构建上下文用 `report-generation-system`，Dockerfile 用 `report-generation-system/Dockerfile`。
4. 构建后推送到 **Artifact Registry**，然后在「构建步骤」后添加「部署到 Cloud Run」步骤（或触发器里选「部署到 Cloud Run」，选已有服务 report-system）。

---

## 四、小结

| 步骤 | 做什么 |
|------|--------|
| 1 | GitHub 新建空仓库，记下地址 |
| 2 | 本地项目切到 dev，`git remote add myorigin 新仓库地址`，`git push -u myorigin dev` |
| 3 | Cloud Run / Cloud Build 里「从仓库部署」或「创建触发器」，选新仓库、dev 分支，构建用 Dockerfile，部署到 report-system |

这样以后你只要往**新仓库的 dev** 推代码，就会按你配置的方式构建并更新 Cloud Run 上的报告系统；主站和原来共享仓库都不受影响。
