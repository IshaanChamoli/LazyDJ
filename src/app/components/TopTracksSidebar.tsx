import { useEffect, useState } from 'react';
import { Track } from '../types/spotify';
import Image from 'next/image';

interface TopTracksSidebarProps {
  accessToken: string;
  onTopTracksLoaded: (tracks: Track[]) => void;
}

export default function TopTracksSidebar({ accessToken, onTopTracksLoaded }: TopTracksSidebarProps) {
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopTracks = async () => {
      try {
        const response = await fetch(
          'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=long_term',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        
        if (!response.ok) {
          console.log('Failed to fetch top tracks');
          return;
        }
        
        const data = await response.json();
        const validTracks = data.items.filter((track: Track) => 
          track && 
          track.name && 
          track.artists && 
          track.album && 
          track.album.images && 
          track.album.images.length > 0
        );
        
        setTopTracks(validTracks);
        onTopTracksLoaded(validTracks);
      } catch (error) {
        console.log('Error fetching top tracks');
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchTopTracks();
    }
  }, [accessToken, onTopTracksLoaded]);

  if (isLoading) {
    return (
      <div className="w-80 bg-[#121212] border-r border-[#282828] p-4">
        <h2 className="text-xl font-bold mb-4">Your Top Tracks</h2>
        <div className="text-[#b3b3b3]">Loading...</div>
      </div>
    );
  }

  if (!topTracks.length) {
    return (
      <div className="w-80 bg-[#121212] border-r border-[#282828] p-4">
        <h2 className="text-xl font-bold mb-4">Your Top Tracks</h2>
        <div className="text-[#b3b3b3]">No tracks available</div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#121212] border-r border-[#282828] h-screen overflow-y-auto custom-scrollbar">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Your Top Tracks</h2>
        <div className="space-y-2">
          {topTracks.map((track, index) => (
            <div 
              key={track.id} 
              className="flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] transition-colors"
            >
              <span className="text-sm text-[#b3b3b3] w-5 text-right">{index + 1}</span>
              <Image
                src={track.album.images[0].url}
                alt={track.name}
                width={40}
                height={40}
                className="rounded shadow-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{track.name}</div>
                <div className="text-sm text-[#b3b3b3] truncate">
                  {track.artists.map(artist => artist.name).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 