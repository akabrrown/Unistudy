import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../../lib/supabase';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // Add Mux webhook signature verification here using Mux SDK if needed
  const event = req.body;

  if (event.type === 'video.asset.ready') {
    const assetId = event.data.id;
    const playbackId = event.data.playback_ids[0].id;
    
    // Update lecture with Mux playback ID
    await supabaseAdmin
      .from('lectures')
      .update({ 
        mux_playback_id: playbackId,
        status: 'ready'
      })
      .eq('mux_asset_id', assetId);
  }

  res.sendStatus(200);
});

export default router;
