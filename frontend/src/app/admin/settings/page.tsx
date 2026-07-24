import { createClient } from '@/lib/supabase/server'
import SettingsClient from './settings-client'
import { Activity } from 'lucide-react'

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Settings</h1>
        <p className="text-muted-foreground">Toggle features and configure limits globally.</p>
      </div>
      
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <a href="/admin/pricing-features" className="block p-6 bg-card border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-[var(--color-plum-500)]">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-[var(--color-plum-500)]" /> Pricing & Features</h2>
          <p className="text-sm text-muted-foreground">Manage which features are included in Free vs Pro plans.</p>
        </a>
      </div>

      <SettingsClient initialSettings={settingsMap} />
    </div>
  )
}
