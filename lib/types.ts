export interface Band {
  id: string;
  name: string;
  description: string | null;
  genres: string[];
  date_formed: string;
  label: string | null;
  spotify_artist_id: string | null;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  image_url: string | null;
}

export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  genres: string[];
  instruments: string[];
  spotify_artist_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  venue_type: "studio" | "bar" | "hangout_place";
  address: string;
  lat: number | null;
  lng: number | null;
  added_by: string | null;
  created_at: string;
}

export interface Album {
  id: string;
  band_id: string;
  name: string;
  description: string | null;
  tracks: Track[];
  cover_url: string | null;
  release_date: string | null;
  created_at: string;
}

export interface Track {
  title: string;
  duration: number;
  order: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  user_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  contact_number: string | null;
  display_picture: string | null;
  instruments: string[];
  created_at: string;
}

export interface BandMember {
  id: string;
  band_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
}

export type EventType = "personal" | "band_rehearsal" | "studio_recording" | "hangout";

export interface Event {
  id: string;
  title: string;
  event_type: EventType;
  owner_id: string;
  band_id: string | null;
  venue_id: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  description: string | null;
  location: string | null;
  created_at: string;
}

export interface Conflict {
  id: string;
  band_event_id: string;
  personal_event_id: string;
  reported_by: string;
  status: "pending" | "cancelled" | "greenlit";
  created_at: string;
}

export interface ConflictVote {
  id: string;
  conflict_id: string;
  user_id: string;
  vote: "cancel" | "greenlit";
  voted_at: string;
}
