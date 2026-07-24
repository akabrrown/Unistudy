'use client';

import { useState, useEffect } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  ControlBar, 
  ParticipantLoop,
  ParticipantName, 
  TrackMutedIndicator,
  useParticipantContext,
  useParticipants
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AudioRoom({ roomName }: { roomName: string }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/audio/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName })
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error);
        } else {
          setToken(d.token);
        }
      })
      .catch(e => setError(e.message));
  }, [roomName]);

  if (error) {
    return <div className="p-4 text-destructive bg-destructive/10 rounded-xl text-sm border border-destructive/20">{error}</div>;
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Connecting to secure audio room...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
      audio={true}
      video={false}
      className="flex flex-col h-full rounded-xl overflow-hidden"
    >
      <div className="flex-1 overflow-y-auto p-6 bg-card">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Audio Study Session
        </h3>
        
        <ActiveParticipantsGrid />
      </div>

      <div className="bg-background border-t p-4 flex justify-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <ControlBar controls={{ microphone: true, camera: false, screenShare: false, chat: false }} />
      </div>
      
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function ActiveParticipantsGrid() {
  const participants = useParticipants();

  if (participants.length === 0) {
    return <div className="text-muted-foreground text-center py-8">Waiting for others to join...</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <ParticipantLoop participants={participants}>
        <ParticipantCard />
      </ParticipantLoop>
    </div>
  );
}

function ParticipantCard() {
  const participant = useParticipantContext();
  
  return (
    <Card className="flex flex-col items-center justify-center p-6 bg-muted/30 border-muted relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3 relative">
        <span className="text-xl font-bold">
          <ParticipantName />
        </span>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
          <TrackMutedIndicator trackRef={{ participant, source: 'microphone' as any }} show={'muted'} className="text-destructive w-4 h-4" />
        </div>
      </div>
      <div className="text-sm font-medium text-center truncate w-full">
        <ParticipantName />
      </div>
    </Card>
  );
}
