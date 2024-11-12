import { NextRequest, NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  // If Spotify returns an error or user denied access
  if (error || !code) {
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/?auth_error=true`);
  }

  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.NODE_ENV === 'production'
      ? 'https://your-project-name.vercel.app/api/auth/callback/spotify'
      : 'http://localhost:3000/api/auth/callback/spotify'
  });

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    
    // Redirect to home with access token in query params
    const params = new URLSearchParams({
      access_token: data.body.access_token,
      refresh_token: data.body.refresh_token,
    });

    // Use dynamic URL for redirect
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/?${params.toString()}`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/?auth_error=true`);
  }
} 