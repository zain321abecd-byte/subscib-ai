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

// ── Pending Confirmation Store ────────────────────────────────────────────
export interface PendingAction {
  actionId: string;
  agentId: string;
  phone: string;
  toolName: string;
  args: Record<string, any>;
  description: string;
  createdAt: number;
}

// Tools that require two-step confirmation before execution
const CONFIRMATION_REQUIRED_TOOLS = new Set([
  'delete_sale',
  'restore_sale',
  'create_coupon',
  'toggle_coupon',
  'update_payable_payment',
  'update_receivable_payment',
]);

@Injectable()
export class WhatsappAgentToolsService {
  private readonly logger = new Logger(WhatsappAgentToolsService.name);
  private readonly pendingActions = new Map<string, PendingAction>();
  private readonly PENDING_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly supabase: SupabaseService,
    private readonly emailService: EmailService,
  ) {
    // Cleanup expired pending actions every 60 seconds
    setInterval(() => this.cleanupExpiredPending(), 60000);
  }

  // ── Pending Action Management ──────────────────────────────────────────

  private cleanupExpiredPending() {
    const now = Date.now();
    for (const [id, action] of this.pendingActions) {
      if (now - action.createdAt > this.PENDING_TTL_MS) {
        this.pendingActions.delete(id);
      }
    }
  }

  stageAction(agentId: string, phone: string, toolName: string, args: Record<string, any>, description: string): string {
    const actionId = `ACT-${Date.now().toString(36).toUpperCase()}`;
    this.pendingActions.set(actionId, {
      actionId,
      agentId,
      phone,
      toolName,
      args,
      description,
      createdAt: Date.now(),
    });
    return actionId;
  }

  getPendingAction(actionId: string, phone: string): PendingAction | null {
    const action = this.pendingActions.get(actionId);
    if (!action) return null;
    if (Date.now() - action.createdAt > this.PENDING_TTL_MS) {
      this.pendingActions.delete(actionId);
      return null;
    }
    if (action.phone !== phone) return null;
    return action;
  }

  async confirmAction(actionId: string, phone: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const action = this.getPendingAction(actionId, phone);
    if (!action) {
      return { success: false, error: `Action ${actionId} not found, expired (5 min limit), or belongs to a different user.` };
    }
    this.pendingActions.delete(actionId);
    try {
      const result = await this.executeToolDirect(action.toolName, action.args);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  cancelAction(actionId: string, phone: string): boolean {
    const action = this.getPendingAction(actionId, phone);
    if (!action) return false;
    this.pendingActions.delete(actionId);
    return true;
  }

  isConfirmationRequired(toolName: string): boolean {
    return CONFIRMATION_REQUIRED_TOOLS.has(toolName);
  }

  /**
   * Gemini Tool Declarations — 28 tools for complete business automation
   */
  getToolDeclarations(): { functionDeclarations: ToolDefinition[] } {
    return {
      functionDeclarations: [
        // ── Sales ──────────────────────────────────────────────────────
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
                description: 'WhatsApp/Phone number of the customer with country code (e.g. +923001234567)',
              },
              product_name: {
                type: 'STRING',
                description: 'Name of the product (e.g. ChatGPT Plus, Netflix 4K, Canva Pro)',
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
          name: 'delete_sale',
          description:
            'Soft-delete a subscription sale (moves it to Deleted Sales for audit). Requires confirmation. Provide sale ID (UUID) or customer name to find a sale.',
          parameters: {
            type: 'OBJECT',
            properties: {
              sale_id: {
                type: 'STRING',
                description: 'UUID of the sale to delete',
              },
              reason: {
                type: 'STRING',
                description: 'Reason for deleting the sale (required for audit)',
              },
            },
            required: ['sale_id', 'reason'],
          },
        },
        // ── Deleted Sales ─────────────────────────────────────────────
        {
          name: 'list_deleted_sales',
          description: 'View soft-deleted subscription sales (audit trail). Shows sales that were removed from the daily ledger.',
          parameters: {
            type: 'OBJECT',
            properties: {
              limit: {
                type: 'INTEGER',
                description: 'Number of deleted records to return (default: 10)',
              },
            },
          },
        },
        {
          name: 'restore_sale',
          description: 'Restore a previously deleted sale back to the active Daily Sales ledger. Requires confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              sale_id: {
                type: 'STRING',
                description: 'UUID of the deleted sale to restore',
              },
            },
            required: ['sale_id'],
          },
        },
        // ── Orders ────────────────────────────────────────────────────
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
        // ── Products ──────────────────────────────────────────────────
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
        // ── Renewals ──────────────────────────────────────────────────
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
        // ── Customer ──────────────────────────────────────────────────
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
        // ── Account Book: Payables ────────────────────────────────────
        {
          name: 'get_account_book_summary',
          description:
            'Get a summary of the Account Book — total payables (money owed to vendors), total receivables (money owed by customers), and net balance.',
          parameters: {
            type: 'OBJECT',
            properties: {},
          },
        },
        {
          name: 'list_payables',
          description: 'List vendor payable bills (money you owe vendors/suppliers). Can filter by status or vendor name.',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: {
                type: 'STRING',
                enum: ['pending', 'partial', 'paid'],
                description: 'Filter by payment status',
              },
              vendor_name: {
                type: 'STRING',
                description: 'Filter by vendor name',
              },
              limit: {
                type: 'INTEGER',
                description: 'Max records to return (default 15)',
              },
            },
          },
        },
        {
          name: 'record_payable',
          description: 'Record a new vendor payable (a bill you owe to a supplier/vendor).',
          parameters: {
            type: 'OBJECT',
            properties: {
              vendor_name: {
                type: 'STRING',
                description: 'Name of the vendor or supplier',
              },
              description: {
                type: 'STRING',
                description: 'What the bill is for (product/service)',
              },
              amount: {
                type: 'NUMBER',
                description: 'Total payable amount',
              },
              currency: {
                type: 'STRING',
                description: 'Currency (PKR or USD, default PKR)',
              },
              due_date: {
                type: 'STRING',
                description: 'Payment due date (YYYY-MM-DD)',
              },
              vendor_contact: {
                type: 'STRING',
                description: 'Vendor phone, WhatsApp, or email',
              },
              notes: {
                type: 'STRING',
                description: 'Optional notes',
              },
            },
            required: ['vendor_name', 'amount'],
          },
        },
        {
          name: 'update_payable_payment',
          description: 'Record a payment toward a vendor payable bill. Updates the paid amount. Requires confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              payable_id: {
                type: 'STRING',
                description: 'UUID of the payable record',
              },
              payment_amount: {
                type: 'NUMBER',
                description: 'Amount being paid now',
              },
              notes: {
                type: 'STRING',
                description: 'Payment notes (e.g. payment method, transaction ref)',
              },
            },
            required: ['payable_id', 'payment_amount'],
          },
        },
        // ── Account Book: Receivables ─────────────────────────────────
        {
          name: 'list_receivables',
          description: 'List customer receivable invoices (money customers owe you). Can filter by status or customer name.',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: {
                type: 'STRING',
                enum: ['pending', 'partial', 'paid'],
                description: 'Filter by collection status',
              },
              customer_name: {
                type: 'STRING',
                description: 'Filter by customer name',
              },
              limit: {
                type: 'INTEGER',
                description: 'Max records to return (default 15)',
              },
            },
          },
        },
        {
          name: 'record_receivable',
          description: 'Record a new customer receivable (an invoice / money a customer owes you).',
          parameters: {
            type: 'OBJECT',
            properties: {
              customer_name: {
                type: 'STRING',
                description: 'Customer name',
              },
              customer_phone: {
                type: 'STRING',
                description: 'Customer phone/WhatsApp number',
              },
              product_name: {
                type: 'STRING',
                description: 'Product or service the invoice is for',
              },
              amount: {
                type: 'NUMBER',
                description: 'Total receivable amount',
              },
              currency: {
                type: 'STRING',
                description: 'Currency (PKR or USD, default PKR)',
              },
              due_date: {
                type: 'STRING',
                description: 'Payment due date (YYYY-MM-DD)',
              },
              invoice_no: {
                type: 'STRING',
                description: 'Optional invoice/reference number',
              },
              notes: {
                type: 'STRING',
                description: 'Optional notes',
              },
            },
            required: ['customer_name', 'amount'],
          },
        },
        {
          name: 'update_receivable_payment',
          description: 'Record a payment received from a customer toward an outstanding receivable. Requires confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              receivable_id: {
                type: 'STRING',
                description: 'UUID of the receivable record',
              },
              payment_amount: {
                type: 'NUMBER',
                description: 'Amount received now',
              },
              notes: {
                type: 'STRING',
                description: 'Payment notes (e.g. payment method, transaction ref)',
              },
            },
            required: ['receivable_id', 'payment_amount'],
          },
        },
        // ── Coupons ───────────────────────────────────────────────────
        {
          name: 'list_coupons',
          description: 'List all promo/coupon codes with their discount type, value, usage, and status.',
          parameters: {
            type: 'OBJECT',
            properties: {
              active_only: {
                type: 'BOOLEAN',
                description: 'If true, only show active coupons (default: false, show all)',
              },
            },
          },
        },
        {
          name: 'create_coupon',
          description: 'Create a new promo/coupon code. Requires confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              code: {
                type: 'STRING',
                description: 'Coupon code (e.g. SAVE20, WELCOME, FLAT500). Auto-uppercased.',
              },
              discount_type: {
                type: 'STRING',
                enum: ['percent', 'fixed'],
                description: 'Discount type: percent (% off) or fixed (PKR off)',
              },
              value: {
                type: 'NUMBER',
                description: 'Discount value (e.g. 20 for 20% off, or 500 for PKR 500 off)',
              },
              max_uses: {
                type: 'INTEGER',
                description: 'Maximum number of times this coupon can be redeemed (omit for unlimited)',
              },
              expires_at: {
                type: 'STRING',
                description: 'Expiry date/time in ISO format or YYYY-MM-DD (omit for never)',
              },
              note: {
                type: 'STRING',
                description: 'Admin memo about the coupon purpose',
              },
            },
            required: ['code', 'discount_type', 'value'],
          },
        },
        {
          name: 'toggle_coupon',
          description: 'Activate or deactivate a coupon code. Requires confirmation.',
          parameters: {
            type: 'OBJECT',
            properties: {
              coupon_code: {
                type: 'STRING',
                description: 'The coupon code to toggle (e.g. SAVE20)',
              },
              active: {
                type: 'BOOLEAN',
                description: 'Set true to activate, false to deactivate',
              },
            },
            required: ['coupon_code', 'active'],
          },
        },
        // ── Stock & Inventory ─────────────────────────────────────────
        {
          name: 'list_stock_items',
          description: 'List supplier stock/inventory items with quantities, expiry dates, and status.',
          parameters: {
            type: 'OBJECT',
            properties: {
              status: {
                type: 'STRING',
                enum: ['active', 'expiringSoon', 'expired', 'renewed'],
                description: 'Filter by stock status',
              },
              category: {
                type: 'STRING',
                description: 'Filter by category (e.g. AI Tools, Streaming)',
              },
              limit: {
                type: 'INTEGER',
                description: 'Max records to return (default 15)',
              },
            },
          },
        },
        {
          name: 'get_expiring_stock',
          description: 'Get supplier stock items expiring within a specified number of days. Use for inventory planning.',
          parameters: {
            type: 'OBJECT',
            properties: {
              days_ahead: {
                type: 'INTEGER',
                description: 'Look for stock expiring within this many days (default: 14)',
              },
            },
          },
        },
        // ── Email & Export ─────────────────────────────────────────────
        {
          name: 'send_email',
          description:
            'Send an email to a customer, admin, or any recipient. Call this whenever the user asks to send an email, email a customer, or test email sending.',
          parameters: {
            type: 'OBJECT',
            properties: {
              to: {
                type: 'STRING',
                description: 'Recipient email address (e.g. customer@example.com)',
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
            'Export all customer subscription and sales database records into a CSV file. Provides a direct download link and emails the CSV attachment.',
          parameters: {
            type: 'OBJECT',
            properties: {
              email_to: {
                type: 'STRING',
                description: 'Optional email address to send the CSV file to (defaults to admin email)',
              },
            },
          },
        },
        // ── Reports ───────────────────────────────────────────────────
        {
          name: 'generate_report',
          description:
            'Generate a business report and email it as a professionally formatted HTML attachment. Supports: sales_report, renewals_report, account_book_report, inventory_report, profit_loss_report. Always call this when the admin asks for a report, PDF, or summary document.',
          parameters: {
            type: 'OBJECT',
            properties: {
              report_type: {
                type: 'STRING',
                enum: ['sales_report', 'renewals_report', 'account_book_report', 'inventory_report', 'profit_loss_report'],
                description: 'Type of report to generate',
              },
              period: {
                type: 'STRING',
                enum: ['today', 'yesterday', 'this_week', 'this_month', 'all_time'],
                description: 'Time period for the report (default: this_month)',
              },
              email_to: {
                type: 'STRING',
                description: 'Email address to send the report to (defaults to admin email)',
              },
            },
            required: ['report_type'],
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
   * Execute any tool requested by Gemini or Claude.
   * For confirmation-required tools, this returns a staging message instead.
   */
  async executeTool(name: string, args: Record<string, any>, opts?: { agentId?: string; phone?: string }): Promise<any> {
    this.logger.log(`Executing tool: ${name} with args: ${JSON.stringify(args)}`);
    try {
      // For confirmation-required tools, stage the action instead of executing
      if (this.isConfirmationRequired(name) && opts?.agentId && opts?.phone) {
        const description = this.buildConfirmationDescription(name, args);
        const actionId = this.stageAction(opts.agentId, opts.phone, name, args, description);
        return {
          pending_confirmation: true,
          action_id: actionId,
          description,
          message: `⚠️ *Confirmation Required*\n\n${description}\n\n📋 Action ID: \`${actionId}\`\n\nReply *CONFIRM ${actionId}* to proceed or *CANCEL ${actionId}* to abort.\n⏱ Expires in 5 minutes.`,
        };
      }

      return await this.executeToolDirect(name, args);
    } catch (err: any) {
      this.logger.error(`Error executing tool ${name}: ${err.message}`);
      return { error: err.message };
    }
  }

  /**
   * Execute tool directly (bypassing confirmation).
   */
  private async executeToolDirect(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      // Sales
      case 'get_sales_summary':
        return this.getSalesSummary(args.period || 'today');
      case 'list_sales':
        return this.listSales(args.search, args.limit);
      case 'record_sale':
        return this.recordSale(args as any);
      case 'delete_sale':
        return this.deleteSale(args.sale_id, args.reason);
      case 'list_deleted_sales':
        return this.listDeletedSales(args.limit);
      case 'restore_sale':
        return this.restoreSale(args.sale_id);

      // Orders
      case 'get_orders_summary':
        return this.getOrdersSummary();
      case 'list_orders':
        return this.listOrders(args.search, args.status, args.limit);
      case 'update_order_status':
        return this.updateOrderStatus(args.order_identifier, args.new_status, args.notes);

      // Products
      case 'list_products':
        return this.listProducts(args.category);
      case 'update_product':
        return this.updateProduct(args.product_name_or_id, args.price, args.in_stock);

      // Renewals
      case 'get_upcoming_renewals':
        return this.getUpcomingRenewals(args.days_ahead || 7);

      // Customer
      case 'search_customer':
        return this.searchCustomer(args.query);

      // Account Book
      case 'get_account_book_summary':
        return this.getAccountBookSummary();
      case 'list_payables':
        return this.listPayables(args.status, args.vendor_name, args.limit);
      case 'record_payable':
        return this.recordPayable(args as any);
      case 'update_payable_payment':
        return this.updatePayablePayment(args.payable_id, args.payment_amount, args.notes);
      case 'list_receivables':
        return this.listReceivables(args.status, args.customer_name, args.limit);
      case 'record_receivable':
        return this.recordReceivable(args as any);
      case 'update_receivable_payment':
        return this.updateReceivablePayment(args.receivable_id, args.payment_amount, args.notes);

      // Coupons
      case 'list_coupons':
        return this.listCoupons(args.active_only);
      case 'create_coupon':
        return this.createCoupon(args as any);
      case 'toggle_coupon':
        return this.toggleCoupon(args.coupon_code, args.active);

      // Stock & Inventory
      case 'list_stock_items':
        return this.listStockItems(args.status, args.category, args.limit);
      case 'get_expiring_stock':
        return this.getExpiringStock(args.days_ahead || 14);

      // Email & Export
      case 'send_email':
        return this.sendEmail(args.to, args.subject, args.body);
      case 'export_customers_csv':
        return this.exportCustomersCsv(args.email_to);

      // Reports
      case 'generate_report':
        return this.generateReport(args.report_type, args.period || 'this_month', args.email_to);

      default:
        return { error: `Tool ${name} is not implemented.` };
    }
  }

  private buildConfirmationDescription(toolName: string, args: Record<string, any>): string {
    switch (toolName) {
      case 'delete_sale':
        return `🗑 *Delete Sale*\nSale ID: \`${args.sale_id}\`\nReason: ${args.reason || 'Not specified'}`;
      case 'restore_sale':
        return `♻️ *Restore Deleted Sale*\nSale ID: \`${args.sale_id}\``;
      case 'create_coupon':
        return `🎟 *Create Coupon*\nCode: *${(args.code || '').toUpperCase()}*\nDiscount: ${args.value}${args.discount_type === 'percent' ? '%' : ' PKR'} off\n${args.max_uses ? `Max Uses: ${args.max_uses}` : 'Unlimited uses'}`;
      case 'toggle_coupon':
        return `🔄 *${args.active ? 'Activate' : 'Deactivate'} Coupon*\nCode: *${(args.coupon_code || '').toUpperCase()}*`;
      case 'update_payable_payment':
        return `💰 *Record Vendor Payment*\nPayable ID: \`${args.payable_id}\`\nPayment: ${args.payment_amount}`;
      case 'update_receivable_payment':
        return `💵 *Record Customer Payment*\nReceivable ID: \`${args.receivable_id}\`\nAmount: ${args.payment_amount}`;
      default:
        return `Execute ${toolName} with ${JSON.stringify(args)}`;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── TOOL IMPLEMENTATIONS ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  // ── Sales ───────────────────────────────────────────────────────────────

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
      .select('id, product_name, sale_price, currency, status, sale_date')
      .is('deleted_at', null);

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
    const productCounts: Record<string, { count: number; revenue: number }> = {};

    for (const s of sales) {
      const price = Number(s.sale_price) || 0;
      if (s.currency === 'USD') totalUsd += price;
      else totalPkr += price;

      const pName = s.product_name || 'Other';
      if (!productCounts[pName]) productCounts[pName] = { count: 0, revenue: 0 };
      productCounts[pName].count++;
      productCounts[pName].revenue += price;
    }

    return {
      period,
      totalSalesCount: totalCount,
      totalRevenuePkr: totalPkr,
      totalRevenueUsd: totalUsd,
      topProducts: Object.entries(productCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, { count, revenue }]) => ({ product: name, salesCount: count, revenue })),
      recentSalesSnippet: sales.slice(0, 5).map((s) => ({
        product: s.product_name,
        price: `${s.sale_price} ${s.currency}`,
        date: s.sale_date,
        status: s.status,
      })),
    };
  }

  private async listSales(search?: string, limit = 10) {
    let query = this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, customer_phone, product_name, plan_name, sale_price, currency, sale_date, expiry_date, status')
      .is('deleted_at', null)
      .order('sale_date', { ascending: false })
      .limit(Math.min(limit || 10, 50));

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
    // Validate required fields
    if (!args.customer_name?.trim()) throw new Error('Customer name is required.');
    if (!args.customer_phone?.trim()) throw new Error('Customer phone is required.');
    if (!args.product_name?.trim()) throw new Error('Product name is required.');
    if (!args.sale_price || Number(args.sale_price) <= 0) throw new Error('Sale price must be greater than 0.');

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
      message: `✅ Sale recorded for *${payload.customer_name}* (${payload.product_name}) — ${payload.sale_price} ${payload.currency}. Expires ${payload.expiry_date}.`,
      sale: data,
    };
  }

  private async deleteSale(saleId: string, reason: string) {
    if (!saleId?.trim()) throw new Error('Sale ID is required.');
    if (!reason?.trim()) throw new Error('A reason for deletion is required for the audit trail.');

    const { data: existing, error: findErr } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, product_name, sale_price, currency, deleted_at')
      .eq('id', saleId.trim())
      .single();

    if (findErr || !existing) throw new Error(`Sale ${saleId} not found.`);
    if (existing.deleted_at) throw new Error(`Sale ${saleId} is already deleted.`);

    const { error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .update({
        deleted_at: new Date().toISOString(),
        delete_reason: reason.trim(),
      })
      .eq('id', saleId.trim());

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `🗑 Sale for *${existing.customer_name}* (${existing.product_name} — ${existing.sale_price} ${existing.currency}) has been moved to Deleted Sales.\nReason: ${reason}`,
    };
  }

  private async listDeletedSales(limit = 10) {
    const { data, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, product_name, sale_price, currency, sale_date, deleted_at, delete_reason')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(Math.min(limit || 10, 50));

    if (error) throw new Error(error.message);
    return {
      count: data?.length || 0,
      deletedSales: (data || []).map((s) => ({
        id: s.id,
        customer: s.customer_name,
        product: s.product_name,
        price: `${s.sale_price} ${s.currency}`,
        saleDate: s.sale_date,
        deletedAt: s.deleted_at,
        reason: s.delete_reason,
      })),
    };
  }

  private async restoreSale(saleId: string) {
    if (!saleId?.trim()) throw new Error('Sale ID is required.');

    const { data: existing, error: findErr } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, product_name, deleted_at')
      .eq('id', saleId.trim())
      .single();

    if (findErr || !existing) throw new Error(`Sale ${saleId} not found.`);
    if (!existing.deleted_at) throw new Error(`Sale ${saleId} is not deleted — it's already active.`);

    const { error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .update({
        deleted_at: null,
        delete_reason: null,
        deleted_by: null,
      })
      .eq('id', saleId.trim());

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `♻️ Sale for *${existing.customer_name}* (${existing.product_name}) has been restored to the active Daily Sales ledger.`,
    };
  }

  // ── Orders ──────────────────────────────────────────────────────────────

  private async getOrdersSummary() {
    const { data, error } = await this.supabase
      .admin()
      .from('orders')
      .select('status, subtotal_pkr, subtotal_usd');

    if (error) throw new Error(error.message);
    const orders = data || [];

    const breakdown: Record<string, number> = {};
    let totalPkr = 0;
    let totalUsd = 0;

    for (const o of orders) {
      breakdown[o.status] = (breakdown[o.status] || 0) + 1;
      totalPkr += Number(o.subtotal_pkr) || 0;
      totalUsd += Number(o.subtotal_usd) || 0;
    }

    return {
      totalOrders: orders.length,
      statusBreakdown: breakdown,
      totalVolumePkr: totalPkr,
      totalVolumeUsd: totalUsd,
    };
  }

  private async listOrders(search?: string, status?: string, limit = 10) {
    let query = this.supabase
      .admin()
      .from('orders')
      .select('id, order_number, customer_name, customer_email, customer_phone, items, subtotal_pkr, subtotal_usd, status, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit || 10, 50));

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
    if (!identifier?.trim()) throw new Error('Order identifier is required.');
    if (!newStatus?.trim()) throw new Error('New status is required.');

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
      message: `✅ Order #${existing.order_number} status updated: ${existing.status} → *${newStatus}*.`,
    };
  }

  // ── Products ────────────────────────────────────────────────────────────

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
    if (!productNameOrId?.trim()) throw new Error('Product name or ID is required.');

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

    if (Object.keys(updateData).length === 0) {
      throw new Error('Nothing to update — provide at least price or in_stock.');
    }

    const { error: updErr } = await this.supabase
      .admin()
      .from('products')
      .update(updateData)
      .eq('id', target.id);

    if (updErr) throw new Error(updErr.message);

    return {
      success: true,
      message: `✅ Product *${target.name}* updated!`,
      details: { ...target, ...updateData },
    };
  }

  // ── Renewals ────────────────────────────────────────────────────────────

  private async getUpcomingRenewals(daysAhead = 7) {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureDate = future.toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('id, customer_name, customer_phone, product_name, sale_price, expiry_date, renew_date, status')
      .is('deleted_at', null)
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

  // ── Customer ────────────────────────────────────────────────────────────

  private async searchCustomer(query: string) {
    if (!query?.trim()) throw new Error('Search query is required.');

    const clean = query.trim();
    const [salesRes, ordersRes] = await Promise.all([
      this.supabase
        .admin()
        .from('subscription_sales')
        .select('id, customer_name, customer_phone, customer_email, product_name, sale_price, currency, sale_date, expiry_date, status')
        .is('deleted_at', null)
        .or(`customer_name.ilike.%${clean}%,customer_phone.ilike.%${clean}%,customer_email.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(5),
      this.supabase
        .admin()
        .from('orders')
        .select('id, order_number, customer_name, customer_email, customer_phone, subtotal_pkr, status, created_at')
        .or(`customer_name.ilike.%${clean}%,customer_phone.ilike.%${clean}%,customer_email.ilike.%${clean}%`)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    return {
      customerQuery: clean,
      salesHistory: salesRes.data || [],
      orderHistory: ordersRes.data || [],
      totalSalesFound: salesRes.data?.length || 0,
      totalOrdersFound: ordersRes.data?.length || 0,
    };
  }

  // ── Account Book ────────────────────────────────────────────────────────

  private async getAccountBookSummary() {
    const [payablesRes, receivablesRes] = await Promise.all([
      this.supabase
        .admin()
        .from('vendor_payables')
        .select('amount, paid_amount, currency, status'),
      this.supabase
        .admin()
        .from('customer_receivables')
        .select('amount, received_amount, currency, status'),
    ]);

    if (payablesRes.error) throw new Error(payablesRes.error.message);
    if (receivablesRes.error) throw new Error(receivablesRes.error.message);

    const payables = payablesRes.data || [];
    const receivables = receivablesRes.data || [];

    let totalPayable = 0, totalPaid = 0, pendingPayables = 0;
    let totalReceivable = 0, totalReceived = 0, pendingReceivables = 0;

    for (const p of payables) {
      totalPayable += Number(p.amount) || 0;
      totalPaid += Number(p.paid_amount) || 0;
      if (p.status !== 'paid') pendingPayables++;
    }

    for (const r of receivables) {
      totalReceivable += Number(r.amount) || 0;
      totalReceived += Number(r.received_amount) || 0;
      if (r.status !== 'paid') pendingReceivables++;
    }

    return {
      payables: {
        total: totalPayable,
        paid: totalPaid,
        outstanding: totalPayable - totalPaid,
        count: payables.length,
        pendingCount: pendingPayables,
      },
      receivables: {
        total: totalReceivable,
        collected: totalReceived,
        outstanding: totalReceivable - totalReceived,
        count: receivables.length,
        pendingCount: pendingReceivables,
      },
      netBalance: (totalReceivable - totalReceived) - (totalPayable - totalPaid),
      summary: `You owe vendors: ${totalPayable - totalPaid} PKR outstanding | Customers owe you: ${totalReceivable - totalReceived} PKR outstanding`,
    };
  }

  private async listPayables(status?: string, vendorName?: string, limit = 15) {
    let query = this.supabase
      .admin()
      .from('vendor_payables')
      .select('id, vendor_name, vendor_contact, description, amount, paid_amount, currency, due_date, status, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit || 15, 50));

    if (status) query = query.eq('status', status);
    if (vendorName) query = query.ilike('vendor_name', `%${vendorName}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      count: data?.length || 0,
      payables: (data || []).map((p) => ({
        ...p,
        outstanding: (Number(p.amount) || 0) - (Number(p.paid_amount) || 0),
      })),
    };
  }

  private async recordPayable(args: {
    vendor_name: string;
    description?: string;
    amount: number;
    currency?: string;
    due_date?: string;
    vendor_contact?: string;
    notes?: string;
  }) {
    if (!args.vendor_name?.trim()) throw new Error('Vendor name is required.');
    if (!args.amount || Number(args.amount) <= 0) throw new Error('Amount must be greater than 0.');

    const payload: Record<string, any> = {
      vendor_name: args.vendor_name.trim(),
      amount: Number(args.amount),
      currency: (args.currency || 'PKR').toUpperCase(),
      paid_amount: 0,
    };
    if (args.description) payload.description = args.description.trim();
    if (args.due_date) payload.due_date = args.due_date;
    if (args.vendor_contact) payload.vendor_contact = args.vendor_contact.trim();
    if (args.notes) payload.notes = args.notes.trim();

    const { data, error } = await this.supabase
      .admin()
      .from('vendor_payables')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `✅ Payable recorded: *${payload.vendor_name}* — ${payload.amount} ${payload.currency}${args.due_date ? ` (Due: ${args.due_date})` : ''}`,
      payable: data,
    };
  }

  private async updatePayablePayment(payableId: string, paymentAmount: number, notes?: string) {
    if (!payableId?.trim()) throw new Error('Payable ID is required.');
    if (!paymentAmount || Number(paymentAmount) <= 0) throw new Error('Payment amount must be greater than 0.');

    const { data: existing, error: findErr } = await this.supabase
      .admin()
      .from('vendor_payables')
      .select('id, vendor_name, amount, paid_amount, currency, status, notes')
      .eq('id', payableId.trim())
      .single();

    if (findErr || !existing) throw new Error(`Payable ${payableId} not found.`);

    const newPaidAmount = (Number(existing.paid_amount) || 0) + Number(paymentAmount);
    const updatePayload: Record<string, any> = {
      paid_amount: newPaidAmount,
    };
    if (notes) updatePayload.notes = `${existing.notes || ''}\n[${new Date().toISOString().slice(0, 10)}] Paid ${paymentAmount} ${existing.currency}. ${notes}`.trim();

    // Trigger will auto-update status
    const { error } = await this.supabase
      .admin()
      .from('vendor_payables')
      .update(updatePayload)
      .eq('id', payableId.trim());

    if (error) throw new Error(error.message);

    const remaining = Number(existing.amount) - newPaidAmount;
    return {
      success: true,
      message: `💰 Payment of ${paymentAmount} ${existing.currency} recorded for *${existing.vendor_name}*.\nTotal Paid: ${newPaidAmount} / ${existing.amount} ${existing.currency}\n${remaining <= 0 ? '✅ Fully settled!' : `Remaining: ${remaining} ${existing.currency}`}`,
    };
  }

  private async listReceivables(status?: string, customerName?: string, limit = 15) {
    let query = this.supabase
      .admin()
      .from('customer_receivables')
      .select('id, customer_name, customer_phone, product_name, invoice_no, amount, received_amount, currency, due_date, status, notes, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit || 15, 50));

    if (status) query = query.eq('status', status);
    if (customerName) query = query.ilike('customer_name', `%${customerName}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      count: data?.length || 0,
      receivables: (data || []).map((r) => ({
        ...r,
        outstanding: (Number(r.amount) || 0) - (Number(r.received_amount) || 0),
      })),
    };
  }

  private async recordReceivable(args: {
    customer_name: string;
    customer_phone?: string;
    product_name?: string;
    amount: number;
    currency?: string;
    due_date?: string;
    invoice_no?: string;
    notes?: string;
  }) {
    if (!args.customer_name?.trim()) throw new Error('Customer name is required.');
    if (!args.amount || Number(args.amount) <= 0) throw new Error('Amount must be greater than 0.');

    const payload: Record<string, any> = {
      customer_name: args.customer_name.trim(),
      amount: Number(args.amount),
      received_amount: 0,
      currency: (args.currency || 'PKR').toUpperCase(),
    };
    if (args.customer_phone) payload.customer_phone = args.customer_phone.trim();
    if (args.product_name) payload.product_name = args.product_name.trim();
    if (args.due_date) payload.due_date = args.due_date;
    if (args.invoice_no) payload.invoice_no = args.invoice_no.trim();
    if (args.notes) payload.notes = args.notes.trim();

    const { data, error } = await this.supabase
      .admin()
      .from('customer_receivables')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `✅ Receivable recorded: *${payload.customer_name}* owes ${payload.amount} ${payload.currency}${args.product_name ? ` for ${args.product_name}` : ''}${args.due_date ? ` (Due: ${args.due_date})` : ''}`,
      receivable: data,
    };
  }

  private async updateReceivablePayment(receivableId: string, paymentAmount: number, notes?: string) {
    if (!receivableId?.trim()) throw new Error('Receivable ID is required.');
    if (!paymentAmount || Number(paymentAmount) <= 0) throw new Error('Payment amount must be greater than 0.');

    const { data: existing, error: findErr } = await this.supabase
      .admin()
      .from('customer_receivables')
      .select('id, customer_name, amount, received_amount, currency, status, notes')
      .eq('id', receivableId.trim())
      .single();

    if (findErr || !existing) throw new Error(`Receivable ${receivableId} not found.`);

    const newReceivedAmount = (Number(existing.received_amount) || 0) + Number(paymentAmount);
    const updatePayload: Record<string, any> = {
      received_amount: newReceivedAmount,
    };
    if (notes) updatePayload.notes = `${existing.notes || ''}\n[${new Date().toISOString().slice(0, 10)}] Received ${paymentAmount} ${existing.currency}. ${notes}`.trim();

    const { error } = await this.supabase
      .admin()
      .from('customer_receivables')
      .update(updatePayload)
      .eq('id', receivableId.trim());

    if (error) throw new Error(error.message);

    const remaining = Number(existing.amount) - newReceivedAmount;
    return {
      success: true,
      message: `💵 Payment of ${paymentAmount} ${existing.currency} received from *${existing.customer_name}*.\nTotal Collected: ${newReceivedAmount} / ${existing.amount} ${existing.currency}\n${remaining <= 0 ? '✅ Fully collected!' : `Outstanding: ${remaining} ${existing.currency}`}`,
    };
  }

  // ── Coupons ─────────────────────────────────────────────────────────────

  private async listCoupons(activeOnly?: boolean) {
    let query = this.supabase
      .admin()
      .from('coupons')
      .select('id, code, discount_type, value, active, expires_at, max_uses, used_count, note, created_at')
      .order('created_at', { ascending: false });

    if (activeOnly) query = query.eq('active', true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      count: data?.length || 0,
      coupons: (data || []).map((c) => ({
        ...c,
        discountDisplay: c.discount_type === 'percent' ? `${c.value}% off` : `${c.value} PKR off`,
        usageDisplay: c.max_uses ? `${c.used_count}/${c.max_uses}` : `${c.used_count} (unlimited)`,
        isExpired: c.expires_at ? new Date(c.expires_at) < new Date() : false,
      })),
    };
  }

  private async createCoupon(args: {
    code: string;
    discount_type: 'percent' | 'fixed';
    value: number;
    max_uses?: number;
    expires_at?: string;
    note?: string;
  }) {
    if (!args.code?.trim()) throw new Error('Coupon code is required.');
    if (!args.discount_type) throw new Error('Discount type (percent or fixed) is required.');
    if (!args.value || Number(args.value) <= 0) throw new Error('Discount value must be greater than 0.');
    if (args.discount_type === 'percent' && Number(args.value) > 100) throw new Error('Percentage discount cannot exceed 100%.');

    const payload: Record<string, any> = {
      code: args.code.trim().toUpperCase(),
      discount_type: args.discount_type,
      value: Number(args.value),
      active: true,
    };
    if (args.max_uses) payload.max_uses = Number(args.max_uses);
    if (args.expires_at) payload.expires_at = args.expires_at;
    if (args.note) payload.note = args.note.trim();

    const { data, error } = await this.supabase
      .admin()
      .from('coupons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new Error(`Coupon code "${payload.code}" already exists. Choose a different code.`);
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `🎟 Coupon *${payload.code}* created!\nDiscount: ${payload.discount_type === 'percent' ? `${payload.value}%` : `${payload.value} PKR`} off\n${payload.max_uses ? `Max uses: ${payload.max_uses}` : 'Unlimited uses'}\n${payload.expires_at ? `Expires: ${payload.expires_at}` : 'Never expires'}`,
      coupon: data,
    };
  }

  private async toggleCoupon(couponCode: string, active: boolean) {
    if (!couponCode?.trim()) throw new Error('Coupon code is required.');

    const { data: existing, error: findErr } = await this.supabase
      .admin()
      .from('coupons')
      .select('id, code, active')
      .ilike('code', couponCode.trim())
      .single();

    if (findErr || !existing) throw new Error(`Coupon "${couponCode}" not found.`);

    const { error } = await this.supabase
      .admin()
      .from('coupons')
      .update({ active: Boolean(active) })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: `${active ? '✅' : '🚫'} Coupon *${existing.code}* has been ${active ? 'activated' : 'deactivated'}.`,
    };
  }

  // ── Stock & Inventory ───────────────────────────────────────────────────

  private async listStockItems(status?: string, category?: string, limit = 15) {
    let query = this.supabase
      .admin()
      .from('stock_items')
      .select('id, item_name, category, quantity, unit, expiry_date, supplier_name, status, notes, created_at')
      .order('expiry_date', { ascending: true })
      .limit(Math.min(limit || 15, 50));

    if (status) query = query.eq('status', status);
    if (category) query = query.ilike('category', `%${category}%`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    return {
      count: data?.length || 0,
      stockItems: (data || []).map((s) => ({
        ...s,
        daysUntilExpiry: Math.ceil((new Date(s.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)),
        isExpired: s.expiry_date < today,
      })),
    };
  }

  private async getExpiringStock(daysAhead = 14) {
    const today = new Date().toISOString().slice(0, 10);
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureDate = future.toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .admin()
      .from('stock_items')
      .select('id, item_name, category, quantity, unit, expiry_date, supplier_name, contact_email, status')
      .lte('expiry_date', futureDate)
      .in('status', ['active', 'expiringSoon'])
      .order('expiry_date', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      count: data?.length || 0,
      daysAhead,
      expiringItems: (data || []).map((s) => ({
        ...s,
        daysUntilExpiry: Math.ceil((new Date(s.expiry_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)),
        isExpired: s.expiry_date < today,
        urgency: s.expiry_date < today ? '🔴 EXPIRED' : s.expiry_date <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) ? '🟡 URGENT' : '🟢 Soon',
      })),
    };
  }

  // ── Email ───────────────────────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, body: string) {
    const cleanTo = (to || '').trim();
    const cleanSubj = (subject || '').trim();
    const cleanBody = (body || '').trim();

    if (!cleanTo) throw new Error('Recipient email address is required.');
    if (!cleanSubj) throw new Error('Subject line is required.');
    if (!cleanBody) throw new Error('Email body is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) throw new Error(`Invalid email address: ${cleanTo}`);

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
        message: `✅ Email sent to *${cleanTo}* — Subject: "${cleanSubj}"`,
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

  // ── CSV Export ──────────────────────────────────────────────────────────

  async generateCustomersCsv(): Promise<string> {
    const { data: sales, error } = await this.supabase
      .admin()
      .from('subscription_sales')
      .select('*')
      .is('deleted_at', null)
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
      message: `📊 Generated CSV with ${rowsCount} records. ${emailDetail}. Direct download: ${downloadUrl}`,
    };
  }

  // ── Report Generation ───────────────────────────────────────────────────

  private async generateReport(reportType: string, period: string, emailTo?: string) {
    const targetEmail = (emailTo || 'amirmehboob921@gmail.com').trim();
    const now = new Date();
    const periodLabel = period.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    let reportTitle = '';
    let reportHtml = '';
    let csvContent = '';

    switch (reportType) {
      case 'sales_report':
        ({ reportTitle, reportHtml, csvContent } = await this.buildSalesReport(period, periodLabel));
        break;
      case 'renewals_report':
        ({ reportTitle, reportHtml, csvContent } = await this.buildRenewalsReport());
        break;
      case 'account_book_report':
        ({ reportTitle, reportHtml, csvContent } = await this.buildAccountBookReport());
        break;
      case 'inventory_report':
        ({ reportTitle, reportHtml, csvContent } = await this.buildInventoryReport());
        break;
      case 'profit_loss_report':
        ({ reportTitle, reportHtml, csvContent } = await this.buildProfitLossReport(period, periodLabel));
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Wrap in branded email template
    const fullHtml = this.wrapReportHtml(reportTitle, reportHtml, now);

    // Send via email with CSV attachment
    const attachments: any[] = [];
    if (csvContent) {
      attachments.push({
        filename: `subscribai_${reportType}_${now.toISOString().slice(0, 10)}.csv`,
        content: Buffer.from(csvContent, 'utf-8'),
      });
    }

    try {
      await this.emailService.sendEmail({
        to: targetEmail,
        subject: `SubscribAI — ${reportTitle} (${now.toLocaleDateString()})`,
        text: `${reportTitle} — Generated ${now.toLocaleString()}`,
        html: fullHtml,
        attachments,
        emailType: 'agent_report',
      });

      return {
        success: true,
        message: `📄 *${reportTitle}* generated and emailed to *${targetEmail}*.\n${csvContent ? 'CSV data file attached.' : ''}`,
        reportType,
        emailedTo: targetEmail,
      };
    } catch (err: any) {
      this.logger.error(`Failed to send report email: ${err.message}`);
      return {
        success: false,
        error: `Report generated but email failed: ${err.message}`,
      };
    }
  }

  private wrapReportHtml(title: string, bodyHtml: string, date: Date): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:700px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">📊 ${title}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Generated ${date.toLocaleString()} • SubscribAI Business Intelligence</p>
  </div>
  <div style="padding:24px 32px;">${bodyHtml}</div>
  <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">SubscribAI Executive Reports • Generated by AI Assistant</p>
  </div>
</div>
</body>
</html>`;
  }

  private async buildSalesReport(period: string, periodLabel: string) {
    const summary = await this.getSalesSummary(period);
    const reportTitle = `Sales Report — ${periodLabel}`;

    const productRows = (summary.topProducts || [])
      .map((p: any) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.product}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${p.salesCount}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${p.revenue}</td></tr>`)
      .join('');

    const reportHtml = `
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#16a34a;">${summary.totalSalesCount}</div>
        <div style="color:#666;font-size:13px;">Total Sales</div>
      </div>
      <div style="flex:1;min-width:140px;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">PKR ${summary.totalRevenuePkr.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Revenue (PKR)</div>
      </div>
      <div style="flex:1;min-width:140px;background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#7c3aed;">$${summary.totalRevenueUsd.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Revenue (USD)</div>
      </div>
    </div>
    <h3 style="color:#1f2937;margin:20px 0 10px;">Top Products</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;font-weight:600;">Product</th><th style="padding:10px 12px;text-align:center;font-weight:600;">Sales</th><th style="padding:10px 12px;text-align:right;font-weight:600;">Revenue</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="3" style="padding:12px;text-align:center;color:#999;">No sales data</td></tr>'}</tbody>
    </table>`;

    const csvContent = `Product,Sales Count,Revenue\n${(summary.topProducts || []).map((p: any) => `${p.product},${p.salesCount},${p.revenue}`).join('\n')}`;

    return { reportTitle, reportHtml, csvContent };
  }

  private async buildRenewalsReport() {
    const renewals7 = await this.getUpcomingRenewals(7);
    const renewals30 = await this.getUpcomingRenewals(30);
    const reportTitle = 'Renewals & Expiry Report';

    const rows = (renewals30.expiringSubscriptions || [])
      .map((r: any) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${r.customer_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${r.product_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${r.customer_phone}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${r.expiry_date}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${r.sale_price} PKR</td>
      </tr>`)
      .join('');

    const reportHtml = `
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#dc2626;">${renewals7.count}</div>
        <div style="color:#666;font-size:13px;">Expiring in 7 days</div>
      </div>
      <div style="flex:1;background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#ea580c;">${renewals30.count}</div>
        <div style="color:#666;font-size:13px;">Expiring in 30 days</div>
      </div>
    </div>
    <h3 style="color:#1f2937;margin:20px 0 10px;">Subscriptions Expiring (Next 30 Days)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;">Customer</th><th style="padding:10px 12px;text-align:left;">Product</th><th style="padding:10px 12px;text-align:left;">Phone</th><th style="padding:10px 12px;text-align:center;">Expiry</th><th style="padding:10px 12px;text-align:right;">Price</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#999;">No upcoming renewals</td></tr>'}</tbody>
    </table>`;

    const csvContent = `Customer,Product,Phone,Expiry Date,Price\n${(renewals30.expiringSubscriptions || []).map((r: any) => `${r.customer_name},${r.product_name},${r.customer_phone},${r.expiry_date},${r.sale_price}`).join('\n')}`;

    return { reportTitle, reportHtml, csvContent };
  }

  private async buildAccountBookReport() {
    const summary = await this.getAccountBookSummary();
    const payables = await this.listPayables('pending', undefined, 20);
    const receivables = await this.listReceivables('pending', undefined, 20);
    const reportTitle = 'Account Book Report';

    const payableRows = (payables.payables || [])
      .map((p: any) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.vendor_name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${p.description || '-'}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${p.amount} ${p.currency}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${p.outstanding} ${p.currency}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${p.due_date || '-'}</td></tr>`)
      .join('');

    const receivableRows = (receivables.receivables || [])
      .map((r: any) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${r.customer_name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${r.product_name || '-'}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${r.amount} ${r.currency}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${r.outstanding} ${r.currency}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${r.due_date || '-'}</td></tr>`)
      .join('');

    const reportHtml = `
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#dc2626;">PKR ${summary.payables.outstanding.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">You Owe (Outstanding)</div>
      </div>
      <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#16a34a;">PKR ${summary.receivables.outstanding.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Owed to You (Outstanding)</div>
      </div>
      <div style="flex:1;min-width:140px;background:${summary.netBalance >= 0 ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:${summary.netBalance >= 0 ? '#16a34a' : '#dc2626'};">PKR ${summary.netBalance.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Net Balance</div>
      </div>
    </div>
    <h3 style="color:#dc2626;margin:20px 0 10px;">📤 Outstanding Payables (${payables.count})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#fef2f2;"><th style="padding:10px 12px;text-align:left;">Vendor</th><th style="padding:10px 12px;text-align:left;">Description</th><th style="padding:10px 12px;text-align:right;">Total</th><th style="padding:10px 12px;text-align:right;">Outstanding</th><th style="padding:10px 12px;text-align:center;">Due</th></tr></thead>
      <tbody>${payableRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#999;">No outstanding payables</td></tr>'}</tbody>
    </table>
    <h3 style="color:#16a34a;margin:24px 0 10px;">📥 Outstanding Receivables (${receivables.count})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f0fdf4;"><th style="padding:10px 12px;text-align:left;">Customer</th><th style="padding:10px 12px;text-align:left;">Product</th><th style="padding:10px 12px;text-align:right;">Total</th><th style="padding:10px 12px;text-align:right;">Outstanding</th><th style="padding:10px 12px;text-align:center;">Due</th></tr></thead>
      <tbody>${receivableRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#999;">No outstanding receivables</td></tr>'}</tbody>
    </table>`;

    const csvContent = `Type,Name,Description,Amount,Outstanding,Currency,Due Date,Status\n` +
      (payables.payables || []).map((p: any) => `Payable,${p.vendor_name},${p.description || ''},${p.amount},${p.outstanding},${p.currency},${p.due_date || ''},${p.status}`).join('\n') +
      '\n' +
      (receivables.receivables || []).map((r: any) => `Receivable,${r.customer_name},${r.product_name || ''},${r.amount},${r.outstanding},${r.currency},${r.due_date || ''},${r.status}`).join('\n');

    return { reportTitle, reportHtml, csvContent };
  }

  private async buildInventoryReport() {
    const allStock = await this.listStockItems(undefined, undefined, 50);
    const expiring = await this.getExpiringStock(14);
    const reportTitle = 'Inventory & Stock Report';

    const rows = (allStock.stockItems || [])
      .map((s: any) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.item_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.category || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${s.quantity} ${s.unit || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${s.supplier_name || '-'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${s.expiry_date}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;"><span style="padding:2px 8px;border-radius:9999px;font-size:12px;background:${s.isExpired ? '#fef2f2;color:#dc2626' : s.daysUntilExpiry <= 7 ? '#fff7ed;color:#ea580c' : '#f0fdf4;color:#16a34a'}">${s.isExpired ? 'Expired' : `${s.daysUntilExpiry}d`}</span></td>
      </tr>`)
      .join('');

    const reportHtml = `
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">${allStock.count}</div>
        <div style="color:#666;font-size:13px;">Total Items</div>
      </div>
      <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#dc2626;">${expiring.count}</div>
        <div style="color:#666;font-size:13px;">Expiring in 14 Days</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead><tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;">Item</th><th style="padding:10px 12px;text-align:left;">Category</th><th style="padding:10px 12px;text-align:center;">Qty</th><th style="padding:10px 12px;text-align:left;">Supplier</th><th style="padding:10px 12px;text-align:center;">Expiry</th><th style="padding:10px 12px;text-align:center;">Remaining</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="padding:12px;text-align:center;color:#999;">No stock items</td></tr>'}</tbody>
    </table>`;

    const csvContent = `Item,Category,Quantity,Unit,Supplier,Expiry Date,Status,Days Remaining\n${(allStock.stockItems || []).map((s: any) => `${s.item_name},${s.category || ''},${s.quantity},${s.unit || ''},${s.supplier_name || ''},${s.expiry_date},${s.status},${s.daysUntilExpiry}`).join('\n')}`;

    return { reportTitle, reportHtml, csvContent };
  }

  private async buildProfitLossReport(period: string, periodLabel: string) {
    const sales = await this.getSalesSummary(period);
    const orders = await this.getOrdersSummary();
    const accountBook = await this.getAccountBookSummary();
    const reportTitle = `Profit & Loss — ${periodLabel}`;

    const totalRevenue = sales.totalRevenuePkr;
    const totalExpenses = accountBook.payables.paid;
    const netProfit = totalRevenue - totalExpenses;

    const reportHtml = `
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#16a34a;">PKR ${totalRevenue.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Revenue (Sales)</div>
      </div>
      <div style="flex:1;min-width:140px;background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#dc2626;">PKR ${totalExpenses.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Expenses (Paid to Vendors)</div>
      </div>
      <div style="flex:1;min-width:140px;background:${netProfit >= 0 ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:${netProfit >= 0 ? '#16a34a' : '#dc2626'};">PKR ${netProfit.toLocaleString()}</div>
        <div style="color:#666;font-size:13px;">Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</div>
      </div>
    </div>
    <h3 style="margin:20px 0 10px;">Revenue Breakdown</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <tr style="background:#f0fdf4;"><td style="padding:10px 12px;">Subscription Sales (PKR)</td><td style="padding:10px 12px;text-align:right;font-weight:600;">PKR ${sales.totalRevenuePkr.toLocaleString()}</td></tr>
      <tr><td style="padding:10px 12px;">Subscription Sales (USD)</td><td style="padding:10px 12px;text-align:right;">$${sales.totalRevenueUsd.toLocaleString()}</td></tr>
      <tr><td style="padding:10px 12px;">Web Orders Volume (PKR)</td><td style="padding:10px 12px;text-align:right;">PKR ${orders.totalVolumePkr.toLocaleString()}</td></tr>
      <tr><td style="padding:10px 12px;">Total Sales Count</td><td style="padding:10px 12px;text-align:right;">${sales.totalSalesCount}</td></tr>
      <tr><td style="padding:10px 12px;">Total Web Orders</td><td style="padding:10px 12px;text-align:right;">${orders.totalOrders}</td></tr>
    </table>
    <h3 style="margin:20px 0 10px;">Expenses & Liabilities</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr style="background:#fef2f2;"><td style="padding:10px 12px;">Vendor Payments (Settled)</td><td style="padding:10px 12px;text-align:right;font-weight:600;">PKR ${accountBook.payables.paid.toLocaleString()}</td></tr>
      <tr><td style="padding:10px 12px;">Outstanding Payables</td><td style="padding:10px 12px;text-align:right;">PKR ${accountBook.payables.outstanding.toLocaleString()}</td></tr>
      <tr><td style="padding:10px 12px;">Outstanding Receivables</td><td style="padding:10px 12px;text-align:right;color:#16a34a;">PKR ${accountBook.receivables.outstanding.toLocaleString()}</td></tr>
    </table>`;

    const csvContent = `Category,Item,Amount (PKR)\nRevenue,Subscription Sales PKR,${sales.totalRevenuePkr}\nRevenue,Web Orders Volume,${orders.totalVolumePkr}\nExpenses,Vendor Payments Settled,${accountBook.payables.paid}\nLiabilities,Outstanding Payables,${accountBook.payables.outstanding}\nAssets,Outstanding Receivables,${accountBook.receivables.outstanding}\nNet,${netProfit >= 0 ? 'Profit' : 'Loss'},${netProfit}`;

    return { reportTitle, reportHtml, csvContent };
  }
}
