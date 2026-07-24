"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Key, Plus, Trash2, RefreshCw } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [provider, setProvider] = useState('grok');
  const [keyValue, setKeyValue] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchKeys();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_api_keys',
        },
        (payload) => {
          // Immediately update the key in the state array without refreshing
          setKeys((currentKeys) =>
            currentKeys.map((k) =>
              k.id === payload.new.id ? { ...k, ...payload.new } : k
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setKeys(data);
    setLoading(false);
  };

  const addKey = async () => {
    if (!keyValue.trim()) return;
    const { error } = await supabase
      .from('ai_api_keys')
      .insert([{ provider, key_value: keyValue }]);
    
    if (!error) {
      setKeyValue('');
      fetchKeys();
    } else {
      alert("Failed to add key: " + error.message);
    }
  };

  const deleteKey = async (id: string) => {
    await supabase.from('ai_api_keys').delete().eq('id', id);
    fetchKeys();
  };

  const reactivateKey = async (id: string) => {
    await supabase.from('ai_api_keys').update({ status: 'active' }).eq('id', id);
    fetchKeys();
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="hidden">
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus size={20} /> Add New Key
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Select value={provider} onValueChange={(val: any) => setProvider(val || '')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grok">Grok (Groq)</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="cohere">Cohere</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Paste API Key here (e.g., gsk_...)" 
              value={keyValue} 
              onChange={(e) => setKeyValue(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addKey} disabled={!keyValue.trim()}>Add Key</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2"><Key size={20} /> Active Pool</div>
            <Button variant="outline" size="sm" onClick={fetchKeys}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No keys in the pool yet. Using system .env fallback.</p>
          ) : (
            <div className="space-y-4">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div>
                    <h3 className="font-semibold uppercase tracking-wider text-sm">{k.provider}</h3>
                    <p className="font-mono text-sm text-muted-foreground mt-1">
                      {k.key_value.substring(0, 8)}...{k.key_value.substring(k.key_value.length - 4)}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        k.status === 'active' ? 'bg-green-100 text-green-700' :
                        k.status === 'rate_limited' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {k.status}
                      </span>
                      <span className="text-muted-foreground">Used: {k.usage_count} times</span>
                      <span className="text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        Tokens: {(k.total_tokens_used || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {k.status !== 'active' && (
                      <Button variant="outline" size="sm" onClick={() => reactivateKey(k.id)}>Reactivate</Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => deleteKey(k.id)}><Trash2 size={16} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
