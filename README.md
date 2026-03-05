# 🏥 医疗报告生成系统 - Web3 认证版

基于 **Sign-In with Ethereum (EIP-4361)** 的去中心化医疗报告生成系统。

**核心特性：钱包签名登录 + AI 报告生成 + 数据库灵活切换**

---

## ✨ 功能特性

- ✅ **Web3 登录** - 钱包签名即登录，无需密码
- ✅ **医疗报告生成** - AI 自动生成 X 光报告
- ✅ **图片渲染** - Word 文档中插入医疗影像
- ✅ **多数据库支持** - SQLite/PostgreSQL 一键切换
- ✅ **生产级安全** - JWT Token + 防重放攻击
- ✅ **开箱即用** - 完整的前后端代码

---

## 🛠️ 技术栈

### 后端
- **FastAPI** - 现代化 Python Web 框架
- **SQLAlchemy** - ORM 数据库操作
- **eth-account** - 以太坊签名验证
- **PyJWT** - JWT Token 认证
- **OpenAI/Anthropic** - AI 报告生成

### 前端
- **React 18** + **Vite** - 用户界面
- **Ethers.js v6** - 以太坊钱包交互
- **Tailwind CSS** - 样式框架

### 区块链
- **MetaMask** - 钱包连接
- **EIP-4361** - SIWE 标准

---

## 🚀 快速开始

### 1️⃣ 前置要求

必须安装：
- **uv** - Python 包管理器
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Node.js** >= 18.0.0
- **npm** 或 **yarn**

可选安装：
- **MetaMask** - 浏览器钱包插件
- **Hardhat** - 本地区块链节点（测试用，**非必需**）

### 2️⃣ 安装依赖

```bash
# 后端依赖（使用 uv）
cd backend
uv sync

# 前端依赖
cd ../frontend
npm install
```

### 3️⃣ 配置环境变量

#### 后端 `.env`（最小配置）
```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`：
```env
# 数据库（使用 SQLite，零配置）
DATABASE_TYPE=sqlite
SQLITE_FILE=medical_reports.db

# JWT 密钥（生产环境必须修改！）
JWT_SECRET_KEY=your-super-secret-key-at-least-32-characters-long

# 认证配置
SIWE_DOMAIN=localhost:5173
SIWE_URI=http://localhost:5173

# AI 配置（如果需要生成报告）
MODEL_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL_ID=gpt-4
```

#### 前端 `.env`（默认即可）
```bash
cd ../frontend
cp .env.example .env
```

### 4️⃣ 启动服务

#### 方式 A：一键启动（推荐）
```bash
chmod +x start_dev.sh stop_dev.sh
./start_dev.sh

# 停止服务
./stop_dev.sh
```

#### 方式 B：手动启动
```bash
# 终端 1：启动后端
cd backend
uv run uvicorn main:app --reload --port 8000

# 终端 2：启动前端
cd frontend
npm run dev
```

### 5️⃣ 访问应用

- 🎨 **前端界面**: http://localhost:5173
- 📡 **后端 API**: http://localhost:8000
- 📚 **API 文档**: http://localhost:8000/docs

---

## 🔐 配置 MetaMask

### 方式 1：使用测试网（推荐，无需 Hardhat）

MetaMask 自带测试网络，直接使用即可：
- **Sepolia** 测试网
- **Goerli** 测试网

**优点**：不需要启动 Hardhat，直接测试

### 方式 2：使用 Hardhat 本地网络（可选）

如果你想在完全本地的环境测试：

#### ① 启动 Hardhat 节点
```bash
# 在你的区块链项目目录
npx hardhat node
```

#### ② 在 MetaMask 中添加网络
1. 打开 MetaMask
2. 点击网络下拉 → 添加网络 → 手动添加
3. 填写信息：
   ```
   网络名称: Hardhat Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 31337
   货币符号: ETH
   ```

#### ③ 导入测试账户
使用 Hardhat 默认提供的测试账户：
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

⚠️ **警告**: 这是公开的测试私钥，**永远不要**在主网使用！

### 方式 3：直接使用主网（生产环境）

配置完成后，系统也支持以太坊主网登录！

---

## 🧪 测试登录流程

1. **确保后端和前端都已启动**
2. **访问前端**: http://localhost:5173
3. **点击「连接 MetaMask」**，选择你的账户
4. **点击「签名登录」**
5. **在 MetaMask 弹窗中确认签名**（不产生 Gas 费用！）
6. **登录成功**，进入 Dashboard 页面

---

## 📂 项目结构

```
demo/
├── backend/                    # 后端服务
│   ├── database/              # 数据库工厂（SQLite/PostgreSQL）
│   ├── middleware/            # JWT 认证中间件
│   ├── models/                # 数据模型（User、Auth）
│   ├── routers/               # API 路由（auth、document）
│   ├── services/              # 业务逻辑（JWT、签名验证）
│   ├── test/                  # 测试文件
│   ├── main.py                # 应用入口
│   └── pyproject.toml         # uv 配置
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── WalletAuth.tsx # 钱包登录
│   │   │   └── Dashboard.tsx  # 用户面板
│   │   ├── services/
│   │   │   └── api.ts         # API 封装
│   │   └── App.tsx            # 主应用
│   └── package.json
│
├── start_dev.sh               # 一键启动脚本
├── stop_dev.sh                # 停止服务脚本
└── README.md                  # 本文档
```

---

## 🔒 认证流程详解

### Step 1: 获取 Nonce
```http
POST /api/v1/auth/nonce
{
  "wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
}
```

**响应**：返回随机 Nonce 和 SIWE 标准签名消息

### Step 2: 用户签名
前端调用 MetaMask 请求用户对消息进行签名（使用 `personal_sign`）

### Step 3: 验证签名并登录
```http
POST /api/v1/auth/verify
{
  "wallet_address": "0xf39...",
  "signature": "0xabcdef...",
  "message": "localhost:5173 wants you to sign in..."
}
```

**响应**：返回 JWT Token 和用户信息

### Step 4: 访问受保护接口
```http
GET /api/v1/auth/me
Authorization: Bearer <jwt_token>
```

---

## 🔐 安全机制

| 机制 | 说明 |
|------|------|
| **Nonce 防重放** | 每个 Nonce 只能使用一次，5 分钟自动过期 |
| **签名验证** | 使用 `eth-account` 的 ecrecover 验证签名真实性 |
| **JWT Token** | HS256 算法加密，24 小时自动过期 |
| **地址验证** | 严格匹配钱包地址，防止伪造 |
| **CORS 保护** | 限制允许的前端域名 |

---

## 🛡️ 给现有接口添加鉴权

只需一行代码！

```python
from fastapi import Depends
from middleware.auth_middleware import get_current_user
from models.user import User

@router.post("/document/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # ✅ 添加这一行
    storage = Depends(get_storage)
):
    # 现在可以访问：
    # - current_user.id
    # - current_user.wallet_address
    # - current_user.created_at

    logger.info(f"用户 {current_user.wallet_address} 上传文件: {file.filename}")

    # 原有逻辑...
```

### 可选鉴权（游客也能访问）

```python
from typing import Optional

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except:
        return None

@router.post("/document/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user),  # 可选登录
):
    if current_user:
        # 登录用户：享受更多权限
        pass
    else:
        # 游客用户：受限访问
        pass
```

---

## 🗄️ 数据库配置

### SQLite（默认，零配置）

```env
DATABASE_TYPE=sqlite
SQLITE_FILE=medical_reports.db
```

**优点**：零配置，开箱即用
**缺点**：不支持高并发

### PostgreSQL（生产环境推荐）

```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/medical_reports
```

**优点**：高性能，支持并发
**缺点**：需要独立数据库服务器

### Supabase（云数据库）

```env
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
```

**优点**：托管服务，自动备份
**缺点**：免费版有限制

---

## 📡 API 接口列表

### 认证接口

| 方法 | 路径 | 描述 | 鉴权 |
|------|------|------|------|
| POST | `/api/v1/auth/nonce` | 获取 Nonce | ❌ |
| POST | `/api/v1/auth/verify` | 验证签名并登录 | ❌ |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | ✅ |

### 文档接口

| 方法 | 路径 | 描述 | 鉴权 |
|------|------|------|------|
| POST | `/api/v1/document/upload` | 上传医疗影像 | 可选 |
| POST | `/api/v1/document/generate_caption` | 生成影像描述 | 可选 |
| POST | `/api/v1/document/generate_report` | 生成完整报告 | 可选 |

完整 API 文档：http://localhost:8000/docs

---

## 🧪 运行测试

```bash
cd backend

# 测试认证系统
uv run python test/test_auth.py

# 测试图片渲染
uv run python test/test_image_render.py

# 测试完整流程
uv run python test/test_full_pipeline.py
```

**预期输出**：
```
✅ 签名验证: 通过
✅ JWT Service: 通过
✅ Auth Service: 通过
✅ 数据库连接: 通过
```

---

## 🐛 常见问题

### 1. `uv: command not found`

**解决**：安装 uv
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # 或 ~/.zshrc
```

### 2. MetaMask 签名后无响应

**原因**：后端未启动或 CORS 配置错误

**解决**：
1. 检查后端是否运行：`curl http://localhost:8000/health`
2. 查看浏览器控制台错误
3. 检查 `backend/.env` 中的 `SIWE_DOMAIN`

### 3. 签名验证失败

**原因**：
- Nonce 已过期（超过 5 分钟）
- 钱包地址不匹配

**解决**：刷新页面重新获取 Nonce

### 4. 数据库连接失败

**SQLite**: 确保 `backend/` 目录有写权限

**PostgreSQL**: 检查连接字符串和数据库是否启动
```bash
psql -h localhost -U user -d medical_reports
```

### 5. 是否必须启动 Hardhat？

**答案：不需要！**

- Hardhat 只是**可选的**本地测试环境
- 你可以直接用 MetaMask 连接：
  - ✅ 测试网（Sepolia、Goerli）
  - ✅ 主网（以太坊、Base）
  - ✅ Hardhat 本地节点（Chain ID 31337）

只有当你需要**完全离线测试**时才需要启动 Hardhat。

---

## 🚀 部署到生产环境

### 检查清单

- [ ] 修改 `JWT_SECRET_KEY` 为强随机字符串（至少 32 字符）
- [ ] 启用 HTTPS（后端和前端）
- [ ] 修改 `SIWE_DOMAIN` 和 `SIWE_URI` 为实际域名
- [ ] 限制 CORS `allow_origins` 为生产域名
- [ ] 使用 PostgreSQL（推荐 Supabase）
- [ ] 配置数据库备份
- [ ] 添加 Rate Limiting（防止暴力破解）
- [ ] 配置日志记录和监控
- [ ] 定期清理过期 Nonce

### 环境变量示例（生产）

```env
# 数据库
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

# JWT（使用强密钥！）
JWT_SECRET_KEY=生产环境的超级复杂密钥至少32字符长
JWT_EXPIRATION_HOURS=24

# 认证
SIWE_DOMAIN=your-domain.com
SIWE_URI=https://your-domain.com

# HTTPS
# 使用 Nginx 或 Cloudflare 配置 SSL
```

---

## 📊 系统架构

```
┌─────────────────────────────────────────────────────────┐
│              前端 (React + Ethers.js)                   │
│  WalletAuth → 连接钱包 → 签名消息 → 登录              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP + JWT
                     ▼
┌─────────────────────────────────────────────────────────┐
│            后端 (FastAPI + SQLAlchemy)                  │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐          │
│  │ /nonce   │→ │  User    │→ │ JWT Service │          │
│  │ /verify  │  │  Model   │  │             │          │
│  │ /me      │  │          │  │             │          │
│  └──────────┘  └──────────┘  └─────────────┘          │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│         数据库 (SQLite / PostgreSQL)                    │
│  users 表: id, wallet_address, nonce, created_at        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 技术亮点

1. **完全去中心化登录** - 钱包签名即身份，无需传统账号密码
2. **符合 EIP-4361 标准** - Sign-In with Ethereum
3. **数据库工厂模式** - 一键切换 SQLite/PostgreSQL
4. **生产级安全** - 防重放、JWT、签名验证
5. **开箱即用** - 完整前后端代码 + 一键启动脚本
6. **AI 集成** - 支持 OpenAI/Anthropic 自动生成报告

---

## 📚 相关资源

- **EIP-4361 规范**: https://eips.ethereum.org/EIPS/eip-4361
- **Ethers.js 文档**: https://docs.ethers.org/v6/
- **FastAPI 文档**: https://fastapi.tiangolo.com/
- **uv 文档**: https://docs.astral.sh/uv/
- **Tailwind CSS**: https://tailwindcss.com/

---

## 📝 开发路线图

### 已完成 ✅
- [x] SIWE 钱包登录
- [x] JWT Token 认证
- [x] 数据库工厂（SQLite/PostgreSQL）
- [x] 前端钱包集成
- [x] AI 报告生成
- [x] Word 文档图片渲染

### 计划中 🚧
- [ ] 用户个人资料编辑
- [ ] 多链支持（Base、Polygon）
- [ ] 登录历史记录
- [ ] 报告历史管理
- [ ] 区块链存证（报告哈希上链）

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 License

MIT License

---

## 🎉 总结

你现在拥有了一个**生产级别的 Web3 医疗报告系统**：

✅ **无密码登录** - MetaMask 钱包签名即登录
✅ **安全可靠** - JWT + 防重放攻击 + 签名验证
✅ **灵活部署** - SQLite/PostgreSQL 一键切换
✅ **AI 赋能** - 自动生成医疗报告
✅ **开箱即用** - 一键启动脚本

**立即运行 `./start_dev.sh` 开始使用吧！** 🚀

---

**有问题？查看日志文件：**
- 后端: `logs/backend.log`
- 前端: `logs/frontend.log`

**或访问 API 文档：** http://localhost:8000/docs
