'use client';

import { useState, useEffect } from 'react';
import { PlaylistGeneratorProps, Track, Playlist } from '../types/spotify';
import Image from 'next/image';

interface PlaylistResponse {
  success: boolean;
  playlist: Playlist;
}

export default function PlaylistGenerator({ accessToken, onPlaylistCreated, onReset, topTracks = [] }: PlaylistGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [randomTracks, setRandomTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingDots('');
      return;
    }

    const interval = setInterval(() => {
      setLoadingDots(dots => {
        if (dots.length >= 3) return '';
        return dots + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading || !topTracks.length) return;

    // Initial set of 5 random tracks
    setRandomTracks([...topTracks]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5));

    const interval = setInterval(() => {
      setRandomTracks(prev => {
        const newTracks = [...topTracks]
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        // Ensure we get different tracks than the previous set
        if (prev.every(track => newTracks.some(newTrack => newTrack.id === track.id))) {
          return [...topTracks]
            .sort(() => Math.random() - 0.5)
            .slice(0, 5);
        }
        return newTracks;
      });
    }, 3000); // Changed from 4000 to 3000ms (3 seconds)

    return () => clearInterval(interval);
  }, [isLoading, topTracks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setPlaylist(null);
    
    try {
      // Check for the rickroll trigger (case insensitive)
      if (prompt.toLowerCase() === 'will you ever let me down?') {
        // Force a delay for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Create a playlist with just Never Gonna Give You Up
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to get user profile');
        }
        
        const userData = await response.json();
        
        // Create the playlist
        const createPlaylistResponse = await fetch(
          `https://api.spotify.com/v1/users/${userData.id}/playlists`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'From LazyDJ <3',
              description: 'Never gonna give you up, never gonna let you down...',
              public: false
            })
          }
        );

        if (!createPlaylistResponse.ok) {
          throw new Error('Failed to create playlist');
        }

        const playlist = await createPlaylistResponse.json();

        // The exact 7 versions from the image
        const rickrollVersions = [
          'spotify:track:4uLU6hMCjMI75M1A2tKUQC',  // Rick Astley - Original
          'spotify:track:5lqyFiWl0lGeyGVRStD3Ai',  // Jean Elan, Francesco Diaz
          'spotify:track:7AQ2YeJaabjcVI3ap7zwQM',  // Hazlett
          'spotify:track:5fnDDcjcXKUvJ6iSnpiU0v',  // Mac Beez
          'spotify:track:1nP5uKJMRZYcXptsY7s76o',  // Spencer Kane
          'spotify:track:4dJYjR2lM6SmYfLw2mnHvb',  // Radio Club
          'spotify:track:0B4D61uWfBiCvvTVRFA27q',  // TripL
        ];

        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: rickrollVersions
          })
        });

        // Get the final playlist with full track details
        const finalPlaylistResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlist.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );

        const finalPlaylist = await finalPlaylistResponse.json();
        setPlaylist(finalPlaylist);
        setPrompt('');
        setSuccess(true);
        onPlaylistCreated();
        return;
      }

      // Normal playlist generation logic continues...
      const response = await fetch('/api/generate-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt, 
          accessToken,
          topTracks
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate playlist');
      }

      if (data.success) {
        setPlaylist(data.playlist);
        setPrompt('');
        setSuccess(true);
        onPlaylistCreated();
      }
    } catch (error) {
      const funnyMessages = [
        "Oops! Our DJ had too much coffee. Mind trying again?",
        "Looks like our music-picking robot needs a reboot. Give it another shot!",
        "The playlist generator is having a dance break. Care to try again?",
        "Even AI DJs have off days! Let's give it another try.",
        "Our musical algorithms are feeling a bit shy. How about another attempt?"
      ];
      const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
      setError(randomMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!playlist?.id) return;
    
    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/followers`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
      }

      setSuccess(false);
      setPlaylist(null);
      onReset();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete playlist');
    }
  };

  const formatDescription = (description: string) => {
    // First decode any HTML entities
    const decoded = description.replace(/&quot;/g, '"')
                             .replace(/&amp;/g, '&')
                             .replace(/&lt;/g, '<')
                             .replace(/&gt;/g, '>')
                             .replace(/&#39;/g, "'");
    
    // Then handle the line break
    return decoded.replace(' | ', '\n');
  };

  const renderPlaylistCover = (tracks: Array<{ track: Track }>) => {
    if (!tracks || tracks.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#181818] text-[#b3b3b3]">
          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      );
    }

    const albumCovers = tracks
      .slice(0, 4)
      .map(item => item.track.album?.images?.[0]?.url)
      .filter(url => url);

    return (
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {albumCovers.map((url, index) => (
          <div key={`cover-${index}`} className="overflow-hidden relative w-full h-full bg-[#282828]">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#282828] via-[#383838] to-[#282828] animate-shimmer z-10 transition-opacity duration-300" 
              id={`shimmer-cover-${index}`}
            />
            <Image 
              src={url} 
              alt="Album cover"
              fill
              className="object-cover transition-opacity duration-300 z-20"
              loading="lazy"
              onLoadingComplete={(image) => {
                image.classList.remove('opacity-0');
                image.classList.add('opacity-100');
                const shimmer = document.getElementById(`shimmer-cover-${index}`);
                if (shimmer) {
                  shimmer.style.opacity = '0';
                }
              }}
            />
          </div>
        ))}
        {/* Fill remaining slots with placeholder if less than 4 covers */}
        {[...Array(4 - albumCovers.length)].map((_, index) => (
          <div key={`cover-placeholder-${index}`} className="bg-[#282828]" />
        ))}
      </div>
    );
  };

  const renderPlaylistContent = () => {
    if (!playlist) return null;

    if (!playlist.tracks?.items?.length) {
      return (
        <div className="text-center text-[#b3b3b3] py-8">
          <p>No tracks were found for your playlist.</p>
          <p className="mt-2">Try creating a new playlist with different criteria.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {/* Header row */}
        <div className="grid grid-cols-[16px,40px,1fr] sm:grid-cols-[16px,40px,1fr,1fr] gap-4 sm:gap-8 px-4 py-2 text-[#b3b3b3] text-sm border-b border-[#ffffff1a] mb-4">
          <span className="text-right">#</span>
          <span className="text-left">COVER</span>
          <span className="text-left">TITLE</span>
          <span className="hidden sm:block text-right">ALBUM</span>
        </div>
        
        {/* Track rows */}
        {playlist.tracks.items.map((item, index) => (
          <div 
            key={`${item.track.id}-${index}`}
            className="grid grid-cols-[16px,40px,1fr] sm:grid-cols-[16px,40px,1fr,1fr] gap-4 sm:gap-8 px-4 py-2 rounded-md group hover:bg-[#ffffff1a] transition-colors"
          >
            <span className="text-[#b3b3b3] group-hover:text-white text-sm text-right">
              {index + 1}
            </span>
            <div className="relative w-10 h-10 bg-[#282828] rounded overflow-hidden">
              {item.track.album?.images?.[0]?.url ? (
                <>
                  {/* Shimmer placeholder effect that disappears when image loads */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-[#282828] via-[#383838] to-[#282828] animate-shimmer z-10 transition-opacity duration-300" 
                    id={`shimmer-${item.track.id}`}
                  />
                  <Image 
                    src={item.track.album.images[0].url} 
                    alt={item.track.name}
                    fill
                    className="rounded object-cover transition-opacity duration-300 z-20"
                    loading="lazy"
                    onLoadingComplete={(image) => {
                      image.classList.remove('opacity-0');
                      image.classList.add('opacity-100');
                      // Hide the shimmer effect
                      const shimmer = document.getElementById(`shimmer-${item.track.id}`);
                      if (shimmer) {
                        shimmer.style.opacity = '0';
                      }
                    }}
                  />
                </>
              ) : (
                // Music note icon placeholder
                <div className="w-full h-full flex items-center justify-center text-[#b3b3b3]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 min-w-0 text-left">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate group-hover:text-[#1DB954] transition-colors">
                  {item.track.name}
                </div>
                <div className="text-sm text-[#b3b3b3] group-hover:text-white truncate transition-colors">
                  {item.track.artists.map(artist => artist.name).join(', ')}
                </div>
              </div>
            </div>
            <div className="hidden sm:block text-sm text-[#b3b3b3] group-hover:text-white truncate text-right">
              {item.track.album?.name}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSuccessMessage = () => {
    const trackCount = playlist?.tracks?.items?.length || 0;
    return (
      <div className="text-center">
        <p className="text-[#1DB954] font-medium mb-2">
          ✨ Your LazyDJ playlist is {trackCount > 0 ? 'ready' : 'created'}!
        </p>
        <p className="text-[#b3b3b3] text-sm mb-4">
          {trackCount > 0 
            ? 'Check your Spotify app — your playlist will be added and ready to listen in a few minutes!'
            : 'No tracks were found matching your criteria. Try creating a new playlist with different criteria.'}
        </p>
        <div className="flex flex-col items-center gap-4 mt-4">
          <button
            onClick={() => {
              setSuccess(false);
              setPlaylist(null);
              onReset();
            }}
            className="bg-[#1DB954] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1ed760] transition-colors"
          >
            Create Another Playlist
          </button>
          <div className="text-[#b3b3b3] text-sm">
            Don&apos;t like it?{' '}
            <button
              onClick={handleDelete}
              className="text-white underline hover:text-[#1DB954] transition-colors"
            >
              Delete this playlist
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingState = () => {
    if (!topTracks || topTracks.length === 0) return null;

    return (
      <div className="mt-6 text-[#b3b3b3] bg-[#282828]/50 rounded-lg p-4 sm:p-6 animate-fade-in">
        <div className="mb-6 px-2">
          <p className="text-sm font-medium text-[#1DB954] mb-1">
            Analyzing Your Music Taste
          </p>
          <p className="text-xs text-[#b3b3b3]/75">
            Using your favorite tracks to enhance recommendations
          </p>
        </div>
        <div className="space-y-2.5 relative">
          {randomTracks.map((track, index) => (
            <div 
              key={`${track.id}-${index}`}
              className="flex items-center gap-2 sm:gap-3 text-sm opacity-0 animate-slide-fade-in px-2"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'forwards'
              }}
            >
              <div className="w-6 h-6 sm:w-5 sm:h-5 relative flex-shrink-0 bg-[#282828] rounded overflow-hidden">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-[#282828] via-[#383838] to-[#282828] animate-shimmer z-10 transition-opacity duration-300"
                  id={`shimmer-loading-${track.id}`}
                />
                <Image
                  src={track.album.images[0].url}
                  alt={track.name}
                  fill
                  className="rounded object-cover transition-opacity duration-300 z-20"
                  loading="lazy"
                  onLoadingComplete={(image) => {
                    image.classList.remove('opacity-0');
                    image.classList.add('opacity-100');
                    // Hide the shimmer effect
                    const shimmer = document.getElementById(`shimmer-loading-${track.id}`);
                    if (shimmer) {
                      shimmer.style.opacity = '0';
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate font-medium text-left">{track.name}</span>
                <div className="hidden sm:flex sm:items-center text-sm text-[#b3b3b3]/75">
                  <span className="text-[#b3b3b3]/50 mx-2">•</span>
                  <span className="truncate">{track.artists[0].name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {success ? (
        <div className="space-y-8">
          {renderSuccessMessage()}
          {playlist && (
            <div className="bg-gradient-to-b from-[#282828] to-[#121212] rounded-lg overflow-hidden">
              <div className="bg-gradient-to-b from-[#3E3E3E] to-[#282828] p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Updated Playlist Cover */}
                  <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-[#282828] shadow-lg rounded overflow-hidden">
                    {renderPlaylistCover(playlist.tracks.items)}
                  </div>

                  {/* Playlist Info */}
                  <div className="flex-1 min-w-0 mt-4 sm:mt-0 text-center sm:text-left">
                    <span className="text-sm text-[#b3b3b3] font-medium uppercase">Playlist</span>
                    <h2 className="text-4xl font-bold mt-2 mb-4">{playlist?.name}</h2>
                    <p className="text-sm text-[#b3b3b3] whitespace-pre-line mb-4">
                      {formatDescription(playlist.description)}
                    </p>
                    <div className="flex justify-center sm:justify-start items-center gap-2 text-[#b3b3b3] text-sm">
                      <span className="font-medium">Created by LazyDJ</span>
                      <span>•</span>
                      <span>{playlist.tracks.items.length} songs</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {renderPlaylistContent()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tell LazyDJ what kind of playlist you want..."
                className="flex-1 bg-[#3E3E3E] text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1DB954] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1ed760] transition-colors disabled:opacity-50 whitespace-nowrap min-w-[160px] relative"
              >
                {isLoading ? (
                  <span className="flex justify-center items-center">
                    <span>Generating</span>
                    <span className="w-[24px] text-left">{loadingDots}</span>
                  </span>
                ) : (
                  'Create Playlist'
                )}
              </button>
            </div>
          </form>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          {isLoading && topTracks && topTracks.length > 0 && renderLoadingState()}
        </div>
      )}
    </div>
  );
} 