'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export default function WebPlayback({ accessToken }) {
  const [player, setPlayer] = useState(null);
  const [is_paused, setPaused] = useState(true);
  const [current_track, setTrack] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'PlayAI Web Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        
        setTrack(state.track_window.current_track);
        setPaused(state.paused);
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account:', message);
      });

      player.activateElement();

      player.connect();
      setPlayer(player);
    };
  }, [accessToken]);

  if (!current_track) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-[#282828] p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={current_track?.album.images[0].url} 
            alt={current_track?.name}
            className="w-14 h-14 rounded"
          />
          <div>
            <div className="font-medium">{current_track?.name}</div>
            <div className="text-sm text-[#b3b3b3]">
              {current_track?.artists.map(artist => artist.name).join(', ')}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            className="text-[#b3b3b3] hover:text-white"
            onClick={() => player.previousTrack()}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          
          <button 
            className="text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => player.togglePlay()}
          >
            {is_paused ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
          
          <button 
            className="text-[#b3b3b3] hover:text-white"
            onClick={() => player.nextTrack()}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 