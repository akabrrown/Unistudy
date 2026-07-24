**UniStudy AI**  
**New Features Documentation**  
_8 New Features · Signup Enhancements · YouTube Study · Material Sharing · Discussion & Audio_

<table><tbody><tr><td>Each feature includes: description · UI/UX · database changes · API routes · links to existing features · phase placement</td></tr></tbody></table>

**Table of Contents**
=====================

**OVERVIEW**  
This document covers 8 new features added to UniStudy AI. Features 1 through 6 are enhancements to the existing signup flow. Features 7 and 8 are entirely new platform modules — YouTube Study integration and a full Discussion and Audio platform. Each feature is documented with its full UI, database changes, API routes, and how it connects to existing features already built in Phases 1 through 5.

<table><tbody><tr><td><strong>Ref</strong></td><td><strong>Feature</strong></td><td><strong>Type</strong></td><td><strong>Phase Placement</strong></td></tr><tr><td>F1</td><td>Avatar Selection on Signup</td><td>Signup Enhancement</td><td>Phase 1 — Auth</td></tr><tr><td>F2</td><td>Student Email Recommendation</td><td>Signup Enhancement</td><td>Phase 1 — Auth</td></tr><tr><td>F3</td><td>University / Institution Selector</td><td>Signup Enhancement</td><td>Phase 1 — Auth</td></tr><tr><td>F4</td><td>Course of Study Field</td><td>Signup Enhancement</td><td>Phase 1 — Auth</td></tr><tr><td>F5</td><td>Study Frequency Preference</td><td>Signup Enhancement</td><td>Phase 1 — Auth</td></tr><tr><td>F6</td><td>YouTube Study Integration</td><td>New Module</td><td>Phase 2 — Practice</td></tr><tr><td>F7</td><td>Study Material Sharing</td><td>New Module</td><td>Phase 4 — Community</td></tr><tr><td>F8</td><td>Discussion — Chat and Audio Platform</td><td>New Module</td><td>Phase 4 — Community</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 1<br><strong>Avatar Selection on Signup</strong><br><em>Students choose from 10 preset avatars or upload their own during registration</em></td></tr></tbody></table>

During signup, before the student submits their registration form, they are presented with an avatar selection section. This gives every student a visual identity on the platform from day one without requiring a profile photo. Students who prefer a personal photo can upload one instead.

**1.1 UI/UX Design**
--------------------

The avatar section appears between the password field and the submit button on the signup form. It is labelled 'Choose your avatar' in a small caps label in plum.

*   10 avatar icons are displayed in a 5×2 grid of circles, each 64px in diameter
*   The avatars are illustrated characters — diverse in appearance, gender-neutral options included, and designed to feel academic and friendly rather than corporate
*   Avatars use the platform palette — plum, lavender, and off-white tones — so they feel native to the design system
*   The selected avatar gets a 3px plum border ring and a small plum checkmark badge in the bottom-right corner
*   An 'Upload your own' option appears as an 11th slot — a dashed circle with a camera icon and 'Upload photo' text below
*   Clicking the upload slot opens the native file picker — accepts JPG, PNG, WEBP under 2MB
*   Uploaded photos are cropped to a circle automatically using a simple CSS border-radius — no cropping tool needed at signup
*   On mobile the grid becomes 5×2 scrollable horizontally — the upload slot sits at the end

**1.2 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add avatar_url and avatar_type columns to the profiles table</td></tr></tbody></table>

<table><tbody><tr><td>-- Add to profiles table<br>ALTER TABLE profiles ADD COLUMN avatar_url TEXT;<br>ALTER TABLE profiles ADD COLUMN avatar_type TEXT DEFAULT 'preset';<br>-- avatar_type: 'preset' | 'uploaded'<br>-- Preset avatar URLs stored as Cloudinary paths<br>-- e.g. '/unistudy/avatars/preset/avatar_01.png'<br>-- Uploaded avatars stored under '/unistudy/avatars/users/{userId}/'</td></tr></tbody></table>

**1.3 API Routes**
------------------

<table><tbody><tr><td><strong>API ROUTE</strong></td><td>POST /api/auth/signup — extended to handle avatar_preset_id or avatar_file</td></tr></tbody></table>

<table><tbody><tr><td>// /app/api/auth/signup/route.ts — extended<br>export async function POST(req: NextRequest) {<br>const formData = await req.formData();<br>const avatarPresetId = formData.get('avatar_preset_id') as string | null;<br>const avatarFile = formData.get('avatar_file') as File | null;<br>let avatar_url = null;<br>let avatar_type = 'preset';<br>if (avatarFile) {<br>// Upload custom photo to Cloudinary<br>const buffer = Buffer.from(await avatarFile.arrayBuffer());<br>const result = await cloudinary.uploader.upload(<br>`data:${avatarFile.type};base64,${buffer.toString('base64')}`,<br>{ folder: `unistudy/avatars/users/${userId}`,<br>transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }] }<br>);<br>avatar_url = result.secure_url;<br>avatar_type = 'uploaded';<br>} else if (avatarPresetId) {<br>// Map preset ID to Cloudinary URL<br>avatar_url = `${process.env.NEXT_PUBLIC_CLOUDINARY_BASE}/unistudy/avatars/preset/${avatarPresetId}.png`;<br>avatar_type = 'preset';<br>}<br>// Create Supabase auth user + profile row<br>await supabase.from('profiles').insert({<br>id: newUser.id, email, full_name, avatar_url, avatar_type<br>});<br>}<br>// PUT /api/profile/avatar — update avatar after signup<br>// Allows changing avatar from Settings → Account page</td></tr></tbody></table>

**1.4 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Avatar appears in: sidebar user row, leaderboard table, study group member list, chat messages (Feature 8), doubt board posts, flashcard battle lobby, study partner matcher cards, admin user table, and the profile page header.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 2<br><strong>Student Email Recommendation</strong><br><em>Recommends student email at signup — personal email accepted with a soft nudge</em></td></tr></tbody></table>

Many university students have an institutional email address issued by their university. Using that email to sign up unlocks automatic university verification and connects the student to their institution's ecosystem within the platform. However students without an institutional email or who prefer their personal email are fully supported.

**2.1 UI/UX Design**
--------------------

*   The email field on the signup form has a helper text line below it in muted text: 'We recommend using your student email (e.g. studentid@upsamail.edu.gh) to unlock your university community'
*   As the student types their email, a small detection runs client-side — if the domain matches a known university domain stored in the institutions table, a green verification tick appears beside the field with the text 'University of Professional Studies, Accra detected'
*   If the student uses a personal email (gmail, yahoo, outlook, etc.) the field stays neutral — no error, no warning — just no verification tick
*   Below the email field a small info card appears only when a personal email is detected: 'Using a personal email? You can connect your student email later in Settings to join your university community.' This card is dismissable and never blocks signup
*   The info card uses the pale lavender background with plum text — consistent with the platform's info style

**2.2 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add email_verified_institutional and institutional_domain columns to profiles</td></tr></tbody></table>

<table><tbody><tr><td>ALTER TABLE profiles ADD COLUMN institutional_email TEXT;<br>ALTER TABLE profiles ADD COLUMN email_is_institutional BOOLEAN DEFAULT FALSE;<br>ALTER TABLE profiles ADD COLUMN institution_id UUID REFERENCES institutions(id);<br>-- institutions table (already planned for institutional plan)<br>-- domain column used for auto-detection<br>-- e.g. domain = 'upsamail.edu.gh'<br>-- Settings page: student can add institutional email later<br>-- Verified by sending OTP to the institutional email address</td></tr></tbody></table>

**2.3 Client-Side Domain Detection**
------------------------------------

<table><tbody><tr><td>// components/auth/EmailField.tsx<br>const KNOWN_DOMAINS = await fetch('/api/institutions/domains').then(r =&gt; r.json());<br>// Returns: [{ domain: 'upsamail.edu.gh', name: 'UPSA' }, ...]<br>function detectInstitution(email: string) {<br>const domain = email.split('@')[1]?.toLowerCase();<br>if (!domain) return null;<br>return KNOWN_DOMAINS.find(inst =&gt; inst.domain === domain) || null;<br>}<br>// Called on every keystroke with 300ms debounce<br>const institution = detectInstitution(emailValue);<br>// If institution found: show green tick + institution name<br>// If not found: show neutral state — no error</td></tr></tbody></table>

**2.4 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Institutional email detection links to Feature 3 (University Selector) — when a student email is detected, the University field auto-fills with the matched institution. Also links to the Institutional Plan (Phase 5) — verified institutional users are counted toward the university's licence usage.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 3<br><strong>University &amp; Institution Selector</strong><br><em>Students select their institution at signup — building both internal and cross-university communities</em></td></tr></tbody></table>

The institution selector on the signup form allows students to identify which university, college, or polytechnic they attend. This powers the course community features — students from the same institution see each other in leaderboards and study groups, while students from different institutions can still connect through shared courses. The platform supports both an internal ecosystem (same university) and an external ecosystem (cross-university) simultaneously.

**3.1 UI/UX Design**
--------------------

*   A searchable dropdown field labelled 'University or Institution' appears after the full name field on the signup form
*   The dropdown is pre-populated with a curated list of Ghanaian and African universities — University of Ghana, KNUST, UPSA, UCC, Ashesi, GIMPA, UDS, Cape Coast Technical University, and so on
*   Typing in the field filters the list in real time — matching on university name, abbreviation, or city
*   If the student's institution is not in the list, a 'My institution is not listed' option appears at the bottom of the dropdown — clicking it reveals a free-text field to type the institution name manually
*   When an institution is selected, a small badge appears showing the institution's abbreviation in plum — e.g. 'UPSA', 'UG', 'KNUST'
*   Selecting an institution from the list also shows how many students from that institution are already on the platform — 'Join 847 students from UPSA' — using a count from the profiles table
*   The field is recommended but not required — a 'Skip for now' link in muted text allows students to proceed without selecting

**3.2 The Two Ecosystems**
--------------------------

The institution selector creates two overlapping communities on the platform:

*   **Internal ecosystem:** Students from the same institution see a dedicated community space — their university's leaderboard, study groups filtered to their institution, and a community bank of past papers specific to their university's exam papers
*   **External ecosystem:** Students from different institutions studying the same course (e.g. Introduction to Macroeconomics, Calculus I) can find each other, share study materials, and join cross-university study groups
*   Both ecosystems exist simultaneously — a student belongs to their university community AND the broader subject-based community at the same time

**3.3 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>institutions table already planned in Phase 5. Add institution_id to profiles and extend the institutions table with a student_count materialized view.</td></tr></tbody></table>

<table><tbody><tr><td>-- institutions table (extend existing)<br>ALTER TABLE institutions ADD COLUMN country TEXT DEFAULT 'Ghana';<br>ALTER TABLE institutions ADD COLUMN city TEXT;<br>ALTER TABLE institutions ADD COLUMN type TEXT DEFAULT 'university';<br>-- type: 'university' | 'polytechnic' | 'college' | 'other'<br>ALTER TABLE institutions ADD COLUMN abbreviation TEXT;<br>ALTER TABLE institutions ADD COLUMN verified BOOLEAN DEFAULT FALSE;<br>-- Student count per institution — fast read<br>CREATE MATERIALIZED VIEW institution_student_counts AS<br>SELECT institution_id, COUNT(*) AS student_count<br>FROM profiles WHERE institution_id IS NOT NULL<br>GROUP BY institution_id;<br>-- Refresh on a schedule or after each signup<br>REFRESH MATERIALIZED VIEW institution_student_counts;</td></tr></tbody></table>

**3.4 API Routes**
------------------

<table><tbody><tr><td>// GET /api/institutions — returns list for dropdown<br>export async function GET(req: NextRequest) {<br>const { q } = Object.fromEntries(new URL(req.url).searchParams);<br>const { data } = await supabase<br>.from('institutions')<br>.select('id, name, abbreviation, city, type')<br>.ilike('name', `%${q || ''}%`)<br>.order('name', { ascending: true })<br>.limit(20);<br>return NextResponse.json(data);<br>}<br>// GET /api/institutions/:id/count<br>// Returns student count for 'Join X students from Y' display<br>export async function GET(req: NextRequest, { params }) {<br>const { data } = await supabase<br>.from('institution_student_counts')<br>.select('student_count')<br>.eq('institution_id', params.id).single();<br>return NextResponse.json({ count: data?.student_count || 0 });<br>}</td></tr></tbody></table>

**3.5 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: Study Streak Leaderboard (Phase 4) — filtered by institution for internal ecosystem. Study Group Creator (Phase 4) — groups can be set to institution-only or open. Community Bank (Phase 3) — past papers tagged by institution so students find papers from their own university's exams. Benchmarking (Phase 4 Analytics) — comparison now works within the same institution for fair comparison. Admin Panel (Phase 5) — admin sees user breakdown by institution.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 4<br><strong>Course of Study Field</strong><br><em>Students type their degree programme at signup — powers AI personalisation and cross-course communities</em></td></tr></tbody></table>

The course of study field captures the student's full degree programme name. Combined with the institution selector and year of study, this gives the AI the complete academic context it needs to make every explanation, flashcard, and quiz directly relevant to that student's actual programme.

**4.1 UI/UX Design**
--------------------

*   A text input field labelled 'Course of Study' appears after the Institution field on the signup form
*   The field has a typeahead suggestion system — as the student types, it suggests common degree names: 'BSc Computer Science', 'BA Economics', 'BEng Electrical Engineering', 'BSc Nursing', and so on
*   Suggestions are pulled from a course\_programmes table seeded with common African university degree names
*   The student can select a suggestion or type their own exact programme name if it is not in the list
*   Below the field a helper text reads: 'This helps the AI explain things in the context of your degree programme'
*   The field is required — it cannot be skipped because it is too important for AI personalisation quality

**4.2 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add degree_programme to profiles. Add course_programmes lookup table for typeahead suggestions.</td></tr></tbody></table>

<table><tbody><tr><td>ALTER TABLE profiles ADD COLUMN degree_programme TEXT;<br>CREATE TABLE course_programmes (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>name TEXT NOT NULL, -- e.g. 'BSc Computer Science'<br>field TEXT, -- e.g. 'Engineering', 'Business', 'Health Sciences'<br>level TEXT DEFAULT 'undergraduate' -- 'undergraduate' | 'postgraduate'<br>);<br>-- Seed with common Ghanaian and African university programmes<br>-- BSc Computer Science, BA Economics, BEng Civil Engineering,<br>-- BSc Nursing, LLB Law, BSc Accounting, BA Communication Studies...</td></tr></tbody></table>

**4.3 How It Powers AI Personalisation**
----------------------------------------

The degree\_programme value is injected into every AI prompt alongside the year of study and learning style. The explanation prompt already includes: 'This is a Year 2 BSc Computer Science student at UPSA.' Adding the programme makes this more precise and more useful:

<table><tbody><tr><td>// /lib/ai/prompts.ts — updated context injection<br>const studentContext = `<br>Student profile:<br>- Degree: ${profile.degree_programme}<br>- Year: Year ${profile.year_of_study}<br>- Institution: ${profile.institution_name}<br>- Learning style: ${profile.learning_style}<br>- Reading level: ${profile.reading_level}/5<br><br>Calibrate all explanations, analogies, and examples to this student's<br>specific degree programme and year level. A Year 1 Nursing student needs<br>different examples than a Year 3 Engineering student even on the same topic.`,</td></tr></tbody></table>

**4.4 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: AI Slide Explanation (Phase 1) — degree programme injected into every explanation prompt. Study Partner Matcher (Phase 4) — matches students in the same or related programmes. Leaderboard (Phase 4) — can filter by programme for programme-specific ranking. Benchmarking (Phase 4) — quiz score comparison filtered to same programme cohort. Trend Tracker (Phase 3) — past paper trends filtered to same institution and programme.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 5<br><strong>Study Frequency Preference</strong><br><em>How often do you study? — captured at signup to build a personalised planner from day one</em></td></tr></tbody></table>

The study frequency question at signup gives the planner module the data it needs to generate a realistic and personalised study schedule immediately — without waiting for the student to manually set up their planner. Instead of starting with an empty planner, every new student gets a pre-built schedule on their first day.

**5.1 UI/UX Design**
--------------------

This appears as the final question on the signup form, presented as a visual option selector — not a dropdown, because it is an important question that deserves visual weight.

*   Label: 'How often do you currently study?' in heading style
*   Five illustrated option cards in a row on desktop, stacked vertically on mobile:
*   **Every day:** 'I study daily' — shows a 7-day calendar icon
*   **Most days:** 'I study 4–5 days a week' — shows a 5-day calendar icon
*   **A few times a week:** 'I study 2–3 days a week' — shows a 3-day calendar icon
*   **Weekends only:** 'I mainly study on weekends' — shows a weekend calendar icon
*   **Irregular:** 'My schedule varies a lot' — shows a shuffle icon
*   Each card is a rounded rectangle in warm white with a plum icon, a bold label, and a sub-label
*   Selected state: plum border, pale lavender background, plum checkmark in corner
*   Below the options a second question appears immediately after selection: 'How many hours do you typically study per session?' — a row of four pill buttons: Under 1 hour / 1–2 hours / 2–4 hours / 4+ hours

**5.2 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add study_frequency and study_hours_per_session to profiles.</td></tr></tbody></table>

<table><tbody><tr><td>ALTER TABLE profiles ADD COLUMN study_frequency TEXT;<br>-- 'daily' | 'most_days' | 'few_times' | 'weekends' | 'irregular'<br>ALTER TABLE profiles ADD COLUMN study_hours_per_session TEXT;<br>-- 'under_1' | '1_to_2' | '2_to_4' | '4_plus'</td></tr></tbody></table>

**5.3 How It Powers the Planner**
---------------------------------

When the student first opens the Planner page, instead of an empty screen they see a pre-generated weekly study schedule built from their signup answers:

<table><tbody><tr><td>// /app/api/planner/generate-initial/route.ts<br>// Called automatically after signup completes<br>export async function POST(req: NextRequest) {<br>const { data: profile } = await supabase<br>.from('profiles')<br>.select('study_frequency, study_hours_per_session, degree_programme, year_of_study')<br>.eq('id', session.user.id).single();<br>const response = await groq.chat.completions.create({<br>model: 'llama3-70b-8192',<br>messages: [{ role: 'user', content:<br>`Generate a realistic weekly study planner for a ${profile.degree_programme}<br>Year ${profile.year_of_study} student.<br>Study frequency: ${profile.study_frequency}.<br>Session length: ${profile.study_hours_per_session} per session.<br>Create a 7-day schedule with specific time blocks for studying.<br>Include: study sessions, revision slots, and rest days.<br>Return JSON: { schedule: [{ day, sessions: [{ start, end, label }] }] }` }]<br>});<br>const { schedule } = JSON.parse(response.choices[0].message.content);<br>// Save to study_goals table as weekly template<br>await supabase.from('study_schedule_templates').insert({<br>user_id: session.user.id,<br>schedule,<br>generated_at: new Date()<br>});<br>}</td></tr></tbody></table>

**5.4 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: Study Goals Tracker (Phase 4) — frequency preference sets the default weekly study hour goal. Daily Study Brief (Phase 4) — the brief respects the student's frequency and does not push study tasks on their scheduled rest days. Best Study Time Detector (Phase 4 Analytics) — cross-referenced with the session length preference to validate whether detected patterns match declared habits. Effort Tracker (Phase 4 Wellbeing) — effort is measured relative to the student's own declared frequency, not a universal standard.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 6<br><strong>YouTube Study Integration</strong><br><em>Search YouTube for course-related videos — pin them — review them alongside your notes</em></td></tr></tbody></table>

YouTube is already one of the most used study tools by university students in Africa. Rather than competing with this behaviour, UniStudy AI integrates it directly. Students can search YouTube from within the platform, find videos related to their current lecture topic, pin the best ones to their course, and review them later in a dedicated study queue — all without leaving the platform.

**6.1 UI/UX Design**
--------------------

### **Entry Point — Inside the Lecture Viewer**

*   A YouTube icon button sits in the lecture viewer toolbar alongside the TTS, notes, and focus mode buttons
*   Clicking it opens a slide-over panel from the right side — not a new page — labelled 'Find YouTube Resources'
*   The panel has a search bar pre-filled with the current lecture's auto-generated tags as a search query — the student can edit this
*   Results appear as a vertical list of video cards — thumbnail, title, channel name, duration, view count
*   Each result card has a 'Pin to course' button with a bookmark icon

### **Dedicated YouTube Study Page**

*   A 'YouTube' item is added to the sidebar navigation under a new 'Resources' section
*   The page has two panels: left is a search interface, right is the student's pinned video library
*   The pinned library is organised by course — cards show the video thumbnail, title, which lecture it was pinned from, and a 'Watch' button
*   Watching a video opens it in an embedded YouTube player within the platform — the video plays inside a modal or a split-screen view so the student can take notes alongside it
*   A 'Mark as watched' button on each pinned video moves it to a Watched section — like a study queue
*   Students can add personal notes to any pinned video — stored in the platform's notes system

### **Search Results Display**

*   Each result card: 64px thumbnail, video title (2 lines max), channel name in muted text, duration badge in plum, view count
*   A 'Preview' hover state shows the first 5 seconds of the video as a silent GIF using YouTube's thumbnail sequence
*   Filter chips above results: All / Under 10 min / 10–30 min / Lectures / Tutorials / Exam Prep

**6.2 YouTube Data API v3 — Free Tier**
---------------------------------------

YouTube Data API v3 is completely free with a Google account. The free quota is 10,000 units per day. A search request costs 100 units. This means 100 free searches per day — more than sufficient for early usage. Quota resets daily.

<table><tbody><tr><td>// Add to .env.local<br>YOUTUBE_API_KEY=AIza_your_youtube_data_api_v3_key<br>// /app/api/youtube/search/route.ts<br>export async function GET(req: NextRequest) {<br>const { q, maxResults = '8' } = Object.fromEntries(new URL(req.url).searchParams);<br>const url = new URL('https://www.googleapis.com/youtube/v3/search');<br>url.searchParams.set('part', 'snippet');<br>url.searchParams.set('q', `${q} university lecture study`);<br>url.searchParams.set('type', 'video');<br>url.searchParams.set('maxResults', maxResults);<br>url.searchParams.set('relevanceLanguage', 'en');<br>url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);<br>const response = await fetch(url.toString());<br>const data = await response.json();<br>const videos = data.items.map(item =&gt; ({<br>videoId: item.id.videoId,<br>title: item.snippet.title,<br>channel: item.snippet.channelTitle,<br>thumbnail: item.snippet.thumbnails.medium.url,<br>description: item.snippet.description,<br>publishedAt: item.snippet.publishedAt,<br>}));<br>return NextResponse.json({ videos });<br>}<br>// /app/api/youtube/pin/route.ts — save a pinned video<br>export async function POST(req: NextRequest) {<br>const { videoId, title, channel, thumbnail, courseId, lectureId } = await req.json();<br>await supabase.from('pinned_videos').insert({<br>user_id: session.user.id,<br>course_id: courseId,<br>lecture_id: lectureId || null,<br>video_id: videoId,<br>title, channel, thumbnail_url: thumbnail,<br>watched: false<br>});<br>return NextResponse.json({ success: true });<br>}</td></tr></tbody></table>

**6.3 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add pinned_videos table and video_notes table.</td></tr></tbody></table>

<table><tbody><tr><td>CREATE TABLE pinned_videos (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>course_id UUID REFERENCES courses(id) ON DELETE CASCADE,<br>lecture_id UUID REFERENCES lectures(id), -- optional: pinned from a lecture<br>video_id TEXT NOT NULL, -- YouTube video ID<br>title TEXT NOT NULL,<br>channel TEXT,<br>thumbnail_url TEXT,<br>watched BOOLEAN DEFAULT FALSE,<br>watch_count INT DEFAULT 0,<br>pinned_at TIMESTAMPTZ DEFAULT NOW()<br>);<br>CREATE TABLE video_notes (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>video_id TEXT NOT NULL,<br>note_text TEXT,<br>updated_at TIMESTAMPTZ DEFAULT NOW()<br>);</td></tr></tbody></table>

**6.4 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: Automatic Lecture Tagging (Phase 1) — tags generated at upload are used as the pre-filled YouTube search query. Note-Taking Mode (Phase 1) — video notes use the same storage pattern as slide notes. Study Goals Tracker (Phase 4) — watching pinned videos earns XP and counts toward weekly study goals. Course Completion Tracker (Phase 4) — pinned videos section shows as a resource type in the course overview. Daily Study Brief (Phase 4) — if a student has unwatched pinned videos for a topic in their brief, they are surfaced as a recommended resource.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 7<br><strong>Study Material Sharing</strong><br><em>Share slides, notes, summaries, and flashcard decks with individuals, groups, or the whole community</em></td></tr></tbody></table>

Students generate valuable study content on the platform — AI-enhanced lecture notes, manually written notes, flashcard decks, exam cheat sheets, and topic summaries. This feature allows that content to be shared with specific friends, with a study group, or with the broader university community — turning individual work into collective knowledge.

**7.1 What Can Be Shared**
--------------------------

<table><tbody><tr><td><strong>Content Type</strong></td><td><strong>Share Target</strong></td><td><strong>Permission Level</strong></td></tr><tr><td>Lecture slides (AI-explained)</td><td>Friend / Group / Institution / Public</td><td>Owner controls</td></tr><tr><td>Personal notes on a slide</td><td>Friend / Group</td><td>Private by default</td></tr><tr><td>AI-merged notes document</td><td>Friend / Group / Institution / Public</td><td>Owner controls</td></tr><tr><td>Flashcard deck</td><td>Friend / Group / Institution / Public</td><td>Owner controls</td></tr><tr><td>Quiz question set</td><td>Friend / Group</td><td>Owner controls</td></tr><tr><td>Exam cheat sheet (PDF)</td><td>Friend / Group / Institution / Public</td><td>Owner controls</td></tr><tr><td>Topic summary</td><td>Friend / Group / Institution / Public</td><td>Owner controls</td></tr><tr><td>Past paper (community bank)</td><td>Institution / Public</td><td>Opt-in at upload</td></tr><tr><td>Pinned YouTube videos</td><td>Friend / Group</td><td>Owner controls</td></tr></tbody></table>

**7.2 UI/UX Design**
--------------------

### **Share Button — Universal**

*   A share icon button appears on every shareable content item — lecture cards, note documents, flashcard deck cards, cheat sheet PDFs
*   Clicking opens a Share modal with three sections: Who to share with / Permission level / Share action

### **Share Modal**

*   **Who to share with:** Four tabs at the top — Specific People / My Groups / My Institution / Everyone
*   Specific People: a people-search input that finds users by name or username — typeahead from the friendships and study\_group\_members tables
*   My Groups: a list of the student's study groups with a checkbox next to each — one click shares to all group members
*   My Institution: shares to all students at the same institution who have the same course in their profile
*   Everyone: makes the content publicly discoverable in the shared materials library
*   **Permission level:** Two radio buttons — View Only (default) / View and Download
*   **Share button:** Plum filled button — clicking sends the share and shows a success toast: 'Shared with 3 people'

### **Shared Materials Library**

*   A 'Shared with me' section appears on the course page and in the sidebar
*   Shows materials shared by others — grouped by type: Notes / Slides / Flashcards / Documents
*   Each shared item shows the sharer's avatar, their name, when it was shared, and a 'Save to my library' button
*   Saving a flashcard deck creates a copy in the student's own library — they own the copy independently
*   Saving shared notes adds them to the student's notes for that course alongside their own

**7.3 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add shared_materials table and material_access table for permission tracking.</td></tr></tbody></table>

<table><tbody><tr><td>CREATE TABLE shared_materials (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>content_type TEXT NOT NULL,<br>-- 'lecture' | 'notes' | 'flashcard_deck' | 'quiz' | 'cheat_sheet' | 'summary' | 'video_list'<br>content_id UUID NOT NULL, -- FK to the relevant table<br>title TEXT NOT NULL,<br>description TEXT,<br>share_scope TEXT NOT NULL,<br>-- 'specific' | 'group' | 'institution' | 'public'<br>permission TEXT DEFAULT 'view', -- 'view' | 'download'<br>institution_id UUID REFERENCES institutions(id),<br>created_at TIMESTAMPTZ DEFAULT NOW()<br>);<br>CREATE TABLE material_access (<br>share_id UUID REFERENCES shared_materials(id) ON DELETE CASCADE,<br>recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>-- NULL recipient_id = shared with group or institution (use share_scope)<br>group_id UUID REFERENCES study_groups(id),<br>accessed_at TIMESTAMPTZ,<br>saved BOOLEAN DEFAULT FALSE,<br>PRIMARY KEY (share_id, recipient_id)<br>);<br>-- RLS: users can see shared materials where:<br>-- scope = 'public'<br>-- scope = 'institution' AND their institution_id matches<br>-- scope = 'group' AND they are a group member<br>-- scope = 'specific' AND material_access row exists for their user_id</td></tr></tbody></table>

**7.4 API Routes**
------------------

<table><tbody><tr><td>// POST /api/materials/share — create a share<br>// POST /api/materials/save — save a shared material to own library<br>// GET /api/materials/shared-with-me — list materials shared with user<br>// GET /api/materials/i-shared — list materials the user has shared<br>// DELETE /api/materials/:shareId — remove a share (owner only)</td></tr></tbody></table>

**7.5 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: Study Groups (Phase 4) — groups are a primary share target. Flashcard Decks (Phase 2) — shared decks can be copied and studied. Community Bank (Phase 3) — past papers already use a similar sharing model; this feature extends that pattern to all content types. Gamification (Phase 4) — sharing content earns XP: 10 XP per share, 25 XP when a shared item is saved by someone. Lecture Download Pack (Phase 4) — downloaded packs can be shared directly. Admin Panel (Phase 5) — admin can see flagged shared materials and remove inappropriate content.</td></tr></tbody></table>

<table><tbody><tr><td>FEATURE 8<br><strong>Discussion — Chat and Audio Platform</strong><br><em>Real-time text chat, threaded course discussions, and live audio study rooms</em></td></tr></tbody></table>

UniStudy AI becomes a complete study social platform with the addition of real-time text chat, threaded course-level discussion boards, and live audio study rooms where students can study together with their microphones — talking, asking questions, and collaborating in real time without needing a separate app like Discord or WhatsApp.

**8.1 The Three Communication Layers**
--------------------------------------

<table><tbody><tr><td><strong>Layer</strong></td><td><strong>What It Is</strong></td><td><strong>Powered By</strong></td><td><strong>Scope</strong></td></tr><tr><td>Direct Messages</td><td>1-to-1 private chat between friends</td><td>Supabase Realtime</td><td>Friends only</td></tr><tr><td>Group Chat</td><td>Group messages inside a study group</td><td>Supabase Realtime</td><td>Study group members</td></tr><tr><td>Course Discussion</td><td>Threaded public forum per course</td><td>Supabase DB + Realtime</td><td>Course community</td></tr><tr><td>Audio Study Rooms</td><td>Live voice rooms — talk while studying together</td><td>LiveKit (free tier)</td><td>Study group or public</td></tr></tbody></table>

**8.2 Direct Messages — UI/UX**
-------------------------------

*   A message icon in the sidebar navigation opens the DM inbox
*   The inbox shows a list of conversations — friend avatar, name, last message preview, timestamp, unread count badge in plum
*   Opening a conversation shows a standard chat interface: messages in bubbles, sent messages right-aligned in plum, received messages left-aligned in pale lavender
*   The input bar at the bottom has: text field, emoji picker, file attachment (shares a study material directly from the library), send button
*   Typing indicator: three animated dots appear when the other person is typing — powered by Supabase Realtime broadcast
*   Messages support: plain text, shared material cards (inline preview of a flashcard deck or note), YouTube video links (auto-embeds a preview card), and image attachments
*   Read receipts: a small single tick (sent) and double tick (read) in muted text

**8.3 Group Chat — UI/UX**
--------------------------

*   Group chat is embedded inside each study group's dedicated page — a tab alongside group members and shared materials
*   Same chat bubble layout as DMs — but messages show the sender's avatar and name above each bubble when there are multiple senders
*   A pinned messages section at the top of the chat can be managed by group admins — important links, resources, or announcements pinned for all to see
*   Group members can react to messages with emoji reactions — clicking an emoji adds it below the message with a count
*   Mentions: typing @ followed by a member name sends them a notification

**8.4 Course Discussion Board — UI/UX**
---------------------------------------

The discussion board is separate from the group chat — it is a structured threaded forum for the full course community, not just a study group.

*   Each course has a Discussion tab alongside Lectures, Flashcards, Past Papers, and YouTube
*   The board shows a list of discussion threads — title, author avatar and name, reply count, last activity timestamp, topic tags
*   Creating a thread: a modal with a title field, body text area with basic formatting (bold, bullet, code block), and topic tag selector
*   Opening a thread shows the original post at the top followed by replies in chronological order
*   Each reply shows the author avatar, name, institution badge, post content, and a reply button
*   Threads support nested replies — one level deep (post → replies, not replies to replies, to keep it simple)
*   Upvote system: each post has an upvote count — most upvoted threads float to the top of the board
*   The AI monitors unanswered threads — after 24 hours with no reply, Gemini posts an AI answer tagged with a 'AI Response' badge in lavender
*   Lecturers can post with a verified badge — their posts are highlighted with a plum left border

**8.5 Audio Study Rooms — UI/UX**
---------------------------------

Audio study rooms let students be on a live voice call while studying independently — the same way students sit in a library together in silence but available to each other. Anyone can speak at any time.

*   A 'Study Rooms' section appears in the Community page alongside Groups and Leaderboard
*   Room cards show: room name, host avatar, participant count, topic/course tag, duration active, and a 'Join' button
*   Creating a room: name the room, select the course, set it to Public (anyone from institution can join) or Private (invite only by link)
*   Inside the room: a panel shows connected participants as avatar circles — speaking participants have an animated plum ring pulsing around their avatar
*   Controls at the bottom: mute/unmute microphone, leave room, share screen (future), and a text chat sidebar that stays visible alongside audio
*   Room capacity: maximum 20 participants per room on the free tier
*   Rooms close automatically 30 minutes after the last participant leaves

**8.6 Audio Technology — LiveKit**
----------------------------------

LiveKit is an open-source real-time audio and video platform. The LiveKit Cloud free tier offers 25 hours per month of audio/video with no credit card required — sufficient for early-stage usage. It handles all the WebRTC complexity.

<table><tbody><tr><td>npm install @livekit/components-react livekit-client<br>// Add to .env.local<br>LIVEKIT_API_KEY=your_livekit_api_key<br>LIVEKIT_API_SECRET=your_livekit_api_secret<br>NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud<br>// /app/api/audio/token/route.ts — generate room access token<br>import { AccessToken } from 'livekit-server-sdk';<br>export async function POST(req: NextRequest) {<br>const { roomName, participantName } = await req.json();<br>const token = new AccessToken(<br>process.env.LIVEKIT_API_KEY!,<br>process.env.LIVEKIT_API_SECRET!,<br>{ identity: session.user.id, name: participantName }<br>);<br>token.addGrant({<br>room: roomName,<br>roomJoin: true,<br>canPublish: true,<br>canSubscribe: true<br>});<br>return NextResponse.json({ token: await token.toJwt() });<br>}<br>// components/community/AudioRoom.tsx<br>import { LiveKitRoom, AudioConference, RoomAudioRenderer } from '@livekit/components-react';<br>export function AudioRoom({ roomName }: { roomName: string }) {<br>const [token, setToken] = useState('');<br>useEffect(() =&gt; {<br>fetch('/api/audio/token', {<br>method: 'POST',<br>body: JSON.stringify({ roomName, participantName: user.full_name })<br>}).then(r =&gt; r.json()).then(d =&gt; setToken(d.token));<br>}, [roomName]);<br>return (<br>&lt;LiveKitRoom<br>token={token}<br>serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}<br>connect={true}<br>audio={true}<br>video={false}<br>&gt;<br>&lt;RoomAudioRenderer /&gt;<br>&lt;AudioConference /&gt;<br>&lt;/LiveKitRoom&gt;<br>);<br>}</td></tr></tbody></table>

**8.7 Database Changes**
------------------------

<table><tbody><tr><td><strong>DB CHANGE</strong></td><td>Add direct_messages, discussion_threads, discussion_replies, and audio_rooms tables.</td></tr></tbody></table>

<table><tbody><tr><td>-- Direct messages<br>CREATE TABLE direct_messages (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,<br>content TEXT NOT NULL,<br>content_type TEXT DEFAULT 'text', -- 'text' | 'material' | 'image'<br>material_id UUID, -- if content_type = 'material'<br>read BOOLEAN DEFAULT FALSE,<br>sent_at TIMESTAMPTZ DEFAULT NOW()<br>);<br>CREATE INDEX idx_dm_conversation ON direct_messages(sender_id, receiver_id, sent_at);<br>-- Course discussion threads<br>CREATE TABLE discussion_threads (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>course_id UUID REFERENCES courses(id) ON DELETE CASCADE,<br>author_id UUID REFERENCES profiles(id),<br>title TEXT NOT NULL,<br>body TEXT NOT NULL,<br>tags TEXT[],<br>upvotes INT DEFAULT 0,<br>is_ai_answered BOOLEAN DEFAULT FALSE,<br>created_at TIMESTAMPTZ DEFAULT NOW()<br>);<br>CREATE TABLE discussion_replies (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,<br>author_id UUID REFERENCES profiles(id),<br>-- NULL author_id = AI response<br>body TEXT NOT NULL,<br>upvotes INT DEFAULT 0,<br>is_ai BOOLEAN DEFAULT FALSE,<br>created_at TIMESTAMPTZ DEFAULT NOW()<br>);<br>-- Audio rooms<br>CREATE TABLE audio_rooms (<br>id UUID PRIMARY KEY DEFAULT gen_random_uuid(),<br>host_id UUID REFERENCES profiles(id),<br>name TEXT NOT NULL,<br>course_id UUID REFERENCES courses(id),<br>livekit_room_name TEXT UNIQUE NOT NULL,<br>is_public BOOLEAN DEFAULT TRUE,<br>participant_count INT DEFAULT 0,<br>created_at TIMESTAMPTZ DEFAULT NOW(),<br>closed_at TIMESTAMPTZ<br>);</td></tr></tbody></table>

**8.8 Realtime — Supabase Channels**
------------------------------------

<table><tbody><tr><td>// Direct message realtime channel<br>const dmChannel = supabase.channel(`dm:${userId}`)<br>.on('postgres_changes', {<br>event: 'INSERT',<br>schema: 'public',<br>table: 'direct_messages',<br>filter: `receiver_id=eq.${userId}`<br>}, payload =&gt; {<br>addMessage(payload.new);<br>showNotificationBadge();<br>})<br>.subscribe();<br>// Group chat realtime channel (broadcast — faster, no DB write per message)<br>const groupChannel = supabase.channel(`group:${groupId}`)<br>.on('broadcast', { event: 'message' }, ({ payload }) =&gt; {<br>addGroupMessage(payload);<br>})<br>.subscribe();<br>// Send a group message<br>groupChannel.send({<br>type: 'broadcast',<br>event: 'message',<br>payload: { text, senderId: user.id, senderName: user.full_name, ts: Date.now() }<br>});<br>// Group messages saved to DB async — broadcast first for instant delivery,<br>// then POST to /api/community/messages to persist</td></tr></tbody></table>

**8.9 Links to Existing Features**
----------------------------------

<table><tbody><tr><td><strong>LINKS TO</strong></td><td>Links to: Study Groups (Phase 4) — group chat is embedded inside study groups. Doubt Board (Phase 4) — the course discussion board replaces and extends the doubt board with threading and AI fallback. Avatar (Feature 1) — avatars appear in every chat message and audio room participant list. Material Sharing (Feature 7) — materials can be sent directly in DMs or posted in group chat. Study Partner Matcher (Phase 4) — matched partners are introduced via a pre-opened DM thread. Gamification (Phase 4) — participating in discussions earns XP: 5 XP per reply posted, 15 XP when a reply is upvoted 3+ times. Admin Panel (Phase 5) — admin can see flagged messages and remove content from discussion boards.</td></tr></tbody></table>

**SUMMARY — ALL NEW FEATURES AND CONNECTIONS**

<table><tbody><tr><td><strong>Feature</strong></td><td><strong>New DB Tables</strong></td><td><strong>New API Routes</strong></td><td><strong>Links To (Existing)</strong></td></tr><tr><td>F1 Avatar Selection</td><td>profiles (2 cols)</td><td>POST /api/auth/signup (extended), PUT /api/profile/avatar</td><td>Sidebar, leaderboard, groups, chat</td></tr><tr><td>F2 Student Email</td><td>profiles (2 cols)</td><td>GET /api/institutions/domains</td><td>Institutional plan, Feature 3</td></tr><tr><td>F3 Institution Selector</td><td>institutions (5 cols), materialized view</td><td>GET /api/institutions, GET /api/institutions/:id/count</td><td>Leaderboard, groups, benchmarking, community bank</td></tr><tr><td>F4 Course of Study</td><td>profiles (1 col), course_programmes</td><td>GET /api/programmes (typeahead)</td><td>AI prompts, partner matcher, benchmarking</td></tr><tr><td>F5 Study Frequency</td><td>profiles (2 cols), study_schedule_templates</td><td>POST /api/planner/generate-initial</td><td>Planner, goals tracker, daily brief, effort tracker</td></tr><tr><td>F6 YouTube Study</td><td>pinned_videos, video_notes</td><td>GET /api/youtube/search, POST /api/youtube/pin</td><td>Lecture tags, notes, goals, daily brief</td></tr><tr><td>F7 Material Sharing</td><td>shared_materials, material_access</td><td>POST /api/materials/share, GET /api/materials/shared-with-me</td><td>Groups, flashcards, community bank, gamification</td></tr><tr><td>F8 Discussion &amp; Audio</td><td>direct_messages, discussion_threads, discussion_replies, audio_rooms</td><td>POST /api/audio/token, /api/community/messages, /api/discussion/*</td><td>Groups, doubt board, avatar, sharing, gamification</td></tr></tbody></table>

UniStudy AI · New Features Documentation · 8 Features · All Phases