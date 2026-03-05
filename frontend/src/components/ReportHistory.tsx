import { useState, useEffect } from 'react'
import { documentAPI } from '../services/api'

interface ReportHistoryProps {
  onClose: () => void
}

interface Report {
  id: number
  template_id: string
  report_name: string
  file_path: string
  image_path: string | null
  created_at: string
  updated_at: string
}

const ReportHistory = ({ onClose }: ReportHistoryProps) => {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await documentAPI.getReports()

      if (response.success) {
        setReports(response.reports || [])
      } else {
        throw new Error(response.message || '获取报告列表失败')
      }
    } catch (err: any) {
      console.error('获取报告列表失败:', err)
      setError(err.response?.data?.detail || err.message || '获取报告列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    try {
      const response = await documentAPI.downloadReport(reportId)

      // 创建下载链接
      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportName}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('下载失败:', err)
      alert('下载失败，请重试')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="bg-white border-b px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📁 我的报告</h2>
            <p className="text-sm text-gray-600 mt-1">
              查看和下载历史报告记录
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

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-600">加载中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-700">❌ {error}</p>
              <button
                onClick={loadReports}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                重试
              </button>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600 text-lg">暂无报告记录</p>
              <p className="text-gray-500 text-sm mt-2">生成报告后将显示在这里</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {report.report_name}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">生成时间:</span>{' '}
                          {formatDate(report.created_at)}
                        </p>
                        <p>
                          <span className="font-medium">模板:</span>{' '}
                          {report.template_id}
                        </p>
                        {report.image_path && (
                          <p className="flex items-center">
                            <span className="font-medium">包含图片:</span>{' '}
                            <span className="ml-1 text-green-600">✓</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(report.id, report.report_name)}
                      className="ml-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>下载</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="bg-gray-50 border-t px-8 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportHistory
