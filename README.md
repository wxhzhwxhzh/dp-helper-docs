# dp_helper 文档站

`骚神插件` 使用文档，基于 [Docusaurus](https://docusaurus.io/) 3.10.2 构建的静态站点。

## 环境要求

- Node.js >= 20
- npm（也可使用你习惯的包管理器，但请自行调整命令）

## 本地开发

```bash
npm install
npm run start
```

启动本地开发服务器并自动打开浏览器，默认地址为 `http://localhost:3000/dp-helper-docs/`。大部分改动会热更新，无需重启。

如需在同一局域网内的其他设备访问：

```bash
npm run all-start
```

## 构建

```bash
npm run build
```

生成静态产物到 `build/` 目录，可用任意静态托管服务部署。

## 部署到 GitHub Pages（推荐）

本项目通过 **GitHub Actions** 自动部署，推送到 `main` 分支即触发。

### 相关配置

`docusaurus.config.js` 中已配置好：

| 配置项 | 值 | 说明 |
| --- | --- | --- |
| `url` | `https://wxhzhwxhzh.github.io` | 站点正式地址 |
| `baseUrl` | `/dp-helper-docs/` | 访问路径前缀，对应仓库名 |
| `organizationName` | `wxhzhwxhzh` | GitHub 用户名 |
| `projectName` | `dp-helper-docs` | 仓库名 |
| `deploymentBranch` | `gh-pages` | 部署产物所在分支 |

工作流文件：`.github/workflows/deploy.yml`，流程为：检出代码 → 安装 Node.js 20 → `npm ci` → `npm run build` → 将 `build/` 发布到 `gh-pages` 分支。

### 一次性设置

1. **开启 Pages**：仓库 → Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `gh-pages` / `/ (root)` → Save。
2. **授予写权限**：仓库 → Settings → Actions → General → Workflow permissions 设为 `Read and write`。

### 发布

```bash
git add .
git commit -m "更新文档"
git push origin main
```

推送后 Actions 会自动构建并发布，稍等片刻即可访问：

```
https://wxhzhwxhzh.github.io/dp-helper-docs/
```

## 手动部署（备选）

如果不想使用 Actions，可在本地直接构建并推送：

```bash
GIT_USER=wxhzhwxhzh npm run deploy
```

> 注意：手动部署与 GitHub Actions 二选一，不要混用，否则可能互相覆盖 `gh-pages` 分支。

## 项目结构

```
.
├── docs/                    # 文档内容（Markdown）
├── blog/                    # 博客文章
├── static/                  # 静态资源（图片、favicon 等）
├── src/                     # 自定义页面与组件
├── sidebars.js              # 文档侧边栏配置
├── docusaurus.config.js     # 站点主配置
└── .github/workflows/       # GitHub Actions 部署工作流
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run start` | 启动本地开发服务器 |
| `npm run all-start` | 启动开发服务器并允许局域网访问 |
| `npm run build` | 构建静态产物到 `build/` |
| `npm run serve` | 本地预览已构建的产物 |
| `npm run deploy` | 手动构建并部署到 `gh-pages` |
| `npm run clear` | 清理缓存与生成文件 |
| `npm run write-heading-ids` | 为文档标题生成锚点 ID |

## 了解更多

- [Docusaurus 官方文档](https://docusaurus.io/docs)
- [GitHub Pages 文档](https://docs.github.com/pages)
