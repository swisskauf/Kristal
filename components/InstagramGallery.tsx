
import React, { useEffect, useState } from 'react';
import { fetchInstagramPhotos, InstagramPost } from '../services/instagramService';

interface InstagramGalleryProps {
  token: string;
}

const InstagramGallery: React.FC<InstagramGalleryProps> = ({ token }) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchInstagramPhotos(token);
      setPosts(data.slice(0, 10)); // Mostriamo gli ultimi 10
      setLoading(false);
    };
    if (token) load();
  }, [token]);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-100 rounded-[2rem]"></div>
      ))}
    </div>
  );

  if (posts.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
         <div>
            <h4 className="text-xl font-luxury font-bold text-gray-900">Kristal Highlights</h4>
            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-[0.2em]">Direttamente dal nostro Instagram</p>
         </div>
         <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors">Seguici <i className="fab fa-instagram ml-1"></i></a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {posts.map(post => (
          <a 
            key={post.id} 
            href={post.permalink} 
            target="_blank" 
            rel="noreferrer"
            className="group relative aspect-square overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-sm hover:shadow-xl transition-all"
          >
            <img 
              src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url} 
              alt="Kristal Work" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <i className={`fas ${post.media_type === 'VIDEO' ? 'fa-play' : 'fa-search-plus'} text-white text-xl`}></i>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default InstagramGallery;
