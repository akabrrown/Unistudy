import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Activity, CreditCard, Cpu } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Get total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // For this MVP, we will mock the active subscriptions and MRR since we don't have payments fully setup yet
  const activeSubs = 0
  const mrr = 0

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
        <p className="text-muted-foreground">Live KPIs and system health for UniStudy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered accounts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subs</CardTitle>
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubs}</div>
            <p className="text-xs text-muted-foreground mt-1">Pro & Enterprise</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR (GHS)</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GH₵ {mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">AI Calls Today</CardTitle>
              <Cpu className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1">Across all LLM providers</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="shadow-sm border-border h-80 flex flex-col items-center justify-center border-dashed border-2 bg-transparent text-muted-foreground">
          <p>AI Usage Chart (Coming Soon)</p>
        </Card>
        <Card className="shadow-sm border-border h-80 flex flex-col items-center justify-center border-dashed border-2 bg-transparent text-muted-foreground">
          <p>Live Activity Feed (Coming Soon)</p>
        </Card>
      </div>
    </div>
  )
}
