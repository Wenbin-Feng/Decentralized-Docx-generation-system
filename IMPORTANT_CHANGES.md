# 重要更新 - 报告生成必须登录

## 🔒 安全性更新

### 修改内容

**报告生成功能现在必须登录才能使用**

之前：
- ❌ 报告生成是可选登录（`get_optional_user`）
- ❌ 未登录用户也能生成报告，但不保存记录
- ❌ 无法追踪谁生成了哪些报告

现在：
- ✅ 报告生成必须登录（`get_current_user`）
- ✅ 未登录用户会收到 401 错误
- ✅ 所有报告都与用户关联并保存到数据库
- ✅ 支持完整的历史记录追踪

## 📊 数据查询

### 查询特定用户的报告

```bash
cd backend
sqlite3 medical_reports.db "SELECT * FROM reports WHERE wallet_address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';"
```

**当前状态**：
- 用户 `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` (winston)
- 报告数量: **0**
- 原因: 之前生成的报告是在可选登录模式下，未保存到数据库

### 查询所有报告

```bash
sqlite3 medical_reports.db "SELECT id, wallet_address, template_id, created_at FROM reports ORDER BY created_at DESC;"
```

## 🔧 技术细节

### 后端修改

**文件**: `backend/routers/template.py`

```python
# 修改前
async def generate_report(
    current_user: Optional[User] = Depends(get_optional_user),  # 可选
):
    if current_user:
        # 保存报告
    else:
        # 不保存

# 修改后
async def generate_report(
    current_user: User = Depends(get_current_user),  # 必须
):
    # 始终保存报告
    logger.info(f"[REPORT] 用户 {current_user.wallet_address} 开始生成报告")
    # ...
    logger.info(f"[REPORT] 报告记录已保存，ID: {report.id}")
```

### 前端修改

**文件**: `frontend/src/components/ReportGenerator.tsx`

1. **添加登录检查**：
```typescript
// 检查是否登录
const token = localStorage.getItem('access_token')
if (!token) {
  setError('❌ 生成报告需要登录，请先连接 MetaMask 钱包并登录')
  return
}
```

2. **显示登录提示**：
```tsx
{!isLoggedIn && (
  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-yellow-800 text-sm">
      ⚠️ <strong>提示：</strong>生成报告需要登录。请先连接 MetaMask 钱包并完成登录。
    </p>
  </div>
)}
```

3. **处理 401 错误**：
```typescript
if (err.response?.status === 401) {
  setError('❌ 登录已过期，请重新登录后再试')
}
```

### 图片路径修复

**文件**: `backend/handlers/word_handler.py`

```python
# 相对路径自动转换为绝对路径
if not image_path.is_absolute():
    base_path = Path(cls._local_storage_path)
    image_path = (base_path / image_path_str).resolve()
    logger.info(f"[WordHandler] 转换相对路径为绝对路径: {image_path_str} -> {image_path}")
```

## ✅ 完整测试流程

### 1. 验证登录要求

```bash
# 应该返回 401
curl -X POST http://localhost:8000/api/v1/document/generate_report \
  -H "Content-Type: application/json" \
  -d '{"content":"测试","template_id":"Medical_reports"}'
```

### 2. 前端登录测试

1. 访问 http://localhost:5173
2. 打开浏览器控制台（F12）
3. 点击「连接 MetaMask」
4. 完成签名登录
5. 查看控制台输出：
   ```
   🔐 认证状态检查
   ✅ 找到 access_token
   ```

### 3. 生成报告测试

1. 点击「📋 生成医疗报告」
2. 如果未登录，会看到黄色提示框
3. 登录后上传图片
4. 生成报告
5. 查看后端日志：
   ```
   [REPORT] 用户 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 开始生成报告
   [REPORT] 保存报告记录到数据库，用户: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
   [REPORT] 报告记录已保存，ID: 1
   ```

### 4. 验证数据库

```bash
cd backend
sqlite3 medical_reports.db "SELECT * FROM reports WHERE wallet_address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';"
```

应该能看到新的报告记录。

### 5. 查看报告历史

1. 点击「📁 我的报告」
2. 应该能看到刚才生成的报告
3. 点击「下载」按钮下载 Word 文档
4. 打开 Word 文档，验证图片是否正确显示

## 🐛 故障排除

### 问题：看不到报告历史

**检查清单**：
1. ✅ 用户已登录（浏览器控制台有 Token）
2. ✅ Token 未过期
3. ✅ 后端日志显示"报告记录已保存"
4. ✅ 数据库中有记录

**诊断命令**：
```bash
# 检查认证状态（浏览器控制台）
window.checkAuth()

# 检查后端日志
cd backend
tail -f /tmp/.../backend_task.output | grep -E "(AUTH|REPORT)"

# 检查数据库
sqlite3 medical_reports.db "SELECT COUNT(*) FROM reports;"
```

### 问题：401 Unauthorized

**原因**：
- Token 不存在
- Token 已过期
- Token 无效

**解决**：
```javascript
// 浏览器控制台
localStorage.clear()
// 刷新页面，重新登录
```

### 问题：图片不显示

**检查**：
- 后端日志是否有 `[WordHandler] 转换相对路径为绝对路径`
- 图片文件是否存在于 `data/static/` 目录
- 文件大小是否 > 0

## 📈 数据统计

当前状态（2026-03-05 10:55）：
- 👥 用户数量: 2
- 📋 报告数量: 0（等待第一个登录后的报告）
- 📁 文件数量: 2 个（旧的未关联报告）

## 🎯 下一步行动

1. **清理旧文件**（可选）：
   ```bash
   cd backend/data/output
   rm Medical_reports_generation.docx  # 没有 UUID 的旧文件
   ```

2. **生成第一个正式报告**：
   - 登录 MetaMask
   - 上传图片
   - 生成报告
   - 验证数据库记录

3. **验证历史功能**：
   - 点击「我的报告」
   - 确认能看到记录
   - 测试下载功能

## 📞 支持

如果遇到问题，请提供：
1. 浏览器控制台完整输出
2. 后端日志（包含 `[AUTH]` 和 `[REPORT]` 的行）
3. 数据库查询结果
4. 错误截图
