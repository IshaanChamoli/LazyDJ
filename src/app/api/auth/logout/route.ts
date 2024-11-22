import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Get the base URL
  const baseUrl = new URL(request.url).origin;
  
  // First redirect to Spotify's logout
  const spotifyLogoutUrl = 'https://www.spotify.com/logout/';
  
  // Then redirect back to our app with a cleared state
  return NextResponse.redirect(`${spotifyLogoutUrl}`);
} 