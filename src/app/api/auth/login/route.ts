import { NextResponse } from 'next/server';

const generateRandomString = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export async function GET() {
  const state = generateRandomString(16);
  const scope = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://your-project-name.vercel.app/api/auth/callback/spotify'
    : 'http://localhost:3000/api/auth/callback/spotify';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope,
    redirect_uri: redirectUri,
    state
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
} 