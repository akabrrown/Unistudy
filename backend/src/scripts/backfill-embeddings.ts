import { config } from 'dotenv';
import path from 'path';

// Load environment variables before anything else
config({ path: path.resolve(__dirname, '../../.env') });

import { supabaseAdmin } from '../lib/supabase';
import { routeRequest, AIRequest } from '../lib/ai/router';

async function generateEmbeddingsBatch(texts: string[], userId: string): Promise<number[][]> {
    const embedReq: AIRequest = {
        task: 'embedding',
        feature: 'search_embedding',
        payload: { texts },
        userId: userId,
        priority: 'low'
    };
    
    const embedRes = await routeRequest(embedReq);
    const result = embedRes.result;
    
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return result;
    } else if (Array.isArray(result)) {
        // Handle single result wrapped
        return [result as number[]];
    }
    return [];
}

async function backfillSlides() {
    console.log('--- Backfilling Slides ---');
    const { data: slides, error } = await supabaseAdmin
        .from('slides')
        .select('id, raw_text, explanation, lecture_id')
        .is('embedding', null);

    if (error) throw error;
    console.log(`Found ${slides?.length || 0} slides to embed.`);

    for (const slide of slides || []) {
        try {
            // Need a user_id for quota tracking, let's just fetch the lecture's course's owner
            // but HuggingFace embeddings are free_rate_limit, so we can use a dummy UUID
            const textToEmbed = `Slide ${slide.raw_text || ''} ${slide.explanation || ''}`.trim();
            if (!textToEmbed) continue;

            const embeddings = await generateEmbeddingsBatch(
                [textToEmbed], 
                '00000000-0000-0000-0000-000000000000'
            );
            
            if (embeddings.length > 0) {
                await supabaseAdmin
                    .from('slides')
                    .update({ embedding: `[${embeddings[0].join(',')}]` })
                    .eq('id', slide.id);
                process.stdout.write('.');
            }
        } catch (e) {
            console.error(`\nFailed slide ${slide.id}:`, e);
        }
    }
    console.log('\nFinished slides.');
}

async function backfillFlashcards() {
    console.log('--- Backfilling Flashcards ---');
    const { data: cards, error } = await supabaseAdmin
        .from('flashcards')
        .select('id, front, back, user_id')
        .is('embedding', null);

    if (error) throw error;
    console.log(`Found ${cards?.length || 0} flashcards to embed.`);

    for (const card of cards || []) {
        try {
            const textToEmbed = `Flashcard: Q: ${card.front} A: ${card.back}`.trim();
            const embeddings = await generateEmbeddingsBatch([textToEmbed], card.user_id);
            
            if (embeddings.length > 0) {
                await supabaseAdmin
                    .from('flashcards')
                    .update({ embedding: `[${embeddings[0].join(',')}]` })
                    .eq('id', card.id);
                process.stdout.write('.');
            }
        } catch (e) {
            console.error(`\nFailed card ${card.id}:`, e);
        }
    }
    console.log('\nFinished flashcards.');
}

async function backfillPastPapers() {
    console.log('--- Backfilling Past Papers ---');
    const { data: questions, error } = await supabaseAdmin
        .from('past_paper_questions')
        .select('id, text_content')
        .is('embedding', null);

    if (error) throw error;
    console.log(`Found ${questions?.length || 0} questions to embed.`);

    for (const q of questions || []) {
        try {
            const textToEmbed = `Question: ${q.text_content}`.trim();
            if (!textToEmbed) continue;

            const embeddings = await generateEmbeddingsBatch(
                [textToEmbed], 
                '00000000-0000-0000-0000-000000000000'
            );
            
            if (embeddings.length > 0) {
                await supabaseAdmin
                    .from('past_paper_questions')
                    .update({ embedding: `[${embeddings[0].join(',')}]` })
                    .eq('id', q.id);
                process.stdout.write('.');
            }
        } catch (e) {
            console.error(`\nFailed question ${q.id}:`, e);
        }
    }
    console.log('\nFinished past papers.');
}

async function run() {
    try {
        await backfillSlides();
        await backfillFlashcards();
        await backfillPastPapers();
        console.log('--- Backfill Complete ---');
        process.exit(0);
    } catch (e) {
        console.error('Backfill script failed:', e);
        process.exit(1);
    }
}

run();
