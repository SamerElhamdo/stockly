#!/bin/bash

# Stockly MCP Server - Deploy Script
# سكريبت النشر

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
PROJECT_NAME="stockly-mcp-server"
DOCKER_IMAGE="stockly/mcp-server"
VERSION="1.0.0"

echo -e "${GREEN}🚀 بدء نشر Stockly MCP Server${NC}"
echo "=================================="

# Check requirements
echo -e "${YELLOW}🔍 فحص المتطلبات...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js غير مثبت${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm غير مثبت${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker غير مثبت${NC}"
    exit 1
fi

echo -e "${GREEN}✅ المتطلبات متوفرة${NC}"

# Check .env file
echo -e "${YELLOW}🔧 فحص ملف الإعدادات...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}📝 إنشاء ملف .env من القالب...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  يرجى تعديل API_TOKEN في ملف .env${NC}"
    else
        echo -e "${RED}❌ ملف .env غير موجود${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

if [ -z "$API_TOKEN" ] || [ "$API_TOKEN" = "your_django_api_token_here" ]; then
    echo -e "${RED}❌ يرجى تعيين API_TOKEN في ملف .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ملف الإعدادات صحيح${NC}"

# Install dependencies
echo -e "${YELLOW}📦 تثبيت المتطلبات...${NC}"
npm install

# Run tests
echo -e "${YELLOW}🧪 تشغيل الاختبارات...${NC}"
if npm test; then
    echo -e "${GREEN}✅ جميع الاختبارات نجحت${NC}"
else
    echo -e "${RED}❌ فشل في الاختبارات${NC}"
    exit 1
fi

# Choose deployment method
echo -e "${YELLOW}📋 اختر طريقة النشر:${NC}"
echo "1) تشغيل محلي مع Node.js"
echo "2) تشغيل مع Docker"
echo "3) تشغيل مع Docker Compose"
echo "4) بناء Docker Image فقط"

read -p "أدخل اختيارك (1-4): " choice

case $choice in
    1)
        echo -e "${YELLOW}🚀 تشغيل مع Node.js...${NC}"
        echo -e "${GREEN}✅ تم التشغيل بنجاح${NC}"
        echo -e "${GREEN}🌐 MCP Server: http://localhost:3001${NC}"
        echo -e "${GREEN}⏹️  اضغط Ctrl+C لإيقاف الخادم${NC}"
        npm start
        ;;
    2)
        echo -e "${YELLOW}🐳 تشغيل مع Docker...${NC}"
        docker build -t $DOCKER_IMAGE:$VERSION .
        docker run -d \
            --name $PROJECT_NAME \
            -p 3001:3001 \
            -e DJANGO_BASE_URL=$DJANGO_BASE_URL \
            -e API_TOKEN=$API_TOKEN \
            -e NODE_ENV=production \
            $DOCKER_IMAGE:$VERSION
        
        echo -e "${GREEN}✅ تم التشغيل بنجاح${NC}"
        echo -e "${GREEN}🌐 MCP Server: http://localhost:3001${NC}"
        ;;
    3)
        echo -e "${YELLOW}🐳 تشغيل مع Docker Compose...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ تم التشغيل بنجاح${NC}"
        echo -e "${GREEN}🌐 MCP Server: http://localhost:3001${NC}"
        echo -e "${GREEN}🤖 n8n: http://localhost:5678${NC}"
        ;;
    4)
        echo -e "${YELLOW}🏗️  بناء Docker Image...${NC}"
        docker build -t $DOCKER_IMAGE:$VERSION .
        docker tag $DOCKER_IMAGE:$VERSION $DOCKER_IMAGE:latest
        echo -e "${GREEN}✅ تم بناء Docker Image بنجاح${NC}"
        echo -e "${GREEN}🐳 Image: $DOCKER_IMAGE:$VERSION${NC}"
        ;;
    *)
        echo -e "${RED}❌ اختيار غير صحيح${NC}"
        exit 1
        ;;
esac

# Display deployment info
echo -e "${GREEN}🎉 تم النشر بنجاح!${NC}"
echo "=================================="
echo -e "${GREEN}📊 معلومات النشر:${NC}"
echo "  المشروع: $PROJECT_NAME"
echo "  الإصدار: $VERSION"
echo "  Docker Image: $DOCKER_IMAGE:$VERSION"
echo "  Django URL: $DJANGO_BASE_URL"
echo ""
echo -e "${GREEN}🔗 الروابط:${NC}"
echo "  MCP Server: http://localhost:3001"
echo "  Health Check: http://localhost:3001/health"
echo ""
echo -e "${GREEN}📚 الأوامر المفيدة:${NC}"
echo "  عرض السجلات: docker logs $PROJECT_NAME"
echo "  إيقاف الخادم: docker stop $PROJECT_NAME"
echo "  إعادة التشغيل: docker restart $PROJECT_NAME"
echo "  حذف الخادم: docker rm $PROJECT_NAME"
echo ""
echo -e "${GREEN}🎯 للاستخدام مع n8n:${NC}"
echo "  1. استورد n8n_workflow_example.json"
echo "  2. اضبط MCP Server URL: http://localhost:3001"
echo "  3. ابدأ في استخدام المحاسب الذكي!"

echo -e "${GREEN}✨ تم النشر بنجاح!${NC}"
