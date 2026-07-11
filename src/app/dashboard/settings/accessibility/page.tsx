'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Accessibility, Eye, Type, Contrast } from 'lucide-react';

export default function AccessibilitySettings() {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPrefs() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setPrefs(data);
      } else {
        // Create default if doesn't exist
        const defaultPrefs = { user_id: user.id, dyslexia_font: false, high_contrast: false, text_size: 'normal' };
        await supabase.from('user_preferences').insert(defaultPrefs);
        setPrefs(defaultPrefs);
      }
      setLoading(false);
    }
    fetchPrefs();
  }, []);

  const handleSave = async (newPrefs: any) => {
    setPrefs(newPrefs);
    setSaving(true);
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('user_preferences')
      .update(newPrefs)
      .eq('user_id', user?.id);
      
    setSaving(false);
    
    if (error) {
      toast.error('Failed to save preferences');
    } else {
      toast.success('Accessibility settings updated!');
      // Dispatch event to update Layout instantly
      window.dispatchEvent(new Event('accessibility-updated'));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Accessibility className="w-6 h-6 text-primary" /> Accessibility & Personalisation
        </h2>
        <p className="text-muted-foreground mt-1">Customise UniStudy to fit your learning needs.</p>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        
        {/* OpenDyslexic Font */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="mt-1 bg-primary/10 p-2 rounded-lg">
              <Type className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Dyslexia-Friendly Font</h3>
              <p className="text-sm text-muted-foreground">Changes all text to the OpenDyslexic typeface for easier reading.</p>
            </div>
          </div>
          <Switch 
            checked={prefs.dyslexia_font} 
            onCheckedChange={(c) => handleSave({ ...prefs, dyslexia_font: c })} 
            disabled={saving}
          />
        </div>

        {/* High Contrast Mode */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="mt-1 bg-primary/10 p-2 rounded-lg">
              <Contrast className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">High Contrast Mode</h3>
              <p className="text-sm text-muted-foreground">Increases the contrast between text and background colours.</p>
            </div>
          </div>
          <Switch 
            checked={prefs.high_contrast} 
            onCheckedChange={(c) => handleSave({ ...prefs, high_contrast: c })} 
            disabled={saving}
          />
        </div>

        {/* Text Size */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="mt-1 bg-primary/10 p-2 rounded-lg">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Base Text Size</h3>
              <p className="text-sm text-muted-foreground">Adjust the default size of text across the platform.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={prefs.text_size === 'normal' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleSave({ ...prefs, text_size: 'normal' })}
            >
              Normal
            </Button>
            <Button 
              variant={prefs.text_size === 'large' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleSave({ ...prefs, text_size: 'large' })}
            >
              Large
            </Button>
            <Button 
              variant={prefs.text_size === 'xlarge' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => handleSave({ ...prefs, text_size: 'xlarge' })}
            >
              Extra Large
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
