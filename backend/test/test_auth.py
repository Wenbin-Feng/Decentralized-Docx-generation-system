"""
认证系统测试
测试 Nonce 生成、签名验证、JWT Token 等功能
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from eth_account import Account
from eth_account.messages import encode_defunct


def test_signature_verification():
    """测试签名验证流程"""
    print("\n" + "=" * 60)
    print("  测试签名验证流程")
    print("=" * 60)

    # 1. 创建测试账户
    account = Account.create()
    address = account.address
    private_key = account.key

    print(f"\n✅ 生成测试账户:")
    print(f"   地址: {address}")
    print(f"   私钥: {private_key.hex()}")

    # 2. 构造消息
    nonce = "test-nonce-12345"
    message = f"""localhost:5173 wants you to sign in with your Ethereum account:
{address}

登录到医疗报告生成系统

URI: http://localhost:5173
Version: 1
Chain ID: 31337
Nonce: {nonce}
Issued At: 2026-03-04T08:00:00Z"""

    print(f"\n✅ 构造签名消息:")
    print(f"   {message[:100]}...")

    # 3. 签名
    message_hash = encode_defunct(text=message)
    signed_message = Account.sign_message(message_hash, private_key)
    signature = signed_message.signature.hex()

    print(f"\n✅ 生成签名:")
    print(f"   {signature[:50]}...")

    # 4. 验证签名
    recovered_address = Account.recover_message(message_hash, signature=signature)

    print(f"\n✅ 恢复地址:")
    print(f"   原始地址: {address}")
    print(f"   恢复地址: {recovered_address}")

    # 5. 验证结果
    is_valid = recovered_address.lower() == address.lower()
    print(f"\n{'✅' if is_valid else '❌'} 签名验证: {'通过' if is_valid else '失败'}")

    return is_valid


def test_jwt_service():
    """测试 JWT Service"""
    print("\n" + "=" * 60)
    print("  测试 JWT Service")
    print("=" * 60)

    from services.jwt_service import get_jwt_service

    jwt_service = get_jwt_service()

    # 1. 生成 Token
    user_id = 1
    wallet_address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

    token = jwt_service.generate_token(user_id, wallet_address)
    print(f"\n✅ 生成 JWT Token:")
    print(f"   {token[:50]}...")

    # 2. 验证 Token
    payload = jwt_service.decode_token(token)
    print(f"\n✅ 解码 Token:")
    print(f"   User ID: {payload.get('user_id')}")
    print(f"   Wallet: {payload.get('sub')}")
    print(f"   Type: {payload.get('type')}")

    # 3. 提取信息
    extracted_address = jwt_service.get_wallet_address(token)
    extracted_id = jwt_service.get_user_id(token)

    print(f"\n✅ 提取信息:")
    print(f"   地址: {extracted_address}")
    print(f"   ID: {extracted_id}")

    # 4. 验证结果
    is_valid = (
        extracted_address == wallet_address.lower()
        and extracted_id == user_id
    )
    print(f"\n{'✅' if is_valid else '❌'} JWT 验证: {'通过' if is_valid else '失败'}")

    return is_valid


def test_auth_service():
    """测试 Auth Service"""
    print("\n" + "=" * 60)
    print("  测试 Auth Service")
    print("=" * 60)

    from services.auth_service import get_auth_service

    auth_service = get_auth_service()

    # 1. 生成 Nonce
    nonce = auth_service.generate_nonce()
    print(f"\n✅ 生成 Nonce:")
    print(f"   {nonce}")

    # 2. 构造 SIWE 消息
    wallet_address = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    siwe_message = auth_service.build_siwe_message(wallet_address, nonce)

    print(f"\n✅ 构造 SIWE 消息:")
    print(f"   {siwe_message[:150]}...")

    # 3. 验证消息中包含必要信息
    checks = [
        ("域名", auth_service.siwe_domain in siwe_message),
        ("钱包地址", wallet_address in siwe_message),
        ("Nonce", nonce in siwe_message),
        ("Chain ID", "31337" in siwe_message),
    ]

    print(f"\n✅ 验证消息内容:")
    for name, result in checks:
        print(f"   {name}: {'✅' if result else '❌'}")

    is_valid = all(check[1] for check in checks)
    print(f"\n{'✅' if is_valid else '❌'} Auth Service: {'通过' if is_valid else '失败'}")

    return is_valid


def test_database_connection():
    """测试数据库连接"""
    print("\n" + "=" * 60)
    print("  测试数据库连接")
    print("=" * 60)

    try:
        from database import init_db, get_db
        from config.settings import settings

        print(f"\n✅ 数据库配置:")
        print(f"   类型: {settings.DATABASE_TYPE}")

        # 初始化数据库
        init_db()
        print(f"\n✅ 数据库初始化成功")

        # 测试连接
        db = next(get_db())
        print(f"✅ 数据库连接成功")

        db.close()
        return True

    except Exception as e:
        print(f"\n❌ 数据库测试失败: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n" + "🔐" * 30)
    print("  认证系统测试")
    print("🔐" * 30)

    results = []

    # 运行测试
    results.append(("签名验证", test_signature_verification()))
    results.append(("JWT Service", test_jwt_service()))
    results.append(("Auth Service", test_auth_service()))
    results.append(("数据库连接", test_database_connection()))

    # 汇总结果
    print("\n" + "=" * 60)
    print("  测试结果汇总")
    print("=" * 60)

    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name:20s} {status}")

    all_passed = all(result for _, result in results)
    print("\n" + ("=" * 60))
    if all_passed:
        print("  🎉 所有测试通过！")
    else:
        print("  ⚠️  部分测试失败")
    print("=" * 60 + "\n")

    sys.exit(0 if all_passed else 1)
