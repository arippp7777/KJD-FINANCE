"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Plus, Calendar, User, Truck, MapPin, Receipt, CheckCircle, Clock, XCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { formatIDR } from "@/lib/currency";
import { formatDateDisplay } from "@/lib/utils";
import type { TripWithDetails } from "@/types/trip";

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getTrip(id);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trip details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this trip? All related expenses will also be deleted.")) return;
    try {
      await ApiClient.deleteTrip(id);
      router.push("/trips");
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-red-600 mb-4">{error || "Trip not found"}</p>
          <Link href="/trips" className="text-blue-600 hover:underline">Kembali ke Daftar Trip</Link>
        </div>
      </div>
    );
  }

  const StatusIcon = trip.status === "ACTIVE" ? Clock : trip.status === "COMPLETED" ? CheckCircle : XCircle;
  const statusColor = trip.status === "ACTIVE" ? "text-blue-600 bg-blue-50" : trip.status === "COMPLETED" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/trips" className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{trip.trip_no}</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                  <StatusIcon size={14} />
                  {trip.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-1">{trip.trip_type} Trip</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link 
              href={`/trips/${trip.id}/edit`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              <Edit size={16} /> Edit
            </Link>
            <button 
              onClick={handleDelete}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Receipt size={20} className="text-blue-600" />
                Informasi Trip
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Calendar size={16}/> Tanggal</p>
                  <p className="font-medium text-gray-900">{formatDateDisplay(trip.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><User size={16}/> Customer</p>
                  <p className="font-medium text-gray-900">{trip.customer_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><Truck size={16}/> Unit & Operator</p>
                  <p className="font-medium text-gray-900">{trip.unit_name} ({trip.unit_code})</p>
                  <p className="text-sm text-gray-600 mt-0.5">Opr: {trip.operator}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2"><MapPin size={16}/> Rute Perjalanan</p>
                  <div className="flex items-center gap-2 font-medium text-gray-900">
                    <span>{trip.origin}</span>
                    <ArrowLeft size={16} className="rotate-180 text-gray-400" />
                    <span>{trip.destination}</span>
                  </div>
                </div>
                
                {trip.notes && (
                  <div className="sm:col-span-2 pt-4 border-t border-gray-50">
                    <p className="text-sm text-gray-500 mb-1">Catatan</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{trip.notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt size={20} className="text-blue-600" />
                  Rincian Pengeluaran
                </h2>
                <Link 
                  href={`/trips/${trip.id}/expenses/new`}
                  className="flex items-center justify-center gap-1 w-full sm:w-auto text-sm font-medium text-white hover:bg-blue-700 bg-blue-600 px-3 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Plus size={16} /> Tambah Pengeluaran
                </Link>
              </div>
              
              {trip.expenses && trip.expenses.length > 0 ? (
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-gray-100 text-gray-500">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Tanggal</th>
                        <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Kategori</th>
                        <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Deskripsi</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Nominal</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {trip.expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 text-gray-600 whitespace-nowrap">{formatDateDisplay(expense.expense_date)}</td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {expense.category_name}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-700 min-w-[150px] whitespace-normal" title={expense.description}>
                            {expense.description || "-"}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                            {formatIDR(expense.amount)}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Link 
                                href={`/trips/${trip.id}/expenses/${expense.id}/edit`} 
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium text-xs transition-colors shadow-sm"
                              >
                                <Edit size={14} />
                                Edit
                              </Link>
                              <button 
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to delete this expense?")) return;
                                  try {
                                    await ApiClient.deleteExpense(expense.id);
                                    fetchTrip(); // reload
                                  } catch (err: any) {
                                    alert("Failed to delete: " + err.message);
                                  }
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium text-xs transition-colors shadow-sm"
                              >
                                <Trash2 size={14} />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50/50">
                      <tr>
                        <td colSpan={3} className="px-4 sm:px-6 py-4 text-right font-medium text-gray-700">Total Pengeluaran</td>
                        <td className="px-4 sm:px-6 py-4 text-right font-bold text-red-600 whitespace-nowrap">{formatIDR(trip.total_expenses)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                    <Receipt className="text-gray-400" size={24} />
                  </div>
                  <h3 className="text-gray-900 font-medium mb-1">Belum Ada Pengeluaran</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                    Trip ini belum memiliki catatan pengeluaran.
                  </p>
                  <Link 
                    href={`/trips/${trip.id}/expenses/new`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={18} /> Tambah Pengeluaran Pertama
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Ringkasan Finansial</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                  <span className="text-gray-500">Pendapatan</span>
                  <span className="font-semibold text-gray-900">{formatIDR(trip.revenue)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                  <span className="text-gray-500">Total Biaya</span>
                  <span className="font-semibold text-red-600">-{formatIDR(trip.total_expenses)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-900 font-medium">Laba Bersih</span>
                  <span className={`text-xl font-bold ${trip.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatIDR(trip.net_profit)}
                  </span>
                </div>
              </div>

              <div className="mt-8 bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-100">
                <span className="text-sm text-gray-600 font-medium">Profit Margin</span>
                <span className={`font-bold ${
                  // @ts-ignore - added in Apps Script response
                  (trip.profit_margin || 0) >= 20 ? "text-emerald-600" : 
                  // @ts-ignore
                  (trip.profit_margin || 0) > 0 ? "text-amber-600" : "text-red-600"
                }`}>
                  {/* @ts-ignore */}
                  {trip.profit_margin || 0}%
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
