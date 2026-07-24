'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Key, Gauge } from 'lucide-react'
import UsageMonitor from './UsageMonitor'
import ApiKeys from './ApiKeys'
import SharedQuota from './SharedQuota'

export default function AiInfrastructurePage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">AI Infrastructure</h1>
        <p className="text-muted-foreground text-sm">
          Unified control center for AI usage, API keys, and global fallback quotas.
        </p>
      </div>

      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="h-auto p-1 gap-1 w-full sm:w-auto bg-muted/60 rounded-lg">
          <TabsTrigger value="usage" className="gap-2 px-4 py-2 text-sm rounded-md">
            <Activity className="w-4 h-4" />
            Usage monitor
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2 px-4 py-2 text-sm rounded-md">
            <Key className="w-4 h-4" />
            API key pools
          </TabsTrigger>
          <TabsTrigger value="quota" className="gap-2 px-4 py-2 text-sm rounded-md">
            <Gauge className="w-4 h-4" />
            Shared global quota
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="usage" className="mt-6">
          <UsageMonitor />
        </TabsContent>
        
        <TabsContent value="keys" className="mt-6">
          <ApiKeys />
        </TabsContent>

        <TabsContent value="quota" className="mt-6">
          <SharedQuota />
        </TabsContent>
      </Tabs>
    </div>
  )
}
