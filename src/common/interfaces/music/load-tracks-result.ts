export interface LoadTracksResult {
  loadType: 'SEARCH_RESULT' | 'PLAYLIST_LOADED' | 'TRACK_LOADED' | 'NO_MATCHES';
  tracks: Track[];
  playlistInfo: PlaylistInfo;
}

export interface PlaylistInfo {
  name: string;
  selectedTrack: number;
}

export interface Track {
  encoded: string;
  track: string;
  info: TrackInfo;
}

export interface TrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  sourceName: string;
}