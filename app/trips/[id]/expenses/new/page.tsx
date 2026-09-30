"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { parseIDRInput, formatIDR } from "@/lib/currency";
import { todayISODate } from "@/lib/utils";
import type { ExpenseCategory } from "@/types/expense";

export default function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: tripId } = use(params);
  
  // Data for dropdowns
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Input fields
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayISODate());

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setLoadingData(true);
      const cats = await ApiClient.getCategories({ status: "ACTIVE" });
      setCategories(cats);
      
      // Auto-select first option if available
      if (cats.length > 0) setCategoryId(cats[0].id);
      
    } catch (err: any) {
      setError("Failed to load categories: " + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseIDRInput(amountInput);
    if (amount < 0 || isNaN(amount)) {
      setError("Nominal harus angka dan tidak boleh negatif.");
      return;
    }

    if (!categoryId) {
      setError("Kategori wajib dipilih.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await ApiClient.createExpense({
        trip_id: tripId,
        category_id: categoryId,
        description,
        amount,
        expense_date: expenseDate,
      });
      
      // Redirect back to trip detail page
      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan pengeluaran.");
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/trips/${tripId}`} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Pengeluaran</h1>
            <p className="text-gray-500 text-sm">Catat biaya operasional trip ini</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            <div className="space-y-6">
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tanggal <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Kategori <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Nominal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">Rp</span>
                  </div>
                  <input 
                    type="text" 
                    required
                    placeholder="0"
                    value={amountInput}
                    onChange={handleAmountChange}
                    className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {amountInput && !isNaN(parseIDRInput(amountInput)) && `Dibaca: ${formatIDR(parseIDRInput(amountInput))}`}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Deskripsi/Keterangan</label>
                <textarea 
                  rows={3}
                  placeholder="Opsional: Keterangan tambahan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                />
              </div>

            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Link 
                href={`/trips/${tripId}`}
                className="px-6 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Batal
              </Link>
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Simpan
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
