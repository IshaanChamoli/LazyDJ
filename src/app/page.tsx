'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PlaylistGenerator from './components/PlaylistGenerator';
import { User } from './types/spotify';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [hasCreatedPlaylist, setHasCreatedPlaylist] = useState(false);
  const searchParams = useSearchParams();
  const accessToken = searchParams.get('access_token');
  const authError = searchParams.get('auth_error');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [accessToken]);

  const handlePlaylistReset = () => {
    setHasCreatedPlaylist(false);
  };

  return (
    <div className={`min-h-screen bg-[#121212] text-white ${!user ? 'flex items-center justify-center' : ''}`}>
      <main className="w-full max-w-3xl mx-auto px-4">
        {user ? (
          <div className="text-center space-y-12 pt-16">
            <div className="mb-12">
              <h1 className="text-5xl font-bold mb-2">LazyDJ</h1>
              <p className="text-[#1DB954] text-lg font-medium">No Effort, Just Vibes</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {user.images?.[0]?.url && (
                  <img
                    src={user.images[0].url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full border-2 border-[#282828] shadow-lg"
                  />
                )}
                <h2 className="text-xl font-medium">Welcome, {user.display_name}!</h2>
              </div>
              {!hasCreatedPlaylist && (
                <div className="text-[#b3b3b3] space-y-2">
                  <p>Ready to create a personalized playlist?</p>
                  <p>Just describe what you're looking for, and let AI do the magic.</p>
                </div>
              )}
            </div>
            <PlaylistGenerator 
              accessToken={accessToken!} 
              onPlaylistCreated={() => setHasCreatedPlaylist(true)}
              onReset={handlePlaylistReset}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-16">
            <div className="text-center space-y-6">
              <h1 className="text-7xl font-bold">LazyDJ</h1>
              <p className="text-[#1DB954] text-2xl font-medium">No Effort, Just Vibes</p>
              <p className="text-[#b3b3b3] text-lg">
                Your AI-powered playlist creator for Spotify
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <a
                href="/api/auth/login"
                className="inline-block bg-[#1DB954] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#1ed760] transition-all transform hover:scale-105 duration-200"
              >
                Login with Spotify
              </a>
              {authError && (
                <p className="text-red-500 text-sm">
                  Could not log in. Please try again.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 