'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlaylistGenerator from './components/PlaylistGenerator';
import { User, Track } from './types/spotify';
import Image from 'next/image';

// Separate the component that uses useSearchParams
const SearchParamsComponent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hasCreatedPlaylist, setHasCreatedPlaylist] = useState(false);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
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
      } catch (error) {
        console.log('Error fetching top tracks');
      }
    };

    if (accessToken) {
      fetchUserProfile();
      fetchTopTracks();
    }
  }, [accessToken]);

  const handlePlaylistReset = () => {
    setHasCreatedPlaylist(false);
  };

  return (
    <div className={`min-h-screen bg-[#121212] text-white ${!user ? 'mobile-login-container' : 'mobile-main-container'}`}>
      {user ? (
        <main className="max-w-3xl mx-auto px-4">
          <div className={`text-center space-y-12 pt-16 ${!hasCreatedPlaylist ? 'mobile-pre-playlist' : ''}`}>
            <div className="mb-12">
              <h1 className="text-5xl font-bold mb-2">LazyDJ</h1>
              <p className="text-[#1DB954] text-lg font-medium">No Effort, Just Vibes</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {user.images?.[0]?.url && (
                  <div className="relative w-8 h-8 bg-[#282828] rounded-full">
                    <Image
                      src={user.images[0].url}
                      alt={user.display_name}
                      fill
                      className="rounded-full border-2 border-[#282828] shadow-lg object-cover"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJSAyVC08MTY3LjIyOUFTRjo/Tj4yMkhiSk46PDtBRUpGSjpNTUpGQEH/2wBDAQUXFx4aHR4eHUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUH/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  </div>
                )}
                <h2 className="text-xl font-medium">Welcome, {user.display_name}!</h2>
              </div>
              {!hasCreatedPlaylist && (
                <div className="text-[#b3b3b3] space-y-2">
                  <p>Ready to create a personalized playlist?</p>
                  <p>Just describe what you&apos;re looking for, and let AI do the magic.</p>
                </div>
              )}
            </div>
            <PlaylistGenerator 
              accessToken={accessToken!} 
              onPlaylistCreated={() => setHasCreatedPlaylist(true)}
              onReset={handlePlaylistReset}
              topTracks={topTracks}
            />
          </div>
        </main>
      ) : (
        <div className="centered-container bg-[#121212] text-white flex flex-col justify-center min-h-screen">
          <div className="text-center space-y-6 mb-8">
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
    </div>
  );
}

// Main page component with Suspense
export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <SearchParamsComponent />
    </Suspense>
  );
} 