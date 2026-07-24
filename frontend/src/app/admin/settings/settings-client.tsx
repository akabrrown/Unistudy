'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [settings, setSettings] = useState(initialSettings);

  const handleToggle = async (key: string, checked: boolean) => {
    const newValue = checked ? 'true' : 'false';
    setSettings(prev => ({ ...prev, [key]: newValue }));
    
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue })
      });
      if (!res.ok) throw new Error('Failed to update setting');
      toast.success(`${key} updated`);
    } catch (e) {
      toast.error(`Could not update ${key}`);
      setSettings(prev => ({ ...prev, [key]: !checked ? 'true' : 'false' }));
    }
  };

  const handleLimitChange = async (key: string, value: string) => {
    if (!value) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (!res.ok) throw new Error('Failed to update setting');
      toast.success(`${key} updated`);
    } catch (e) {
      toast.error(`Could not update ${key}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable major modules across the entire platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Locks out non-admin users with a maintenance screen.</p>
            </div>
            <Switch 
              checked={settings['MAINTENANCE_MODE'] === 'true'} 
              onCheckedChange={(checked) => handleToggle('MAINTENANCE_MODE', checked)} 
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Community Past Papers</Label>
              <p className="text-sm text-muted-foreground">Allow students to share past papers globally.</p>
            </div>
            <Switch 
              checked={settings['COMMUNITY_BANK_ENABLED'] !== 'false'} 
              onCheckedChange={(checked) => handleToggle('COMMUNITY_BANK_ENABLED', checked)} 
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>Configure constraints for the free tier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Free Course Limit</Label>
              <input 
                type="number" 
                defaultValue={settings['FREE_COURSE_LIMIT'] || 3} 
                onBlur={(e) => handleLimitChange('FREE_COURSE_LIMIT', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
              />
            </div>
            <div className="space-y-2">
              <Label>Free AI Calls per Day</Label>
              <input 
                type="number" 
                defaultValue={settings['FREE_AI_CALLS_PER_DAY'] || 30} 
                onBlur={(e) => handleLimitChange('FREE_AI_CALLS_PER_DAY', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>Set the base prices and apply global discounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pro Plan Price (GH₵)</Label>
              <input 
                type="number" 
                defaultValue={settings['PRICE_PRO'] || 49} 
                onBlur={(e) => handleLimitChange('PRICE_PRO', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
              />
            </div>
            <div className="space-y-2">
              <Label>Ultra Plan Price (GH₵)</Label>
              <input 
                type="number" 
                defaultValue={settings['PRICE_ULTRA'] || 99} 
                onBlur={(e) => handleLimitChange('PRICE_ULTRA', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Global Discount Percentage (%)</Label>
              <p className="text-xs text-muted-foreground mb-1">Set to 0 to disable. Example: 20 for 20% off.</p>
              <input 
                type="number" 
                defaultValue={settings['DISCOUNT_PERCENTAGE'] || 0} 
                onBlur={(e) => handleLimitChange('DISCOUNT_PERCENTAGE', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
