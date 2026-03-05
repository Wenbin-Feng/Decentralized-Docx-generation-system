# 调试指南 - 报告历史功能

## 🔍 问题定位步骤

### 步骤 1: 检查前端认证状态

1. **打开浏览器控制台** (F12)
2. **刷新页面** http://localhost:5173
3. **登录后查看控制台输出**，应该看到：
   ```
   🔐 认证状态检查
   ✅ 找到 access_token
   Token 前缀: eyJhbGciOiJIUzI1NiIsI...
   过期时间: 2026-03-05 18:00:00
   是否过期: ✅ 否
   ```

4. **如果看到以下任一情况，说明需要重新登录**：
   - `❌ 未找到 access_token`
   - `❌ Token 已过期`
   - `❌ 无法解析 Token`

### 步骤 2: 重新登录

如果 Token 不存在或过期：

1. **清除 localStorage**：
   ```javascript
   // 在浏览器控制台运行
   localStorage.clear()
   ```

2. **刷新页面**

3. **重新连接 MetaMask**

4. **签名登录**

5. **再次检查控制台**，确认 Token 已保存

### 步骤 3: 生成报告并检查后端日志

1. **生成一个新报告**（确保已登录）

2. **查看后端日志**：
   ```bash
   # 在 backend 目录运行
   tail -f /private/tmp/claude-501/.../backend_task.output | grep -E "(AUTH|REPORT)"
   ```

3. **正确的日志应该显示**：
   ```
   [AUTH] 用户认证成功: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
   [REPORT] 保存报告记录到数据库，用户: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
   [REPORT] 报告记录已保存，ID: 1
   ```

4. **如果看到**：
   ```
   [AUTH] 未提供认证凭据（credentials is None）
   [REPORT] 用户未登录，不保存报告记录
   ```
   说明前端没有发送 Token，需要检查浏览器 localStorage

### 步骤 4: 验证数据库

```bash
cd backend
sqlite3 medical_reports.db "SELECT id, wallet_address, created_at FROM reports ORDER BY created_at DESC LIMIT 5;"
```

应该看到新的报告记录。

### 步骤 5: 检查文件路径

```bash
ls -lh data/output/ | grep Medical | tail -5
```

应该看到新生成的文件，格式为：
```
Medical_reports_20260305_HHMMSS_uuid.docx
```

## 🐛 常见问题

### 问题 1: Token 自动过期

**症状**：
- 刚登录时可以保存报告
- 过一段时间后无法保存

**原因**：JWT Token 有过期时间（默认 24 小时）

**解决**：
1. 检查 `backend/services/jwt_service.py` 中的过期时间设置
2. 或者重新登录

### 问题 2: 前端没有发送 Token

**症状**：
- localStorage 中有 Token
- 但后端日志显示"未提供认证凭据"

**检查**：
1. 打开浏览器 Network 面板
2. 找到 `/document/generate_report` 请求
3. 查看 Request Headers
4. 确认有 `Authorization: Bearer eyJ...`

**如果没有**：
- 检查 `frontend/src/services/api.ts` 的请求拦截器
- 确认 apiClient 被正确使用

### 问题 3: 图片在 Word 中无法显示

**症状**：
- 报告生成成功
- 但打开 Word 文档后图片显示为占位符

**原因**：图片路径不正确

**已修复**：
- ✅ 相对路径会自动转换为绝对路径
- ✅ 路径基于 `settings.LOCAL_STORAGE_PATH`

**检查后端日志**：
```
[WordHandler] 转换相对路径为绝对路径: static/test.jpg -> /Users/.../backend/data/static/test.jpg
[WordHandler] Processed image: /Users/.../backend/data/static/test.jpg
```

### 问题 4: 报告列表为空

**检查清单**：
- [ ] 用户已登录（浏览器控制台有 Token）
- [ ] 后端日志显示"用户认证成功"
- [ ] 后端日志显示"报告记录已保存"
- [ ] 数据库中有记录
- [ ] 前端正确调用了 `/document/reports` API

## 🛠️ 快速诊断脚本

### 前端诊断

在浏览器控制台运行：
```javascript
// 检查认证状态
window.checkAuth()

// 检查 localStorage
console.log('localStorage:', localStorage)

// 手动测试 API
fetch('http://localhost:8000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(data => console.log('用户信息:', data))
.catch(e => console.error('获取用户信息失败:', e))
```

### 后端诊断

```bash
cd backend
source .venv/bin/activate

# 运行状态检查
python test/check_status.py

# 实时查看日志
tail -f /private/tmp/claude-501/.../backend_task.output
```

## ✅ 完整测试流程

1. **清理环境**：
   ```bash
   # 前端
   localStorage.clear()  # 浏览器控制台

   # 后端
   cd backend
   rm medical_reports.db  # 可选：重置数据库
   ```

2. **重启服务**：
   ```bash
   # 后端
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

   # 前端
   npm run dev
   ```

3. **完整流程**：
   - 访问 http://localhost:5173
   - 打开浏览器控制台（F12）
   - 点击「连接 MetaMask」
   - 签名登录
   - **查看控制台**，确认 Token 已保存
   - 点击「生成医疗报告」
   - 上传图片并生成
   - **查看后端日志**，确认保存成功
   - 点击「我的报告」
   - **应该能看到记录**

## 📞 如果还是不行

请提供以下信息：

1. **浏览器控制台输出**（完整的 `checkAuth()` 输出）
2. **后端日志**（包含 `[AUTH]` 和 `[REPORT]` 的行）
3. **数据库查询结果**：
   ```bash
   sqlite3 medical_reports.db "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM reports;"
   ```
4. **Network 面板截图**（`/document/generate_report` 请求的 Headers）
