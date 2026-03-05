"""
报告记录数据模型
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, func, ForeignKey
from database.db import Base


class Report(Base):
    """
    报告记录表 - 存储用户生成的报告历史
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # 关联用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    wallet_address = Column(String(42), nullable=False, index=True)  # 冗余字段，方便查询

    # 报告信息
    template_id = Column(String(100), nullable=False)  # 模板 ID，如 "Medical_reports"
    report_name = Column(String(200), nullable=True)  # 报告名称（可自定义）

    # 文件路径
    file_path = Column(String(500), nullable=False)  # Word 文档路径
    image_path = Column(String(500), nullable=True)  # 胸片图片路径

    # 报告内容（JSON格式存储）
    json_data = Column(Text, nullable=True)  # 生成的结构化数据
    content = Column(Text, nullable=True)  # 原始输入内容（findings + diagnosis）

    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Report(id={self.id}, user_id={self.user_id}, template={self.template_id})>"

    def to_dict(self):
        """转换为字典（用于 API 响应）"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "wallet_address": self.wallet_address,
            "template_id": self.template_id,
            "report_name": self.report_name or f"医疗报告_{self.id}",
            "file_path": self.file_path,
            "image_path": self.image_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
