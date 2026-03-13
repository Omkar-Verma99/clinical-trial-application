'use client';

import { useAdminAuth } from '@/contexts/admin-auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, Bell } from 'lucide-react';

export default function AdminHeader() {
  const { adminUser, logout } = useAdminAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const handleOpenProfile = () => {
    router.push('/admin/profile');
  };

  const handleOpenSettings = () => {
    router.push('/admin/settings');
  };

  return (
    <header className="border-b border-border bg-white sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">CA</span>
          </div>
          <span className="text-foreground font-semibold hidden sm:inline">Clinical Admin</span>
        </div>

        {/* Center - Title */}
        <div className="flex-1 text-center">
          <h1 className="text-foreground font-semibold text-sm">Admin Dashboard</h1>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Admin Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {adminUser?.firstName[0]}{adminUser?.lastName[0]}
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-white border-border">
              <DropdownMenuLabel className="text-foreground">
                <div>
                  <p className="font-semibold text-sm">
                    {adminUser?.firstName} {adminUser?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{adminUser?.email}</p>
                  <p className="text-xs text-primary mt-1">
                    {adminUser?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={handleOpenProfile}
                className="text-foreground cursor-pointer hover:bg-muted"
              >
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleOpenSettings}
                className="text-foreground cursor-pointer hover:bg-muted"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer hover:bg-muted focus:bg-muted"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
