"use client";

import { useEffect, useState, useMemo } from "react";
import { Truck, Plus, Search, Edit, Trash2, X, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { SavingOverlay, SavingButton } from "@/components/saving-overlay";
import type { Unit, UnitStatus } from "@/types/unit";

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
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
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formStatus, setFormStatus] = useState<UnitStatus>("ACTIVE");

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getUnits();
      setUnits(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data unit.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("CREATE");
    setFormId("");
    setFormCode("");
    setFormName("");
    setFormType("TRUCK");
    setFormPlate("");
    setFormStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setModalMode("EDIT");
    setFormId(unit.id);
    setFormCode(unit.code);
    setFormName(unit.name);
    setFormType(unit.type);
    setFormPlate(unit.plate_number);
    setFormStatus(unit.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Auto-generate code from plate number (strip spaces, uppercase)
      const autoCode = formPlate.replace(/\s+/g, "").toUpperCase();
      const payload = {
        code: autoCode,
        name: formName,
        type: formType as import("@/types/unit").UnitType,
        plate_number: formPlate,
        status: "ACTIVE" as import("@/types/unit").UnitStatus,
      };
      
      if (modalMode === "CREATE") {
        await ApiClient.createUnit(payload);
      } else {
        await ApiClient.updateUnit({ id: formId, ...payload });
      }
      closeModal();
      fetchUnits();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus armada ini? Operasi ini mungkin gagal jika armada masih memiliki riwayat Trip.")) return;
    try {
      await ApiClient.deleteUnit(id);
      fetchUnits();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const filteredUnits = useMemo(() => {
    return units.filter(u => {
      const matchSearch = 
        u.code.toLowerCase().includes(search.toLowerCase()) || 
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.plate_number.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [units, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="text-blue-600" />
              Master Armada
            </h1>
            <p className="text-gray-500 text-sm mt-1">Kelola data kendaraan dan unit operasional</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Tambah Armada</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari kode, nama, atau plat nomor..."
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
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button onClick={fetchUnits} className="ml-auto underline">Coba Lagi</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Kode & Plat</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Nama Armada</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Tipe</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Tidak ada data armada yang sesuai.</td>
                  </tr>
                ) : (
                  filteredUnits.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{u.code}</div>
                        <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 px-2 py-0.5 rounded inline-block">{u.plate_number || "-"}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-800 min-w-[150px] whitespace-normal">{u.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700 whitespace-nowrap">{u.type || "-"}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : 
                          u.status === "MAINTENANCE" ? "bg-amber-50 text-amber-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => openEditModal(u)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(u.id)}
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
                {modalMode === "CREATE" ? "Tambah Armada" : "Edit Armada"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4 relative">
              {saving && <SavingOverlay />}
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Plat Nomor <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Nomor polisi kendaraan. Contoh: BM 1234 AM</p>
                <input 
                  type="text" required
                  placeholder="Contoh: BM 1234 AM"
                  value={formPlate} onChange={e => setFormPlate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Armada <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Nama atau merek kendaraan. Contoh: Truk Fuso Engkel</p>
                <input 
                  type="text" required
                  placeholder="Contoh: Truk Fuso Engkel"
                  value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tipe Kendaraan</label>
                <select
                  value={formType} onChange={e => setFormType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="TRUCK">Truk</option>
                  <option value="PICKUP">Pickup</option>
                  <option value="CONTAINER">Container</option>
                  <option value="TOWING">Towing</option>
                  <option value="CRANE">Crane</option>
                  <option value="OTHER">Lainnya</option>
                </select>
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
