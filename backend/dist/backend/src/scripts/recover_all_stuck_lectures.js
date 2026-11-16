"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("../lib/supabase");
const slideProcessor_1 = require("../services/slideProcessor");
async function runRecovery() {
    console.log('[Recovery] Finding all stuck lectures across database...');
    const { data: lectures, error } = await supabase_1.supabaseAdmin
        .from('lectures')
        .select('id, title, week, slide_count, processing, file_url, course_id')
        .order('created_at', { ascending: true });
    if (error || !lectures) {
        console.error('[Recovery] Failed to fetch lectures:', error);
        return;
    }
    console.log(`[Recovery] Inspecting ${lectures.length} total lectures...`);
    for (const lec of lectures) {
        const { count: actualSlides } = await supabase_1.supabaseAdmin
            .from('slides')
            .select('id', { count: 'exact', head: true })
            .eq('lecture_id', lec.id);
        const isStuck = lec.processing || (actualSlides === 0 && lec.file_url);
        if (isStuck) {
            console.log(`\n======================================================`);
            console.log(`[Recovery] Processing stuck lecture: [${lec.id}]`);
            console.log(`  Title: ${lec.title}`);
            console.log(`  Week: ${lec.week}, processing: ${lec.processing}, slide_count: ${lec.slide_count}, actual slides in DB: ${actualSlides}`);
            console.log(`  File: ${lec.file_url}`);
            if (actualSlides && actualSlides > 0 && actualSlides >= (lec.slide_count || 1)) {
                console.log(`  -> Slides already exist (${actualSlides}). Unmarking processing.`);
                await supabase_1.supabaseAdmin
                    .from('lectures')
                    .update({ processing: false, slide_count: actualSlides })
                    .eq('id', lec.id);
            }
            else if (lec.file_url) {
                // If some slides are missing or 0, delete incomplete partial slides and re-run clean fast extraction
                if (actualSlides && actualSlides > 0 && actualSlides < (lec.slide_count || 0)) {
                    console.log(`  -> Cleaning incomplete partial slides (${actualSlides}/${lec.slide_count}) before full extraction...`);
                    await supabase_1.supabaseAdmin.from('slides').delete().eq('lecture_id', lec.id);
                }
                console.log(`  -> Running real-time extraction...`);
                await (0, slideProcessor_1.processLectureSlidesInBackground)(lec.id, 'recovery-admin', lec.file_url);
            }
            else {
                console.log(`  -> No file_url for lecture. Marking processing: false.`);
                await supabase_1.supabaseAdmin.from('lectures').update({ processing: false }).eq('id', lec.id);
            }
        }
    }
    console.log('\n[Recovery] All stuck lectures recovered successfully!');
}
runRecovery().catch(console.error);
