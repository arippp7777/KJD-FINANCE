"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { formatIDR } from "@/lib/currency";
import { formatDateTimeDisplay, formatDateDisplay } from "@/lib/utils";
import type { TripWithDetails } from "@/types/trip";

export default function TripsPage() {
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getTrips();
      setTrips(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
      await ApiClient.deleteTrip(id);
      fetchTrips();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    const matchSearch =
      trip.trip_no.toLowerCase().includes(search.toLowerCase()) ||
      trip.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      trip.unit_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? trip.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
            <p className="text-gray-500 text-sm">Manage your fleet trips</p>
          </div>
          <Link
            href="/trips/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            <span>Tambah Trip</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari trip number, customer, unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* State rendering */}
        {loading ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500">Memuat data trip...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTrips}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-gray-400" size={24} />
            </div>
            <h3 className="text-gray-900 font-medium mb-1">Tidak ada data</h3>
            <p className="text-gray-500 mb-6">Belum ada trip yang sesuai kriteria pencarian.</p>
            {!search && !statusFilter && (
              <Link
                href="/trips/new"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                + Buat trip pertama
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Trip Info</th>
                    <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Customer & Unit</th>
                    <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Rute</th>
                    <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Pendapatan</th>
                    <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{trip.trip_no}</div>
                        <div className="text-gray-500 text-xs mt-1">{formatDateDisplay(trip.date)}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 min-w-[140px] whitespace-normal">
                        <div className="font-medium text-gray-900">{trip.customer_name || "Unknown"}</div>
                        <div className="text-gray-500 text-xs mt-1">{trip.unit_name} ({trip.unit_code})</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 min-w-[120px] whitespace-normal">
                        <div className="text-gray-900">{trip.origin}</div>
                        <div className="text-gray-500 text-xs mt-1">→ {trip.destination}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{formatIDR(trip.revenue)}</div>
                        <div className="text-gray-500 text-xs mt-1">{trip.trip_type}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trip.status === "ACTIVE" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            trip.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/trips/${trip.id}/expenses/new`} title="Tambah Pengeluaran" className="text-gray-400 hover:text-emerald-600 transition-colors">
                            <Plus size={18} />
                          </Link>
                          <Link href={`/trips/${trip.id}`} title="Lihat Detail" className="text-gray-400 hover:text-blue-600 transition-colors">
                            <Eye size={18} />
                          </Link>
                          <Link href={`/trips/${trip.id}/edit`} title="Edit Trip" className="text-gray-400 hover:text-amber-600 transition-colors">
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            title="Hapus Trip"
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
