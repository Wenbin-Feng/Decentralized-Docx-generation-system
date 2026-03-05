/**
 * 认证状态检查工具
 */

export const checkAuthStatus = () => {
  const token = localStorage.getItem('access_token')

  console.group('🔐 认证状态检查')

  if (!token) {
    console.warn('❌ 未找到 access_token')
    console.log('📋 localStorage 内容:', localStorage)
    console.groupEnd()
    return {
      hasToken: false,
      token: null,
    }
  }

  console.log('✅ 找到 access_token')
  console.log('Token 前缀:', token.substring(0, 20) + '...')
  console.log('Token 长度:', token.length)

  // 尝试解析 JWT
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      console.log('JWT Payload:', payload)

      // 检查过期时间
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000)
        const now = new Date()
        const isExpired = expDate < now

        console.log('过期时间:', expDate.toLocaleString('zh-CN'))
        console.log('当前时间:', now.toLocaleString('zh-CN'))
        console.log('是否过期:', isExpired ? '❌ 是' : '✅ 否')

        if (isExpired) {
          console.warn('⚠️ Token 已过期，请重新登录')
        }
      }
    }
  } catch (e) {
    console.error('❌ 无法解析 Token:', e)
  }

  console.groupEnd()

  return {
    hasToken: true,
    token,
  }
}

// 在控制台添加全局函数
if (typeof window !== 'undefined') {
  (window as any).checkAuth = checkAuthStatus
}
