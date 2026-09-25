import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useApp } from '@/context/AppContext';
import { Loader } from '@/components/common/EmptyState';

export default function DashboardLayout() {
  const { masters, user } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="main">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="page">{masters && user ? <Outlet /> : <Loader />}</main>
      </div>
    </div>
  );
}
