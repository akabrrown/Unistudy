import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeGrid } from '@/components/study/BadgeGrid'
import { MoodCheckin } from '@/components/study/MoodCheckin'
import { StudyHeatmap } from '@/components/analytics/StudyHeatmap'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to UniStudy</h1>
        <div className="w-full md:w-auto">
          <MoodCheckin />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Study Streak</CardTitle>
            <CardDescription>Keep it going!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">3 Days</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total XP</CardTitle>
            <CardDescription>Your learning progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">1,250 XP</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming Exams</CardTitle>
            <CardDescription>Stay prepared</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">None</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="h-64 flex items-center justify-center border-dashed border-2 bg-transparent shadow-none">
          <div className="text-muted-foreground">Recent Courses will appear here</div>
        </Card>
        <Card className="h-64 shadow-sm border-border">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Study Heatmap</CardTitle>
            <CardDescription>Your consistency over the year</CardDescription>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)] flex items-center">
            <StudyHeatmap />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Achievements</h2>
        <BadgeGrid />
      </div>
    </div>
  )
}
