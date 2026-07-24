import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { withAIQuota } from '../middleware/quotaGuard';
import { routeRequest, AIRequest } from '../lib/ai/router';
import { consumeUserQuota } from '../lib/ai/quota';
import { supabaseAdmin } from '../lib/supabase';
import { getCohereClient } from '../lib/ai/providers/cohere';

const router = Router();
router.use(authenticateUser);

router.post('/', async (req: Request, res: Response) => {
  const { query, limit = 20 } = req.body;
  const userId = req.user!.id;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // 1. Generate embedding for the search query
    const aiReq: AIRequest = {
      task: 'embedding',
      feature: 'search_embedding',
      payload: { texts: [query] },
      userId: userId,
      priority: 'high'
    };

    const hfResponse = await routeRequest(aiReq);
    const queryEmbedding = Array.isArray(hfResponse.result) ? hfResponse.result[0] : hfResponse.result;

    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }

    // 2. Perform vector search using Supabase RPC
    const { data: searchResults, error: rpcError } = await supabaseAdmin.rpc('match_study_content', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2, // Adjust threshold as needed
      match_count: limit,
      p_user_id: userId
    });

    if (rpcError) throw rpcError;

    let finalResults = searchResults || [];
    let enhanced = false;

    // 3. Cohere Rerank for all users
    if (finalResults.length > 0) {
      enhanced = true;
      try {
        const cohere = getCohereClient();
        
        // Prepare documents for reranking
        const documents = finalResults.map((r: any) => {
          if (r.content_type === 'slide') return `Slide ${r.slide_number}: ${r.text_content} ${r.explanation || ''}`;
          if (r.content_type === 'flashcard') return `Flashcard: Q: ${r.front} A: ${r.back}`;
          if (r.content_type === 'past_paper_question') return `Question: ${r.text_content}`;
          return '';
        });

        const rerankResult = await cohere.rerank({
          model: 'rerank-english-v3.0',
          query: query,
          documents: documents,
          topN: Math.min(10, finalResults.length) // Return top 10 best matches
        });

        // Re-map the original results based on the new reranked indices
        finalResults = rerankResult.results.map((re: any) => ({
          ...finalResults[re.index],
          relevance_score: re.relevanceScore // Cohere's score
        }));
      } catch (rerankError) {
        console.error('Cohere reranking failed:', rerankError);
        // Fallback to un-reranked if Cohere fails
      }
    } else {
      finalResults = finalResults.slice(0, 10);
    }

    // Group results
    const grouped = {
      slides: finalResults.filter((r: any) => r.content_type === 'slide'),
      flashcards: finalResults.filter((r: any) => r.content_type === 'flashcard'),
      past_papers: finalResults.filter((r: any) => r.content_type === 'past_paper_question')
    };

    res.json({
      success: true,
      data: grouped,
      enhanced
    });

  } catch (err: any) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
