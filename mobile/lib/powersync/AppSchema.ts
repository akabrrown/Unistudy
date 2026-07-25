import { column, Schema, Table } from '@powersync/react-native';

const coursesTable = new Table({
  user_id: column.text,
  title: column.text,
  course_code: column.text,
  description: column.text,
  colour: column.text,
  semester: column.text,
  year: column.integer,
  archived: column.integer,
  created_at: column.text
});

const lecturesTable = new Table({
  course_id: column.text,
  title: column.text,
  week: column.integer,
  file_url: column.text,
  slide_count: column.integer,
  difficulty: column.integer,
  quality_score: column.text,
  processing: column.integer,
  created_at: column.text
});

const pinnedVideosTable = new Table({
  user_id: column.text,
  course_id: column.text,
  video_id: column.text,
  title: column.text,
  channel: column.text,
  thumbnail_url: column.text,
  watched: column.integer
});

export const AppSchema = new Schema({
  courses: coursesTable,
  lectures: lecturesTable,
  pinned_videos: pinnedVideosTable
});
