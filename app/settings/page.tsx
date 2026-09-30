"use client";

import { useEffect, useState } from "react";
import { Settings, Save, AlertCircle } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import type { Setting } from "@/types/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // A local map of key -> value to manage form state easily
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.getSettings();
      setSettings(data);
      
      const newValues: Record<string, string> = {};
      data.forEach(s => {
        newValues[s.key] = s.value;
      });
      setValues(newValues);
    } catch (err: any) {
      setError(err.message || "Gagal memuat pengaturan.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: string) => {
    try {
      setSavingKeys(prev => ({ ...prev, [key]: true }));
      await ApiClient.updateSetting(key, values[key]);
      
      // Update the main settings array to reflect saved value
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value: values[key] } : s));
      
      // small delay to show visual feedback (optional)
      setTimeout(() => {
        setSavingKeys(prev => ({ ...prev, [key]: false }));
      }, 500);
      
    } catch (err: any) {
      alert("Gagal menyimpan " + key + ": " + err.message);
      setSavingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-blue-600" />
              Pengaturan Sistem
            </h1>
            <p className="text-gray-500 text-sm mt-1">Konfigurasi variabel global aplikasi</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button onClick={fetchSettings} className="ml-auto underline">Coba Lagi</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : settings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Belum ada pengaturan tersedia.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {settings.map(s => {
                const isChanged = s.value !== values[s.key];
                const isSaving = savingKeys[s.key];
                
                return (
                  <div key={s.key} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center hover:bg-gray-50/50 transition-colors">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-gray-900 block mb-1">{s.key}</label>
                      <p className="text-sm text-gray-500">{s.description || "-"}</p>
                    </div>
                    
                    <div className="w-full sm:w-2/3 flex items-center gap-3">
                      <input 
                        type="text"
                        value={values[s.key] ?? ""}
                        onChange={(e) => handleChange(s.key, e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm ${isChanged ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`}
                      />
                      
                      <button
                        onClick={() => handleSave(s.key)}
                        disabled={!isChanged || isSaving}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isSaving 
                            ? "bg-gray-100 text-gray-400 border border-gray-200"
                            : isChanged
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                              : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save size={16} />
                        )}
                        <span className="hidden sm:inline">{isSaving ? "Menyimpan" : "Simpan"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
