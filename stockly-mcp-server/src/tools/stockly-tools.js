/**
 * Stockly MCP Tools
 * أدوات المحاسبة الذكية لنظام Stockly
 */

import axios from 'axios';
import { Config } from '../utils/config.js';
import { Logger } from '../utils/logger.js';

export class StocklyMCPTools {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.httpClient = axios.create({
      baseURL: this.config.djangoBaseUrl,
      timeout: this.config.requestTimeout,
      headers: this.config.getHeaders(),
    });

    // Available tools definition
    this.tools = [
      // Invoice Tools
      {
        name: 'create_invoice',
        description: 'إنشاء فاتورة جديدة',
        inputSchema: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'اسم العميل',
              default: 'عميل نقدي'
            }
          }
        }
      },
      {
        name: 'get_invoice',
        description: 'الحصول على تفاصيل الفاتورة',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'معرف الفاتورة'
            }
          },
          required: ['invoice_id']
        }
      },
      {
        name: 'add_item_to_invoice',
        description: 'إضافة منتج للفاتورة',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'معرف الفاتورة'
            },
            product_id: {
              type: 'number',
              description: 'معرف المنتج'
            },
            quantity: {
              type: 'number',
              description: 'الكمية',
              default: 1
            }
          },
          required: ['invoice_id', 'product_id']
        }
      },
      {
        name: 'confirm_invoice',
        description: 'تأكيد الفاتورة',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'معرف الفاتورة'
            }
          },
          required: ['invoice_id']
        }
      },
      {
        name: 'get_recent_invoices',
        description: 'الحصول على الفواتير الأخيرة',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'عدد الفواتير المطلوبة',
              default: 10
            }
          }
        }
      },
      {
        name: 'search_invoices',
        description: 'البحث في الفواتير',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'نص البحث'
            },
            limit: {
              type: 'number',
              description: 'عدد النتائج المطلوبة',
              default: 20
            }
          },
          required: ['query']
        }
      },

      // Customer Tools
      {
        name: 'get_customers',
        description: 'الحصول على قائمة العملاء',
        inputSchema: {
          type: 'object',
          properties: {
            search_query: {
              type: 'string',
              description: 'نص البحث (اختياري)'
            }
          }
        }
      },
      {
        name: 'add_customer',
        description: 'إضافة عميل جديد',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'اسم العميل'
            },
            phone: {
              type: 'string',
              description: 'رقم الهاتف'
            },
            email: {
              type: 'string',
              description: 'البريد الإلكتروني'
            },
            address: {
              type: 'string',
              description: 'العنوان'
            }
          },
          required: ['name']
        }
      },
      {
        name: 'get_customer_balance',
        description: 'الحصول على رصيد العميل',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'معرف العميل'
            }
          },
          required: ['customer_id']
        }
      },
      {
        name: 'get_customer_payments',
        description: 'الحصول على مدفوعات العميل',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'معرف العميل'
            }
          },
          required: ['customer_id']
        }
      },

      // Product Tools
      {
        name: 'get_products',
        description: 'الحصول على قائمة المنتجات',
        inputSchema: {
          type: 'object',
          properties: {
            search_query: {
              type: 'string',
              description: 'نص البحث (اختياري)'
            }
          }
        }
      },
      {
        name: 'add_product',
        description: 'إضافة منتج جديد',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'اسم المنتج'
            },
            category_id: {
              type: 'number',
              description: 'معرف الفئة'
            },
            price: {
              type: 'number',
              description: 'السعر'
            },
            stock_qty: {
              type: 'number',
              description: 'كمية المخزون',
              default: 0
            },
            unit: {
              type: 'string',
              description: 'الوحدة',
              default: 'piece'
            },
            description: {
              type: 'string',
              description: 'الوصف'
            }
          },
          required: ['name', 'category_id', 'price']
        }
      },
      {
        name: 'update_product_stock',
        description: 'تحديث كمية المخزون',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'معرف المنتج'
            },
            new_stock: {
              type: 'number',
              description: 'الكمية الجديدة'
            }
          },
          required: ['product_id', 'new_stock']
        }
      },

      // Category Tools
      {
        name: 'get_categories',
        description: 'الحصول على قائمة الفئات',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'add_category',
        description: 'إضافة فئة جديدة',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'اسم الفئة'
            },
            parent_id: {
              type: 'number',
              description: 'معرف الفئة الأب (اختياري)'
            }
          },
          required: ['name']
        }
      },

      // Payment Tools
      {
        name: 'create_payment',
        description: 'إنشاء دفعة جديدة',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'معرف العميل'
            },
            amount: {
              type: 'number',
              description: 'المبلغ'
            },
            payment_method: {
              type: 'string',
              description: 'طريقة الدفع',
              default: 'cash'
            },
            invoice_id: {
              type: 'number',
              description: 'معرف الفاتورة (اختياري)'
            },
            notes: {
              type: 'string',
              description: 'ملاحظات'
            }
          },
          required: ['customer_id', 'amount']
        }
      },
      {
        name: 'get_payments',
        description: 'الحصول على قائمة المدفوعات',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'عدد المدفوعات المطلوبة',
              default: 20
            }
          }
        }
      },

      // Report Tools
      {
        name: 'get_dashboard_stats',
        description: 'الحصول على إحصائيات لوحة التحكم',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_inventory_report',
        description: 'تقرير المخزون',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_sales_report',
        description: 'تقرير المبيعات',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'تاريخ البداية (YYYY-MM-DD)'
            },
            end_date: {
              type: 'string',
              description: 'تاريخ النهاية (YYYY-MM-DD)'
            }
          }
        }
      },

      // Return Tools
      {
        name: 'create_return',
        description: 'إنشاء مرتجع',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'معرف الفاتورة الأصلية'
            },
            items: {
              type: 'array',
              description: 'قائمة العناصر المرتجعة',
              items: {
                type: 'object',
                properties: {
                  item_id: {
                    type: 'number',
                    description: 'معرف العنصر'
                  },
                  qty_returned: {
                    type: 'number',
                    description: 'الكمية المرتجعة'
                  }
                }
              }
            },
            notes: {
              type: 'string',
              description: 'ملاحظات'
            }
          },
          required: ['invoice_id', 'items']
        }
      },
      {
        name: 'get_returns',
        description: 'الحصول على قائمة المرتجعات',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'عدد المرتجعات المطلوبة',
              default: 20
            }
          }
        }
      },
      {
        name: 'approve_return',
        description: 'الموافقة على المرتجع',
        inputSchema: {
          type: 'object',
          properties: {
            return_id: {
              type: 'number',
              description: 'معرف المرتجع'
            }
          },
          required: ['return_id']
        }
      },

      // System Tools
      {
        name: 'health_check',
        description: 'فحص صحة النظام',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_system_info',
        description: 'الحصول على معلومات النظام',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  getAvailableTools() {
    return this.tools;
  }

  async executeTool(toolName, args) {
    this.logger.infoAr(`تنفيذ الأداة: ${toolName}`, { args });

    try {
      switch (toolName) {
        // Invoice Tools
        case 'create_invoice':
          return await this.createInvoice(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'add_item_to_invoice':
          return await this.addItemToInvoice(args);
        case 'confirm_invoice':
          return await this.confirmInvoice(args);
        case 'get_recent_invoices':
          return await this.getRecentInvoices(args);
        case 'search_invoices':
          return await this.searchInvoices(args);

        // Customer Tools
        case 'get_customers':
          return await this.getCustomers(args);
        case 'add_customer':
          return await this.addCustomer(args);
        case 'get_customer_balance':
          return await this.getCustomerBalance(args);
        case 'get_customer_payments':
          return await this.getCustomerPayments(args);

        // Product Tools
        case 'get_products':
          return await this.getProducts(args);
        case 'add_product':
          return await this.addProduct(args);
        case 'update_product_stock':
          return await this.updateProductStock(args);

        // Category Tools
        case 'get_categories':
          return await this.getCategories(args);
        case 'add_category':
          return await this.addCategory(args);

        // Payment Tools
        case 'create_payment':
          return await this.createPayment(args);
        case 'get_payments':
          return await this.getPayments(args);

        // Report Tools
        case 'get_dashboard_stats':
          return await this.getDashboardStats(args);
        case 'get_inventory_report':
          return await this.getInventoryReport(args);
        case 'get_sales_report':
          return await this.getSalesReport(args);

        // Return Tools
        case 'create_return':
          return await this.createReturn(args);
        case 'get_returns':
          return await this.getReturns(args);
        case 'approve_return':
          return await this.approveReturn(args);

        // System Tools
        case 'health_check':
          return await this.healthCheck();
        case 'get_system_info':
          return await this.getSystemInfo();

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.logger.errorAr(`خطأ في تنفيذ الأداة ${toolName}:`, error);
      throw error;
    }
  }

  // ==================== Invoice Methods ====================

  async createInvoice(args) {
    const { customer_name = 'عميل نقدي' } = args;
    
    const response = await this.httpClient.post('/api/invoices/session', {
      customer_name
    });

    return {
      success: true,
      invoice_id: response.data.session_id,
      customer_id: response.data.customer_id,
      message: 'تم إنشاء الفاتورة بنجاح'
    };
  }

  async getInvoice(args) {
    const { invoice_id } = args;
    
    const response = await this.httpClient.get(`/api/invoices/${invoice_id}`);
    
    return {
      success: true,
      invoice: response.data
    };
  }

  async addItemToInvoice(args) {
    const { invoice_id, product_id, quantity = 1 } = args;
    
    const response = await this.httpClient.post(`/api/invoices/${invoice_id}/items`, {
      product_id,
      qty: quantity
    });

    return {
      success: true,
      message: 'تم إضافة المنتج للفاتورة'
    };
  }

  async confirmInvoice(args) {
    const { invoice_id } = args;
    
    const response = await this.httpClient.post(`/api/invoices/${invoice_id}/confirm`);

    return {
      success: true,
      message: 'تم تأكيد الفاتورة بنجاح'
    };
  }

  async getRecentInvoices(args) {
    const { limit = 10 } = args;
    
    const response = await this.httpClient.get('/api/invoices/recent', {
      params: { limit }
    });

    return {
      success: true,
      invoices: response.data
    };
  }

  async searchInvoices(args) {
    const { query, limit = 20 } = args;
    
    const response = await this.httpClient.get('/api/search-invoices/', {
      params: { query, limit }
    });

    return {
      success: true,
      invoices: response.data
    };
  }

  // ==================== Customer Methods ====================

  async getCustomers(args) {
    const { search_query = '' } = args;
    
    const response = await this.httpClient.get('/api/customers/', {
      params: search_query ? { search: search_query } : {}
    });

    return {
      success: true,
      customers: response.data
    };
  }

  async addCustomer(args) {
    const { name, phone = '', email = '', address = '' } = args;
    
    const response = await this.httpClient.post('/api/customers/add/', {
      name,
      phone,
      email,
      address
    });

    return {
      success: true,
      customer_id: response.data.id,
      message: 'تم إضافة العميل بنجاح'
    };
  }

  async getCustomerBalance(args) {
    const { customer_id } = args;
    
    const response = await this.httpClient.get(`/api/customers/${customer_id}/balance/`);

    return {
      success: true,
      balance: response.data
    };
  }

  async getCustomerPayments(args) {
    const { customer_id } = args;
    
    const response = await this.httpClient.get(`/api/customers/${customer_id}/payments/`);

    return {
      success: true,
      payments: response.data
    };
  }

  // ==================== Product Methods ====================

  async getProducts(args) {
    const { search_query = '' } = args;
    
    const response = await this.httpClient.get('/api/products/', {
      params: search_query ? { query: search_query } : {}
    });

    return {
      success: true,
      products: response.data
    };
  }

  async addProduct(args) {
    const { name, category_id, price, stock_qty = 0, unit = 'piece', description = '' } = args;
    
    const response = await this.httpClient.post('/api/products/add/', {
      name,
      category_id,
      price,
      stock_qty,
      unit,
      description
    });

    return {
      success: true,
      product_id: response.data.id,
      message: 'تم إضافة المنتج بنجاح'
    };
  }

  async updateProductStock(args) {
    const { product_id, new_stock } = args;
    
    const response = await this.httpClient.put(`/api/products/${product_id}/update/`, {
      stock_qty: new_stock
    });

    return {
      success: true,
      message: 'تم تحديث المخزون بنجاح'
    };
  }

  // ==================== Category Methods ====================

  async getCategories(args) {
    const response = await this.httpClient.get('/api/categories/');

    return {
      success: true,
      categories: response.data
    };
  }

  async addCategory(args) {
    const { name, parent_id } = args;
    
    const response = await this.httpClient.post('/api/categories/add/', {
      name,
      parent_id
    });

    return {
      success: true,
      category_id: response.data.id,
      message: 'تم إضافة الفئة بنجاح'
    };
  }

  // ==================== Payment Methods ====================

  async createPayment(args) {
    const { customer_id, amount, payment_method = 'cash', invoice_id, notes = '' } = args;
    
    const response = await this.httpClient.post('/api/payments/create/', {
      customer_id,
      amount,
      payment_method,
      invoice_id,
      notes
    });

    return {
      success: true,
      payment_id: response.data.id,
      message: 'تم إنشاء الدفعة بنجاح'
    };
  }

  async getPayments(args) {
    const { limit = 20 } = args;
    
    const response = await this.httpClient.get('/api/payments/', {
      params: { limit }
    });

    return {
      success: true,
      payments: response.data
    };
  }

  // ==================== Report Methods ====================

  async getDashboardStats(args) {
    const response = await this.httpClient.get('/api/dashboard/stats');

    return {
      success: true,
      stats: response.data
    };
  }

  async getInventoryReport(args) {
    const products = await this.getProducts({});
    
    if (!products.success) {
      throw new Error('Failed to get products for inventory report');
    }

    const totalProducts = products.products.length;
    const lowStock = products.products.filter(p => p.stock_qty < 10);
    const outOfStock = products.products.filter(p => p.stock_qty === 0);

    return {
      success: true,
      report: {
        total_products: totalProducts,
        low_stock_count: lowStock.length,
        out_of_stock_count: outOfStock.length,
        low_stock_products: lowStock,
        out_of_stock_products: outOfStock
      }
    };
  }

  async getSalesReport(args) {
    // For now, return dashboard stats as sales report
    // This can be enhanced with specific sales reporting endpoint
    return await this.getDashboardStats(args);
  }

  // ==================== Return Methods ====================

  async createReturn(args) {
    const { invoice_id, items, notes = '' } = args;
    
    const response = await this.httpClient.post('/api/returns/create/', {
      invoice_id,
      items,
      notes
    });

    return {
      success: true,
      return_id: response.data.id,
      message: 'تم إنشاء المرتجع بنجاح'
    };
  }

  async getReturns(args) {
    const { limit = 20 } = args;
    
    const response = await this.httpClient.get('/api/returns/', {
      params: { limit }
    });

    return {
      success: true,
      returns: response.data
    };
  }

  async approveReturn(args) {
    const { return_id } = args;
    
    const response = await this.httpClient.post(`/api/returns/${return_id}/approve/`);

    return {
      success: true,
      message: 'تم الموافقة على المرتجع بنجاح'
    };
  }

  // ==================== System Methods ====================

  async healthCheck() {
    try {
      const response = await this.httpClient.get('/api/dashboard/stats');
      
      return {
        status: 'healthy',
        message: 'النظام يعمل بشكل طبيعي',
        django_connection: 'ok',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'مشكلة في الاتصال بالنظام',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getSystemInfo() {
    return {
      name: 'Stockly MCP Server',
      version: '1.0.0',
      description: 'محاسب ذكي لنظام Stockly',
      django_url: this.config.djangoBaseUrl,
      available_tools: this.tools.length,
      timestamp: new Date().toISOString()
    };
  }

  async testConnection() {
    try {
      await this.httpClient.get('/api/dashboard/stats');
      this.logger.infoAr('تم اختبار الاتصال بـ Django بنجاح');
    } catch (error) {
      this.logger.errorAr('فشل في اختبار الاتصال بـ Django:', error);
      throw new Error(`Django connection failed: ${error.message}`);
    }
  }
}
