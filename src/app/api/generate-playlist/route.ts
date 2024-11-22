import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { prompt, accessToken, topTracks } = await request.json();

    if (!prompt || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Add detailed console logging of the entire prompt
    console.log('\n=== COMPLETE PROMPT TO CHATGPT ===\n');
    console.log('=== SYSTEM PROMPT ===');
    console.log(`You are a music expert DJ that creates personalized playlists. 
You will receive:
1. A user's request describing the type of playlist they want
2. A list of their most listened to tracks (for context about their music taste)

IMPORTANT GUIDELINES:
- The user's request is your TOP PRIORITY. Focus primarily on matching their specific request
- Use their top tracks only as subtle inspiration, not as main playlist content
- DO NOT include more than 2-3 songs from their top tracks list, and only if they naturally fit the request
- If their request doesn't align with their listening history, IGNORE their top tracks completely
- You may recommend other songs from artists in their top tracks, but ONLY IF those songs make sense in the context of the user's request
- Aim to discover new songs that match their request, rather than using their known favorites

Respond with exactly 15 songs in this JSON format:
{
  "songs": [
    { "title": "Song Name" }
  ]
}`);

    console.log('\n=== USER PROMPT ===');
    console.log(`User Request: "${prompt}"`);
    
    console.log('\n=== USER\'S TOP TRACKS ===');
    topTracks.slice(0, 50).forEach((track, i) => {
      console.log(`${i + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`);
    });

    console.log('\n=== REMINDER TO GPT ===');
    console.log(`Remember: 
- Focus primarily on the user's request
- Only include a maximum of 2-3 songs from their top tracks IF they naturally fit
- You can suggest other songs from their favorite artists IF they match the request perfectly
- Prioritize discovering new songs that match their request`);

    console.log('\n=== END OF PROMPT ===\n');

    // First get the user's Spotify ID
    console.log('Getting user profile...');
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to get user profile:', await userResponse.text());
      throw new Error('Failed to get user profile');
    }

    const userData = await userResponse.json();
    const userId = userData.id;
    console.log('Got user ID:', userId);

    // Get playlist title suggestion from OpenAI
    console.log('Getting playlist title suggestion...');
    const titleCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: "You are a creative playlist title generator. Create a catchy, relevant title (3-4 words max) from ANY input by interpreting the mood, sound, or feeling it conveys. Even playful or unconventional inputs should get meaningful titles. Examples: 'hehehe' → 'Laughs & Giggles Mix', 'blah blah' → 'Casual Vibes Only', 'asdfghjkl' → 'Keyboard Warriors Radio'. Only use 'LazyDJ's Playlist' if the input is a single character or completely empty. Be creative and find meaning in everything! Return ONLY the title, no other text."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.9,
    });

    const suggestedTitle = titleCompletion.choices[0].message.content?.trim() || "LazyDJ's Playlist";

    // Create empty playlist with suggested title
    console.log('Creating empty playlist...');
    const createPlaylistResponse = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: suggestedTitle,
          description: `A LazyDJ Playlist, by Ishaan Chamoli | AI prompt used: ${prompt}`,
          public: false
        })
      }
    );

    if (!createPlaylistResponse.ok) {
      console.error('Failed to create playlist:', await createPlaylistResponse.text());
      throw new Error('Failed to create playlist');
    }

    const playlist = await createPlaylistResponse.json();
    console.log('Empty playlist created:', playlist.id);

    // Then get song suggestions from OpenAI
    try {
      const systemPrompt = `You are a music expert DJ that creates personalized playlists. 
You will receive:
1. A user's request describing the type of playlist they want
2. A list of their most listened to tracks (for context about their music taste)

IMPORTANT GUIDELINES:
- The user's request is your TOP PRIORITY. Focus primarily on matching their specific request
- Use their top tracks only as subtle inspiration, not as main playlist content
- DO NOT include more than 2-3 songs from their top tracks list, and only if they naturally fit the request
- If their request doesn't align with their listening history, IGNORE their top tracks completely
- You may recommend other songs from artists in their top tracks, but ONLY IF those songs perfectly match the user's request
- Aim to discover new songs that match their request, rather than using their known favorites

Respond with exactly 15 songs in this JSON format:
{
  "songs": [
    { "title": "Song Name" }
  ]
}`;

      const userPrompt = `User Request: "${prompt}"

Their Top Tracks (for context only):
${topTracks.slice(0, 50).map((track, i) => 
  `${i + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`
).join('\n')}

Remember: 
- Focus primarily on the user's request
- Only include a maximum of 2-3 songs from their top tracks IF they naturally fit
- You can suggest other songs from their favorite artists IF they match the request perfectly
- Prioritize discovering new songs that match their request`;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.7,
      });

      if (!completion.choices[0].message.content) {
        console.log('No response from OpenAI - returning empty playlist');
        return NextResponse.json({ 
          success: true, 
          playlist,
          tracksFound: 0,
          totalSuggested: 0
        });
      }

      console.log('Raw OpenAI response:', completion.choices[0].message.content);

      // Parse the song list
      const parsedResponse = JSON.parse(completion.choices[0].message.content.trim());
      const songList = parsedResponse.songs || [];
      console.log('Songs to search for:', songList);

      // Array to store successfully found tracks
      const foundTracks: string[] = [];

      // Try to find and add each song one by one
      for (const song of songList) {
        try {
          // Simple search using just the song title
          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(song.title)}&type=track&limit=1`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!searchResponse.ok) {
            console.log(`Skipping "${song.title}" - search failed`);
            continue;
          }

          const searchResult = await searchResponse.json();
          
          // If a track is found, add it to our list
          if (searchResult.tracks?.items?.length > 0) {
            const trackUri = searchResult.tracks.items[0].uri;
            foundTracks.push(trackUri);
            console.log(`Found track: "${song.title}"`);

            // Add the track to the playlist immediately
            const addTrackResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                uris: [trackUri]
              })
            });

            if (addTrackResponse.ok) {
              console.log(`Added "${song.title}" to playlist`);
            } else {
              console.log(`Failed to add "${song.title}" to playlist`);
            }
          } else {
            console.log(`No match found for "${song.title}" - skipping`);
          }
        } catch (error) {
          console.log(`Error processing "${song.title}" - skipping:`, error);
          continue;
        }
      }

      // After adding all tracks, fetch the complete playlist
      const finalPlaylistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!finalPlaylistResponse.ok) {
        throw new Error('Failed to fetch final playlist');
      }

      const finalPlaylist = await finalPlaylistResponse.json();

      // Add excited completion message
      console.log('\n🎉 ============================== 🎉');
      console.log('🎵 PLAYLIST CREATION COMPLETE!!! 🎵');
      console.log(`✨ FOUND ${foundTracks.length} OUT OF ${songList.length} TRACKS! ✨`);
      console.log('🎉 ============================== 🎉\n');

      // Return success with the complete playlist data
      return NextResponse.json({ 
        success: true, 
        playlist: finalPlaylist,
        tracksFound: foundTracks.length,
        totalSuggested: songList.length
      });

    } catch (error) {
      // If OpenAI fails, we still return success since we created the playlist
      console.error('Error getting songs from OpenAI:', error);
      
      // Fetch the playlist even if OpenAI failed
      const emptyPlaylistResponse = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      const emptyPlaylist = await emptyPlaylistResponse.json();

      return NextResponse.json({ 
        success: true, 
        playlist: emptyPlaylist,
        tracksFound: 0,
        totalSuggested: 0,
        openaiError: error instanceof Error ? error.message : 'Failed to get song suggestions'
      });
    }

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 