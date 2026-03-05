#!/usr/bin/env python3
"""
简单的 AI 对话调用工具
输入文本，输出 AI 回复
"""

import requests


class AIChat:
    """AI 对话客户端"""

    def __init__(self):
        # API 配置（明文写在这里）
        self.api_key = ""
        self.api_base = ""
        self.model = "gpt-4.1-mini"

    def chat(
        self, system_prompt: str, user_message: str, max_tokens: int = 1000
    ) -> str:
        """
        发送消息给 AI 并获取回复

        Args:
            system_prompt: 系统提示词
            user_message: 用户输入的文本
            max_tokens: 最大生成 token 数

        Returns:
            str: AI 的回复文本
        """
        try:
            response = requests.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "max_tokens": max_tokens,
                },
                timeout=30,
            )

            if response.status_code == 200:
                result = response.json()
                reply = result["choices"][0]["message"]["content"]
                return reply
            else:
                error_msg = f"API 请求失败: HTTP {response.status_code}"
                try:
                    error_detail = response.json().get("error", {}).get("message", "")
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                return f"❌ {error_msg}"

        except requests.exceptions.Timeout:
            return "❌ 请求超时，请稍后重试"
        except requests.exceptions.RequestException as e:
            return f"❌ 网络错误: {str(e)}"
        except Exception as e:
            return f"❌ 未知错误: {str(e)}"


def chat(message: str) -> str:
    """
    便捷函数：直接调用 AI 对话

    Args:
        message: 用户输入的文本

    Returns:
        str: AI 的回复
    """
    ai = AIChat()
    return ai.chat("你是一个有用的助手。", message)
