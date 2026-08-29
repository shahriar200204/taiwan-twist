import { Sale, BranchInventoryItem, Expense, BusinessSettings } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface GoogleSheetsConfig {
  enabled: boolean;
  webhookUrl: string;
  spreadsheetId?: string;
  sheetNameSales?: string;
  sheetNameInventory?: string;
  sheetNameExpenses?: string;
  autoSyncSales: boolean;
  autoSyncExpenses: boolean;
  lastSyncedAt?: string;
  totalSyncedCount: number;
}

const STORAGE_KEY = 'taiwan_foodex_google_sheets_config';

const DEFAULT_CONFIG: GoogleSheetsConfig = {
  enabled: false,
  webhookUrl: '',
  sheetNameSales: 'Live_Sales',
  sheetNameInventory: 'Live_Inventory',
  sheetNameExpenses: 'Live_Expenses',
  autoSyncSales: true,
  autoSyncExpenses: true,
  totalSyncedCount: 0
};

class GoogleSheetsSyncService {
  private config: GoogleSheetsConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<GoogleSheetsConfig> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'google_sheets_config'));
      if (snap.exists()) {
        this.config = { ...DEFAULT_CONFIG, ...(snap.data() as GoogleSheetsConfig) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        return this.config;
      }
    } catch {
      // ignore
    }

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(local) };
      } catch {
        this.config = DEFAULT_CONFIG;
      }
    }
    return this.config;
  }

  async saveConfig(newConfig: Partial<GoogleSheetsConfig>): Promise<GoogleSheetsConfig> {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    try {
      await setDoc(doc(db, 'settings', 'google_sheets_config'), this.config);
    } catch (e) {
      console.warn('Firestore Google Sheets config save fallback:', e);
    }
    return this.config;
  }

  getConfig(): GoogleSheetsConfig {
    return this.config;
  }

  /**
   * Sends payload to Google Apps Script Web App Webhook
   */
  private async sendWebhook(action: string, payload: Record<string, any>): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled || !this.config.webhookUrl) {
      return { success: false, message: 'Google Sheets sync is not enabled or Webhook URL is missing.' };
    }

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action,
          timestamp: new Date().toISOString(),
          app: 'TAIWAN X FOODEX',
          data: payload,
        }),
      });

      const resText = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(resText);
      } catch {
        // Many Apps Script webhooks return raw text or redirect
      }

      this.config.lastSyncedAt = new Date().toISOString();
      this.config.totalSyncedCount += Array.isArray(payload) ? payload.length : 1;
      this.saveConfig(this.config);

      return { 
        success: true, 
        message: resJson.message || 'Successfully synced with Google Sheets.' 
      };
    } catch (error: any) {
      console.warn('Google Sheets live sync error:', error);
      return { 
        success: false, 
        message: error.message || 'Network error syncing with Google Sheets.' 
      };
    }
  }

  /**
   * Sync single sale invoice row in real time
   */
  async syncSale(sale: Sale): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled || !this.config.autoSyncSales) {
      return { success: false, message: 'Auto-sync for sales is disabled.' };
    }

    const row = {
      Invoice_No: sale.invoiceNumber,
      Date_Time: sale.createdAt,
      Branch: sale.branchName,
      Cashier: sale.cashierName,
      Customer: sale.customerName || 'Walk-in Guest',
      Customer_Phone: sale.customerPhone || 'N/A',
      Items_Summary: sale.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
      Item_Count: sale.itemCount,
      Subtotal_BDT: sale.subtotal,
      Discount_BDT: sale.discountAmount,
      VAT_BDT: sale.taxAmount,
      Grand_Total_BDT: sale.grandTotal,
      Cost_Total_BDT: sale.totalCost,
      Net_Profit_BDT: sale.netProfit,
      Payment_Method: sale.paymentMethod.toUpperCase(),
      Payment_Status: sale.paymentStatus.toUpperCase(),
      Paid_Amount_BDT: sale.paidAmount,
      Due_Amount_BDT: sale.dueAmount,
      Order_Status: sale.status.toUpperCase(),
    };

    return this.sendWebhook('SYNC_SALE', row);
  }

  /**
   * Batch sync all sales
   */
  async syncAllSales(sales: Sale[]): Promise<{ success: boolean; message: string; count: number }> {
    const rows = sales.map(s => ({
      Invoice_No: s.invoiceNumber,
      Date_Time: s.createdAt,
      Branch: s.branchName,
      Cashier: s.cashierName,
      Customer: s.customerName || 'Walk-in Guest',
      Customer_Phone: s.customerPhone || 'N/A',
      Items_Summary: s.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
      Item_Count: s.itemCount,
      Subtotal_BDT: s.subtotal,
      Discount_BDT: s.discountAmount,
      VAT_BDT: s.taxAmount,
      Grand_Total_BDT: s.grandTotal,
      Cost_Total_BDT: s.totalCost,
      Net_Profit_BDT: s.netProfit,
      Payment_Method: s.paymentMethod.toUpperCase(),
      Payment_Status: s.paymentStatus.toUpperCase(),
      Paid_Amount_BDT: s.paidAmount,
      Due_Amount_BDT: s.dueAmount,
      Order_Status: s.status.toUpperCase(),
    }));

    const result = await this.sendWebhook('BATCH_SYNC_SALES', rows);
    return { ...result, count: rows.length };
  }

  /**
   * Sync inventory stock levels
   */
  async syncInventory(inventory: BranchInventoryItem[]): Promise<{ success: boolean; message: string; count: number }> {
    const rows = inventory.map(i => ({
      Branch_Name: i.branchName,
      Product_Name: i.productName,
      SKU: i.sku,
      Barcode: i.barcode,
      Category: i.categoryName,
      Current_Stock: i.currentStock,
      Unit: i.unit || 'pcs',
      Selling_Price_BDT: i.sellingPrice,
      Cost_Price_BDT: i.costPrice,
      Stock_Value_BDT: i.currentStock * i.sellingPrice,
      Low_Stock_Threshold: i.minStockAlert,
      Status: i.currentStock <= 0 ? 'OUT OF STOCK' : i.currentStock <= i.minStockAlert ? 'LOW STOCK' : 'IN STOCK',
      Last_Updated: i.updatedAt,
    }));

    const result = await this.sendWebhook('SYNC_INVENTORY', rows);
    return { ...result, count: rows.length };
  }

  /**
   * Sync single expense
   */
  async syncExpense(expense: Expense): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled || !this.config.autoSyncExpenses) {
      return { success: false, message: 'Auto-sync for expenses is disabled.' };
    }

    const row = {
      Expense_ID: expense.id,
      Date: expense.date,
      Branch: expense.branchName,
      Title: expense.title,
      Category: expense.category.toUpperCase(),
      Amount_BDT: expense.amount,
      Payment_Method: expense.paymentMethod ? expense.paymentMethod.toUpperCase() : 'CASH',
      Added_By: expense.addedByName || 'Admin',
      Notes: expense.notes || '',
    };

    return this.sendWebhook('SYNC_EXPENSE', row);
  }

  /**
   * Test Connection ping
   */
  async testConnection(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'PING_TEST',
          timestamp: new Date().toISOString(),
          app: 'TAIWAN X FOODEX',
          data: { ping: 'pong', status: 'Connected successfully to Taiwan X Foodex Live Sync!' }
        }),
      });

      return {
        success: true,
        message: 'Connected successfully to your Google Sheet! Ready for live syncing.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Could not connect to Google Apps Script Webhook. Please verify the URL and ensure access is set to "Anyone".'
      };
    }
  }

  /**
   * Generates the ready-to-paste Google Apps Script code for the user
   */
  getAppsScriptTemplate(): string {
    return `/**
 * TAIWAN X FOODEX - LIVE GOOGLE SHEETS SYNC APPS SCRIPT
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete existing code, paste this script, and click Save (Ctrl + S).
 * 4. Click Deploy > New deployment > Select type: Web app.
 * 5. Configuration:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Click Deploy, Authorize access, and Copy the Web app URL.
 * 7. Paste the Web app URL in Taiwan X Foodex POS "Google Sheets Sync" settings!
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var parsed = JSON.parse(rawData);
    var action = parsed.action;
    var data = parsed.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'PING_TEST') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Connected successfully!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_SALE') {
      var sheet = getOrCreateSheet(ss, 'Live_Sales', [
        'Invoice_No', 'Date_Time', 'Branch', 'Cashier', 'Customer', 'Customer_Phone',
        'Items_Summary', 'Item_Count', 'Subtotal_BDT', 'Discount_BDT', 'VAT_BDT',
        'Grand_Total_BDT', 'Cost_Total_BDT', 'Net_Profit_BDT', 'Payment_Method',
        'Payment_Status', 'Paid_Amount_BDT', 'Due_Amount_BDT', 'Order_Status'
      ]);
      appendRowData(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sale synced' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'BATCH_SYNC_SALES') {
      var sheet = getOrCreateSheet(ss, 'Live_Sales', [
        'Invoice_No', 'Date_Time', 'Branch', 'Cashier', 'Customer', 'Customer_Phone',
        'Items_Summary', 'Item_Count', 'Subtotal_BDT', 'Discount_BDT', 'VAT_BDT',
        'Grand_Total_BDT', 'Cost_Total_BDT', 'Net_Profit_BDT', 'Payment_Method',
        'Payment_Status', 'Paid_Amount_BDT', 'Due_Amount_BDT', 'Order_Status'
      ]);
      if (Array.isArray(data)) {
        data.forEach(function(row) { appendRowData(sheet, row); });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: data.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_INVENTORY') {
      var sheet = getOrCreateSheet(ss, 'Live_Inventory', [
        'Branch_Name', 'Product_Name', 'SKU', 'Barcode', 'Category', 'Current_Stock',
        'Unit', 'Selling_Price_BDT', 'Cost_Price_BDT', 'Stock_Value_BDT',
        'Low_Stock_Threshold', 'Status', 'Last_Updated'
      ]);
      sheet.clearContents();
      sheet.appendRow([
        'Branch_Name', 'Product_Name', 'SKU', 'Barcode', 'Category', 'Current_Stock',
        'Unit', 'Selling_Price_BDT', 'Cost_Price_BDT', 'Stock_Value_BDT',
        'Low_Stock_Threshold', 'Status', 'Last_Updated'
      ]);
      if (Array.isArray(data)) {
        data.forEach(function(row) { appendRowData(sheet, row); });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: data.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'SYNC_EXPENSE') {
      var sheet = getOrCreateSheet(ss, 'Live_Expenses', [
        'Expense_ID', 'Date', 'Branch', 'Title', 'Category', 'Amount_BDT',
        'Payment_Method', 'Added_By', 'Notes'
      ]);
      appendRowData(sheet, data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Expense synced' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ignored', action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#D97706'); // Warm amber
      headerRange.setFontColor('#0F172A');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function appendRowData(sheet, dataObj) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = dataObj[key] !== undefined ? dataObj[key] : '';
    rowValues.push(val);
  }
  sheet.appendRow(rowValues);
}
`;
  }
}

export const googleSheetsSync = new GoogleSheetsSyncService();
