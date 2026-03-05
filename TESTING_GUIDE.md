# 测试指南 - 报告历史记录功能

## ✅ 已实现的功能

### 1. UUID 文件命名
- ✅ 每次生成的报告使用唯一文件名
- ✅ 格式: `{template_id}_{timestamp}_{uuid}.docx`
- ✅ 示例: `Medical_reports_20260305_105007_d0b27abb.docx`

### 2. 报告历史记录
- ✅ 登录用户生成报告后自动保存到数据库
- ✅ 可查看历史报告列表（按时间倒序）
- ✅ 支持下载报告文件
- ✅ 未登录用户仍可生成报告，但不保存记录

### 3. 图片路径自动注入
- ✅ 胸片路径自动拼接到 LLM prompt
- ✅ 确保生成的 JSON 包含 `chest_xray.image_path` 字段

## 🧪 完整测试流程

### 步骤 1: 启动服务

```bash
# 后端（在 backend 目录）
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 前端（在 frontend 目录）
npm run dev
```

### 步骤 2: 登录 MetaMask

1. 访问 http://localhost:5173
2. 点击「连接 MetaMask」
3. 签名确认登录
4. **重要**: 确保登录成功，看到 Dashboard

### 步骤 3: 完善个人资料（可选）

1. 点击「编辑 ✏️」或「⚙️ 个人资料设置」
2. 填写姓名、性别、年龄
3. 保存
4. 生成报告时会自动填充这些信息

### 步骤 4: 生成医疗报告

1. 点击「📋 生成医疗报告」
2. 上传一张胸片/CT 图片
3. 等待 AI 生成影像描述
4. 编辑描述（可选）
5. 点击「生成完整报告」
6. 等待报告生成完成

### 步骤 5: 查看报告历史

1. 返回 Dashboard
2. 点击「📁 我的报告」
3. 应该能看到刚才生成的报告
4. 显示信息：
   - 报告名称
   - 生成时间
   - 模板类型
   - 是否包含图片

### 步骤 6: 下载报告

1. 在报告列表中找到报告
2. 点击「下载」按钮
3. Word 文档会自动下载到本地

## 🔍 验证要点

### 数据库检查

```bash
# 进入 backend 目录
cd backend

# 检查报告记录
sqlite3 medical_reports.db "SELECT id, wallet_address, template_id, file_path, created_at FROM reports;"
```

应该看到类似输出：
```
1|0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266|Medical_reports|/path/to/Medical_reports_20260305_105007_d0b27abb.docx|2026-03-05 10:50:07
```

### 文件检查

```bash
# 检查生成的文件
ls -lh data/output/ | grep Medical
```

应该看到包含时间戳和 UUID 的文件名。

### 后端日志检查

查看后端日志，应该有：
```
[REPORT] 保存报告记录到数据库，用户: 0x...
[REPORT] 报告记录已保存，ID: 1
```

## ❌ 常见问题

### 问题 1: 看不到报告历史

**原因**: 用户没有登录
**解决**:
1. 确保已连接 MetaMask
2. 确保已签名登录
3. 刷新页面重新登录
4. 检查浏览器控制台是否有错误

### 问题 2: 报告没有保存到数据库

**检查**:
```bash
# 查看后端日志
tail -f /private/tmp/claude-501/.../backend_task.output

# 如果看到 "用户未登录，不保存报告记录"
# 说明前端 token 失效，需要重新登录
```

### 问题 3: 下载失败

**原因**: 文件路径不存在或权限问题
**检查**:
```bash
# 确认文件存在
ls -l data/output/Medical_reports_*.docx
```

## 📊 API 端点

### 生成报告
```
POST /api/v1/document/generate_report
Headers: Authorization: Bearer <token>  # 可选
Body: {
  "content": "影像所见...\n诊断意见...",
  "template_id": "Medical_reports",
  "image_url": "static/test.png"  # 可选
}
```

### 获取报告列表
```
GET /api/v1/document/reports
Headers: Authorization: Bearer <token>  # 必需
```

### 下载报告
```
GET /api/v1/document/download/{report_id}
Headers: Authorization: Bearer <token>  # 必需
```

## 💡 提示

1. **登录状态**: 报告历史功能需要登录，确保先完成 MetaMask 登录
2. **文件命名**: 每次生成的文件名都是唯一的，不会覆盖
3. **数据保存**: 只有登录用户的报告才会保存到数据库
4. **图片路径**: 上传的图片路径会自动传递给 LLM，确保生成的 JSON 包含图片信息

## 🎯 成功标志

如果看到以下情况，说明功能正常：

- ✅ 文件名格式: `Medical_reports_YYYYMMDD_HHMMSS_uuid.docx`
- ✅ 数据库中有报告记录
- ✅ 前端能显示报告列表
- ✅ 能成功下载 Word 文档
- ✅ 生成的 Word 中包含图片
