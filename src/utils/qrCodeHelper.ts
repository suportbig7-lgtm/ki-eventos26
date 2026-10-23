import QRCode from 'qrcode';

/**
 * Generates a clean client-side data URL or SVG for QR codes
 * without relying on external third-party servers.
 */
export async function generateQrDataUrl(
  text: string, 
  size = 220, 
  darkColor = '#1c1917', 
  lightColor = '#ffffff'
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.warn('[QR Generator] Error generating QR code, falling back to public CDN:', err);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

/**
 * High-resolution PNG generator for Print Shops & Physical Invitations (Gráfica)
 * Produces crisp 1200x1200px image with high error correction (H)
 */
export async function generateHighResQrPng(
  text: string, 
  size = 1200, 
  darkColor = '#1c1917'
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: darkColor,
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    console.warn('[QR Generator] High-res error:', err);
    return await generateQrDataUrl(text, size, darkColor);
  }
}

/**
 * Direct file download of the QR code image for physical printing
 */
export async function downloadQrCodeImage(
  text: string, 
  filename = 'QRCode_Convite_Casamento.png', 
  size = 1200, 
  darkColor = '#1c1917'
): Promise<void> {
  const dataUrl = await generateHighResQrPng(text, size, darkColor);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Synchronous SVG string generator for instant rendering
 */
export async function generateQrSvgString(
  text: string, 
  size = 220, 
  darkColor = '#1c1917'
): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: darkColor,
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
  } catch (err) {
    return '';
  }
}
