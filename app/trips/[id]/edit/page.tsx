"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { parseIDRInput, formatIDR, formatNumberInput } from "@/lib/currency";
import type { Customer } from "@/types/customer";
import type { Unit } from "@/types/unit";
import type { TripType, TripStatus } from "@/types/trip";

export default function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  // Data for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Input fields
  const [tripNo, setTripNo] = useState("");
  const [date, setDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [operator, setOperator] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState<TripType>("REGULER");
  const [revenueInput, setRevenueInput] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TripStatus>("ACTIVE");

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      setLoadingData(true);
      const [custs, unts, trip] = await Promise.all([
        ApiClient.getCustomers({ status: "ACTIVE" }),
        ApiClient.getUnits({ status: "ACTIVE" }),
        ApiClient.getTrip(id)
      ]);
      setCustomers(custs);
      setUnits(unts);
      
      // Populate form
      setTripNo(trip.trip_no);
      setDate(trip.date);
      setCustomerId(trip.customer_id);
      setUnitId(trip.unit_id);
      setOperator(trip.operator);
      setOrigin(trip.origin);
      setDestination(trip.destination);
      setTripType(trip.trip_type);
      setRevenueInput(formatNumberInput(trip.revenue.toString()));
      setNotes(trip.notes || "");
      setStatus(trip.status);
      
    } catch (err: any) {
      setError("Failed to load data: " + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRevenueInput(formatNumberInput(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const revenue = parseIDRInput(revenueInput);
    if (revenue < 0 || isNaN(revenue)) {
      setError("Pendapatan harus angka dan tidak boleh negatif.");
      return;
    }

    if (!customerId || !unitId) {
      setError("Customer dan Unit wajib dipilih.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await ApiClient.updateTrip({
        id,
        date,
        customer_id: customerId,
        unit_id: unitId,
        operator,
        origin,
        destination,
        trip_type: tripType,
        revenue,
        notes,
        status
      });
      
      // Redirect back to detail page
      router.push(`/trips/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan perubahan trip.");
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
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/trips/${id}`} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Trip: {tripNo}</h1>
            <p className="text-gray-500 text-sm">Perbarui data operasional trip</p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tanggal Trip <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Pilih tanggal keberangkatan kendaraan.</p>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Pilih "Active" jika sedang berjalan, "Completed" jika selesai.</p>
                <select 
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TripStatus)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Jenis Trip <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Pilih jenis layanan (Reguler, Charter, atau Kontrak).</p>
                <select 
                  required
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as TripType)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="REGULER">Reguler</option>
                  <option value="CHARTER">Charter</option>
                  <option value="KONTRAK">Kontrak</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Customer <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Pilih perusahaan penyewa (customer).</p>
                <select 
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Pilih Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {/* Keep current if inactive but selected */}
                  {customerId && !customers.find(c => c.id === customerId) && (
                    <option value={customerId}>[Inactive Customer]</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Unit Kendaraan <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Pilih armada/mobil yang akan digunakan.</p>
                <select 
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Pilih Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                  ))}
                  {unitId && !units.find(u => u.id === unitId) && (
                    <option value={unitId}>[Inactive Unit]</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Operator/Sopir <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Ketik nama sopir yang bertugas membawa unit.</p>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Asal (Origin) <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Tuliskan nama kota atau lokasi penjemputan.</p>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Dumai"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tujuan (Destination) <span className="text-red-500">*</span></label>
                <p className="text-[11px] text-gray-500 mb-1">Tuliskan nama kota atau lokasi tujuan bongkar.</p>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Pekanbaru"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Pendapatan (Revenue) <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-gray-500 mb-1">Ketik angka saja, titik ribuan otomatis ditambahkan.</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">Rp</span>
                  </div>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    required
                    placeholder="Contoh: 5.000.000"
                    value={revenueInput}
                    onChange={handleRevenueChange}
                    className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Total pendapatan: <strong>{revenueInput ? formatIDR(parseIDRInput(revenueInput)) : "Rp 0"}</strong></p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Catatan Tambahan</label>
                <p className="text-[11px] text-gray-500 mb-1">Informasi tambahan (opsional).</p>
                <textarea 
                  rows={3}
                  placeholder="Contoh: Kondisi jalan tol, barang khusus, dll."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                />
              </div>

            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <Link 
                href={`/trips/${id}/expenses/new`}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
              >
                <Plus size={18} />
                Tambah Pengeluaran
              </Link>
              
              <div className="flex justify-end gap-3">
                <Link 
                  href={`/trips/${id}`}
                  className="flex-1 sm:flex-none text-center px-6 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Batal
                </Link>
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
