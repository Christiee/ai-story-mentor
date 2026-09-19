# AI 剧本导师 (StoryMentor)

为 6-7 岁一年级孩子提供语音交互的剧本共创体验。AI 作为守护者·导师·镜子，引导孩子自己创作剧本，生成图文配音的绘本式作品。

## 产品特性

- **五步叙事脚手架**：主角 → 愿望 → 困难 → 办法 → 结局
- **AI 导师只引导不代劳**：孩子是导演，AI 是守护者与镜子
- **点亮机制替代评分**：徽章 + 能力雷达 + 成长刻度
- **绘本式作品展示**：图文分页 + 配音播放
- **家长端日报**：亮点回顾 + 金句 + 能力成长

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：NestJS 10 + TypeScript + Drizzle ORM
- **数据库**：PostgreSQL
- **AI 能力**：基于妙搭平台插件（AI 生文 / AI 生图 / 语音合成）

## 项目结构

```
├── client/               # React 前端
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 可复用组件
│   │   ├── api/          # API 调用层
│   │   └── utils/        # 工具函数
│   └── index.html
├── server/               # NestJS 后端
│   ├── modules/          # 功能模块
│   ├── database/         # Drizzle ORM schema
│   └── common/           # 共享工具
├── shared/               # 前后端共享类型定义
│   └── api.interface.ts
├── examples/             # 示例素材（AI 生成，版权干净）
│   └── assets/
│       ├── images/       # 绘本风格示例图片
│       └── audio/        # 示例配音音频
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 后端模块

| 模块 | 说明 |
|------|------|
| `children` | 孩子档案管理 |
| `scripts` | 剧本创作与 AI 导师引导 |
| `badges` | 成就徽章系统 |
| `radar` | 能力雷达数据 |
| `daily` | 家长亮点日报 |

### 前端页面

| 路由 | 说明 |
|------|------|
| `/` | 首页（孩子选择入口） |
| `/create` | 创作页（五步叙事脚手架 + 语音交互） |
| `/portfolio` | 作品集（孩子的作品收藏） |
| `/script/:id` | 剧本详情（绘本式分页展示 + 配音播放） |
| `/parent/daily` | 家长端·亮点日报 |
| `/parent/works` | 家长端·作品墙 |
| `/parent/radar` | 家长端·能力雷达 |

### 数据库表

| 表名 | 说明 |
|------|------|
| `child_profile` | 孩子档案 |
| `script_work` | 剧本作品 |
| `script_page` | 剧本分页内容 |
| `achievement_badge` | 成就徽章 |
| `ability_radar` | 能力雷达记录 |
| `parent_daily` | 家长日报 |
| `conversation_log` | 对话日志 |
| `app_user` | 注册用户 |
| `sms_code` | 短信验证码 |

## 快速开始

### 环境要求

- Node.js >= 22.0.0
- PostgreSQL 14+
- npm

### 安装

```bash
npm install
```

### 环境变量

复制 `.env.example` 为 `.env` 并填入你的配置：

```bash
# 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/storymentor

# AI 插件配置（按需配置，通过妙搭平台 Connection 管理）
# PLUGIN_API_KEY=...
```

### 开发

```bash
# 启动前后端开发服务器
npm run dev
```

- 前端默认端口：5173
- 后端默认端口：3000

### 构建

```bash
npm run build
```

## 核心机制

1. **孩子是导演**：AI 只提问题、引导思考，不替孩子写剧本
2. **五步叙事法**：主角 → 愿望 → 障碍 → 办法 → 结局
3. **正向反馈闭环**：每完成一个步骤点亮相应能力维度
4. **内容安全**：所有 AI 生成内容经过正向引导过滤

## 设计规范

- **品牌主色**：森林绿 `#0F6E56`
- **点缀色**：琥珀橙 `#BA7517`
- **风格**：温暖童趣、圆润柔和、绘本风插画
- **孩子端**：大字号、圆润按钮、更多插画、语音交互
- **家长端**：正常字号、信息密度适中、数据和内容展示

## 示例素材

仓库 `examples/assets/` 目录包含 AI 生成的示例素材，用于演示和开发测试：

- **图片（4 张）**：儿童绘本水彩风格，包括封面图和内页插图
- **音频（3 段）**：AI 语音合成的儿童故事旁白，含男女声两种音色

详见 [examples/assets/README.md](examples/assets/README.md)。

## License

MIT

MIT
