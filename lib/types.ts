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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  user_id: string;
  created_at: string;
}
