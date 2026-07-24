-- Direct messages
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- 'text' | 'material' | 'image'
    material_id UUID, -- if content_type = 'material'
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dm_conversation ON direct_messages(sender_id, receiver_id, sent_at);

-- Group messages
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    material_id UUID,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_group_messages ON group_messages(group_id, sent_at);

-- Course discussion threads
CREATE TABLE discussion_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT[],
    upvotes INT DEFAULT 0,
    is_ai_answered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion replies
CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id), -- NULL author_id = AI response
    body TEXT NOT NULL,
    upvotes INT DEFAULT 0,
    is_ai BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audio rooms
CREATE TABLE audio_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES profiles(id),
    name TEXT NOT NULL,
    course_id UUID REFERENCES courses(id),
    livekit_room_name TEXT UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    participant_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own DMs" ON direct_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send DMs" ON direct_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark DMs as read" ON direct_messages
    FOR UPDATE USING (auth.uid() = receiver_id);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view group messages" ON group_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_group_members 
            WHERE group_id = group_messages.group_id 
            AND user_id = auth.uid()
        )
    );
CREATE POLICY "Group members can send group messages" ON group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM study_group_members 
            WHERE group_id = group_messages.group_id 
            AND user_id = auth.uid()
        )
    );

ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view threads" ON discussion_threads FOR SELECT USING (true);
CREATE POLICY "Auth users can create threads" ON discussion_threads FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());
CREATE POLICY "Authors can update their threads" ON discussion_threads FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Authors can delete their threads" ON discussion_threads FOR DELETE USING (author_id = auth.uid());

ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view replies" ON discussion_replies FOR SELECT USING (true);
CREATE POLICY "Auth users can create replies" ON discussion_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND author_id = auth.uid());
CREATE POLICY "Authors can update their replies" ON discussion_replies FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Authors can delete their replies" ON discussion_replies FOR DELETE USING (author_id = auth.uid());

ALTER TABLE audio_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view audio rooms" ON audio_rooms FOR SELECT USING (true);
CREATE POLICY "Auth users can create audio rooms" ON audio_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND host_id = auth.uid());
CREATE POLICY "Hosts can update their audio rooms" ON audio_rooms FOR UPDATE USING (host_id = auth.uid());

-- Functions for upvoting
CREATE OR REPLACE FUNCTION increment_thread_upvotes(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE discussion_threads SET upvotes = upvotes + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_reply_upvotes(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE discussion_replies SET upvotes = upvotes + 1 WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
