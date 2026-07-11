**UniStudy AI**  
**Doc 13: Analytics & Insights**  
_6 Features · Phase 4 · Data that teaches students about their own learning_

**Table of Contents**
=====================

**OVERVIEW**  
The Analytics & Insights module gives students a data-driven mirror of their own learning. Rather than just tracking streaks and scores, it analyses patterns — when they learn best, where their blind spots are, how fast they're progressing — and surfaces those insights in plain language. All analytics are computed from data already collected in earlier phases. No new data collection is needed.

<table><tbody><tr><td><strong>Feature</strong></td><td><strong>Ref</strong></td><td><strong>Data Source</strong></td><td><strong>AI Used</strong></td></tr><tr><td>Study Pattern Heatmap</td><td>13.1</td><td>study_sessions table</td><td>None — D3.js visualisation</td></tr><tr><td>Learning Velocity Tracker</td><td>13.2</td><td>quiz_attempts + sessions</td><td>None — calculation</td></tr><tr><td>Best Study Time Detector</td><td>13.3</td><td>quiz_attempts timestamps</td><td>None — time analysis</td></tr><tr><td>Blind Spot Detector</td><td>13.4</td><td>confidence_ratings + quizzes</td><td>Groq (insight text)</td></tr><tr><td>Anonymous Performance Benchmarking</td><td>13.5</td><td>quiz_attempts aggregate</td><td>None — SQL aggregate</td></tr><tr><td>Monthly Progress Report (PDF)</td><td>13.6</td><td>All tables</td><td>Together AI + Puppeteer</td></tr><tr><td>AI Semester Narrative Review</td><td>13.7</td><td>Full semester aggregate</td><td>Together AI</td></tr></tbody></table>

<table><tbody><tr><td><strong>13.1</strong></td><td><strong>Study Pattern Heatmap</strong><br><em>GitHub contribution-style calendar — darker square = more study activity that day</em></td></tr></tbody></table>

A full-year calendar heatmap built with D3.js. Each day is a coloured square — pale lavender for light activity, deep plum for intense study days. Students see their habits at a glance without any manual logging.

### **Activity Score Calculation**

<table><tbody><tr><td>// Activity score per day — weighted sum stored in study_sessions<br>const activityScore = (<br>slidesViewed * 2 + // each slide viewed = 2 pts<br>flashcardsReviewed * 1 + // each card = 1 pt<br>quizQuestionsAnswered * 3 + // each quiz q = 3 pts<br>Math.floor(studyMinutes / 5) * 1 // every 5 mins = 1 pt<br>);<br>// Colour scale — maps score to plum shade<br>const colourScale = d3.scaleQuantize()<br>.domain([0, 100])<br>.range(['#EDE7F6','#D1C4E9','#B39DDB','#9B72CF','#7B4DB5','#5B2D8E','#3D1A6E']);<br>// /app/api/analytics/heatmap/route.ts<br>export async function GET(req: NextRequest) {<br>const { data } = await supabase<br>.from('study_sessions')<br>.select('session_date, slides_viewed, duration_secs')<br>.eq('user_id', session.user.id)<br>.gte('session_date', startOfYear)<br>.order('session_date', { ascending: true });<br>// Aggregate by date<br>const byDate = data.reduce((acc, s) =&gt; {<br>const key = s.session_date;<br>if (!acc[key]) acc[key] = { slides: 0, minutes: 0 };<br>acc[key].slides += s.slides_viewed;<br>acc[key].minutes += Math.floor(s.duration_secs / 60);<br>return acc;<br>}, {});<br>return NextResponse.json(byDate);<br>}</td></tr></tbody></table>

### **D3.js Heatmap Component**

<table><tbody><tr><td>// components/analytics/StudyHeatmap.tsx<br>import * as d3 from 'd3';<br>import { useEffect, useRef } from 'react';<br>export function StudyHeatmap({ data }: { data: Record&lt;string, number&gt; }) {<br>const ref = useRef&lt;SVGSVGElement&gt;(null);<br>useEffect(() =&gt; {<br>const svg = d3.select(ref.current);<br>svg.selectAll('*').remove();<br>const weeks = d3.timeWeeks(startOfYear, endOfYear);<br>const cellSize = 14;<br>svg.selectAll('rect')<br>.data(d3.timeDays(startOfYear, endOfYear))<br>.enter().append('rect')<br>.attr('width', cellSize - 2)<br>.attr('height', cellSize - 2)<br>.attr('x', d =&gt; d3.timeWeek.count(startOfYear, d) * cellSize)<br>.attr('y', d =&gt; d.getDay() * cellSize)<br>.attr('rx', 2)<br>.attr('fill', d =&gt; {<br>const score = data[d3.timeFormat('%Y-%m-%d')(d)] || 0;<br>return colourScale(score);<br>})<br>.append('title')<br>.text(d =&gt; `${d3.timeFormat('%b %d')(d)}: ${data[d3.timeFormat('%Y-%m-%d')(d)] || 0} pts`);<br>}, [data]);<br>return &lt;svg ref={ref} className='w-full' /&gt;;<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>13.2</strong></td><td><strong>Learning Velocity Tracker</strong><br><em>How fast is the student mastering new topics compared to their own baseline?</em></td></tr></tbody></table>

Velocity is calculated as the average number of days between first seeing a topic and scoring 80%+ on a quiz covering that topic. A lower number = faster mastery. After 4 weeks of use, a personal baseline is established and each subsequent week is compared to it.

<table><tbody><tr><td>// /app/api/analytics/velocity/route.ts<br>export async function GET(req: NextRequest) {<br>const userId = session.user.id;<br>// Get all lectures with first-view date and first 80%+ quiz date<br>const { data } = await supabase.rpc('get_mastery_velocity', {<br>p_user_id: userId<br>});<br>// data: [{ lecture_title, first_viewed, first_mastered, days_to_master }]<br>const avgVelocity = data.reduce((s, d) =&gt; s + d.days_to_master, 0) / data.length;<br>// Baseline = first 4 weeks average<br>const baseline = data.slice(0, 10).reduce((s, d) =&gt; s + d.days_to_master, 0) / 10;<br>const trend = avgVelocity &lt; baseline * 0.9 ? 'Accelerating'<br>: avgVelocity &lt; baseline * 1.1 ? 'On Track'<br>: 'Slowing';<br>return NextResponse.json({ avgVelocity, baseline, trend, data });<br>}<br>-- Supabase SQL function<br>CREATE OR REPLACE FUNCTION get_mastery_velocity(p_user_id UUID)<br>RETURNS TABLE(lecture_title TEXT, first_viewed DATE,<br>first_mastered DATE, days_to_master INT)<br>LANGUAGE sql STABLE AS $$<br>SELECT l.title,<br>MIN(ss.session_date) AS first_viewed,<br>MIN(qa.completed_at::DATE) AS first_mastered,<br>EXTRACT(DAY FROM MIN(qa.completed_at) - MIN(ss.session_date)::TIMESTAMPTZ)::INT<br>FROM lectures l<br>JOIN study_sessions ss ON ss.lecture_id = l.id AND ss.user_id = p_user_id<br>JOIN quiz_attempts qa ON qa.lecture_id = l.id AND qa.user_id = p_user_id<br>AND qa.score &gt;= 80<br>GROUP BY l.id, l.title<br>ORDER BY first_viewed;<br>$$;</td></tr></tbody></table>

### **UI — Velocity Display**

*   Trend badge: Accelerating (green) / On Track (lavender) / Slowing (orange)
*   Line chart: days-to-master per topic over time — Chart.js
*   Insight text: 'You are mastering new topics 40% faster than your first month'
*   Personal record: fastest mastery ever — shown as a milestone

<table><tbody><tr><td><strong>13.3</strong></td><td><strong>Best Study Time Detector</strong><br><em>When during the day does this student perform best on quizzes?</em></td></tr></tbody></table>

All quiz attempts are timestamped. After 20+ attempts the system groups scores by hour of day and identifies peak performance windows. The study planner uses these windows to recommend when to tackle the hardest lectures.

<table><tbody><tr><td>// /app/api/analytics/best-time/route.ts<br>export async function GET(req: NextRequest) {<br>const { data } = await supabase<br>.from('quiz_attempts')<br>.select('score, completed_at')<br>.eq('user_id', session.user.id)<br>.not('score', 'is', null);<br>if (data.length &lt; 20) {<br>return NextResponse.json({ insufficient: true, count: data.length });<br>}<br>// Group scores by hour of day<br>const byHour: Record&lt;number, number[]&gt; = {};<br>data.forEach(a =&gt; {<br>const hour = new Date(a.completed_at).getHours();<br>if (!byHour[hour]) byHour[hour] = [];<br>byHour[hour].push(a.score);<br>});<br>// Average score per hour<br>const hourlyAvg = Object.entries(byHour).map(([hour, scores]) =&gt; ({<br>hour: parseInt(hour),<br>avg: scores.reduce((s, v) =&gt; s + v, 0) / scores.length,<br>count: scores.length<br>})).sort((a, b) =&gt; b.avg - a.avg);<br>// Top 2 performance windows<br>const peakHours = hourlyAvg.filter(h =&gt; h.count &gt;= 3).slice(0, 2);<br>return NextResponse.json({ hourlyAvg, peakHours });<br>}</td></tr></tbody></table>

### **UI — Time Performance Chart**

*   24-hour bar chart — bar height = average quiz score for that hour
*   Peak windows highlighted in deep plum
*   Recommendation card: 'Your best quiz performance is between 9–11am and 8–10pm'
*   Study planner integration: hard lectures auto-scheduled in peak windows

<table><tbody><tr><td><strong>13.4</strong></td><td><strong>Blind Spot Detector</strong><br><em>High confidence rating but low quiz score = dangerous blind spot — flagged immediately</em></td></tr></tbody></table>

The most dangerous knowledge gaps are the ones students don't know they have. The Blind Spot Detector cross-references per-slide confidence ratings with quiz performance on the same topics. A high confidence score paired with a low quiz score triggers a Blind Spot alert.

<table><tbody><tr><td>// /app/api/analytics/blind-spots/route.ts<br>export async function GET(req: NextRequest) {<br>const userId = session.user.id;<br>// Get average confidence per lecture<br>const { data: confidence } = await supabase<br>.from('confidence_ratings')<br>.select('slide_id, rating, slides(lecture_id)')<br>.eq('user_id', userId);<br>// Get quiz scores per lecture<br>const { data: quizzes } = await supabase<br>.from('quiz_attempts')<br>.select('lecture_id, score')<br>.eq('user_id', userId);<br>// Build maps<br>const confByLecture: Record&lt;string, number[]&gt; = {};<br>confidence.forEach(c =&gt; {<br>const lid = c.slides.lecture_id;<br>if (!confByLecture[lid]) confByLecture[lid] = [];<br>confByLecture[lid].push(c.rating);<br>});<br>const scoreByLecture: Record&lt;string, number[]&gt; = {};<br>quizzes.forEach(q =&gt; {<br>if (!scoreByLecture[q.lecture_id]) scoreByLecture[q.lecture_id] = [];<br>scoreByLecture[q.lecture_id].push(q.score);<br>});<br>// Find blind spots: confidence &gt;= 4 but quiz avg &lt; 60<br>const blindSpots = Object.keys(confByLecture)<br>.filter(lid =&gt; scoreByLecture[lid])<br>.map(lid =&gt; {<br>const avgConf = confByLecture[lid].reduce((s,v) =&gt; s+v, 0) / confByLecture[lid].length;<br>const avgScore = scoreByLecture[lid].reduce((s,v) =&gt; s+v, 0) / scoreByLecture[lid].length;<br>return { lectureId: lid, avgConf, avgScore, isBlindSpot: avgConf &gt;= 4 &amp;&amp; avgScore &lt; 60 };<br>})<br>.filter(r =&gt; r.isBlindSpot);<br>// Groq generates plain-English insight per blind spot<br>const insights = await Promise.all(blindSpots.slice(0, 3).map(async bs =&gt; {<br>const resp = await groq.chat.completions.create({<br>model: 'llama3-70b-8192',<br>messages: [{ role: 'user', content:<br>`A student rated confidence ${bs.avgConf.toFixed(1)}/5 on this lecture`,<br>`but only scored ${bs.avgScore.toFixed(0)}% on the quiz.`,<br>`Write one sentence explaining why this happens and what to do. Be specific, not generic.` }]<br>});<br>return { ...bs, insight: resp.choices[0].message.content };<br>}));<br>return NextResponse.json({ blindSpots: insights });<br>}</td></tr></tbody></table>

### **UI — Blind Spot Alert**

*   Red alert card per detected blind spot: lecture name, confidence vs quiz score
*   Insight text from Groq explaining the likely cause
*   One-click action: 'Drill this topic' — opens Weakness Drill from Phase 3
*   Resolved automatically when next quiz on that topic scores 70%+

<table><tbody><tr><td><strong>13.5</strong></td><td><strong>Anonymous Performance Benchmarking</strong><br><em>How does the student compare to the course average — per topic, fully anonymised</em></td></tr></tbody></table>

Opt-in feature. When enabled, the student's quiz scores are included in the anonymous course aggregate. In return, they can see how they compare to all other students on the same lectures.

<table><tbody><tr><td>-- SQL function: compare student vs course average per lecture<br>CREATE OR REPLACE FUNCTION get_benchmark(p_user_id UUID, p_course_id UUID)<br>RETURNS TABLE(<br>lecture_title TEXT,<br>student_avg FLOAT,<br>course_avg FLOAT,<br>percentile FLOAT<br>)<br>LANGUAGE sql STABLE AS $$<br>SELECT<br>l.title,<br>AVG(qa.score) FILTER (WHERE qa.user_id = p_user_id) AS student_avg,<br>AVG(qa.score) AS course_avg,<br>PERCENT_RANK() OVER (<br>PARTITION BY l.id<br>ORDER BY AVG(qa.score) FILTER (WHERE qa.user_id = p_user_id)<br>) * 100 AS percentile<br>FROM lectures l<br>JOIN quiz_attempts qa ON qa.lecture_id = l.id<br>JOIN courses c ON c.id = l.course_id AND c.id = p_course_id<br>GROUP BY l.id, l.title<br>HAVING COUNT(DISTINCT qa.user_id) &gt;= 5 -- min 5 students for privacy<br>ORDER BY l.title;<br>$$;</td></tr></tbody></table>

*   Above average (70th+ percentile): deep plum bar
*   At average (40th–70th): lavender bar
*   Below average (below 40th): orange bar with 'Focus here' nudge
*   Minimum 5 students required before showing benchmark — protects privacy

<table><tbody><tr><td><strong>13.6</strong></td><td><strong>Monthly Progress Report</strong><br><em>Auto-generated PDF sent on the 1st of every month — full study activity breakdown</em></td></tr></tbody></table>

<table><tbody><tr><td>// /app/api/cron/monthly-report/route.ts<br>// Triggered by Vercel Cron on the 1st of every month at 8am<br>export async function GET(req: NextRequest) {<br>if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)<br>return new Response('Unauthorized', { status: 401 });<br>const { data: users } = await supabase.from('profiles').select('id, email, full_name');<br>const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);<br>for (const user of users) {<br>// Gather all stats for last month<br>const [sessions, quizzes, flashcards, papers] = await Promise.all([<br>supabase.from('study_sessions').select('duration_secs,slides_viewed')<br>.eq('user_id', user.id).gte('session_date', startOfLastMonth),<br>supabase.from('quiz_attempts').select('score')<br>.eq('user_id', user.id).gte('completed_at', startOfLastMonth),<br>supabase.from('flashcards').select('id',{count:'exact',head:true})<br>.eq('user_id', user.id),<br>supabase.from('past_paper_attempts').select('score')<br>.eq('user_id', user.id).gte('started_at', startOfLastMonth),<br>]);<br>const stats = {<br>totalHours: sessions.data.reduce((s,r) =&gt; s + r.duration_secs/3600, 0).toFixed(1),<br>slidesViewed: sessions.data.reduce((s,r) =&gt; s + r.slides_viewed, 0),<br>avgQuizScore: (quizzes.data.reduce((s,r) =&gt; s+r.score,0)/quizzes.data.length).toFixed(0),<br>paperAttempts: papers.data.length,<br>};<br>// Together AI writes narrative summary<br>const narrative = await together.chat.completions.create({<br>model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',<br>messages: [{ role: 'user', content:<br>`Write a 2-paragraph monthly study review for ${user.full_name}.<br>Stats: ${JSON.stringify(stats)}.<br>Tone: encouraging mentor. Reference specific numbers. End with one goal for next month.` }]<br>});<br>// Generate PDF with Puppeteer, email with Resend<br>const pdf = await generateReportPDF(user, stats, narrative.choices[0].message.content);<br>await resend.emails.send({<br>from: process.env.EMAIL_FROM!,<br>to: user.email,<br>subject: `Your ${monthName} Study Report`,<br>html: buildReportEmail(user.full_name),<br>attachments: [{ filename: 'study-report.pdf', content: pdf }]<br>});<br>}<br>return NextResponse.json({ sent: users.length });<br>}</td></tr></tbody></table>

<table><tbody><tr><td><strong>13.7</strong></td><td><strong>AI Semester Narrative Review</strong><br><em>At semester end — Together AI writes a personal story of the student's academic journey</em></td></tr></tbody></table>

Not a stats dump — a written narrative that reads like a year-end letter from a mentor. Generated once per semester on the archive date. Available as a PDF download and as a shareable summary card.

<table><tbody><tr><td>// /app/api/analytics/semester-review/route.ts<br>export async function POST(req: NextRequest) {<br>const { semesterId } = await req.json();<br>const userId = session.user.id;<br>// Aggregate entire semester<br>const [courses, topTopic, hardestLecture, bestQuiz, streak, totalHours] =<br>await Promise.all([/* all semester data queries */]);<br>const response = await together.chat.completions.create({<br>model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',<br>messages: [{ role: 'user', content:<br>`Write a personal semester review for a university student.<br>Data: ${JSON.stringify({ courses, topTopic, hardestLecture, bestQuiz, streak, totalHours })}.<br>Format: 3 paragraphs.<br>Para 1: The journey — what they studied and how the semester unfolded.<br>Para 2: Their standout achievement and what it shows about them.<br>Para 3: What to carry into next semester — one specific, actionable focus.<br>Tone: warm mentor, not generic. Reference specific details from the data.` }]<br>});<br>return NextResponse.json({ narrative: response.choices[0].message.content });<br>}</td></tr></tbody></table>

*   Triggered automatically when student archives a semester
*   Shareable card version: key stats in plum/lavender design, shareable as image
*   PDF download: full narrative with course breakdown table

**SUMMARY — ANALYTICS & INSIGHTS**

<table><tbody><tr><td><strong>Feature</strong></td><td><strong>API Route</strong></td><td><strong>AI Provider</strong></td><td><strong>Phase</strong></td></tr><tr><td>Study Pattern Heatmap</td><td>/api/analytics/heatmap</td><td>None (D3.js)</td><td>4</td></tr><tr><td>Learning Velocity Tracker</td><td>/api/analytics/velocity</td><td>None (SQL)</td><td>4</td></tr><tr><td>Best Study Time Detector</td><td>/api/analytics/best-time</td><td>None (math)</td><td>4</td></tr><tr><td>Blind Spot Detector</td><td>/api/analytics/blind-spots</td><td>Groq</td><td>4</td></tr><tr><td>Performance Benchmarking</td><td>/api/analytics/benchmark</td><td>None (SQL)</td><td>4</td></tr><tr><td>Monthly Progress Report</td><td>/api/cron/monthly-report</td><td>Together AI</td><td>4</td></tr><tr><td>Semester Narrative</td><td>/api/analytics/semester-review</td><td>Together AI</td><td>4</td></tr></tbody></table>

UniStudy AI · Doc 13: Analytics & Insights · Phase 4 · 7 Features