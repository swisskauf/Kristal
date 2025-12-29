
export interface InstagramPost {
  id: string;
  media_url: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  thumbnail_url?: string;
}

export async function fetchInstagramPhotos(token: string): Promise<InstagramPost[]> {
  if (!token) return [];
  try {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_url,permalink,media_type,thumbnail_url&limit=10&access_token=${token}`
    );
    const data = await response.json();
    
    if (data.error) {
      console.error('Instagram API Error:', data.error);
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch Instagram photos:', error);
    return [];
  }
}
