"use client";

import { useEffect, useState, useMemo } from "react";
import { Tags, Plus, Search, Edit, Trash2, X, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { SavingOverlay, SavingButton } from "@/components/saving-overlay";
import type { ExpenseCategory } from "@/types/expense";

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data kategori pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("CREATE");
    setFormId("");
    setFormName("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ExpenseCategory) => {
    setModalMode("EDIT");
    setFormId(cat.id);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formName,
        description: formDescription,
        status: "ACTIVE" as import("@/types/expense").CategoryStatus
      };
      
      if (modalMode === "CREATE") {
        await ApiClient.createCategory(payload);
      } else {
        await ApiClient.updateCategory({ id: formId, ...payload });
      }
      closeModal();
      fetchCategories();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini? Operasi akan gagal jika kategori sudah digunakan di transaksi.")) return;
    try {
      await ApiClient.deleteCategory(id);
      fetchCategories();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        (c.description || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [categories, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tags className="text-blue-600" />
              Master Kategori Pengeluaran
            </h1>
            <p className="text-gray-500 text-sm mt-1">Kelola jenis-jenis biaya operasional</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Tambah Kategori</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm sm:w-48"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button onClick={fetchCategories} className="ml-auto underline">Coba Lagi</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Nama Kategori</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Deskripsi</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Tidak ada data kategori yang sesuai.</td>
                  </tr>
                ) : (
                  filteredCategories.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 font-bold text-gray-900 whitespace-nowrap">{c.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700 whitespace-normal min-w-[200px]">{c.description || "-"}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          c.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => openEditModal(c)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === "CREATE" ? "Tambah Kategori" : "Edit Kategori"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 relative">
              {saving && <SavingOverlay />}
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Kategori <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea 
                  value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-20"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Batal</button>
                <SavingButton saving={saving} />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
