import React from 'react';
import { Link, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, PackageSearch, ShieldCheck, BarChart2, Settings, Flag } from 'lucide-react';
import { AdminGuard } from './AdminGuard';
import { AdminModerationQueue } from './AdminModerationQueue';

// Lazy loaded panels (placeholder)
const UsersPanel = React.lazy(() => import('./admin/UsersPanel').then(m => ({ default: m.UsersPanel } as any)));
const ListingsPanel = React.lazy(() => import('./admin/ListingsPanel').then(m => ({ default: m.ListingsPanel } as any)));
const ClaimsPanel = React.lazy(() => import('./AdminClaimsDashboard').then(m => ({ default: m.AdminClaimsDashboard } as any)));
const AnalyticsPanel = React.lazy(() => import('./admin/AnalyticsPanel').then(m => ({ default: m.AnalyticsPanel } as any)));
const SettingsPanel = React.lazy(() => import('./admin/SettingsPanel').then(m => ({ default: m.SettingsPanel } as any)));

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AdminGuard>
      <div className="min-h-screen flex flex-col">
        <header className="border-b p-4 flex items-center space-x-4">
          <h1 className="text-xl font-bold mr-auto">Admin Dashboard</h1>
          <Link to="users"><Button variant="ghost" size="sm"><Users className="h-4 w-4 mr-1"/>Users</Button></Link>
          <Link to="listings"><Button variant="ghost" size="sm"><PackageSearch className="h-4 w-4 mr-1"/>Listings</Button></Link>
          <Link to="claims"><Button variant="ghost" size="sm"><ShieldCheck className="h-4 w-4 mr-1"/>Claims</Button></Link>
          <Link to="moderation"><Button variant="ghost" size="sm"><Flag className="h-4 w-4 mr-1"/>Moderation</Button></Link>
          <Link to="analytics"><Button variant="ghost" size="sm"><BarChart2 className="h-4 w-4 mr-1"/>Analytics</Button></Link>
          <Link to="settings"><Button variant="ghost" size="sm"><Settings className="h-4 w-4 mr-1"/>Settings</Button></Link>
        </header>

        <main className="flex-1 p-6 bg-muted/40">
          <React.Suspense fallback={<div>Loading…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersPanel />} />
              <Route path="listings" element={<ListingsPanel />} />
              <Route path="claims" element={<ClaimsPanel />} />
              <Route path="moderation" element={<AdminModerationQueue isOpen={true} onClose={() => navigate('users')} />} />
              <Route path="analytics" element={<AnalyticsPanel />} />
              <Route path="settings" element={<SettingsPanel />} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </AdminGuard>
  );
}; 