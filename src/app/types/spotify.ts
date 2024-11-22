export interface User {
  display_name: string;
  id: string;
  images?: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  tracks: {
    items: Array<{
      track: Track;
    }>;
  };
}

export interface PlaylistTrack {
  track: Track;
  added_at: string;
}

export interface Track {
  id: string;
  name: string;
  uri: string;
  artists: Artist[];
  album?: {
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
}

export interface Artist {
  id: string;
  name: string;
}

export interface PlaylistGeneratorProps {
  accessToken: string;
  onPlaylistCreated: () => void;
  onReset: () => void;
  topTracks?: Track[];
} 