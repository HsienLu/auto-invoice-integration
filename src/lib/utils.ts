import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Categorize item based on item name
 */
export function categorizeItem(itemName: string): string {
  const name = itemName.toLowerCase();
  
  // Food categories
  if (name.includes('飯') || name.includes('麵') || name.includes('便當') || 
      name.includes('餐') || name.includes('食') || name.includes('菜')) {
    return '餐飲';
  }
  
  // Beverages
  if (name.includes('飲') || name.includes('茶') || name.includes('咖啡') || 
      name.includes('水') || name.includes('汁') || name.includes('奶')) {
    return '飲料';
  }
  
  // Snacks
  if (name.includes('餅') || name.includes('糖') || name.includes('巧克力') || 
      name.includes('零食') || name.includes('點心')) {
    return '零食';
  }
  
  // Daily necessities
  if (name.includes('紙') || name.includes('洗') || name.includes('清潔') || 
      name.includes('衛生') || name.includes('毛巾')) {
    return '日用品';
  }
  
  // Transportation
  if (name.includes('車') || name.includes('油') || name.includes('停車') || 
      name.includes('交通') || name.includes('捷運') || name.includes('公車')) {
    return '交通';
  }
  
  // Medical/Health
  if (name.includes('藥') || name.includes('醫') || name.includes('健康') || 
      name.includes('維他命') || name.includes('保健')) {
    return '醫療保健';
  }
  
  // Clothing
  if (name.includes('衣') || name.includes('褲') || name.includes('鞋') || 
      name.includes('襪') || name.includes('帽')) {
    return '服飾';
  }
  
  // Electronics
  if (name.includes('電') || name.includes('手機') || name.includes('電腦') || 
      name.includes('充電') || name.includes('3C')) {
    return '電子產品';
  }
  
  // Books/Stationery
  if (name.includes('書') || name.includes('筆') || name.includes('紙') || 
      name.includes('文具') || name.includes('雜誌')) {
    return '文具書籍';
  }
  
  // Default category
  return '其他';
}
