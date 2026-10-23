/**
 * High-performance browser-based image compressor utility
 * Resizes and compresses user-uploaded images in canvas to prevent localStorage quota exhaustion
 * and guarantee instant real-time UI rendering across mobile and desktop.
 */

export function compressImage(
  file: File, 
  maxWidth = 1200, 
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        resolve('');
        return;
      }
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxWidth) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxWidth) / height);
                height = maxWidth;
              }
            }
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string || '');
              return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (canvasErr) {
            console.warn('Canvas compression fallback:', canvasErr);
            resolve(e.target?.result as string || '');
          }
        };
        img.onerror = (imgErr) => {
          console.warn('Image load error during compression:', imgErr);
          resolve(e.target?.result as string || '');
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => {
        console.warn('FileReader error:', err);
        reject(err);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('compressImage exception:', err);
      reject(err);
    }
  });
}

export function compressAvatar(file: File): Promise<string> {
  return compressImage(file, 400, 0.85);
}
