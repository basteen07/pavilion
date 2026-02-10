import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(img) {
  if (!img) return '';
  if (typeof img === 'object') return img.image_url || img.url || '';
  return img;
}

export function getProductImage(product) {
  try {
    if (!product || !product.images) return null;
    let images = product.images;

    // Handle stringified JSON (common in PostgreSQL JSONB fields delivered as strings)
    if (typeof images === 'string') {
      if (images.trim().startsWith('[') || images.trim().startsWith('{')) {
        try {
          images = JSON.parse(images);
        } catch (e) {
          console.error('Failed to parse image string', e);
          return null;
        }
      } else {
        // Direct string URL
        return getImageUrl(images);
      }
    }

    if (Array.isArray(images) && images.length > 0) {
      const firstImage = images[0];
      // Check if it's a direct string URL or an object
      return getImageUrl(firstImage);
    }

    if (typeof images === 'object' && images !== null) {
      return getImageUrl(images);
    }

    return null;
  } catch (e) {
    console.error('Error parsing product images:', e);
    return null;
  }
}

export function getProductImages(product) {
  try {
    if (!product || !product.images) return [];
    let images = product.images;

    if (typeof images === 'string') {
      try {
        images = JSON.parse(images);
      } catch (e) {
        return [getImageUrl(images)];
      }
    }

    if (Array.isArray(images)) {
      return images.map(img => getImageUrl(img)).filter(url => !!url);
    }

    if (typeof images === 'object' && images !== null) {
      return [getImageUrl(images)];
    }

    return [];
  } catch (e) {
    console.error('Error parsing product images:', e);
    return [];
  }
}
