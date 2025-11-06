"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook to prevent hydration mismatch by ensuring client-side only operations
 * Use this for any date formatting, Math.random(), or client-specific operations
 */
export const useClientSideOnly = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

/**
 * Safe date formatter that prevents hydration mismatch
 */
export const useSafeDateFormatter = () => {
  const isClient = useClientSideOnly();

  const formatDate = (date: any, options?: Intl.DateTimeFormatOptions): string => {
    if (!date || !isClient) return 'กำลังโหลด...';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      return new Intl.DateTimeFormat('th-TH', { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'ไม่ระบุวันที่';
    }
  };

  const formatDateTime = (date: any): string => {
    return formatDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatJoinDate = (date: any): string => {
    return formatDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return {
    isClient,
    formatDate,
    formatDateTime,
    formatJoinDate
  };
};