import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, PackageSearch, ShieldCheck, BarChart2, Settings, Flag, 
  Home, MessageSquare, AlertTriangle, TrendingUp, Activity, 
  UserCheck, UserX, Package, DollarSign, Star, Eye, Edit, Trash2,
  Plus, Search, Filter, Download, Upload, RefreshCw, Bell, Menu
} from 'lucide-react';
import { AdminGuard } from './AdminGuard';
import { AdminModerationQueue } from './AdminModerationQueue';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

// Lazy load admin panels
const UsersPanel = React.lazy(() => import('./admin/UsersPanel').then(m => ({ default: m.UsersPanel })));
const ListingsPanel = React.lazy(() => import('./admin/ListingsPanel').then(m => ({ default: m.ListingsPanel })));
const ClaimsPanel = React.lazy(() => import('./admin/ClaimsPanel').then(m => ({ default: m.ClaimsPanel })));
const AnalyticsPanel = React.lazy(() => import('./admin/AnalyticsPanel').then(m => ({ default: m.AnalyticsPanel })));
const SettingsPanel = React.lazy(() => import('./admin/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const CleanupPanel = React.lazy(() => import('./admin/CleanupPanel').then(m => ({ default: m.default })));

const navigationItems = [
  { path: 'overview', label: 'Vizualizare generală', icon: Home, color: 'text-blue-600' },
  { path: 'users', label: 'Utilizatori', icon: Users, color: 'text-green-600' },
  { path: 'listings', label: 'Echipamente', icon: PackageSearch, color: 'text-purple-600' },
  { path: 'claims', label: 'Reclamații', icon: ShieldCheck, color: 'text-red-600' },
  { path: 'moderation', label: 'Moderare', icon: Flag, color: 'text-orange-600' },
  { path: 'analytics', label: 'Analytics', icon: BarChart2, color: 'text-indigo-600' },
  { path: 'cleanup', label: 'Cleanup', icon: Trash2, color: 'text-red-600' },
  { path: 'settings', label: 'Setări', icon: Settings, color: 'text-gray-600' },
];

interface AdminStats {
  totalUsers: number;
  activeListings: number;
  pendingClaims: number;
  totalRevenue: number;
  newUsers: number;
  completedBookings: number;
  verifiedUsers: number;
  averageRating: number;
  responseTime: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user?: string;
  item?: string;
  amount?: string;
  time: string;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeListings: 0,
    pendingClaims: 0,
    totalRevenue: 0,
    newUsers: 0,
    completedBookings: 0,
    verifiedUsers: 0,
    averageRating: 0,
    responseTime: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Fix the currentPath detection to handle the concatenated URL issue
  const getCurrentPath = () => {
    const pathSegments = location.pathname.split('/');
    // Find the admin route and get the next segment
    const adminIndex = pathSegments.indexOf('admin');
    if (adminIndex !== -1 && adminIndex + 1 < pathSegments.length) {
      const nextSegment = pathSegments[adminIndex + 1];
      // Check if it's a valid navigation path
      if (navigationItems.some(item => item.path === nextSegment)) {
        return nextSegment;
      }
    }
    return 'overview';
  };

  const currentPath = getCurrentPath();

  // Fetch real admin statistics
  const fetchAdminStats = async () => {
    try {
      setLoading(true);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active listings
      const { count: activeListings } = await supabase
        .from('gear')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true);

      // Get pending claims (handle if table doesn't exist)
      let pendingClaims = 0;
      try {
        const { count } = await supabase
          .from('claims')
          .select('*', { count: 'exact', head: true })
          .eq('claim_status', 'pending');
        pendingClaims = count || 0;
      } catch (error) {
        console.log('Claims table not available:', error);
        pendingClaims = 0;
      }

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Get completed bookings
      const { count: completedBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Get verified users
      const { count: verifiedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      // Calculate total revenue from completed bookings
      let totalRevenue = 0;
      try {
        const { data: revenueData } = await supabase
          .from('bookings')
          .select('total_amount')
          .eq('status', 'completed');

        totalRevenue = revenueData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;
      } catch (error) {
        console.log('Error fetching revenue data:', error);
        totalRevenue = 0;
      }

      // Calculate average rating from reviews
      let averageRating = 0;
      try {
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating');

        averageRating = reviewsData && reviewsData.length > 0
          ? reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0) / reviewsData.length
          : 0;
      } catch (error) {
        console.log('Reviews table not available:', error);
        averageRating = 0;
      }

      // Mock response time (in real app, this would be calculated from actual response times)
      const responseTime = 2.3;

      setStats({
        totalUsers: totalUsers || 0,
        activeListings: activeListings || 0,
        pendingClaims,
        totalRevenue,
        newUsers: newUsers || 0,
        completedBookings: completedBookings || 0,
        verifiedUsers: verifiedUsers || 0,
        averageRating,
        responseTime,
      });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      // Set default values if there's an error
      setStats({
        totalUsers: 0,
        activeListings: 0,
        pendingClaims: 0,
        totalRevenue: 0,
        newUsers: 0,
        completedBookings: 0,
        verifiedUsers: 0,
        averageRating: 0,
        responseTime: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Get recent user registrations
      try {
        const { data: recentUsers } = await supabase
          .from('users')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        recentUsers?.forEach(user => {
          activities.push({
            id: user.id,
            action: 'Utilizator nou înregistrat',
            user: user.full_name || 'Utilizator',
            time: format(new Date(user.created_at), 'dd MMMM yyyy', { locale: ro }),
            created_at: user.created_at,
          });
        });
      } catch (error) {
        console.log('Error fetching recent users:', error);
      }

      // Get recent gear approvals
      try {
        const { data: recentGear } = await supabase
          .from('gear')
          .select('id, title, created_at')
          .order('created_at', { ascending: false })
          .limit(2);

        recentGear?.forEach(gear => {
          activities.push({
            id: gear.id,
            action: 'Echipament aprobat',
            item: gear.title,
            time: format(new Date(gear.created_at), 'dd MMMM yyyy', { locale: ro }),
            created_at: gear.created_at,
          });
        });
      } catch (error) {
        console.log('Error fetching recent gear:', error);
      }

      // Get recent completed bookings
      try {
        const { data: recentBookings } = await supabase
          .from('bookings')
          .select('id, total_amount, created_at')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(2);

        recentBookings?.forEach(booking => {
          activities.push({
            id: booking.id,
            action: 'Plată procesată',
            amount: `${booking.total_amount} RON`,
            time: format(new Date(booking.created_at), 'dd MMMM yyyy', { locale: ro }),
            created_at: booking.created_at,
          });
        });
      } catch (error) {
        console.log('Error fetching recent bookings:', error);
      }

      // Sort by creation date and take the most recent 4
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activities.slice(0, 4));

    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchRecentActivity();
  }, []);

  const OverviewPanel = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Utilizatori</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                <p className="text-xs text-blue-600">+{stats.newUsers} luna aceasta</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Echipamente Active</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900">{stats.activeListings}</p>
                <p className="text-xs text-green-600">Disponibile pentru închiriere</p>
              </div>
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Reclamații în Așteptare</p>
                <p className="text-xl sm:text-2xl font-bold text-red-900">{stats.pendingClaims}</p>
                <p className="text-xs text-red-600">Necesită atenție</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Venit Total</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">{stats.totalRevenue.toLocaleString()} RON</p>
                <p className="text-xs text-purple-600">Toate timpurile</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Activitate Recentă</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                    <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Nu există activitate recentă</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.action}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.user || item.item || item.amount} • {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Statistici Rapide</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Închirieri Complete</span>
                <Badge variant="secondary">{stats.completedBookings}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Utilizatori Verificați</span>
                <Badge variant="secondary">
                  {stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}%
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium">Rating Mediu</span>
                <Badge variant="secondary">{stats.averageRating.toFixed(1)}/5</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Timp de Răspuns</span>
                <Badge variant="secondary">{stats.responseTime}h</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acțiuni Rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 sm:h-20 flex-col space-y-2" onClick={() => navigate('/admin/users')}>
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Gestionare Utilizatori</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col space-y-2" onClick={() => navigate('/admin/moderation')}>
              <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Moderare Conținut</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col space-y-2" onClick={() => navigate('/admin/claims')}>
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Reclamații</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col space-y-2" onClick={() => navigate('/admin/analytics')}>
              <BarChart2 className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm">Rapoarte</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600">Gestionare platformă GearUp</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button variant="ghost" size="sm" className="hover:bg-gray-100 p-2">
                <Bell className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
                className="hover:bg-gray-100 p-2 sm:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')} 
                className="hover:bg-gray-100 hidden sm:flex"
              >
                <Home className="h-4 w-4 mr-2" />
                Înapoi la Dashboard
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row">
          {/* Mobile Navigation Overlay */}
          {sidebarCollapsed && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setSidebarCollapsed(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white/95 backdrop-blur-sm border-r border-gray-200/50 transition-all duration-300 transform ${
            sidebarCollapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${sidebarCollapsed ? 'w-64' : 'w-64'}`}>
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full mb-4 hidden lg:flex"
              >
                {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <span>Colapsare</span>}
              </Button>
            </div>
            
            <nav className="px-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={`/admin/${item.path}`}
                    onClick={() => setSidebarCollapsed(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-900 border border-blue-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 w-full">
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                  <p className="text-gray-600">Se încarcă...</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewPanel />} />
                <Route path="users" element={<UsersPanel />} />
                <Route path="listings" element={<ListingsPanel />} />
                <Route path="claims" element={<ClaimsPanel />} />
                <Route path="moderation" element={<AdminModerationQueue isOpen={true} onClose={() => navigate('/admin/overview')} />} />
                <Route path="analytics" element={<AnalyticsPanel />} />
                <Route path="cleanup" element={<CleanupPanel />} />
                <Route path="settings" element={<SettingsPanel />} />
              </Routes>
            </React.Suspense>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}; 