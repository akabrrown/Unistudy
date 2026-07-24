'use client';

import { useState } from 'react';
import { useSettings, DisplayTheme, FontFamily, TextSize, LineSpacing, ColorBlindMode, AIPersonality, AIReadingLevel, AITone, LearningStyle, Language } from '@/contexts/SettingsContext';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MonitorSmartphone, Type, Bot, Globe, Wifi } from 'lucide-react';

export default function AccessibilitySettingsPage() {
  const t = useTranslations();
  const { settings, updateSettings, loading } = useSettings();

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading preferences...</div>;

  const handleUpdate = async (updates: Partial<typeof settings>) => {
    try {
      await updateSettings(updates);
      toast.success('Settings updated', { position: 'bottom-right' });
    } catch {
      toast.error('Failed to update settings');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('accessibility.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('accessibility.description')}
        </p>
      </div>

      <div className="grid gap-6">
        
        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5 text-primary" /> Display & Typography
            </CardTitle>
            <CardDescription>Adjust how text and colors appear on your screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <div className="text-sm text-muted-foreground">Switch between light and dark themes.</div>
              </div>
              <Select value={settings.theme} onValueChange={(val) => handleUpdate({ theme: val as DisplayTheme })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dyslexia Friendly Font</Label>
                <div className="text-sm text-muted-foreground">Use OpenDyslexic font everywhere.</div>
              </div>
              <Switch 
                checked={settings.font_family === 'opendyslexic'} 
                onCheckedChange={(checked) => handleUpdate({ font_family: checked ? 'opendyslexic' : 'inter' })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High Contrast Mode</Label>
                <div className="text-sm text-muted-foreground">Maximum contrast for low visibility.</div>
              </div>
              <Switch 
                checked={settings.high_contrast} 
                onCheckedChange={(checked) => handleUpdate({ high_contrast: checked })} 
              />
            </div>

            <div className="space-y-3">
              <Label>Text Size</Label>
              <RadioGroup 
                value={settings.text_size} 
                onValueChange={(val) => handleUpdate({ text_size: val as TextSize })}
                className="flex flex-wrap gap-4"
              >
                {['small', 'normal', 'large', 'extra-large'].map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <RadioGroupItem value={size} id={`size-${size}`} />
                    <Label htmlFor={`size-${size}`} className="capitalize">{size}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div className="space-y-3">
              <Label>Color Blind Mode</Label>
              <Select value={settings.color_blind_mode || 'none'} onValueChange={(val) => handleUpdate({ color_blind_mode: val === 'none' ? null : val as ColorBlindMode })}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Default Colors)</SelectItem>
                  <SelectItem value="deuteranopia">Deuteranopia (Green Blind)</SelectItem>
                  <SelectItem value="protanopia">Protanopia (Red Blind)</SelectItem>
                  <SelectItem value="achromatopsia">Achromatopsia (Monochromacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> AI Tutor Personalization
            </CardTitle>
            <CardDescription>Customize how your AI tutor speaks and explains concepts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-3">
              <Label>Tutor Name</Label>
              <Input 
                value={settings.ai_tutor_name} 
                onChange={(e) => handleUpdate({ ai_tutor_name: e.target.value })}
                placeholder="Name your tutor (e.g. Uni, Prof. Smith)" 
                className="max-w-xs"
              />
            </div>

            <div className="space-y-3">
              <Label>Personality</Label>
              <RadioGroup 
                value={settings.ai_personality} 
                onValueChange={(val) => handleUpdate({ ai_personality: val as AIPersonality })}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                {['neutral','encouraging','strict','funny','motivational','empathetic','curious'].map((p) => (
                  <div key={p} className="flex items-center space-x-2">
                    <RadioGroupItem value={p} id={`personality-${p}`} />
                    <Label htmlFor={`personality-${p}`} className="capitalize">{p}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Explanation Complexity</Label>
              <Select value={settings.ai_reading_level} onValueChange={(val) => handleUpdate({ ai_reading_level: val as AIReadingLevel })}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">Simplified (Like I'm 5)</SelectItem>
                  <SelectItem value="beginner">Beginner (High School)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (College Intro)</SelectItem>
                  <SelectItem value="advanced">Advanced (Upper Level)</SelectItem>
                  <SelectItem value="expert">Expert (Post-grad)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>Subject Tone</Label>
                <div className="text-sm text-muted-foreground">Keep it academic or casual.</div>
              </div>
              <Select value={settings.ai_tone} onValueChange={(val) => handleUpdate({ ai_tone: val as AITone })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="casual">Casual & Conversational</SelectItem>
                </SelectContent>
              </Select>
            
              </div>
              {/* UI Language */}
              <div className="space-y-3">
                <Label>App Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(val) => handleUpdate({ language: val as Language })}
                >
                  <SelectTrigger className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="tw">Twi</SelectItem>
                    <SelectItem value="ha">Hausa</SelectItem>
                    <SelectItem value="yo">Yoruba</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>


          </CardContent>
        </Card>

        {/* Performance & Network */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" /> Performance & Connectivity
            </CardTitle>
            <CardDescription>Optimize UniStudy for slow internet or older devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Bandwidth Mode</Label>
                <div className="text-sm text-muted-foreground max-w-[80%]">
                  Compresses slide images, disables prefetching, and turns off animations to save mobile data.
                </div>
              </div>
              <Switch 
                checked={settings.low_bandwidth} 
                onCheckedChange={(checked) => handleUpdate({ low_bandwidth: checked })} 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Simplified UI Mode</Label>
                <div className="text-sm text-muted-foreground max-w-[80%]">
                  Hides advanced tools (calculator, focus timer) to provide a distraction-free learning experience.
                </div>
              </div>
              <Switch 
                checked={settings.simplified_mode} 
                onCheckedChange={(checked) => handleUpdate({ simplified_mode: checked })} 
              />
            </div>

          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Language & Region
            </CardTitle>
            <CardDescription>Change the UI language and AI delivery language.</CardDescription>
          </CardHeader>
          <CardContent>
            
            <div className="space-y-3">
              <Label>Primary Language</Label>
              <Select value={settings.language} onValueChange={(val) => handleUpdate({ language: val as Language })}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (Default)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                  <SelectItem value="tw">Twi (Ghana)</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                  <SelectItem value="yo">Yoruba</SelectItem>
                  <SelectItem value="sw">Swahili</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
