# Stockly MCP Server - Makefile
# أوامر مساعدة لتشغيل وإدارة الخادم

.PHONY: help install run test clean setup check

# الألوان للطباعة
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## عرض المساعدة
	@echo "$(GREEN)Stockly MCP Server - أوامر متاحة:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

install: ## تثبيت المتطلبات
	@echo "$(GREEN)تثبيت المتطلبات...$(NC)"
	pip install -r requirements.txt
	@echo "$(GREEN)تم التثبيت بنجاح!$(NC)"

setup: ## إعداد المشروع (تثبيت + نسخ ملف الإعدادات)
	@echo "$(GREEN)إعداد المشروع...$(NC)"
	$(MAKE) install
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)تم إنشاء ملف .env - يرجى تعديل القيم المطلوبة$(NC)"; \
	else \
		echo "$(YELLOW)ملف .env موجود بالفعل$(NC)"; \
	fi
	@echo "$(GREEN)تم الإعداد بنجاح!$(NC)"

run: ## تشغيل الخادم
	@echo "$(GREEN)تشغيل Stockly MCP Server...$(NC)"
	python run_server.py

run-debug: ## تشغيل الخادم في وضع التصحيح
	@echo "$(GREEN)تشغيل الخادم في وضع التصحيح...$(NC)"
	python run_server.py --debug

check: ## فحص الإعدادات فقط
	@echo "$(GREEN)فحص الإعدادات...$(NC)"
	python run_server.py --check

test: ## تشغيل اختبارات الخادم
	@echo "$(GREEN)تشغيل اختبارات الخادم...$(NC)"
	python test_server.py

test-verbose: ## تشغيل الاختبارات مع تفاصيل أكثر
	@echo "$(GREEN)تشغيل الاختبارات مع تفاصيل أكثر...$(NC)"
	python test_server.py --verbose

clean: ## تنظيف الملفات المؤقتة
	@echo "$(GREEN)تنظيف الملفات المؤقتة...$(NC)"
	rm -f *.log
	rm -f __pycache__/*.pyc
	rm -rf .pytest_cache/
	@echo "$(GREEN)تم التنظيف!$(NC)"

logs: ## عرض السجلات
	@echo "$(GREEN)عرض السجلات...$(NC)"
	tail -f mcp_server.log

logs-error: ## عرض أخطاء السجلات فقط
	@echo "$(GREEN)عرض أخطاء السجلات...$(NC)"
	grep "ERROR" mcp_server.log

status: ## فحص حالة الخادم
	@echo "$(GREEN)فحص حالة الخادم...$(NC)"
	@if pgrep -f "python.*run_server.py" > /dev/null; then \
		echo "$(GREEN)الخادم يعمل$(NC)"; \
	else \
		echo "$(RED)الخادم لا يعمل$(NC)"; \
	fi

stop: ## إيقاف الخادم
	@echo "$(GREEN)إيقاف الخادم...$(NC)"
	@pkill -f "python.*run_server.py" || echo "$(YELLOW)لم يتم العثور على عملية خادم$(NC)"

restart: stop run ## إعادة تشغيل الخادم

dev: ## وضع التطوير (تشغيل + مراقبة السجلات)
	@echo "$(GREEN)بدء وضع التطوير...$(NC)"
	@$(MAKE) run-debug &
	@$(MAKE) logs

# أوامر Django (من المجلد الرئيسي)
django-run: ## تشغيل Django server
	@echo "$(GREEN)تشغيل Django server...$(NC)"
	cd .. && python manage.py runserver

django-migrate: ## تشغيل migrations
	@echo "$(GREEN)تشغيل migrations...$(NC)"
	cd .. && python manage.py migrate

django-superuser: ## إنشاء superuser
	@echo "$(GREEN)إنشاء superuser...$(NC)"
	cd .. && python manage.py createsuperuser

# أوامر التطوير
format: ## تنسيق الكود
	@echo "$(GREEN)تنسيق الكود...$(NC)"
	black *.py
	flake8 *.py

lint: ## فحص الكود
	@echo "$(GREEN)فحص الكود...$(NC)"
	flake8 *.py
	mypy *.py

# أوامر المساعدة
version: ## عرض إصدار الخادم
	@echo "$(GREEN)إصدار Stockly MCP Server: 1.0.0$(NC)"

info: ## عرض معلومات المشروع
	@echo "$(GREEN)معلومات المشروع:$(NC)"
	@echo "  اسم المشروع: Stockly MCP Server"
	@echo "  الإصدار: 1.0.0"
	@echo "  الوصف: محاسب ذكي لنظام Stockly"
	@echo "  المؤلف: Stockly Team"
	@echo "  الرخصة: MIT"
