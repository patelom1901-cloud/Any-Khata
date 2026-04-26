import { create } from 'zustand';
import type { Business, Customer } from '../types';

interface BusinessState {
  business: Business | null;
  customers: Customer[];
  isSubscriptionActive: boolean;
  setBusiness: (business: Business | null) => void;
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  removeCustomer: (customerId: string) => void;
  clearBusiness: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  business: null,
  customers: [],
  isSubscriptionActive: false,

  setBusiness: (business) => set({
    business,
    isSubscriptionActive: business?.subscriptionStatus === 'active',
  }),

  setCustomers: (customers) => set({ customers }),

  addCustomer: (customer) => set((state) => ({
    customers: [...state.customers, customer],
  })),

  updateCustomer: (customerId, updates) => set((state) => ({
    customers: state.customers.map(c =>
      c.customerId === customerId ? { ...c, ...updates } : c
    ),
  })),

  removeCustomer: (customerId) => set((state) => ({
    customers: state.customers.filter(c => c.customerId !== customerId),
  })),

  clearBusiness: () => set({ business: null, customers: [], isSubscriptionActive: false }),
}));
