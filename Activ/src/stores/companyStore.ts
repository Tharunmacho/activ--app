import { create } from 'zustand';
import { Company } from '../types';

interface CompanyState {
  companies: Company[];
  selectedCompanyId: string | null;
  isLoading: boolean;
  
  // Actions
  setCompanies: (companies: Company[]) => void;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  setSelectedCompany: (id: string | null) => void;
  getSelectedCompany: () => Company | null;
  clearCompanies: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompanyId: null,
  isLoading: false,
  
  setCompanies: (companies) => {
    set({ companies });
    // Auto-select first company if none selected
    if (companies.length > 0 && !get().selectedCompanyId) {
      set({ selectedCompanyId: companies[0].id });
    }
  },
  
  addCompany: (company) =>
    set((state) => ({ companies: [...state.companies, company] })),
  
  updateCompany: (id, updates) =>
    set((state) => ({
      companies: state.companies.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  
  deleteCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
      selectedCompanyId: state.selectedCompanyId === id ? null : state.selectedCompanyId,
    })),
  
  setSelectedCompany: (id) => set({ selectedCompanyId: id }),
  
  getSelectedCompany: () => {
    const { companies, selectedCompanyId } = get();
    return companies.find((c) => c.id === selectedCompanyId) || null;
  },
  
  clearCompanies: () => set({ companies: [], selectedCompanyId: null }),
}));
