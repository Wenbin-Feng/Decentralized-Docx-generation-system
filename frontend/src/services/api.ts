import axios from 'axios'

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动添加 Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Token 过期或无效
      if (error.response.status === 401) {
        localStorage.removeItem('access_token')
        window.location.href = '/'
      }
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

// ──────────────────────────────────────────────────────────────
// 认证 API
// ──────────────────────────────────────────────────────────────

export const authAPI = {
  /**
   * 获取 Nonce
   */
  getNonce: async (walletAddress: string) => {
    return apiClient.post('/auth/nonce', {
      wallet_address: walletAddress,
    })
  },

  /**
   * 验证签名并登录
   */
  verifySignature: async (data: {
    wallet_address: string
    signature: string
    message: string
  }) => {
    return apiClient.post('/auth/verify', data)
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser: async () => {
    return apiClient.get('/auth/me')
  },

  /**
   * 更新用户资料
   */
  updateProfile: async (profile: {
    username?: string
    gender?: string
    age?: number
  }) => {
    return apiClient.put('/auth/profile', profile)
  },
}

// ──────────────────────────────────────────────────────────────
// 文档 API（示例）
// ──────────────────────────────────────────────────────────────

export const documentAPI = {
  /**
   * 上传图片
   */
  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post('/document/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * 生成影像描述
   */
  generateCaption: async (imgUrl: string) => {
    return apiClient.post('/document/generate_caption', {
      img_url: imgUrl,
    })
  },

  /**
   * 生成报告
   */
  generateReport: async (content: string, templateId: string, imageUrl?: string) => {
    return apiClient.post('/document/generate_report', {
      content,
      template_id: templateId,
      image_url: imageUrl,
    })
  },

  /**
   * 获取报告列表
   */
  getReports: async () => {
    return apiClient.get('/document/reports')
  },

  /**
   * 下载报告
   */
  downloadReport: async (reportId: number) => {
    return apiClient.get(`/document/download/${reportId}`, {
      responseType: 'blob',
    })
  },
}

export default apiClient
