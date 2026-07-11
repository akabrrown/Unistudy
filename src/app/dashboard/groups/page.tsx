'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, Trash2, LogOut, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  userRole: 'admin' | 'member';
  created_by: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });

  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (res.ok) setGroups(data.groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newGroup.name.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setGroups([...groups, data.group]);
      setIsCreating(false);
      setNewGroup({ name: '', description: '' });
      toast.success('Group created successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', groupId: joinCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await fetchGroups();
      setIsJoining(false);
      setJoinCode('');
      toast.success('Successfully joined group!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLeaveOrDelete = async (id: string, action: 'leave' | 'delete') => {
    try {
      const res = await fetch(`/api/groups?id=${id}&action=${action}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to perform action');
      
      setGroups(groups.filter(g => g.id !== id));
      toast(action === 'delete' ? 'Group deleted' : 'Left group');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyInviteCode = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast('Invite code copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Users className="w-8 h-8" /> Study Groups
          </h1>
          <p className="text-muted-foreground mt-1">Collaborate, share flashcards, and compete with friends.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => { setIsJoining(true); setIsCreating(false); }}>
            <UserPlus className="w-4 h-4 mr-2" /> Join Group
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => { setIsCreating(true); setIsJoining(false); }}>
            <Plus className="w-4 h-4 mr-2" /> Create Group
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-semibold mb-4">Create a New Study Group</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input 
                type="text" 
                value={newGroup.name} 
                onChange={e => setNewGroup({...newGroup, name: e.target.value})} 
                className="w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="e.g. CS101 Study Squad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <input 
                type="text" 
                value={newGroup.description} 
                onChange={e => setNewGroup({...newGroup, description: e.target.value})} 
                className="w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none" 
                placeholder="What is this group about?"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newGroup.name.trim()}>Create Group</Button>
            </div>
          </div>
        </div>
      )}

      {isJoining && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-semibold mb-4">Join an Existing Group</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">Invite Code</label>
              <input 
                type="text" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value)} 
                className="w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm" 
                placeholder="Paste the unique group ID here..."
              />
              <p className="text-xs text-muted-foreground mt-2">Ask the group admin to click "Copy Invite Code" on their group card.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsJoining(false)}>Cancel</Button>
              <Button onClick={handleJoin} disabled={!joinCode.trim()}>Join Group</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p>Loading your groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-24 bg-card border border-dashed border-border rounded-xl">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">You aren't in any groups yet.</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Create a group to study with friends, or join an existing one using an invite code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col hover:border-primary/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                {group.userRole === 'admin' && (
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-1">{group.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">
                {group.description || 'No description provided.'}
              </p>
              
              <div className="mt-auto space-y-3">
                <Button 
                  variant="secondary" 
                  className="w-full justify-between"
                  onClick={() => copyInviteCode(group.id)}
                >
                  <span className="truncate mr-2 text-xs font-mono">{group.id.split('-')[0]}...</span>
                  {copiedId === group.id ? (
                    <span className="flex items-center text-green-500"><Check className="w-4 h-4 mr-1"/> Copied</span>
                  ) : (
                    <span className="flex items-center"><Copy className="w-4 h-4 mr-1"/> Invite Code</span>
                  )}
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => toast.info('Group Dashboard coming soon!')}>
                    View Group
                  </Button>
                  
                  {group.userRole === 'admin' ? (
                    <Button variant="destructive" size="icon" onClick={() => handleLeaveOrDelete(group.id, 'delete')} title="Delete Group">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-white border-destructive/30" onClick={() => handleLeaveOrDelete(group.id, 'leave')} title="Leave Group">
                      <LogOut className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
