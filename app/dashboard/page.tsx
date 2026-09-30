"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, TrendingDown, DollarSign, Receipt, Truck, Activity, 
  RefreshCw, AlertCircle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { ApiClient } from "@/lib/api-client";
import { formatIDR } from "@/lib/currency";
import { formatDateDisplay } from "@/lib/utils";
import type { DashboardResponse } from "@/types/dashboard";

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Period filter mapping directly to backend capabilities (year/month)
  const [period, setPeriod] = useState<"THIS_MONTH" | "THIS_YEAR" | "LAST_YEAR">("THIS_YEAR");

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      let year = now.getFullYear().toString();
      let month: string | undefined = undefined;

      if (period === "THIS_MONTH") {
        month = (now.getMonth() + 1).toString();
      } else if (period === "LAST_YEAR") {
        year = (now.getFullYear() - 1).toString();
      }

      const res = await ApiClient.getDashboard({ year, month });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 h-28"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 h-[400px]"></div>
        <div className="bg-white rounded-xl border border-gray-100 h-[400px]"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm">Ringkasan keuangan dan operasional</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-gray-700"
            >
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="THIS_YEAR">Tahun Ini</option>
              <option value="LAST_YEAR">Tahun Lalu</option>
            </select>
            <button 
              onClick={fetchDashboard}
              disabled={loading}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {loading && !data ? renderSkeleton() : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Pendapatan</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatIDR(data.summary.total_revenue)}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <DollarSign size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total Pengeluaran</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatIDR(data.summary.total_expenses)}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <Receipt size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Laba Bersih (Net Profit)</p>
                    <h3 className={`text-2xl font-bold mt-1 ${data.summary.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatIDR(data.summary.net_profit)}
                    </h3>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${data.summary.net_profit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {data.summary.net_profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${data.summary.profit_margin >= 20 ? "text-emerald-600" : data.summary.profit_margin > 0 ? "text-amber-600" : "text-red-600"}`}>
                    {data.summary.profit_margin}% Margin
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Trip Operasional</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h3 className="text-2xl font-bold text-gray-900">{data.summary.total_trips}</h3>
                      <span className="text-sm text-gray-500">Total</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <Truck size={20} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Activity size={14} className="text-blue-500"/> {data.summary.active_trips} Active</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Revenue vs Expense Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Arus Kas (Pendapatan vs Pengeluaran)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenue_chart} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="period" 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => {
                          const parts = value.split('-');
                          return parts.length === 2 ? `${parts[1]}/${parts[0].slice(2)}` : value;
                        }}
                        style={{ fontSize: '12px', fill: '#6b7280' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `Rp ${value / 1000000}M`}
                        style={{ fontSize: '12px', fill: '#6b7280' }}
                      />
                      <RechartsTooltip 
                        formatter={(value: any) => formatIDR(Number(value))}
                        labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="revenue" name="Pendapatan" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expenses by Category Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribusi Pengeluaran</h3>
                {data.expense_by_category.length > 0 ? (
                  <div className="h-[300px] w-full flex flex-col">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expense_by_category}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="total_amount"
                          nameKey="category_name"
                        >
                          {data.expense_by_category.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: any) => formatIDR(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4 overflow-y-auto max-h-24">
                      {data.expense_by_category.map((cat, i) => (
                        <div key={cat.category_id} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                          <span className="truncate">{cat.category_name} ({cat.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                    Belum ada pengeluaran
                  </div>
                )}
              </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Top Customers */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
                </div>
                {data.top_customers.length > 0 ? (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50/50 text-gray-500">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Customer</th>
                          <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Trips</th>
                          <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.top_customers.map((c) => (
                          <tr key={c.id}>
                            <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 min-w-[120px] whitespace-normal">{c.name}</td>
                            <td className="px-4 sm:px-6 py-4 text-right text-gray-600 whitespace-nowrap">{c.trip_count}</td>
                            <td className="px-4 sm:px-6 py-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                              {formatIDR(c.total_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">Tidak ada data customer aktif</div>
                )}
              </div>

              {/* Recent Trips */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">10 Trip Terbaru</h3>
                  <Link href="/trips" className="text-sm font-medium text-blue-600 hover:text-blue-700">Lihat Semua</Link>
                </div>
                {data.recent_trips.length > 0 ? (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50/50 text-gray-500">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Trip No</th>
                          <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Customer & Rute</th>
                          <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Revenue</th>
                          <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Net Profit</th>
                          <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_trips.map((trip) => (
                          <tr key={trip.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => router.push(`/trips/${trip.id}`)}>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <Link href={`/trips/${trip.id}`} className="font-medium text-blue-600 group-hover:underline">
                                {trip.trip_no}
                              </Link>
                              <div className="text-xs text-gray-500 mt-0.5">{formatDateDisplay(trip.date)}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 min-w-[150px] whitespace-normal">
                              <div className="font-medium text-gray-900 line-clamp-2">{trip.customer_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-1">
                                <span>{trip.origin}</span>
                                <span>→</span>
                                <span>{trip.destination}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right text-gray-900 font-medium whitespace-nowrap">
                              {formatIDR(trip.revenue)}
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                              <span className={`font-medium ${trip.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {formatIDR(trip.net_profit)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                trip.status === "ACTIVE" ? "bg-blue-50 text-blue-700" :
                                trip.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                                "bg-red-50 text-red-700"
                              }`}>
                                {trip.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">Belum ada trip dicatat</div>
                )}
              </div>

            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
