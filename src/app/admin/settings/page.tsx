import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  // Fetch settings
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')

  const settingsMap = (settings || []).reduce((acc, curr) => {
    acc[curr.key] = curr.value
    return acc
  }, {} as Record<string, string>)

  // Default values based on spec if not set
  const isMaintenance = settingsMap['MAINTENANCE_MODE'] === 'true'
  const isCommunityBank = settingsMap['COMMUNITY_BANK_ENABLED'] !== 'false'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Toggle features and configure limits globally.</p>
      </div>

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
            <Switch checked={isMaintenance} disabled />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Community Past Papers</Label>
              <p className="text-sm text-muted-foreground">Allow students to share past papers globally.</p>
            </div>
            <Switch checked={isCommunityBank} disabled />
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
              <input type="number" defaultValue={settingsMap['FREE_COURSE_LIMIT'] || 3} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" disabled />
            </div>
            <div className="space-y-2">
              <Label>Free AI Calls per Day</Label>
              <input type="number" defaultValue={settingsMap['FREE_AI_CALLS_PER_DAY'] || 30} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" disabled />
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Note: Server actions to update settings are not wired up in this MVP preview.</p>
    </div>
  )
}
