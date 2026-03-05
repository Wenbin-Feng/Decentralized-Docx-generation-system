import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import { authAPI } from '../services/api'

interface WalletAuthProps {
  onLoginSuccess: (user: any) => void
}

declare global {
  interface Window {
    ethereum?: any
  }
}

const WalletAuth = ({ onLoginSuccess }: WalletAuthProps) => {
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string>('')
  const [chainId, setChainId] = useState<number | null>(null)

  // ── Step 1: 连接钱包 ────────────────────────────────────────
  const connectWallet = async (forceSwitch: boolean = false) => {
    setError('')
    setIsConnecting(true)

    try {
      // 检查 MetaMask 是否安装
      if (!window.ethereum) {
        throw new Error('请先安装 MetaMask 钱包')
      }

      const provider = new BrowserProvider(window.ethereum)

      // 如果是强制切换账户，使用 wallet_requestPermissions
      if (forceSwitch) {
        console.log('🔄 请求切换账户...')
        await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])
      }

      // 请求连接钱包
      const accounts = await provider.send('eth_requestAccounts', [])

      if (accounts.length === 0) {
        throw new Error('未获取到钱包地址')
      }

      const address = accounts[0]
      setWalletAddress(address)

      // 获取链 ID
      const network = await provider.getNetwork()
      setChainId(Number(network.chainId))

      console.log('✅ 钱包连接成功:', address)
      console.log('📡 Chain ID:', network.chainId)

      // 监听账号切换
      window.ethereum.on('accountsChanged', (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          setWalletAddress('')
        } else {
          setWalletAddress(newAccounts[0])
        }
      })

      // 监听链切换
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })

    } catch (err: any) {
      console.error('❌ 连接钱包失败:', err)
      setError(err.message || '连接钱包失败')
    } finally {
      setIsConnecting(false)
    }
  }

  // ── Step 2 & 3: 签名登录 ────────────────────────────────────
  const signInWithWallet = async () => {
    if (!walletAddress) {
      setError('请先连接钱包')
      return
    }

    setError('')
    setIsSigning(true)

    try {
      // Step 2.1: 获取 Nonce
      console.log('📝 Step 1: 获取 Nonce...')
      const nonceResponse = await authAPI.getNonce(walletAddress)

      if (!nonceResponse.success) {
        throw new Error(nonceResponse.message || '获取 Nonce 失败')
      }

      const { nonce, siwe_message } = nonceResponse
      console.log('✅ Nonce 获取成功:', nonce)
      console.log('📋 签名消息:', siwe_message)

      // Step 2.2: 请求用户签名
      console.log('✍️  Step 2: 请求用户签名...')
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const signature = await signer.signMessage(siwe_message)
      console.log('✅ 签名成功:', signature.slice(0, 20) + '...')

      // Step 2.3: 验证签名并登录
      console.log('🔐 Step 3: 验证签名...')
      const authResponse = await authAPI.verifySignature({
        wallet_address: walletAddress,
        signature: signature,
        message: siwe_message,
      })

      if (!authResponse.success) {
        throw new Error(authResponse.message || '登录失败')
      }

      console.log('🎉 登录成功!')

      // 保存 Token
      localStorage.setItem('access_token', authResponse.access_token)

      // 回调通知父组件
      onLoginSuccess(authResponse.user)

    } catch (err: any) {
      console.error('❌ 签名登录失败:', err)

      // 用户拒绝签名
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('您拒绝了签名请求')
      } else {
        setError(err.message || '登录失败，请重试')
      }
    } finally {
      setIsSigning(false)
    }
  }

  // ── 断开连接 ────────────────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      // 清除本地状态
      setWalletAddress('')
      setChainId(null)
      setError('')

      // 移除事件监听器
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged')
        window.ethereum.removeAllListeners('chainChanged')
      }

      console.log('✅ 钱包已断开连接')
      console.log('💡 提示: 如需更换钱包账户，请在 MetaMask 中切换账户后重新连接')
    } catch (err: any) {
      console.error('❌ 断开连接失败:', err)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏥 医疗报告生成系统
          </h1>
          <p className="text-gray-600">
            使用 Web3 钱包登录，无需密码
          </p>
        </div>

        {/* 主卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}

          {/* 未连接状态 */}
          {!walletAddress ? (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🦊</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-800">
                  连接您的钱包
                </h2>
                <p className="text-gray-500 text-sm mt-2">
                  支持 MetaMask 等以太坊钱包
                </p>
              </div>

              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    连接中...
                  </span>
                ) : (
                  '🦊 连接 MetaMask'
                )}
              </button>

              <div className="text-xs text-gray-500 text-center mt-4">
                <p>没有钱包？</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  立即下载 MetaMask →
                </a>
              </div>
            </div>
          ) : (
            /* 已连接状态 */
            <div className="space-y-6">
              {/* 钱包信息 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">钱包地址</span>
                  <span className="text-xs text-green-600 font-semibold">● 已连接</span>
                </div>
                <p className="font-mono text-sm text-gray-800 break-all">
                  {walletAddress}
                </p>
                {chainId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Chain ID: {chainId}
                    {chainId === 31337 && ' (Hardhat Local)'}
                    {chainId === 8453 && ' (Base Mainnet)'}
                  </p>
                )}
              </div>

              {/* 签名登录按钮 */}
              <button
                onClick={signInWithWallet}
                disabled={isSigning}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isSigning ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    签名中...
                  </span>
                ) : (
                  '✍️ 签名登录'
                )}
              </button>

              {/* 操作按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={() => connectWallet(true)}
                  className="flex-1 border border-blue-300 text-blue-700 py-3 rounded-lg text-sm font-medium hover:bg-blue-50 hover:border-blue-400 transition-all"
                >
                  🔄 切换账户
                </button>
                <button
                  onClick={disconnectWallet}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  🔌 断开连接
                </button>
              </div>

              {/* 安全提示 */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  🔒 <strong>安全提示：</strong>签名不会产生任何费用，也不会转移您的资产。
                  这只是用于验证您是该钱包的所有者。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部说明 */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>基于 EIP-4361 (Sign-In with Ethereum) 标准</p>
        </div>
      </div>
    </div>
  )
}

export default WalletAuth
