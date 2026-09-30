"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Menu,
  X,
  FileText,
  Tags
} from "lucide-react";

const navItems = [
  {
    group: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Operasional",
    items: [
      { href: "/trips", label: "Trip", icon: Truck },
      { href: "/reports", label: "Laporan", icon: FileText },
    ],
  },
  {
    group: "Master Data",
    items: [
      { href: "/customers", label: "Customer", icon: Users },
      { href: "/units", label: "Armada", icon: Truck },
      { href: "/expense-categories", label: "Kategori Biaya", icon: Tags },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-white border-b border-gray-100 shadow-sm fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">PT Putri Kharisma </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white z-40 shadow-2xl transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="pt-16 h-full">
          <SidebarInnerContent pathname={pathname} collapsed={false} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 flex-shrink-0 transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <SidebarInnerContent pathname={pathname} collapsed={collapsed} setCollapsed={setCollapsed} setMobileOpen={setMobileOpen} />
      </aside>
    </>
  );
}

function SidebarInnerContent({
  pathname,
  collapsed,
  setCollapsed,
  setMobileOpen,
}: {
  pathname: string;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-gray-900 text-sm leading-tight whitespace-nowrap">PT Putri Kharisma</p>
            <p className="text-xs text-gray-400 whitespace-nowrap">Finance System</p>
          </div>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-3 hide-scrollbar">
        {navItems.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-2">
                {group.group}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                        ${isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                        ${collapsed ? "justify-center" : ""}
                      `}
                    >
                      <item.icon
                        size={18}
                        className={`flex-shrink-0 ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle (desktop only) */}
      <div className="hidden md:block border-t border-gray-100 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Tutup Sidebar</span>}
        </button>
      </div>
    </div>
  );
}
