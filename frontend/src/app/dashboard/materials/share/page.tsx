'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ShareMaterialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId');
  
  const [loading, setLoading] = useState(false);
  const [lectures, setLectures] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const [selectedLectureId, setSelectedLectureId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(preselectedGroupId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lecRes, grpRes] = await Promise.all([
        fetch('/api/lectures'),
        fetch('/api/groups')
      ]);
      
      const lecData = await lecRes.json();
      const grpData = await grpRes.json();
      
      if (lecRes.ok) setLectures(lecData.lectures || []);
      if (grpRes.ok) setGroups(grpData.groups || []);
      
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLectureId || !title || !selectedGroupId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/materials/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'lecture',
          contentId: selectedLectureId,
          title,
          description,
          shareScope: 'group',
          groupId: selectedGroupId,
          permission: 'view'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Material shared successfully!');
      router.push(`/dashboard/groups/${selectedGroupId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to share material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Share Material to a Group</CardTitle>
          <CardDescription>Select one of your lectures to share with a study group.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleShare} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lecture">Select Lecture *</Label>
              <Select value={selectedLectureId} onValueChange={(val) => {
                const stringVal = val as string;
                setSelectedLectureId(stringVal);
                const lec = lectures.find(l => l.id === stringVal);
                if (lec && !title) setTitle(lec.title);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lecture" />
                </SelectTrigger>
                <SelectContent>
                  {lectures.map(lec => (
                    <SelectItem key={lec.id} value={lec.id}>{lec.title}</SelectItem>
                  ))}
                  {lectures.length === 0 && <SelectItem value="none" disabled>No lectures found</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="E.g. Midterm Review Lecture"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Add some context..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Share with Group *</Label>
              <Select value={selectedGroupId} onValueChange={(val) => setSelectedGroupId(val as string)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(grp => (
                    <SelectItem key={grp.id} value={grp.id}>{grp.name}</SelectItem>
                  ))}
                  {groups.length === 0 && <SelectItem value="none" disabled>No groups found</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Share Material
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
