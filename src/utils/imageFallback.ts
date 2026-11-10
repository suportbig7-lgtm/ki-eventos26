/**
 * Kutxi Resilient Image Fallback & CDN Helper
 * Provides guaranteed, high-resolution wedding photography fallbacks
 * and auto-recovery for broken or unresolvable image URLs.
 */

export const WEDDING_FALLBACK_IMAGES = {
  // Couple Cover & Hero
  cover: '/assets/aistudio/capa_eeb23baf.jpeg',
  coverAlternative: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Couple Story & Romance
  story: '/assets/aistudio/nossa_historia_0790376f.jpeg',
  storyAlternative: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Groom & Bride Portraits
  groom: '/assets/aistudio/noivo_cb7dee44.jpeg',
  bride: '/assets/aistudio/noivaa_f3d108c5.jpeg',
  couple: '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',

  // Gallery Moments
  gallery: [
    '/assets/aistudio/galeria_do_casal1_aefb2fb2.jpeg',
    '/assets/aistudio/galeria_do_casal_2_026437d5.jpeg',
    '/assets/aistudio/galeria_do_casal_0790376f.jpeg',
    '/assets/aistudio/foto_do_casal_c43a7ce0.jpeg',
    '/assets/aistudio/capa_eeb23baf.jpeg',
    '/assets/aistudio/nossa_historia_0790376f.jpeg'
  ],

  // Gift Registry Categories
  giftEletro: 'https://images.unsplash.com/photo-1594385208974-2e75f9d8a8be?auto=format&fit=crop&q=80&w=600',
  giftCozinha: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=600',
  giftMesa: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=600',
  giftViagem: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=600',
  giftQuarto: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
  giftExperiencias: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
  giftDefault: '/assets/aistudio/capa_eeb23baf.jpeg',

  // Avatars
  avatarFemale: '/assets/aistudio/noivaa_f3d108c5.jpeg',
  avatarMale: '/assets/aistudio/noivo_cb7dee44.jpeg'
};

/**
 * Returns a valid URL or the real couple photo fallback if empty or generic Unsplash placeholder
 */
export function getSafeImageUrl(url: string | undefined | null, type: keyof typeof WEDDING_FALLBACK_IMAGES = 'cover'): string {
  const fallback = WEDDING_FALLBACK_IMAGES[type];
  const defaultFallbackUrl = typeof fallback === 'string' ? fallback : (Array.isArray(fallback) && fallback.length > 0 ? fallback[0] : WEDDING_FALLBACK_IMAGES.cover);

  if (!url || typeof url !== 'string' || url.trim().length <= 5) {
    return defaultFallbackUrl;
  }

  const cleanUrl = url.trim();

  // If the image is an old generic Unsplash portrait/couple placeholder, replace with root real couple photography
  if (
    cleanUrl.includes('images.unsplash.com') && 
    (type === 'groom' || type === 'bride' || type === 'couple' || type === 'cover' || type === 'story' || type === 'gallery')
  ) {
    return defaultFallbackUrl;
  }

  return cleanUrl;
}

/**
 * Image onError handler to recover broken images without showing browser broken-icon
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackType: keyof typeof WEDDING_FALLBACK_IMAGES = 'cover') {
  const target = e.currentTarget;
  const fallback = WEDDING_FALLBACK_IMAGES[fallbackType];
  const fallbackUrl = typeof fallback === 'string' ? fallback : (Array.isArray(fallback) ? fallback[0] : WEDDING_FALLBACK_IMAGES.cover);
  if (target.src !== fallbackUrl) {
    target.onerror = null;
    target.src = fallbackUrl;
  }
}
