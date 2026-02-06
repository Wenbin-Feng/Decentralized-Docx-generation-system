#!/usr/bin/env python3
"""
测试 OpenAI API Key 的可用性
"""

import requests
import json

def test_openai_key(api_key, api_base="https://api.openai.com/v1"):
    """
    测试 OpenAI API Key 是否可用
    
    Args:
        api_key: OpenAI API Key
        api_base: API Base URL（支持代理服务）
        
    Returns:
        bool: True 表示可用，False 表示不可用
    """
    print("=" * 60)
    print("OpenAI API Key 可用性测试")
    print("=" * 60)
    print(f"API Base: {api_base}")
    print(f"测试的 Key: {api_key[:20]}...{api_key[-4:]}")
    print()
    
    # 测试 1: 获取模型列表
    print("测试 1: 获取模型列表...")
    try:
        response = requests.get(
            f"{api_base}/models",
            headers={
                "Authorization": f"Bearer {api_key}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            models = response.json()
            print(f"✅ 成功！找到 {len(models.get('data', []))} 个模型")
            # 显示部分模型
            model_ids = [m['id'] for m in models.get('data', [])[:5]]
            print(f"   部分模型: {', '.join(model_ids)}")
        elif response.status_code == 401:
            print(f"❌ 认证失败！API Key 无效或已过期")
            print(f"   错误信息: {response.json().get('error', {}).get('message', '未知错误')}")
            return False
        elif response.status_code == 404:
            print(f"⚠️  该代理服务不支持 /models 端点，跳过此测试")
        else:
            print(f"⚠️  请求失败: HTTP {response.status_code}")
            print(f"   响应: {response.text[:200]}")
    except requests.exceptions.Timeout:
        print("❌ 请求超时！请检查网络连接")
        return False
    except requests.exceptions.RequestException as e:
        print(f"⚠️  网络请求错误（可能正常）: {e}")
    except Exception as e:
        print(f"⚠️  错误（可能正常）: {e}")
    
    print()
    
    # 测试 2: 简单的聊天补全
    print("测试 2: 发送简单的聊天请求...")
    try:
        response = requests.post(
            f"{api_base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4.1-mini",  # 使用代理支持的模型
                "messages": [
                    {"role": "user", "content": "用中文说'你好'"}
                ],
                "max_tokens": 20
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            reply = result['choices'][0]['message']['content']
            tokens_used = result['usage']['total_tokens']
            print(f"✅ 成功！模型回复: {reply}")
            print(f"   使用 Token 数: {tokens_used}")
        elif response.status_code == 401:
            print(f"❌ 认证失败！API Key 无效")
            try:
                error_msg = response.json().get('error', {}).get('message', '未知错误')
            except:
                error_msg = response.text[:200]
            print(f"   错误信息: {error_msg}")
            return False
        elif response.status_code == 429:
            print(f"⚠️  速率限制或配额不足")
            try:
                error_msg = response.json().get('error', {}).get('message', '未知错误')
            except:
                error_msg = response.text[:200]
            print(f"   错误信息: {error_msg}")
            return False
        else:
            print(f"⚠️  请求失败: HTTP {response.status_code}")
            print(f"   完整响应: {response.text}")
            return False
    except requests.exceptions.Timeout:
        print("❌ 请求超时！OpenAI 服务可能响应较慢")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False
    
    print()
    print("=" * 60)
    print("✅ 测试通过！API Key 可用")
    print("=" * 60)
    return True


if __name__ == "__main__":
    # API 配置
    API_KEY = "sk-EeQXyFHaGkbKBieUHkKHcG"
    API_BASE = "https://api.manus.im/api/llm-proxy/v1"
    
    # 运行测试
    is_valid = test_openai_key(API_KEY, API_BASE)
    
    if not is_valid:
        print("\n⚠️  API Key 验证失败！请检查:")
        print("   1. API Key 是否正确")
        print("   2. API Key 是否已过期")
        print("   3. 账户是否有余额")
        print("   4. 网络连接是否正常")
        exit(1)
    else:
        print("\n🎉 API Key 验证成功，可以正常使用！")
        exit(0)












