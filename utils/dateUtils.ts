/**
 * Date utilities for Any Khata
 * ALL dates in DB are "YYYY-MM-DD" strings. Never use Date objects in DB.
 */

/** Get today's date as "YYYY-MM-DD" strictly in IST */
export const getTodayString = (): string => {
  const options: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Kolkata', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

/** Check if a date string is today (edit allowed) */
export const isEditAllowed = (date: string): boolean => {
  return date === getTodayString();
};

/** Format "YYYY-MM-DD" → "24 Jan 2025" for display */
export const formatDisplayDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]} ${year}`;
};

/** Format "YYYY-MM-DD" → "Today", "Yesterday", or "24 Jan" */
export const formatRelativeDate = (date: string): string => {
  const today = getTodayString();
  if (date === today) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (date === yesterdayStr) return 'Yesterday';

  return formatDisplayDate(date);
};

/** Get first day of current month "YYYY-MM-01" */
export const getMonthStart = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Check if subscription is about to expire (within 3 days) */
export const isExpiringSoon = (expiryDate: string): boolean => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3 && diffDays >= 0;
};

/** Check if subscription is already expired */
export const isExpired = (expiryDate: string): boolean => {
  return new Date(expiryDate) < new Date();
};

/** Get current time as "HH:MM" */
export const getCurrentTime = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
