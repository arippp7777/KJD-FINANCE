"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Plus, Search, Edit, Trash2, X, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import type { Customer, CustomerStatus } from "@/types/customer";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formStatus, setFormStatus] = useState<CustomerStatus>("ACTIVE");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data customer.");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("CREATE");
    setFormId("");
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormContactPerson("");
    setFormStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setModalMode("EDIT");
    setFormId(customer.id);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address);
    setFormContactPerson(customer.contact_person);
    setFormStatus(customer.status);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (modalMode === "CREATE") {
        await ApiClient.createCustomer({
          name: formName,
          phone: formPhone,
          address: formAddress,
          contact_person: formContactPerson,
          status: formStatus
        });
      } else {
        await ApiClient.updateCustomer({
          id: formId,
          name: formName,
          phone: formPhone,
          address: formAddress,
          contact_person: formContactPerson,
          status: formStatus
        });
      }
      closeModal();
      fetchCustomers();
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus customer ini? Operasi ini mungkin gagal jika customer masih memiliki riwayat Trip.")) return;
    try {
      await ApiClient.deleteCustomer(id);
      fetchCustomers();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.contact_person.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [customers, search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600" />
              Master Customer
            </h1>
            <p className="text-gray-500 text-sm mt-1">Kelola data pelanggan dan perusahaan</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Tambah Customer</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama atau contact person..."
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
            <button onClick={fetchCustomers} className="ml-auto underline">Coba Lagi</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Customer Name</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Contact Person</th>
                  <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Phone & Address</th>
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
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Tidak ada data customer yang sesuai.</td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 min-w-[150px] whitespace-normal">{c.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700 min-w-[150px] whitespace-normal">{c.contact_person || "-"}</td>
                      <td className="px-4 sm:px-6 py-4 min-w-[150px] whitespace-normal">
                        <div className="text-gray-900 whitespace-nowrap">{c.phone || "-"}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={c.address}>{c.address || "-"}</div>
                      </td>
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
                {modalMode === "CREATE" ? "Tambah Customer" : "Edit Customer"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Customer <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Contact Person <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formContactPerson} onChange={e => setFormContactPerson(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">No. Telepon <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={formPhone} onChange={e => setFormPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Alamat</label>
                <textarea 
                  value={formAddress} onChange={e => setFormAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={formStatus} onChange={e => setFormStatus(e.target.value as CustomerStatus)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
