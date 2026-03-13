'use client';

import { useAdminAuth } from '@/contexts/admin-auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, Calendar, Activity } from 'lucide-react';

export default function AdminProfilePage() {
  const { adminUser, permissions } = useAdminAuth();

  if (!adminUser) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-muted-foreground">No admin profile loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">My Profile</h1>
        <p className="text-muted-foreground mt-2">Account details and assigned access</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white">{adminUser.firstName} {adminUser.lastName}</CardTitle>
          <CardDescription className="text-muted-foreground">{adminUser.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-900/40 text-blue-300 border-blue-700/60">
              <Shield className="w-3.5 h-3.5 mr-1" />
              {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </Badge>
            <Badge className={adminUser.status === 'active' ? 'bg-green-900/40 text-green-300 border-green-700/60' : 'bg-red-900/40 text-red-300 border-red-700/60'}>
              <Activity className="w-3.5 h-3.5 mr-1" />
              {adminUser.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground flex items-center gap-2"><Mail className="w-4 h-4" /> Email</p>
              <p className="text-white mt-1">{adminUser.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Last Login</p>
              <p className="text-white mt-1">{adminUser.lastLogin ? new Date(adminUser.lastLogin).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white">Permissions</CardTitle>
          <CardDescription className="text-muted-foreground">
            {permissions.length} permission(s) assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <p className="text-muted-foreground">No permissions assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="border-border text-foreground">
                  {permission}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
