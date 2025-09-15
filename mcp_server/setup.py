#!/usr/bin/env python3
"""
Stockly MCP Server - ملف الإعداد
إعداد وتثبيت خادم MCP للمحاسب الذكي
"""

from setuptools import setup, find_packages
from pathlib import Path

# قراءة ملف README
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding='utf-8')

# قراءة متطلبات التثبيت
requirements = []
with open(this_directory / "requirements.txt", "r", encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="stockly-mcp-server",
    version="1.0.0",
    author="Stockly Team",
    author_email="team@stockly.com",
    description="MCP Server للمحاسب الذكي لنظام Stockly",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/stockly/mcp-server",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Financial and Insurance Industry",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Office/Business :: Financial :: Accounting",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
        "docs": [
            "sphinx>=5.0.0",
            "sphinx-rtd-theme>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "stockly-mcp=run_server:main",
        ],
    },
    include_package_data=True,
    package_data={
        "": ["*.md", "*.txt", "*.env.example"],
    },
    keywords=[
        "mcp", "model-context-protocol", "accounting", "ai", "n8n", 
        "django", "stockly", "inventory", "invoices", "arabic"
    ],
    project_urls={
        "Bug Reports": "https://github.com/stockly/mcp-server/issues",
        "Source": "https://github.com/stockly/mcp-server",
        "Documentation": "https://docs.stockly.com/mcp-server",
        "Homepage": "https://stockly.com",
    },
)
