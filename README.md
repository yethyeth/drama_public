# 短剧数据分析平台

一个专业的短剧数据收集与分析工具，专注于从主流视频平台收集短剧（微剧）数据并进行深度分析。为内容创作者、投资方和行业分析师提供全面的市场洞察。

## ✨ 功能特性

### 🕷️ 智能数据采集
- **多平台支持**：腾讯视频、优酷、爱奇艺、抖音等主流平台
- **智能反爬**：内置反爬虫检测机制，支持代理轮换和请求间隔控制
- **任务管理**：支持定时采集、手动触发、任务重试和异常处理
- **实时监控**：采集进度实时显示，错误日志详细记录

### 📊 数据分析展示
- **数据概览仪表板**：全平台数据统计、实时更新状态、关键指标展示
- **榜单分析**：跨平台榜单整合、单平台榜单展示、自定义排序规则
- **演员导演热度榜**：男女演员热度排行、导演影响力分析
- **短剧详情页**：完整信息展示、多平台数据对比、历史趋势分析

### 🎨 现代化界面
- **深色主题**：专业的深色界面设计，减少视觉疲劳
- **响应式布局**：支持桌面和平板设备，优化用户体验
- **实时图表**：基于 Recharts 的交互式数据可视化
- **直观操作**：卡片式布局，清晰的信息层次结构

### 🔧 系统管理
- **配置管理**：反爬策略配置、数据源参数设置
- **数据管理**：本地数据库管理、数据清理、备份恢复
- **导出功能**：支持 Excel、CSV、JSON 格式导出

## 🛠️ 技术栈

### 前端技术
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Tailwind CSS** - 原子化 CSS 框架
- **React Router** - 客户端路由
- **Recharts** - 数据可视化图表库
- **Zustand** - 轻量级状态管理
- **Lucide React** - 现代图标库

### 后端技术
- **Node.js 20** + **Express.js 4** - 服务端框架
- **TypeScript** - 类型安全的 JavaScript
- **SQLite3** - 轻量级本地数据库
- **Playwright** - 现代化网页自动化工具
- **Cheerio** - 服务端 HTML 解析
- **Axios** - HTTP 客户端

### 部署与工具
- **Vercel** - 无服务器部署平台
- **ESLint** + **TypeScript ESLint** - 代码质量检查
- **Nodemon** - 开发环境热重载
- **Concurrently** - 并行运行多个命令

## 🚀 快速开始

### 环境要求
- Node.js >= 20.0.0
- npm 或 pnpm

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 开发环境运行

```bash
# 同时启动前端和后端开发服务器
npm run dev

# 或分别启动
npm run client:dev  # 前端开发服务器 (http://localhost:5173)
npm run server:dev  # 后端开发服务器 (http://localhost:3000)
```

### 构建项目

```bash
# 构建前端和后端
npm run build

# 仅构建后端 API
npm run build:api

# 类型检查
npm run check
npm run check:api
```

### 代码质量检查

```bash
# ESLint 检查
npm run lint

# 预览构建结果
npm run preview
```

## 📁 项目结构

```
drama/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义 Hooks
│   ├── router/            # 路由配置
│   └── lib/               # 工具函数
├── api/                   # 后端 API
│   ├── routes/            # API 路由
│   ├── crawler/           # 爬虫模块
│   ├── database/          # 数据库配置
│   └── tsconfig.json      # 后端 TypeScript 配置
├── public/                # 静态资源
├── data/                  # 数据库文件
├── debug/                 # 调试日志
├── scripts/               # 工具脚本
└── config/                # 配置文件
```

## 🌐 API 接口

### 爬虫管理
- `POST /api/crawler/start` - 启动爬虫任务
- `GET /api/crawler/status` - 获取爬虫状态
- `POST /api/crawler/stop` - 停止爬虫任务

### 数据查询
- `GET /api/dashboard` - 获取仪表板数据
- `GET /api/rankings` - 获取榜单数据
- `GET /api/celebrities` - 获取演员导演热度
- `GET /api/drama/:id` - 获取短剧详情

### 数据管理
- `GET /api/data/export` - 导出数据
- `POST /api/cleanup` - 清理数据
- `GET /api/config` - 获取系统配置
- `PUT /api/config` - 更新系统配置

## 🎯 页面路由

- `/` - 数据概览仪表板
- `/crawler` - 数据采集控制台
- `/rankings` - 榜单分析页面
- `/celebrities` - 演员导演热度榜
- `/drama/:id` - 短剧详情页面
- `/settings` - 系统设置页面

## 🔧 配置说明

### 爬虫配置
项目支持多种反爬虫策略配置：
- 请求间隔控制
- User-Agent 轮换
- 代理服务器配置
- 浏览器指纹伪装

### 数据库配置
使用 SQLite3 作为本地数据库，支持：
- 自动初始化数据表
- 数据备份和恢复
- 定期数据清理

## 🚀 部署

### Vercel 部署
项目已配置 Vercel 部署，支持一键部署：

1. Fork 本项目到你的 GitHub
2. 在 Vercel 中导入项目
3. 自动部署完成

### 本地部署

```bash
# 构建项目
npm run build

# 启动生产服务器
node api/server.js
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [React](https://reactjs.org/) - 用户界面库
- [Playwright](https://playwright.dev/) - 网页自动化工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Recharts](https://recharts.org/) - 图表库
- [Vercel](https://vercel.com/) - 部署平台

---

**注意**：本工具仅用于学习和研究目的，请遵守各平台的使用条款和 robots.txt 规则。
## 🎁 打赏支持

感谢您对本项目的关注与支持！如果您觉得这个短剧数据分析平台对您有帮助，欢迎通过以下方式打赏支持开发者：

- **支付宝打赏**  
  ![支付宝二维码](/doc/assets/alipay.jpg)  
  扫描上方二维码，使用支付宝进行打赏。

- **微信打赏**  
  ![微信二维码](/doc/assets/wechatpay.jpg)  
  扫描上方二维码，使用微信进行打赏。

您的每一份支持，都是我们持续优化和更新的动力！🍻
