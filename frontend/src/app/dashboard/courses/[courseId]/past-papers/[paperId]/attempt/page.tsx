'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function PastPaperAttemptRedirectPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (params?.paperId) {
      router.replace(`/dashboard/past-papers/${params.paperId}`)
    }
  }, [params?.paperId, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      <p className="text-muted-foreground text-sm">Opening past paper exam...</p>
    </div>
  )
}
