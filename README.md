# 🕰️ 时间邮局 - Time Post Office

基于 MERN 技术栈的数字时间胶囊应用

## 项目结构

```
TimePostOffice/
├── backend/          # 后端服务 (Node.js + Express + MongoDB)
│   ├── models/       # 数据模型
│   ├── routes/       # API 路由
│   ├── middleware/   # 中间件
│   ├── server.js     # 服务器入口
│   └── package.json
└── frontend/       # 前端应用 (React)
    ├── public/
    ├── src/
    │   ├── components/  # 组件
    │   ├── pages/       # 页面
    │   └── context/     # 状态管理
    └── package.json
```

## 功能特性

- 👤 用户注册/登录
- 📦 创建时间胶囊
- 🔒 按指定日期解锁胶囊
- 📱 响应式设计

## 快速开始

### 前置要求

- Node.js
- MongoDB

### 安装依赖

#### 后端

```bash
cd backend
npm install
```

#### 前端

```bash
cd frontend
npm install
```

### 运行项目

#### 启动后端服务

```bash
cd backend
npm start
# 或开发模式
npm run dev
```

后端运行在 http://localhost:5000

#### 启动前端应用

```bash
cd frontend
npm start
```

前端运行在 http://localhost:3000

## API 接口

### 认证

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 时间胶囊

- `GET /api/capsules` - 获取用户所有胶囊
- `POST /api/capsules` - 创建新胶囊
- `GET /api/capsules/:id` - 获取单个胶囊详情

## 技术栈

### 后端

- **Node.js** - 运行环境
- **Express** - Web 框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **JWT** - 身份认证
- **bcryptjs** - 密码加密

### 前端

- **React 18** - UI 框架
- **React Router** - 路由
- **Axios** - HTTP 客户端
- **Context API** - 状态管理
