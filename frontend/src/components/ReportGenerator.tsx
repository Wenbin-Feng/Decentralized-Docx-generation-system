import { useState } from 'react'
import { documentAPI } from '../services/api'

interface ReportGeneratorProps {
  user: any
  onClose: () => void
}

const ReportGenerator = ({ user, onClose }: ReportGeneratorProps) => {
  const [step, setStep] = useState<'upload' | 'caption' | 'report'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [imageUrl, setImageUrl] = useState<string>('')

  const [findings, setFindings] = useState<string>('')
  const [diagnosis, setDiagnosis] = useState<string>('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportUrl, setReportUrl] = useState('')

  // 检查是否登录
  const isLoggedIn = !!localStorage.getItem('access_token')

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  // 步骤1: 上传图片
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('请先选择图片')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await documentAPI.uploadImage(selectedFile)

      if (response.success) {
        setImageUrl(response.message)
        setStep('caption')
        // 自动生成描述
        await handleGenerateCaption(response.message)
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (err: any) {
      console.error('上传失败:', err)
      setError(err.response?.data?.detail || err.message || '上传失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 步骤2: 生成影像描述
  const handleGenerateCaption = async (imgUrl?: string) => {
    const url = imgUrl || imageUrl
    if (!url) {
      setError('图片路径丢失')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await documentAPI.generateCaption(url)

      if (response.success) {
        setFindings(response.findings || '')
        setDiagnosis(response.diagnosis || '')
        setStep('caption')
      } else {
        throw new Error(response.message || '生成描述失败')
      }
    } catch (err: any) {
      console.error('生成描述失败:', err)
      setError(err.response?.data?.detail || err.message || '生成描述失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 步骤3: 生成完整报告
  const handleGenerateReport = async () => {
    if (!findings || !diagnosis) {
      setError('请先生成影像描述')
      return
    }

    // 检查是否登录
    const token = localStorage.getItem('access_token')
    if (!token) {
      setError('❌ 生成报告需要登录，请先连接 MetaMask 钱包并登录')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const content = `影像所见：\n${findings}\n\n诊断意见：\n${diagnosis}`
      const response = await documentAPI.generateReport(content, 'Medical_reports', imageUrl)

      if (response.success) {
        setReportUrl(response.output_path || '')
        setStep('report')
      } else {
        throw new Error(response.message || '生成报告失败')
      }
    } catch (err: any) {
      console.error('生成报告失败:', err)

      // 处理 401 未授权错误
      if (err.response?.status === 401) {
        setError('❌ 登录已过期，请重新登录后再试')
      } else {
        setError(err.response?.data?.detail || err.message || '生成报告失败，请重试')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-white border-b px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📋 医疗报告生成</h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'upload' && '第1步: 上传医学影像'}
              {step === 'caption' && '第2步: 编辑影像描述'}
              {step === 'report' && '第3步: 生成完整报告'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          {/* 步骤1: 上传图片 */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* 登录提示 */}
              {!isLoggedIn && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>提示：</strong>生成报告需要登录。请先连接 MetaMask 钱包并完成登录。
                  </p>
                </div>
              )}

              {/* 上传区域 */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {previewUrl ? (
                    <div>
                      <img src={previewUrl} alt="预览" className="max-h-64 mx-auto rounded-lg" />
                      <p className="mt-4 text-sm text-gray-600">点击重新选择图片</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">点击选择 CT / 胸片图像</p>
                      <p className="mt-1 text-xs text-gray-500">支持 JPG, PNG 格式</p>
                    </div>
                  )}
                </label>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">❌ {error}</p>
                </div>
              )}

              {/* 按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '上传中...' : '上传并生成描述'}
                </button>
              </div>
            </div>
          )}

          {/* 步骤2: 编辑影像描述 */}
          {step === 'caption' && (
            <div className="space-y-6">
              {/* 图片预览 */}
              {previewUrl && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <img src={previewUrl} alt="影像" className="max-h-48 mx-auto rounded" />
                </div>
              )}

              {/* 影像所见 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  影像所见 (Findings)
                </label>
                <textarea
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="AI 生成的影像描述将显示在这里，您可以编辑..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* 诊断意见 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  诊断意见 (Diagnosis)
                </label>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="AI 生成的诊断意见将显示在这里，您可以编辑..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">❌ {error}</p>
                </div>
              )}

              {/* 按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  返回上传
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={!findings || !diagnosis || isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '生成中...' : '生成完整报告'}
                </button>
              </div>
            </div>
          )}

          {/* 步骤3: 报告生成完成 */}
          {step === 'report' && (
            <div className="space-y-6">
              {/* 成功提示 */}
              <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-xl font-semibold text-green-800 mb-2">报告生成成功！</h3>
                <p className="text-sm text-green-700">
                  您的医疗报告已生成完成
                  {user?.username && `，患者姓名: ${user.username}`}
                </p>
                {user && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ 报告已保存到您的历史记录中
                  </p>
                )}
              </div>

              {/* 报告信息 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">报告路径</p>
                    <p className="font-mono text-sm text-gray-800 mt-1">{reportUrl}</p>
                  </div>
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setStep('upload')
                    setSelectedFile(null)
                    setPreviewUrl('')
                    setImageUrl('')
                    setFindings('')
                    setDiagnosis('')
                    setReportUrl('')
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  生成新报告
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                  完成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator
