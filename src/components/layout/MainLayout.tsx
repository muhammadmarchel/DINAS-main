import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { MobileBottomNav } from '../common/MobileBottomNav';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar for navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 sm:pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
};
