#!/usr/bin/env node

/**
 * Stockly MCP Server - Test Suite
 * اختبارات شاملة للنظام
 */

import { StocklyMCPTools } from './tools/stockly-tools.js';
import { Config } from './utils/config.js';
import { Logger } from './utils/logger.js';

class MCPTester {
  constructor() {
    this.config = new Config();
    this.logger = new Logger();
    this.tools = new StocklyMCPTools(this.config, this.logger);
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🧪 بدء اختبار Stockly MCP Server');
    console.log('=' .repeat(60));

    // Test configuration
    if (!this.config.validate()) {
      console.log('❌ فشل في التحقق من الإعدادات');
      return false;
    }

    try {
      // Test connection to Django
      await this.tools.testConnection();
      console.log('✅ اختبار الاتصال بـ Django نجح');
    } catch (error) {
      console.log(`❌ فشل في اختبار الاتصال بـ Django: ${error.message}`);
      return false;
    }

    // Run individual tests
    await this.testHealthCheck();
    await this.testSystemInfo();
    await this.testDashboardStats();
    await this.testCustomers();
    await this.testProducts();
    await this.testCategories();
    await this.testInvoices();
    await this.testPayments();
    await this.testReturns();

    // Display results
    this.printResults();
    return true;
  }

  async testHealthCheck() {
    console.log('\n🏥 اختبار فحص صحة النظام...');
    
    try {
      const result = await this.tools.healthCheck();
      if (result.status === 'healthy') {
        console.log('✅ فحص صحة النظام نجح');
        this.testResults.push({ name: 'health_check', success: true, result });
      } else {
        console.log(`❌ فحص صحة النظام فشل: ${result.message}`);
        this.testResults.push({ name: 'health_check', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في فحص صحة النظام: ${error.message}`);
      this.testResults.push({ name: 'health_check', success: false, error: error.message });
    }
  }

  async testSystemInfo() {
    console.log('\nℹ️  اختبار معلومات النظام...');
    
    try {
      const result = await this.tools.getSystemInfo();
      console.log(`✅ معلومات النظام: ${result.name} v${result.version}`);
      this.testResults.push({ name: 'system_info', success: true, result });
    } catch (error) {
      console.log(`❌ خطأ في معلومات النظام: ${error.message}`);
      this.testResults.push({ name: 'system_info', success: false, error: error.message });
    }
  }

  async testDashboardStats() {
    console.log('\n📊 اختبار إحصائيات لوحة التحكم...');
    
    try {
      const result = await this.tools.getDashboardStats({});
      if (result.success) {
        console.log('✅ إحصائيات لوحة التحكم تم الحصول عليها بنجاح');
        this.testResults.push({ name: 'dashboard_stats', success: true, result });
      } else {
        console.log(`❌ خطأ في إحصائيات لوحة التحكم: ${result.error}`);
        this.testResults.push({ name: 'dashboard_stats', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في إحصائيات لوحة التحكم: ${error.message}`);
      this.testResults.push({ name: 'dashboard_stats', success: false, error: error.message });
    }
  }

  async testCustomers() {
    console.log('\n👥 اختبار أدوات العملاء...');
    
    try {
      const result = await this.tools.getCustomers({});
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.customers.length} عميل`);
        this.testResults.push({ name: 'get_customers', success: true, count: result.customers.length });
      } else {
        console.log(`❌ خطأ في الحصول على العملاء: ${result.error}`);
        this.testResults.push({ name: 'get_customers', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات العملاء: ${error.message}`);
      this.testResults.push({ name: 'customers', success: false, error: error.message });
    }
  }

  async testProducts() {
    console.log('\n📦 اختبار أدوات المنتجات...');
    
    try {
      const result = await this.tools.getProducts({});
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.products.length} منتج`);
        this.testResults.push({ name: 'get_products', success: true, count: result.products.length });
      } else {
        console.log(`❌ خطأ في الحصول على المنتجات: ${result.error}`);
        this.testResults.push({ name: 'get_products', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات المنتجات: ${error.message}`);
      this.testResults.push({ name: 'products', success: false, error: error.message });
    }
  }

  async testCategories() {
    console.log('\n📂 اختبار أدوات الفئات...');
    
    try {
      const result = await this.tools.getCategories({});
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.categories.length} فئة`);
        this.testResults.push({ name: 'get_categories', success: true, count: result.categories.length });
      } else {
        console.log(`❌ خطأ في الحصول على الفئات: ${result.error}`);
        this.testResults.push({ name: 'get_categories', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات الفئات: ${error.message}`);
      this.testResults.push({ name: 'categories', success: false, error: error.message });
    }
  }

  async testInvoices() {
    console.log('\n🧾 اختبار أدوات الفواتير...');
    
    try {
      const result = await this.tools.getRecentInvoices({ limit: 5 });
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.invoices.length} فاتورة حديثة`);
        this.testResults.push({ name: 'get_recent_invoices', success: true, count: result.invoices.length });
      } else {
        console.log(`❌ خطأ في الحصول على الفواتير: ${result.error}`);
        this.testResults.push({ name: 'get_recent_invoices', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات الفواتير: ${error.message}`);
      this.testResults.push({ name: 'invoices', success: false, error: error.message });
    }
  }

  async testPayments() {
    console.log('\n💳 اختبار أدوات المدفوعات...');
    
    try {
      const result = await this.tools.getPayments({ limit: 5 });
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.payments.length} دفعة`);
        this.testResults.push({ name: 'get_payments', success: true, count: result.payments.length });
      } else {
        console.log(`❌ خطأ في الحصول على المدفوعات: ${result.error}`);
        this.testResults.push({ name: 'get_payments', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات المدفوعات: ${error.message}`);
      this.testResults.push({ name: 'payments', success: false, error: error.message });
    }
  }

  async testReturns() {
    console.log('\n🔄 اختبار أدوات المرتجعات...');
    
    try {
      const result = await this.tools.getReturns({ limit: 5 });
      if (result.success) {
        console.log(`✅ تم الحصول على ${result.returns.length} مرتجع`);
        this.testResults.push({ name: 'get_returns', success: true, count: result.returns.length });
      } else {
        console.log(`❌ خطأ في الحصول على المرتجعات: ${result.error}`);
        this.testResults.push({ name: 'get_returns', success: false, result });
      }
    } catch (error) {
      console.log(`❌ خطأ في أدوات المرتجعات: ${error.message}`);
      this.testResults.push({ name: 'returns', success: false, error: error.message });
    }
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('📋 نتائج الاختبارات');
    console.log('=' .repeat(60));

    let passed = 0;
    let failed = 0;

    this.testResults.forEach(({ name, success, error, count }) => {
      const status = success ? '✅ نجح' : '❌ فشل';
      console.log(`${name.padEnd(25)} | ${status}`);
      
      if (count !== undefined) {
        console.log(`${' '.repeat(25)} |   العدد: ${count}`);
      }
      
      if (!success && error) {
        console.log(`${' '.repeat(25)} |   ${error}`);
      }

      if (success) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log('-'.repeat(60));
    console.log(`إجمالي الاختبارات: ${this.testResults.length}`);
    console.log(`نجح: ${passed}`);
    console.log(`فشل: ${failed}`);
    console.log(`نسبة النجاح: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 جميع الاختبارات نجحت! الخادم جاهز للاستخدام.');
    } else {
      console.log(`\n⚠️  ${failed} اختبار فشل. راجع الأخطاء أعلاه.`);
    }

    console.log('=' .repeat(60));
  }
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('خطأ في تشغيل الاختبارات:', error);
  process.exit(1);
});
