export interface TripMoment {
  moment_id: string;
  trip_id: string;
  user_id: string;
  user_name: string;
  media_type: 'image' | 'video';
  /** Compressed thumbnail used in grid / recent strip. */
  thumbnail_url: string;
  /** Full-quality URL used in the viewer. Same as thumbnail_url for video until R2 is wired. */
  media_url: string;
  caption?: string;
  uploaded_at: string; // ISO string
  file_size: number;   // original bytes
}
