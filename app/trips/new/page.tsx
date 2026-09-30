"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { parseIDRInput, formatIDR } from "@/lib/currency";
import { todayISODate } from "@/lib/utils";
import type { Customer } from "@/types/customer";
import type { Unit } from "@/types/unit";
import type { TripType } from "@/types/trip";

export default function NewTripPage() {
  const router = useRouter();
  
  // Data for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Input fields
  const [date, setDate] = useState(todayISODate());
  const [customerId, setCustomerId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [operator, setOperator] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState<TripType>("REGULER");
  const [revenueInput, setRevenueInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setLoadingData(true);
      const [custs, unts] = await Promise.all([
        ApiClient.getCustomers({ status: "ACTIVE" }),
        ApiClient.getUnits({ status: "ACTIVE" })
      ]);
      setCustomers(custs);
      setUnits(unts);
      
      // Auto-select first option if available
      if (custs.length > 0) setCustomerId(custs[0].id);
      if (unts.length > 0) setUnitId(unts[0].id);
      
    } catch (err: any) {
      setError("Failed to load customers/units: " + err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic formatting as user types: allow only numbers and formatted strings
    // But for a robust input, we usually parse on blur or keep raw input and parse.
    // For simplicity, we just keep raw string and format on display or parse on submit.
    setRevenueInput(e.target.value);
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
      
      await ApiClient.createTrip({
        date,
        customer_id: customerId,
        unit_id: unitId,
        operator,
        origin,
        destination,
        trip_type: tripType,
        revenue,
        notes,
        status: "ACTIVE" // default
      });
      
      // Redirect back to trips list
      router.push("/trips");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan trip.");
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
          <Link href="/trips" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Trip Baru</h1>
            <p className="text-gray-500 text-sm">Buat trip operasional baru</p>
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
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Jenis Trip <span className="text-red-500">*</span></label>
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
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Unit Kendaraan <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="" disabled>Pilih Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.code} - {u.plate_number})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Nama Operator/Sopir <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Misal: Budi Santoso"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Asal (Origin) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Lokasi muat"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Tujuan (Destination) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="Lokasi bongkar"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Pendapatan (Revenue) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500">Rp</span>
                  </div>
                  <input 
                    type="text" 
                    required
                    placeholder="0"
                    value={revenueInput}
                    onChange={handleRevenueChange}
                    className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Format akan otomatis dikonversi saat disimpan. {revenueInput && !isNaN(parseIDRInput(revenueInput)) && `(Dibaca: ${formatIDR(parseIDRInput(revenueInput))})`}
                </p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Catatan Tambahan</label>
                <textarea 
                  rows={3}
                  placeholder="Keterangan opsional..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" 
                />
              </div>

            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <Link 
                href="/trips"
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
                    Simpan Trip
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
