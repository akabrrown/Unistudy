# UniStudy Development Roadmap & Queued Features

## 🚀 Recent Deliverables

### ✅ Progressive Web App (PWA) & Offline Shell (Phase 1)
- **Web App Manifest:** Standalone display, UPSA brand theme `#00004E`, collegiate icons, and mobile install prompt.
- **Service Worker (`public/sw.js`):** Pre-caches critical assets, executes network-first navigation with 3.5s timeout, cache-first for static media, and serves `/offline` fallback when disconnected.
- **Offline Fallback Page (`/offline`):** Collegiate offline experience with real-time connectivity detection, auto-reload on reconnect, and direct links to locally cached dashboards and past papers.
- **PWA Manager (`components/pwa/PwaManager.tsx`):** Seamless install prompt handler, live online/offline toast notifications, and Dexie IndexedDB integration.

---

## 📌 Next Priority Milestone: UniLecture Live (Interactive AI Lecturer)

> **Status:** Queued / Ready for Implementation  
> **Chosen Approach:** **Option A — Real-Time Audio-Synced Live Lecturer**

### Architectural Summary
- **Zero-Latency Audio Delivery:** Web Speech Synthesis API + Edge TTS / ElevenLabs with word-level subtitle tracking. Starts lecturing in < 1 second without waiting for video rendering.
- **Visual Presentation Canvas:** Central presentation slide with an audio-reactive 2D animated avatar / collegiate waveform indicator.
- **Interactive Interruption Engine:**
  - Floating **"Pause & Ask"** mic button (or Spacebar / voice barge-in).
  - Audio pauses instantly when the student interrupts.
  - Student asks their question via voice or text.
  - The AI Tutor answers with full context of the active slide.
  - Lecture seamlessly resumes at the exact timestamp or next concept upon command.
- **Auto-Progression:** Automatically advances to Slide $N+1$ when current slide narration finishes.

### Planned Implementation Tasks
1. **Audio Narration Engine:** Integrate synthesis service with slide text + vision context in [`actions/explain.ts`](file:///c:/Users/Dell/Desktop/PROjects/Unistudy/frontend/src/app/actions/explain.ts).
2. **Audio-Reactive Lecturer Component:** Design collegiate speaking waveform avatar for the lecture viewer.
3. **Voice Interruption Hook:** Implement `useSpeechRecognition` with pause/resume state machine.
4. **Contextual Slide Q&A Bridge:** Connect student questions directly to the active slide's visual context.
