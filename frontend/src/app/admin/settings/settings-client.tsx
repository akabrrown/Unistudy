'use client';

import { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  ShieldAlert,
  Sliders,
  Zap,
  CreditCard,
  Layers,
  Save,
  Download,
  RotateCcw,
  CheckCircle2,
  Lock,
  Globe,
  BrainCircuit,
  Activity,
  History,
  Check,
  Server,
  FileText,
  Users,
  Compass,
  Headphones,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEFAULT_RECOMMENDED_SETTINGS: Record<string, string> = {
  MAINTENANCE_MODE: 'false',
  MAINTENANCE_MESSAGE: 'UniStudy is undergoing scheduled system upgrades. Normal service will resume shortly.',
  REGISTRATIONS_ENABLED: 'true',
  COMMUNITY_BANK_ENABLED: 'true',
  MOODLE_SYNC_ENABLED: 'true',
  STUDY_GROUPS_ENABLED: 'true',
  AI_TUTOR_ENABLED: 'true',
  WELLBEING_MODULE_ENABLED: 'true',
  AUDIO_ROOMS_ENABLED: 'true',
  FLASHCARD_COMMUNITY_ENABLED: 'true',
  FREE_COURSE_LIMIT: '3',
  FREE_LECTURE_LIMIT: '5',
  FREE_AI_CALLS_PER_DAY: '30',
  FREE_TRIAL_DAYS: '7',
  MAX_UPLOAD_SIZE_MB: '50',
  MAX_PAPER_UPLOAD_SIZE_MB: '25',
  CURRENCY_SYMBOL: 'GH₵',
  PRICE_PRO: '49',
  PRICE_ULTRA: '99',
  DISCOUNT_PERCENTAGE: '0',
  PROMO_BANNER_TEXT: 'Midsem Special: 20% discount on all quarterly plans!',
  PRIMARY_AI_PROVIDER: 'groq',
  SECONDARY_AI_PROVIDER: 'gemini',
  AI_FALLBACK_LATENCY_THRESHOLD_MS: '2000',
  MAX_AI_TOKENS_PER_RESPONSE: '2048',
  LATEX_AUTOFMT_ENABLED: 'true',
  HALLUCINATION_GUARD_STRICT: 'true'
};

interface SettingsClientProps {
  initialSettings: Record<string, string>;
  initialAuditLogs?: any[];
}

export default function SettingsClient({ initialSettings, initialAuditLogs = [] }: SettingsClientProps) {
  const [settings, setSettings] = useState<Record<string, string>>({
    ...DEFAULT_RECOMMENDED_SETTINGS,
    ...initialSettings
  });
  const [baseline, setBaseline] = useState<Record<string, string>>({
    ...DEFAULT_RECOMMENDED_SETTINGS,
    ...initialSettings
  });
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('flags');

  // Compute dirty unsaved keys
  const dirtyKeys = useMemo(() => {
    const changed: string[] = [];
    Object.keys(settings).forEach((k) => {
      if (settings[k] !== baseline[k]) {
        changed.push(k);
      }
    });
    return changed;
  }, [settings, baseline]);

  const isDirty = dirtyKeys.length > 0;

  // Change handlers
  const handleValueChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked ? 'true' : 'false' }));
  };

  // Save changes via API
  const handleSaveAll = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const changedPayload: Record<string, string> = {};
      dirtyKeys.forEach((k) => {
        changedPayload[k] = settings[k];
      });

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changedPayload })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setBaseline({ ...settings });
      toast.success(`Successfully saved ${dirtyKeys.length} platform setting${dirtyKeys.length > 1 ? 's' : ''}`);

      // Refresh audit logs
      try {
        const auditRes = await fetch('/api/admin/settings');
        if (auditRes.ok) {
          const freshData = await auditRes.json();
          if (freshData.auditLogs) setAuditLogs(freshData.auditLogs);
        }
      } catch (e) {
        // Safe fallback
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update platform settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setSettings({ ...baseline });
    toast.info('Discarded unsaved modifications');
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset all settings to recommended production baseline?')) return;
    setSettings({ ...DEFAULT_RECOMMENDED_SETTINGS });
    toast.info('Loaded default recommended settings (click Save Changes to apply)');
  };

  // Export JSON Manifest
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `unistudy-platform-settings-${format(new Date(), 'yyyyMMdd-HHmm')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported platform settings configuration JSON');
  };

  // KPI Calculations
  const isMaintenanceActive = settings['MAINTENANCE_MODE'] === 'true';
  const activeFlagsCount = [
    settings['COMMUNITY_BANK_ENABLED'],
    settings['MOODLE_SYNC_ENABLED'],
    settings['STUDY_GROUPS_ENABLED'],
    settings['AI_TUTOR_ENABLED'],
    settings['WELLBEING_MODULE_ENABLED'],
    settings['AUDIO_ROOMS_ENABLED'],
    settings['FLASHCARD_COMMUNITY_ENABLED'],
    settings['REGISTRATIONS_ENABLED']
  ].filter((v) => v !== 'false').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              Platform Governance • Global Config
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-mono text-muted-foreground">
              v2.5 Production Core
            </span>
            {isDirty && (
              <Badge variant="default" className="text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {dirtyKeys.length} Unsaved Change{dirtyKeys.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground text-sm max-w-2xl mt-0.5">
            Configure system-wide feature flags, free tier quota limits, monetization rules, and AI fallback thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Discard
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-9 gap-2 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleSaveAll}
            disabled={!isDirty || saving}
            className="h-9 gap-2 text-xs font-semibold shadow-sm"
          >
            {saving ? (
              <Activity className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes {isDirty && `(${dirtyKeys.length})`}
          </Button>
        </div>
      </div>

      {/* Emergency Maintenance Mode Banner */}
      {isMaintenanceActive && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block">
                Emergency State: Maintenance Mode Active
              </span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Non-admin student logins and all mutating API endpoints are currently restricted.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleChange('MAINTENANCE_MODE', false)}
            className="h-8 text-xs border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 shrink-0"
          >
            Disable Maintenance Mode
          </Button>
        </div>
      )}

      {/* KPI Ribbon (5 High-Density Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className={cn(
          "p-4 relative overflow-hidden transition-all",
          isMaintenanceActive ? "border-rose-500/50 bg-rose-500/5" : "bg-card"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform State</span>
            <Server className={cn("w-4 h-4", isMaintenanceActive ? "text-rose-500" : "text-emerald-500")} />
          </div>
          <div className={cn(
            "text-2xl font-bold font-mono tracking-tight",
            isMaintenanceActive ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {isMaintenanceActive ? 'Locked' : 'Online'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isMaintenanceActive ? 'Maintenance active' : 'Normal student traffic'}
          </p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Modules</span>
            <Sliders className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {activeFlagsCount} <span className="text-sm font-normal text-muted-foreground font-sans">/ 8</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Global feature flags</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free Tier AI</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {settings['FREE_AI_CALLS_PER_DAY'] || '30'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Requests / user / day</p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription Base</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {settings['CURRENCY_SYMBOL'] || 'GH₵'}{settings['PRICE_PRO'] || '49'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ultra: {settings['CURRENCY_SYMBOL'] || 'GH₵'}{settings['PRICE_ULTRA'] || '99'} / mo
          </p>
        </Card>

        <Card className="p-4 bg-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Gateway</span>
            <BrainCircuit className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight uppercase text-violet-600 dark:text-violet-400">
            {settings['PRIMARY_AI_PROVIDER'] || 'Groq'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Fallback: {settings['SECONDARY_AI_PROVIDER'] || 'Gemini'}
          </p>
        </Card>
      </div>

      {/* Main Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/70 p-1 h-10 w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="flags" className="text-xs gap-1.5 px-4 shrink-0">
            <Sliders className="w-3.5 h-3.5" /> Feature Rollouts
          </TabsTrigger>
          <TabsTrigger value="quotas" className="text-xs gap-1.5 px-4 shrink-0">
            <Layers className="w-3.5 h-3.5" /> Free Tier & Quotas
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs gap-1.5 px-4 shrink-0">
            <CreditCard className="w-3.5 h-3.5" /> Pricing & Monetization
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs gap-1.5 px-4 shrink-0">
            <BrainCircuit className="w-3.5 h-3.5" /> AI Engine & Routing
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5 px-4 shrink-0">
            <History className="w-3.5 h-3.5" /> Governance Audit Log
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Feature Flags & Rollouts */}
        <TabsContent value="flags" className="space-y-4 m-0">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Core Module Switches & Killswitches
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle major functional subsystems on or off across the web platform and mobile apps in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0 text-xs">
              {/* Maintenance Mode */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Maintenance Mode Killswitch</Label>
                    {isMaintenanceActive && (
                      <Badge variant="destructive" className="text-[10px] font-mono">
                        ACTIVE LOCK
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Temporarily lock all non-administrator users out of the application with a branded maintenance splash screen. Use during database migrations or portal maintenance.
                  </p>
                </div>
                <Switch
                  checked={settings['MAINTENANCE_MODE'] === 'true'}
                  onCheckedChange={(checked) => handleToggleChange('MAINTENANCE_MODE', checked)}
                />
              </div>

              {/* Maintenance Custom Message */}
              {isMaintenanceActive && (
                <div className="p-4 bg-muted/20 space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Maintenance Screen Announcement</Label>
                  <Input
                    value={settings['MAINTENANCE_MESSAGE'] || ''}
                    onChange={(e) => handleValueChange('MAINTENANCE_MESSAGE', e.target.value)}
                    placeholder="Custom maintenance announcement displayed to students..."
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}

              {/* New Student Registrations */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Student Account Registrations</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Allow new university students to create accounts. Pause registrations during high-load exam surges or invitation-only beta periods.
                  </p>
                </div>
                <Switch
                  checked={settings['REGISTRATIONS_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('REGISTRATIONS_ENABLED', checked)}
                />
              </div>

              {/* Community Past Papers Vault */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Community Past Papers Bank</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Enable the shared university exam paper repository where students can search, download, and practice with exam past questions.
                  </p>
                </div>
                <Switch
                  checked={settings['COMMUNITY_BANK_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('COMMUNITY_BANK_ENABLED', checked)}
                />
              </div>

              {/* Automated Moodle Virtual Portal Sync */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Moodle & Virtual Portal Crawler Sync</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Enable automated course discovery and PDF past paper synchronization from university Moodle portals (e.g. UPSA Virtual).
                  </p>
                </div>
                <Switch
                  checked={settings['MOODLE_SYNC_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('MOODLE_SYNC_ENABLED', checked)}
                />
              </div>

              {/* Peer Study Groups */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Peer Study Groups & Course Discussions</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Allow students to create study groups, discuss course topics, and ask questions within course forums.
                  </p>
                </div>
                <Switch
                  checked={settings['STUDY_GROUPS_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('STUDY_GROUPS_ENABLED', checked)}
                />
              </div>

              {/* AI Tutor Engine */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">AI Tutor & Lecture Explanation Engine</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Power interactive slide Q&A, mock exam generation, and instant STEM formula solving across web and mobile.
                  </p>
                </div>
                <Switch
                  checked={settings['AI_TUTOR_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('AI_TUTOR_ENABLED', checked)}
                />
              </div>

              {/* Student Wellbeing */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Wellbeing & Exam Anxiety Check-ins</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Enable anxiety mood ratings, study break suggestions, and mental fatigue detection during long study sessions.
                  </p>
                </div>
                <Switch
                  checked={settings['WELLBEING_MODULE_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('WELLBEING_MODULE_ENABLED', checked)}
                />
              </div>

              {/* Audio Study Rooms */}
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <Label className="text-sm font-semibold">Live Audio Study Rooms</Label>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Allow students to enter live voice study rooms for group exam preparation and verbal note summaries.
                  </p>
                </div>
                <Switch
                  checked={settings['AUDIO_ROOMS_ENABLED'] !== 'false'}
                  onCheckedChange={(checked) => handleToggleChange('AUDIO_ROOMS_ENABLED', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Free Tier & Resource Quotas */}
        <TabsContent value="quotas" className="space-y-4 m-0">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Free Tier Constraints & Storage Ceilings
              </CardTitle>
              <CardDescription className="text-xs">
                Govern free user allocations, rate limits, and maximum file upload thresholds to manage cloud operating costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Free Course Limit</Label>
                  <p className="text-[11px] text-muted-foreground">Maximum active courses allowed on free accounts</p>
                  <Input
                    type="number"
                    value={settings['FREE_COURSE_LIMIT'] || '3'}
                    onChange={(e) => handleValueChange('FREE_COURSE_LIMIT', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Free Lectures per Course</Label>
                  <p className="text-[11px] text-muted-foreground">Maximum slide decks processed per course</p>
                  <Input
                    type="number"
                    value={settings['FREE_LECTURE_LIMIT'] || '5'}
                    onChange={(e) => handleValueChange('FREE_LECTURE_LIMIT', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Daily Free AI Calls</Label>
                  <p className="text-[11px] text-muted-foreground">Max AI questions answered per student every 24 hours</p>
                  <Input
                    type="number"
                    value={settings['FREE_AI_CALLS_PER_DAY'] || '30'}
                    onChange={(e) => handleValueChange('FREE_AI_CALLS_PER_DAY', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Pro Trial Duration (Days)</Label>
                  <p className="text-[11px] text-muted-foreground">Complimentary Pro access granted to new signups</p>
                  <Input
                    type="number"
                    value={settings['FREE_TRIAL_DAYS'] || '7'}
                    onChange={(e) => handleValueChange('FREE_TRIAL_DAYS', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Max Lecture Slide Upload (MB)</Label>
                  <p className="text-[11px] text-muted-foreground">Maximum allowed file size for PPTX and PDF uploads</p>
                  <Input
                    type="number"
                    value={settings['MAX_UPLOAD_SIZE_MB'] || '50'}
                    onChange={(e) => handleValueChange('MAX_UPLOAD_SIZE_MB', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Max Past Paper File Size (MB)</Label>
                  <p className="text-[11px] text-muted-foreground">Maximum file size for exam question paper uploads</p>
                  <Input
                    type="number"
                    value={settings['MAX_PAPER_UPLOAD_SIZE_MB'] || '25'}
                    onChange={(e) => handleValueChange('MAX_PAPER_UPLOAD_SIZE_MB', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Pricing & Commercial Monetization */}
        <TabsContent value="pricing" className="space-y-4 m-0">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" /> Commercial Pricing & Promotional Campaigns
              </CardTitle>
              <CardDescription className="text-xs">
                Set subscription tiers, currency denominations, and sitewide promotional discounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Billing Currency Symbol</Label>
                  <p className="text-[11px] text-muted-foreground">e.g. GH₵ for Ghana Cedis, $ for USD</p>
                  <Input
                    value={settings['CURRENCY_SYMBOL'] || 'GH₵'}
                    onChange={(e) => handleValueChange('CURRENCY_SYMBOL', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Pro Plan Monthly Price</Label>
                  <p className="text-[11px] text-muted-foreground">Standard tier price billed via Paystack</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-xs">
                      {settings['CURRENCY_SYMBOL'] || 'GH₵'}
                    </span>
                    <Input
                      type="number"
                      value={settings['PRICE_PRO'] || '49'}
                      onChange={(e) => handleValueChange('PRICE_PRO', e.target.value)}
                      className="h-9 text-xs font-mono pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Ultra Plan Monthly Price</Label>
                  <p className="text-[11px] text-muted-foreground">Unlimited AI tutoring & mock exam tier</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-xs">
                      {settings['CURRENCY_SYMBOL'] || 'GH₵'}
                    </span>
                    <Input
                      type="number"
                      value={settings['PRICE_ULTRA'] || '99'}
                      onChange={(e) => handleValueChange('PRICE_ULTRA', e.target.value)}
                      className="h-9 text-xs font-mono pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Sitewide Promotional Discount (%)</Label>
                  <p className="text-[11px] text-muted-foreground">Applies immediate discount at checkout (0 to disable)</p>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings['DISCOUNT_PERCENTAGE'] || '0'}
                      onChange={(e) => handleValueChange('DISCOUNT_PERCENTAGE', e.target.value)}
                      className="h-9 text-xs font-mono pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground font-mono text-xs">%</span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="font-semibold text-xs">Promotional Banner Announcement</Label>
                  <p className="text-[11px] text-muted-foreground">Copy displayed on the public landing page and student checkout</p>
                  <Input
                    value={settings['PROMO_BANNER_TEXT'] || ''}
                    onChange={(e) => handleValueChange('PROMO_BANNER_TEXT', e.target.value)}
                    placeholder="e.g. Midsem Special: 20% off all plans this week!"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: AI Engine & Routing */}
        <TabsContent value="ai" className="space-y-4 m-0">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-violet-500" /> AI Gateway, Latency Guards & Model Policies
              </CardTitle>
              <CardDescription className="text-xs">
                Configure primary AI inference models, failover triggers, output token bounds, and LaTeX formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Primary Inference Provider</Label>
                  <p className="text-[11px] text-muted-foreground">Default model serving AI Tutor & explanations</p>
                  <Select
                    value={settings['PRIMARY_AI_PROVIDER'] || 'groq'}
                    onValueChange={(v) => handleValueChange('PRIMARY_AI_PROVIDER', v || 'groq')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groq">Groq (Llama 3.3 70B Versatile)</SelectItem>
                      <SelectItem value="gemini">Google Gemini (Gemini 2.5 Flash)</SelectItem>
                      <SelectItem value="mistral">Mistral AI (Mistral Small)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Secondary Fallback Provider</Label>
                  <p className="text-[11px] text-muted-foreground">Activated automatically when primary times out</p>
                  <Select
                    value={settings['SECONDARY_AI_PROVIDER'] || 'gemini'}
                    onValueChange={(v) => handleValueChange('SECONDARY_AI_PROVIDER', v || 'gemini')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini (Gemini 2.5 Flash)</SelectItem>
                      <SelectItem value="groq">Groq (Llama 3.3 70B)</SelectItem>
                      <SelectItem value="mistral">Mistral AI (Mistral Small)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Fallback Latency Threshold (ms)</Label>
                  <p className="text-[11px] text-muted-foreground">Trigger provider failover if latency exceeds threshold</p>
                  <Input
                    type="number"
                    value={settings['AI_FALLBACK_LATENCY_THRESHOLD_MS'] || '2000'}
                    onChange={(e) => handleValueChange('AI_FALLBACK_LATENCY_THRESHOLD_MS', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">Max Tokens per Response</Label>
                  <p className="text-[11px] text-muted-foreground">Upper token ceiling on AI lecture answers</p>
                  <Input
                    type="number"
                    value={settings['MAX_AI_TOKENS_PER_RESPONSE'] || '2048'}
                    onChange={(e) => handleValueChange('MAX_AI_TOKENS_PER_RESPONSE', e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">KaTeX Formula Auto-Formatting</Label>
                  <p className="text-[11px] text-muted-foreground">Standardize STEM expressions into $...$ delimiters</p>
                  <Select
                    value={settings['LATEX_AUTOFMT_ENABLED'] !== 'false' ? 'true' : 'false'}
                    onValueChange={(v) => handleValueChange('LATEX_AUTOFMT_ENABLED', v || 'true')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled (Strict KaTeX standard)</SelectItem>
                      <SelectItem value="false">Disabled (Raw markdown)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-xs">RAG Hallucination Guard</Label>
                  <p className="text-[11px] text-muted-foreground">Reject responses lacking span-grounding citations</p>
                  <Select
                    value={settings['HALLUCINATION_GUARD_STRICT'] !== 'false' ? 'true' : 'false'}
                    onValueChange={(v) => handleValueChange('HALLUCINATION_GUARD_STRICT', v || 'true')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Strict (LettuceDetect Grounding)</SelectItem>
                      <SelectItem value="false">Permissive (Standard Context)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Governance Audit Log */}
        <TabsContent value="audit" className="space-y-4 m-0">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Configuration Governance & Change Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable audit trail of administrator modifications made to platform configuration keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {log.details?.key || 'SETTING'}
                          </Badge>
                          <span className="font-semibold text-foreground">
                            Updated to <code className="bg-muted px-1.5 py-0.5 rounded text-primary">{String(log.details?.value)}</code>
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                          <span>Admin UID: {log.admin_id || 'System'}</span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-muted-foreground shrink-0">
                        <div className="font-medium text-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-[10px] opacity-75">
                          {format(new Date(log.created_at), 'MMM d, yyyy (p)')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-muted-foreground space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Zero Configuration Alerts</p>
                  <p>All platform settings are running within standard baseline thresholds.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Bottom Save Bar when Dirty */}
      {isDirty && (
        <div className="fixed bottom-6 right-8 z-50 p-3 bg-card border border-border shadow-xl rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">{dirtyKeys.length} unsaved modification{dirtyKeys.length > 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="h-8 text-xs"
            >
              Discard
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAll}
              disabled={saving}
              className="h-8 text-xs font-semibold shadow-sm"
            >
              {saving ? <Activity className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
