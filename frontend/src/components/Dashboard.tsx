import { useState, useEffect } from 'react'
import ProfileEdit from './ProfileEdit'
import ReportGenerator from './ReportGenerator'
import ReportHistory from './ReportHistory'
import { checkAuthStatus } from '../utils/checkAuth'

interface DashboardProps {
  user: any
  onLogout: () => void
}

const Dashboard = ({ user: initialUser, onLogout }: DashboardProps) => {
  const [user, setUser] = useState(initialUser)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const [showReportHistory, setShowReportHistory] = useState(false)

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const handleProfileUpdate = (updatedUser: any) => {
    setUser(updatedUser)
  }

  const handleDisconnect = () => {
    if (confirm('确定要断开钱包连接吗？您可以随时重新连接或更换钱包。')) {
      onLogout()
    }
  }

  // 检查用户资料是否完整
  const isProfileComplete = user.username && user.gender && user.age

  // 检查认证状态（开发调试用）
  useEffect(() => {
    checkAuthStatus()
  }, [])

  return (
    <>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* 顶部导航 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  🏥 医疗报告生成系统
                </h1>
                <p className="text-gray-600 mt-1">
                  欢迎回来{user.username ? `, ${user.username}` : ''}!
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDisconnect}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  断开钱包
                </button>
                <button
                  onClick={onLogout}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>

          {/* 资料未完善提示 */}
          {!isProfileComplete && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="font-semibold text-yellow-800">个人资料未完善</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      完善资料后，生成报告时会自动填充您的信息，无需重复输入
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors whitespace-nowrap"
                >
                  立即完善
                </button>
              </div>
            </div>
          )}

          {/* 用户信息卡片 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* 个人资料 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <span className="text-2xl mr-2">👤</span>
                  个人资料
                </h2>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  编辑 ✏️
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">姓名</span>
                  <span className="font-semibold text-gray-800">
                    {user.username || <span className="text-gray-400 text-sm">未填写</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">性别</span>
                  <span className="font-semibold text-gray-800">
                    {user.gender || <span className="text-gray-400 text-sm">未填写</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">年龄</span>
                  <span className="font-semibold text-gray-800">
                    {user.age ? `${user.age} 岁` : <span className="text-gray-400 text-sm">未填写</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">钱包地址</span>
                  <span className="font-mono text-sm text-gray-800">
                    {formatAddress(user.wallet_address)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">用户 ID</span>
                  <span className="font-semibold text-gray-800">{user.id}</span>
                </div>
              </div>
            </div>

            {/* 功能入口 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-2xl mr-2">🚀</span>
                快速操作
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setShowReportGenerator(true)}
                  className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors border border-blue-200"
                >
                  <div className="font-semibold text-blue-800">📋 生成医疗报告</div>
                  <div className="text-sm text-blue-600 mt-1">上传影像并生成报告</div>
                </button>
                <button
                  onClick={() => setShowReportHistory(true)}
                  className="w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors border border-green-200"
                >
                  <div className="font-semibold text-green-800">📁 我的报告</div>
                  <div className="text-sm text-green-600 mt-1">查看历史报告记录</div>
                </button>
                <button
                  onClick={() => setShowProfileEdit(true)}
                  className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors border border-purple-200"
                >
                  <div className="font-semibold text-purple-800">⚙️ 个人资料设置</div>
                  <div className="text-sm text-purple-600 mt-1">编辑姓名、性别、年龄</div>
                </button>
              </div>
            </div>
          </div>

          {/* 系统信息 */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">ℹ️</span>
              系统信息
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-sm opacity-80">认证方式</div>
                <div className="font-semibold mt-1">SIWE (EIP-4361)</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-sm opacity-80">Token 类型</div>
                <div className="font-semibold mt-1">JWT Bearer</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-sm opacity-80">状态</div>
                <div className="font-semibold mt-1 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  已认证
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-sm opacity-80">资料完整度</div>
                <div className="font-semibold mt-1">
                  {isProfileComplete ? '✅ 已完善' : '⚠️ 待完善'}
                </div>
              </div>
            </div>
          </div>

          {/* 完整钱包地址（可复制） */}
          <div className="mt-6 text-center">
            <div className="inline-block bg-white rounded-lg shadow px-6 py-3">
              <span className="text-sm text-gray-600 mr-2">完整地址:</span>
              <code className="font-mono text-sm text-gray-800 select-all">
                {user.wallet_address}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 个人资料编辑弹窗 */}
      {showProfileEdit && (
        <ProfileEdit
          user={user}
          onProfileUpdate={handleProfileUpdate}
          onClose={() => setShowProfileEdit(false)}
        />
      )}

      {/* 报告生成弹窗 */}
      {showReportGenerator && (
        <ReportGenerator
          user={user}
          onClose={() => setShowReportGenerator(false)}
        />
      )}

      {/* 报告历史弹窗 */}
      {showReportHistory && (
        <ReportHistory
          onClose={() => setShowReportHistory(false)}
        />
      )}
    </>
  )
}

export default Dashboard
