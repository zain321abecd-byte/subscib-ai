import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../notifications/email.service';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

@Injectable()
export class WhatsappAgentToolsService {
  private readonly logger = new Logger(WhatsappAgentToolsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Gemini Tool Declarations for full assistant operations
   */
  getToolDeclarations(): { functionDeclarations: ToolDefinition[] } {
    return {
      functionDeclarations: [
        {
          name: 'get_sales_summary',
          description:
            'Get revenue and sales statistics for SubscribAI. Call this when asked about sales, revenue, earnings, or performance.',
          parameters: {
            type: 'OBJECT',
            properties: {
              period: {
                type: 'STRING',
                enum: ['today', 'yesterday', 'this_week', 'this_month', 'all_time'],
                description: 'Time period to calculate sales for (default: today)',
              },
            },
          },
        },
        {
          name: 'list_sales',
          description:
            'List recent sales or search sales records by customer name, phone, or product.',
          parameters: {
            type: 'OBJECT',
            properties: {
              search: {
                type: 'STRING',
                description: 'Optional customer name, phone, or product to filter by',
              },
              limit: {
                type: 'INTEGER',
                description: 'Number of records to return (default: 10)',
              },
            },
          },
        },
        {
          name: 'record_sale',
          description:
            'Add/record a new customer subscription sale. Call this when asked to add a sale, log a sale, or record a customer purchase.',
          parameters: {
            type: 'OBJECT',
            properties: {
              customer_name: {
                type: 'STRING',
                description: 'Full name of the customer',
              },
              customer_phone: {
                type: 'STRING',
                description: 'WhatsApp/Phone number of the customer with country code (e.g. +923001234567 or 923001234567)',
              },
              product_name: {
                type: 'STRING',
                description: 'Name of the product (e.g. ChatGPT Plus, Netflix 4K, Canva Pro, Gemini Advanced)',
              },
              sale_price: {
                type: 'NUMBER',
                description: 'Price charged to the customer',
              },
              currency: {
                type: 'STRING',
                description: 'Currency of the sale (PKR or USD, default PKR)',
              },
              duration_days: {
                type: 'INTEGER',
                description: 'Subscription duration in days (default: 30 for 1 month)',
              },
              payment_method: {
                type: 'STRING',
                description: 'Payment method used (e.g. JazzCash, EasyPaisa, Bank, Card, WhatsApp)',
              },
              notes: {
                type: 'STRING',
                description: 'Optional admin notes or account details',
              },
            },
            required: ['customer_name', 'customer_phone', 'product_name', 'sale_price'],
          },
        },
        {
          name: 'get_orders_summary',
          description: 'Get total orders breakdown and counts by status (pending, paid, delivered, etc.).',
          parameters: {
            type: 'OBJECT',
            properties: {},
          },
        },
        {
          name: 'list_orders',
          description: 'Search or list recent store orders by status, customer name, phone, email, or order number.',
          parameters: {
            type: 'OBJECT',
            properties: {
              search: {
                type: 'STRING',
                description: 'Order number (e.g. #1002), customer name, email, or phone',
              },
              status: {
                type: 'STRING',
                enum: ['pending', 'paid', 'delivered', 'cancelled'],
                description: 'Filter orders by status',
              },
              limit: {
                type: 'INTEGER',
                description: 'Max number of orders to return (default 10)',
              },
            },
          },
        },
        {
          name: 'update_order_status',
          description: 'Update an order status (e.g. mark as paid, delivered, or cancelled).',
          parameters: {
            type: 'OBJECT',
            properties: {
              order_identifier: {
                type: 'STRING',
                description: 'The order number (e.g. 1002 or ORD-1002) or order UUID',
              },
              new_status: {
                type: 'STRING',
                enum: ['pending', 'paid', 'delivered', 'cancelled'],
                description: 'The new status to set for the order',
              },
              notes: {
                type: 'STRING',
                description: 'Optional internal note about the update',
              },
            },
            required: ['order_identifier', 'new_status'],
          },
        },
        {
          name: 'list_products',
          description: 'List store products, prices, and stock status.',
          parameters: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                description: 'Optional category filter (e.g. AI Tools, Streaming, Productivity)',
              },
            },
          },
        },
        {
          name: 'update_product',
          description: 'Update a product price or stock availability.',
          parameters: {
            type: 'OBJECT',
            properties: {
              product_name_or_id: {
                type: 'STRING',
                description: 'The product slug id or name (e.g. chatgpt-plus, canva-pro)',
              },
              price: {
                type: 'NUMBER',
                description: 'New price for the product',
              },
              in_stock: {
                type: 'BOOLEAN',
                description: 'Set true if product is in stock, false if out of stock',
              },
            },
            required: ['product_name_or_id'],
          },
        },
        {
          name: 'get_upcoming_renewals',
          description: 'Find customer subscriptions expiring soon that need renewal reminders or attention.',
          parameters: {
            type: 'OBJECT',
            properties: {
              days_ahead: {
                type: 'INTEGER',
                description: 'Look for expirations within this many days (default: 7)',
              },
            },
          },
        },
        {
          name: 'search_customer',
          description: 'Look up a customer history, phone, email, orders, and active subscriptions across the database.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: {
                type: 'STRING',
                description: 'Customer phone number, email, or name to search for',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'send_email',
          description:
            'Send an email to a customer, admin, or any recipient. Call this whenever the user asks to send an email, email a customer, or test email sending.',
          parameters: {
            type: 'OBJECT',
            properties: {
              to: {
                type: 'STRING',
                description: 'Recipient email address (e.g. customer@example.com or amirmehboob921@gmail.com)',
              },
              subject: {
                type: 'STRING',
                description: 'Subject line of the email',
              },
              body: {
                type: 'STRING',
                description: 'The body/message content of the email',
              },
            },
            required: ['to', 'subject', 'body'],
          },
        },
        {
          name: 'export_customers_csv',
          description:
            'Export all customer subscription and sales database records into a CSV file. Always call this when asked for a CSV, spreadsheet, customer export, or sales export. It provides an instant direct download link and emails the CSV file with attachment.',
          parameters: {
            type: 'OBJECT',
            properties: {
              email_to: {
                type: 'STRING',
                description: 'Optional email address to send the CSV file to (defaults to admin email amirmehboob921@gmail.com)',
              },
            },
          },
        },
      ],
    };
  }

  /**
   * Anthropic Claude Tool Declarations (converts Gemini function declarations to input_schema format)
   */
  getClaudeTools(): ClaudeToolDefinition[] {
    const { functionDeclarations } = this.getToolDeclarations();
    return functionDeclarations.map((fn) => {
      const rawProps = fn.parameters?.properties || {};
      const convertedProps: Record<string, any> = {};

      for (const [propName, propVal] of Object.entries(rawProps)) {
        const typeStr = (propVal.type || 'string').toLowerCase();
        let schemaType = 'string';
        if (typeStr === 'integer') schemaType = 'integer';
        else if (typeStr === 'number') schemaType = 'number';
        else if (typeStr === 'boolean') schemaType = 'boolean';
        else if (typeStr === 'array') schemaType = 'array';
        else if (typeStr === 'object') schemaType = 'object';

        convertedProps[propName] = {
          ...propVal,
          type: schemaType,
        };
      }

      return {
        name: fn.name,
        description: fn.description,
        input_schema: {
          type: 'object',
          properties: convertedProps,
          ...(fn.parameters?.required && fn.parameters.required.length > 0
            ? { required: fn.parameters.required }
            : {}),
        },
      };
    });
  }

  /**
   * Execute any tool requested by Gemini or Claude
   */
  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    this.logger.log(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
    try {
      switch (name) {
        case 'get_sales_summary':
          return await this.getSalesSummary(args.period || 'today');
        case 'list_sales':
          return await this.listSales(args.search, args.limit);
        case 'record_sale':
          return await this.recordSale(args as any);
        case 'get_orders_summary':
          return await this.getOrdersSummary();
        case 'list_orders':
          return await this.listOrders(args.search, args.status, args.limit);
        case 'update_order_status':
          return await this.updateOrderStatus(args.order_identifier, args.new_status, args.notes);
        case 'list_products':
          return await this.listProducts(args.category);
        case 'update_product':
          return await this.updateProduct(args.product_name_or_id, args.price, args.in_stock);
        case 'get_upcoming_renewals':
          return await this.getUpcomingRenewals(args.days_ahead || 7);
        case 'search_customer':
          return await this.searchCustomer(args.query);
        case 'send_email':
          return await this.sendEmail(args.to, args.subject, args.body);
        case 'export_customers_csv':
          return await this.exportCustomersCsv(args.email_to);
        default:
          return { error: `Tool ${name} is not implemented.` };
      }
    } catch (err: any) {
      this.logger.error(`Error executing tool ${name}: ${err.message}`);
      return { error: err.message };
    }
  }

  // ── Tool Implementations ──────────────────────────────────────────────────

  private async getSalesSummary(period: string) {
    const today = new Date().toISOString().slice(0, 10);
    let startDate = today;

    if (period === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      startDate = d.toISOString().slice(0, 10);
    } else if (period === 'this_week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().slice(0, 10);
    } else if (period === 'this_month') {
      const d = new Date();
      d.setDate(1);
      startDate = d.toISOString().slice(0, 10);
    } else if (period === 'all_time') {
      startDate = '2000-01-01';
    }

    let query = this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, product_name, sale_price, currency, status, sale_date');

    if (period === 'yesterday') {
      query = query.eq('sale_date', startDate);
    } else if (period !== 'all_time') {
      query = query.gte('sale_date', startDate);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const sales = data || [];
    const totalCount = sales.length;
    let totalPkr = 0;
    let totalUsd = 0;
    const productCounts: Record<string, number> = {};

    for (const s of sales) {
      const price = Number(s.sale_price) || 0;
      if (s.currency === 'USD') totalUsd += price;
      else totalPkr += price;

      const pName = s.product_name || 'Other';
      productCounts[pName] = (productCounts[pName] || 0) + 1;
    }

    return {
      period,
      totalSalesCount: totalCount,
      totalRevenuePkr: totalPkr,
      totalRevenueUsd: totalUsd,
      topProducts: Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ product: name, salesCount: count })),
      recentSalesSnippet: sales.slice(0, 5).map((s) => ({
        product: s.product_name,
        price: `${s.sale_price} ${s.currency}`,
        date: s.sale_date,
      })),
    };
  }

  private async listSales(search?: string, limit = 10) {
    let query = this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, customer_phone, product_name, plan_name, sale_price, currency, sale_date, expiry_date, status')
      .order('sale_date', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,product_name.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data?.length || 0, sales: data || [] };
  }

  private async recordSale(args: {
    customer_name: string;
    customer_phone: string;
    product_name: string;
    sale_price: number;
    currency?: string;
    duration_days?: number;
    payment_method?: string;
    notes?: string;
  }) {
    const duration = args.duration_days || 30;
    const saleDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(saleDate.getDate() + duration);

    const renewDate = new Date(expiryDate);
    renewDate.setDate(expiryDate.getDate() - 3);

    const payload = {
      customer_name: args.customer_name.trim(),
      customer_phone: args.customer_phone.trim(),
      product_name: args.product_name.trim(),
      sale_price: Number(args.sale_price),
      currency: (args.currency || 'PKR').toUpperCase(),
      sale_date: saleDate.toISOString().slice(0, 10),
      expiry_date: expiryDate.toISOString().slice(0, 10),
      renew_date: renewDate.toISOString().slice(0, 10),
      status: 'active',
      payment_method: args.payment_method || 'WhatsApp',
      notes: args.notes || 'Recorded via WhatsApp Assistant',
    };

    const { data, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      success: true,
      message: `Sale successfully recorded for ${payload.customer_name} (${payload.product_name})!`,
      sale: data,
    };
  }

  private async getOrdersSummary() {
    const { data, error } = await this.supabase
      .admin()
      .from('orders')
      .select('status, subtotal_pkr, subtotal_usd');

    if (error) throw new Error(error.message);
    const orders = data || [];

    const breakdown: Record<string, number> = {};
    let totalPkr = 0;

    for (const o of orders) {
      breakdown[o.status] = (breakdown[o.status] || 0) + 1;
      totalPkr += Number(o.subtotal_pkr) || 0;
    }

    return {
      totalOrders: orders.length,
      statusBreakdown: breakdown,
      totalVolumePkr: totalPkr,
    };
  }

  private async listOrders(search?: string, status?: string, limit = 10) {
    let query = this.supabase
      .admin()
      .from('orders')
      .select('id, order_number, customer_name, customer_email, customer_phone, items, subtotal_pkr, subtotal_usd, status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      const clean = search.replace('#', '').trim();
      query = query.or(`order_number.ilike.%${clean}%,customer_name.ilike.%${clean}%,customer_email.ilike.%${clean}%,customer_phone.ilike.%${clean}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data?.length || 0, orders: data || [] };
  }

  private async updateOrderStatus(identifier: string, newStatus: string, notes?: string) {
    const clean = identifier.replace('#', '').trim();
    let query = this.supabase.admin().from('orders').select('id, order_number, status');

    if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(clean)) {
      query = query.eq('id', clean);
    } else {
      query = query.eq('order_number', clean);
    }

    const { data: existing, error: findErr } = await query.single();
    if (findErr || !existing) {
      throw new Error(`Order ${identifier} not found.`);
    }

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (notes) updatePayload.notes = notes;
    if (newStatus === 'delivered') updatePayload.delivered_at = new Date().toISOString();

    const { error: updErr } = await this.supabase
      .admin()
      .from('orders')
      .update(updatePayload)
      .eq('id', existing.id);

    if (updErr) throw new Error(updErr.message);

    return {
      success: true,
      message: `Order #${existing.order_number} status updated from ${existing.status} to ${newStatus}.`,
    };
  }

  private async listProducts(category?: string) {
    let query = this.supabase
      .admin()
      .from('products')
      .select('id, name, price, category, in_stock, tag')
      .order('sort_order', { ascending: true });

    if (category) query = query.ilike('category', `%${category}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { count: data?.length || 0, products: data || [] };
  }

  private async updateProduct(productNameOrId: string, price?: number, inStock?: boolean) {
    const clean = productNameOrId.trim();
    const { data: products, error: findErr } = await this.supabase
      .admin()
      .from('products')
      .select('id, name, price, in_stock')
      .or(`id.eq.${clean},name.ilike.%${clean}%`)
      .limit(1);

    if (findErr || !products || products.length === 0) {
      throw new Error(`Product '${productNameOrId}' not found.`);
    }

    const target = products[0];
    const updateData: Record<string, any> = {};
    if (price !== undefined) updateData.price = Number(price);
    if (inStock !== undefined) updateData.in_stock = Boolean(inStock);

    const { error: updErr } = await this.supabase
      .admin()
      .from('products')
      .update(updateData)
      .eq('id', target.id);

    if (updErr) throw new Error(updErr.message);

    return {
      success: true,
      message: `Product '${target.name}' updated!`,
      details: { ...target, ...updateData },
    };
  }

  private async getUpcomingRenewals(daysAhead = 7) {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureDate = future.toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, customer_phone, product_name, sale_price, expiry_date, renew_date, status')
      .gte('expiry_date', today)
      .lte('expiry_date', futureDate)
      .order('expiry_date', { ascending: true });

    if (error) throw new Error(error.message);
    return {
      count: data?.length || 0,
      daysAhead,
      expiringSubscriptions: data || [],
    };
  }

  private async searchCustomer(query: string) {
    const clean = query.trim();
    const [salesRes, ordersRes] = await Promise.all([
      this.supabase
        .admin()
        .from('subscription_sales')
        .select('*')
        .or(`customer_name.ilike.%${clean}%,customer_phone.ilike.%${clean}%,customer_email.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(5),
      this.supabase
        .admin()
        .from('orders')
        .select('*')
        .or(`customer_name.ilike.%${clean}%,customer_phone.ilike.%${clean}%,customer_email.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    return {
      customerQuery: clean,
      sales: salesRes.data || [],
      orders: ordersRes.data || [],
    };
  }

  private async sendEmail(to: string, subject: string, body: string) {
    const cleanTo = (to || '').trim();
    const cleanSubj = (subject || '').trim();
    const cleanBody = (body || '').trim();

    if (!cleanTo || !cleanSubj || !cleanBody) {
      throw new Error('Recipient email (to), subject, and body are required.');
    }

    try {
      const res = await this.emailService.sendEmail({
        to: cleanTo,
        subject: cleanSubj,
        text: cleanBody,
        html: `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5; margin-top: 0;">SubscribAI</h2>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
            ${cleanBody.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
            Sent by SubscribAI Assistant on WhatsApp.
          </p>
        </div>`,
        emailType: 'agent_whatsapp',
      });

      return {
        success: true,
        message: `Email successfully sent to ${cleanTo} with subject "${cleanSubj}"!`,
        result: res,
      };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${cleanTo}: ${err.message}`);
      return {
        success: false,
        error: `Could not send email: ${err.message}`,
      };
    }
  }

  async generateCustomersCsv(): Promise<string> {
    const { data: sales, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Customer Name',
      'Phone Number',
      'Email',
      'Product',
      'Plan',
      'Price',
      'Currency',
      'Duration (Days)',
      'Payment Method',
      'Status',
      'Sale Date',
      'Expiry Date',
    ];

    const rows = (sales || []).map((s) =>
      [
        escapeCsv(s.customer_name),
        escapeCsv(s.customer_phone),
        escapeCsv(s.customer_email),
        escapeCsv(s.product_name),
        escapeCsv(s.plan_name || 'Standard'),
        escapeCsv(s.sale_price),
        escapeCsv(s.currency || 'PKR'),
        escapeCsv(s.duration_days || 30),
        escapeCsv(s.payment_method || 'WhatsApp'),
        escapeCsv(s.status || 'active'),
        escapeCsv(s.created_at ? s.created_at.slice(0, 10) : ''),
        escapeCsv(s.expiry_date || ''),
      ].join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  async exportCustomersCsv(emailTo?: string) {
    const csvContent = await this.generateCustomersCsv();
    const rowsCount = csvContent.split('\n').length - 1;

    const targetEmail = (emailTo || 'amirmehboob921@gmail.com').trim();
    const apiUrl = process.env.API_URL || process.env.PAYFAST_PUBLIC_API_URL || 'https://subscribai-api.onrender.com';
    const token = process.env.INTERNAL_API_TOKEN || '';
    const downloadUrl = `${apiUrl}/whatsapp-agent/export-customers.csv?token=${token}`;

    let emailSent = false;
    let emailDetail = '';

    try {
      await this.emailService.sendEmail({
        to: targetEmail,
        subject: `SubscribAI - Customer & Sales CSV Export (${new Date().toLocaleDateString()})`,
        text: `Attached is your complete SubscribAI customer and sales database export (${rowsCount} records).\n\nYou can also download it anytime here:\n${downloadUrl}`,
        html: `<div style="font-family: Arial, sans-serif; font-size: 15px; color: #222; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5; margin-top: 0;">SubscribAI Customer Database Export</h2>
          <p>Here is your complete customer and subscription sales CSV export with <strong>${rowsCount} records</strong>.</p>
          <div style="margin: 20px 0;">
            <a href="${downloadUrl}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Download Customers CSV
            </a>
          </div>
          <p style="font-size: 13px; color: #666;">The CSV file is also attached to this email so you can open it directly in Excel.</p>
        </div>`,
        attachments: [
          {
            filename: 'subscribai_customers.csv',
            content: Buffer.from(csvContent, 'utf-8'),
          },
        ],
        emailType: 'agent_whatsapp_export',
      });
      emailSent = true;
      emailDetail = `Emailed CSV file with attachment to ${targetEmail}`;
    } catch (err: any) {
      emailDetail = `Email delivery notice: ${err.message}`;
    }

    return {
      success: true,
      totalCustomers: rowsCount,
      downloadUrl,
      emailedTo: targetEmail,
      emailSent,
      message: `Generated complete CSV with ${rowsCount} customer records. ${emailDetail}. Direct download link: ${downloadUrl}`,
    };
  }
}

