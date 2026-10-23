import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { WeddingConfig, Guest } from '../types';

/**
 * Mobile-Sized Luxury Wedding Pass PDF (Smartphone / Apple Wallet Pass format)
 * Dimensions: 100mm x 195mm (Vertical smartphone ratio)
 * Features:
 * - Luxury gold & cream mobile boarding card
 * - Prominent Bride & Groom header
 * - Perforated ticket divider with notches
 * - Full guest name and companion name
 * - Table reservation and seat count
 * - Embedded high-definition scannable QR Code
 * - Complete church, civil and reception details
 * - Security token and entrance instructions
 */
export async function generateMobileWeddingPassPdf(config: WeddingConfig, guest: Guest): Promise<{ doc: jsPDF; blob: Blob; filename: string }> {
  // Mobile smartphone pass dimensions (100mm x 195mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 195]
  });

  const width = 100;
  const height = 195;

  // Rich luxury ivory card background
  doc.setFillColor(253, 251, 247);
  doc.rect(0, 0, width, height, 'F');

  // Double gold border
  doc.setDrawColor(180, 142, 70); // Warm gold
  doc.setLineWidth(0.7);
  doc.rect(5, 5, width - 10, height - 10);

  doc.setDrawColor(225, 205, 155);
  doc.setLineWidth(0.25);
  doc.rect(6.8, 6.8, width - 13.6, height - 13.6);

  // Corner decorative flourishes
  const cornerMark = (x: number, y: number, dx: number, dy: number) => {
    doc.setDrawColor(180, 142, 70);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + dx * 3, y);
    doc.line(x, y, x, y + dy * 3);
  };
  cornerMark(8, 8, 1, 1);
  cornerMark(width - 8, 8, -1, 1);
  cornerMark(8, height - 8, 1, -1);
  cornerMark(width - 8, height - 8, -1, -1);

  let curY = 14;

  // Header Badge
  doc.setFillColor(180, 142, 70);
  doc.roundedRect(width / 2 - 28, curY, 56, 5.5, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(6.5);
  doc.text('PASSE VIP DIGITAL · PORTARIA', width / 2, curY + 3.8, { align: 'center' });
  curY += 10;

  // Couple Monogram & Names
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.text('Acesso Exclusivo à Celebração de', width / 2, curY, { align: 'center' });
  curY += 6;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(16.5);
  doc.text(`${groom} & ${bride}`, width / 2, curY, { align: 'center' });
  curY += 5.5;

  // Wedding Date
  let dateFormatted = '25 de Outubro de 2026';
  try {
    const d = new Date(config.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  doc.setTextColor(130, 115, 100);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.text(dateFormatted, width / 2, curY, { align: 'center' });
  curY += 7;

  // TICKET PERFORATION LINE (Notches + Dotted Line)
  doc.setFillColor(243, 239, 230); // notch color matching page background
  // Left cutout notch
  doc.circle(0, curY, 4, 'F');
  doc.setDrawColor(180, 142, 70);
  doc.setLineWidth(0.4);
  if (typeof (doc as any).arc === 'function') {
    (doc as any).arc(0, curY, 4, 4, 270, 90, 'S');
  }

  // Right cutout notch
  doc.circle(width, curY, 4, 'F');
  if (typeof (doc as any).arc === 'function') {
    (doc as any).arc(width, curY, 4, 4, 90, 270, 'S');
  }

  // Dotted divider across
  doc.setDrawColor(200, 175, 125);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(7, curY, width - 7, curY);
  doc.setLineDashPattern([], 0); // reset dash
  curY += 7;

  // GUEST DETAILS CARD CONTAINER
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 200, 160);
  doc.setLineWidth(0.35);
  const guestBoxHeight = guest.companionName ? 33 : 27;
  doc.roundedRect(9, curY, width - 18, guestBoxHeight, 2.5, 2.5, 'FD');

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(6.5);
  doc.text('CONVIDADO(A) DE HONRA', 13, curY + 5.5);

  doc.setTextColor(40, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text(guest.name, 13, curY + 11);

  if (guest.companionName) {
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(6.5);
    doc.text('ACOMPANHANTE CONFIRMADO(A)', 13, curY + 16.5);

    doc.setTextColor(60, 45, 35);
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.text(guest.companionName, 13, curY + 21.5);
  }

  // Table & Seats badges inside container
  const tableY = curY + (guest.companionName ? 27.5 : 18.5);
  doc.setTextColor(120, 110, 100);
  doc.setFont('times', 'normal');
  doc.setFontSize(7);
  const seatsText = guest.companionName 
    ? 'Lugares: 2 Pessoas (Titular + Acompanhante)'
    : `Lugares: 1 + ${guest.plusOnesConfirmed ?? guest.maxPlusOnes} Acompanhante(s)`;
  doc.text(`Mesa: ${guest.tableNumber || 'Reservada'}   ·   ${seatsText}`, 13, tableY);

  curY += guestBoxHeight + 5;

  // EMBEDDED HIGH-RES QR CODE FOR SECURITY CHECK-IN
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`;

  const qrSize = 42; // mm
  const qrX = (width - qrSize) / 2;

  try {
    const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
      margin: 1,
      width: 400,
      color: {
        dark: '#2A1E14',
        light: '#FFFFFF'
      }
    });
    // Draw white background backing for QR
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 192, 134);
    doc.setLineWidth(0.4);
    doc.roundedRect(qrX - 2, curY - 2, qrSize + 4, qrSize + 4, 2, 2, 'FD');
    doc.addImage(qrDataUrl, 'PNG', qrX, curY, qrSize, qrSize);
  } catch (err) {
    // Fallback placeholder box
    doc.setDrawColor(180, 142, 70);
    doc.roundedRect(qrX, curY, qrSize, qrSize, 2, 2, 'S');
    doc.setTextColor(180, 142, 70);
    doc.setFontSize(8);
    doc.text('QR CODE VIP', width / 2, curY + qrSize / 2, { align: 'center' });
  }

  curY += qrSize + 6;

  // Token Badge
  doc.setTextColor(180, 142, 70);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.text(`TOKEN: ${guest.rsvpToken}`, width / 2, curY, { align: 'center' });
  curY += 4.5;

  doc.setTextColor(120, 110, 100);
  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.text('Status: Presença Confirmada & Aprovada pelos Noivos ✓', width / 2, curY, { align: 'center' });
  curY += 6;

  // CEREMONY & RECEPTION VENUE DETAILS (COMPACT & BEAUTIFULLY STYLED)
  doc.setDrawColor(220, 205, 175);
  doc.setLineWidth(0.25);
  doc.line(14, curY, width - 14, curY);
  curY += 4.5;

  // 1. Civil (if present)
  if (config.venue?.civilName) {
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(6.5);
    doc.text('CIVIL / REGISTO:', 12, curY);

    doc.setTextColor(50, 40, 30);
    doc.setFont('times', 'normal');
    doc.text(`${config.venue.civilName} (${config.venue.civilTime || '10:30h'})`, 36, curY);
    curY += 4;
  }

  // 2. Church
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(6.5);
  doc.text('IGREJA (RELIGIOSO):', 12, curY);

  const churchName = config.venue?.churchName || config.venue?.ceremonyName || 'Igreja N. Sra. do Carmo';
  const churchTime = config.venue?.churchTime || config.venue?.ceremonyTime || '16:00h';
  doc.setTextColor(50, 40, 30);
  doc.setFont('times', 'normal');
  doc.text(`${churchName} (${churchTime})`, 41, curY);
  curY += 3.5;

  const churchAddr = config.venue?.churchAddress || config.venue?.ceremonyAddress || 'Luanda, Angola';
  doc.setTextColor(130, 120, 110);
  doc.setFontSize(5.8);
  doc.text(churchAddr, 41, curY);
  curY += 4.5;

  // 3. Reception
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(6.5);
  doc.text('COPO DE ÁGUA:', 12, curY);

  const recepName = config.venue?.receptionName || 'Espaço Jardins da Welwitschia';
  const recepTime = config.venue?.receptionTime || '18:00h';
  doc.setTextColor(50, 40, 30);
  doc.setFont('times', 'normal');
  doc.text(`${recepName} (${recepTime})`, 35, curY);
  curY += 3.5;

  const recepAddr = config.venue?.receptionAddress || 'Talatona, Luanda';
  doc.setTextColor(130, 120, 110);
  doc.setFontSize(5.8);
  doc.text(recepAddr, 35, curY);
  curY += 6;

  // DRESS CODE & ENTRY INSTRUCTIONS
  doc.setFillColor(248, 245, 238);
  doc.roundedRect(10, curY, width - 20, 9.5, 2, 2, 'F');

  doc.setTextColor(140, 100, 45);
  doc.setFont('times', 'bold');
  doc.setFontSize(6);
  const dressCodeTitle = config.dressCode?.title ? `TRAJE: ${config.dressCode.title.toUpperCase()}` : 'TRAJE: FORMAL / PASSEIO COMPLETO';
  doc.text(dressCodeTitle, width / 2, curY + 4, { align: 'center' });

  doc.setTextColor(110, 100, 90);
  doc.setFont('times', 'italic');
  doc.setFontSize(5.5);
  doc.text('Apresente este bilhete digital no seu telemóvel na portaria.', width / 2, curY + 7.5, { align: 'center' });

  // ROMANTIC FOOTER
  doc.setTextColor(160, 145, 125);
  doc.setFont('times', 'italic');
  doc.setFontSize(6.5);
  doc.text(`Com amor eterno, ${groom} & ${bride} ❤️`, width / 2, height - 7.5, { align: 'center' });

  const safeFilename = `Passe_VIP_Mobile_${groom}_e_${bride}_${guest.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  return { doc, blob, filename: safeFilename };
}

export async function downloadMobileWeddingPassPdf(config: WeddingConfig, guest: Guest): Promise<void> {
  const { doc, filename } = await generateMobileWeddingPassPdf(config, guest);
  doc.save(filename);
}

export async function generateWeddingInvitationPdf(config: WeddingConfig, guest?: Guest): Promise<{ doc: jsPDF; blob: Blob; filename: string }> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background tint
  doc.setFillColor(252, 250, 246);
  doc.rect(0, 0, width, height, 'F');

  // Outer ornate double border
  doc.setDrawColor(180, 142, 70); // Rich Gold
  doc.setLineWidth(0.8);
  doc.rect(8, 8, width - 16, height - 16);

  doc.setDrawColor(218, 192, 134);
  doc.setLineWidth(0.3);
  doc.rect(10.5, 10.5, width - 21, height - 21);

  // Corner decorative marks
  const cornerSize = 4;
  const drawCorner = (x: number, y: number, dx: number, dy: number) => {
    doc.setDrawColor(180, 142, 70);
    doc.setLineWidth(0.6);
    doc.line(x, y, x + dx * cornerSize, y);
    doc.line(x, y, x, y + dy * cornerSize);
  };

  drawCorner(12, 12, 1, 1);
  drawCorner(width - 12, 12, -1, 1);
  drawCorner(12, height - 12, 1, -1);
  drawCorner(width - 12, height - 12, -1, -1);

  let curY = 22;

  // Header title
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('C O N V I T E   D E   C A S A M E N T O', width / 2, curY, { align: 'center' });
  curY += 6;

  // Ornate divider
  doc.setDrawColor(218, 192, 134);
  doc.setLineWidth(0.4);
  doc.line(width / 2 - 25, curY, width / 2 + 25, curY);
  curY += 7;

  // Blessing text
  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.text('Com a bênção de Deus e de nossas famílias', width / 2, curY, { align: 'center' });
  curY += 10;

  // Couple names
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(21);
  doc.text(groom, width / 2, curY, { align: 'center' });
  curY += 6.5;

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'italic');
  doc.setFontSize(15);
  doc.text('&', width / 2, curY, { align: 'center' });
  curY += 7;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(21);
  doc.text(bride, width / 2, curY, { align: 'center' });
  curY += 10;

  // Invitation text
  doc.setTextColor(100, 90, 80);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('Têm a imensa alegria de convidar para o seu matrimónio.', width / 2, curY, { align: 'center' });
  curY += 9;

  // 1. CERIMÓNIA CIVIL (IF CONFIGURED)
  if (config.venue?.civilName) {
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text('CERIMÓNIA CIVIL (REGISTO)', width / 2, curY, { align: 'center' });
    curY += 4.5;

    doc.setTextColor(45, 30, 20);
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text(config.venue.civilName, width / 2, curY, { align: 'center' });
    curY += 4;

    doc.setTextColor(115, 105, 95);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    const civilDetails = `${config.venue.civilTime ? config.venue.civilTime + ' · ' : ''}${config.venue.civilAddress || 'Luanda'}`;
    doc.text(civilDetails, width / 2, curY, { align: 'center' });
    curY += 7;
  }

  // 2. CERIMÓNIA RELIGIOSA (IGREJA)
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.text('CERIMÓNIA RELIGIOSA (IGREJA)', width / 2, curY, { align: 'center' });
  curY += 4.5;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  const churchName = config.venue?.churchName || config.venue?.ceremonyName || 'Igreja Nossa Senhora do Carmo';
  doc.text(churchName, width / 2, curY, { align: 'center' });
  curY += 4;

  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  const churchDetails = `${config.venue.churchTime || config.venue.ceremonyTime || '16:00h'} · ${config.venue.churchAddress || config.venue.ceremonyAddress || 'Luanda, Angola'}`;
  doc.text(churchDetails, width / 2, curY, { align: 'center' });
  curY += 7;

  // 3. COPO DE ÁGUA & RECEPÇÃO
  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.text('COPO DE ÁGUA & RECEPÇÃO (FESTA)', width / 2, curY, { align: 'center' });
  curY += 4.5;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  const receptionName = config.venue?.receptionName || 'Espaço Jardins da Welwitschia';
  doc.text(receptionName, width / 2, curY, { align: 'center' });
  curY += 4;

  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  const receptionDetails = `${config.venue.receptionTime || 'A partir das 18:00h'} · ${config.venue.receptionAddress || 'Talatona, Luanda'}`;
  doc.text(receptionDetails, width / 2, curY, { align: 'center' });
  curY += 10;

  // PERSONALIZED GUEST PASS WITH COMPANION NAME (IF PRESENT)
  if (guest) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 192, 134);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, curY, width - 28, 38, 3, 3, 'FD');

    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(7);
    doc.text('PASSE VIP DE ENTRADA & PORTARIA', 20, curY + 6);

    doc.setTextColor(30, 30, 30);
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.text(guest.name, 20, curY + 13);

    // Companion name if specified
    if (guest.companionName) {
      doc.setTextColor(140, 90, 40);
      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.text(`Acompanhante: ${guest.companionName}`, 20, curY + 18.5);
    }

    doc.setTextColor(100, 95, 90);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    const companionLabel = guest.companionName 
      ? `Assentos: 2 pessoas (Titular + Acompanhante)` 
      : `Assentos: 1 + ${guest.plusOnesConfirmed ?? guest.maxPlusOnes} acompanhante(s)`;
    doc.text(`Mesa: ${guest.tableNumber || 'Reservada'}     ${companionLabel}`, 20, curY + (guest.companionName ? 23.5 : 20));

    doc.setTextColor(180, 142, 70);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Token: ${guest.rsvpToken}`, 20, curY + (guest.companionName ? 28.5 : 26));

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`;

    doc.setTextColor(120, 120, 120);
    doc.setFont('times', 'normal');
    doc.setFontSize(6.5);
    doc.text('Link do Convite Online:', 20, curY + (guest.companionName ? 33 : 31));
    doc.setTextColor(180, 142, 70);
    doc.text(inviteLink, 20, curY + (guest.companionName ? 36 : 35));

    curY += 44;
  } else {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(218, 192, 134);
    doc.setLineWidth(0.4);
    doc.roundedRect(16, curY, width - 32, 26, 3, 3, 'FD');

    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text('CONFIRMAÇÃO DE PRESENÇA (RSVP)', width / 2, curY + 6.5, { align: 'center' });

    doc.setTextColor(80, 75, 70);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('Por gentileza, confirme a sua presença até 10 dias antes da cerimónia.', width / 2, curY + 13, { align: 'center' });

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseLink = `${origin}/?clientId=${config.clientId || 'client_1'}`;
    doc.setTextColor(180, 142, 70);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text(baseLink, width / 2, curY + 19.5, { align: 'center' });

    curY += 32;
  }

  // Footer message
  const footerMsg = config.customFooter || `Com amor, sempre. — ${groom} & ${bride}`;
  doc.setTextColor(150, 135, 115);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text(footerMsg, width / 2, height - 12, { align: 'center' });

  const safeFilename = `Convite_${groom}_e_${bride}${guest ? '_' + guest.name.replace(/[^a-zA-Z0-9]/g, '_') : ''}.pdf`;
  const blob = doc.output('blob');
  return { doc, blob, filename: safeFilename };
}

export async function downloadWeddingPdf(config: WeddingConfig, guest?: Guest, preferMobile = true): Promise<void> {
  if (guest && preferMobile) {
    return downloadMobileWeddingPassPdf(config, guest);
  }
  const { doc, filename } = await generateWeddingInvitationPdf(config, guest);
  doc.save(filename);
}

export function formatWhatsAppMessage(config: WeddingConfig, guest?: Guest): string {
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';
  let dateFormatted = '25 de Outubro de 2026';
  try {
    const d = new Date(config.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = guest 
    ? `${origin}/?invite=${guest.rsvpToken}&clientId=${config.clientId || 'client_1'}`
    : `${origin}/?clientId=${config.clientId || 'client_1'}`;

  const greeting = guest ? `Olá, *${guest.name}*!` : `Olá!`;
  const churchPart = config.venue?.churchName ? `\n⛪ *Igreja (Religioso):* ${config.venue.churchName} (${config.venue.churchTime || '16:00h'})\n📍 ${config.venue.churchAddress || 'Luanda'}` : '';
  const civilPart = config.venue?.civilName ? `\n🏛️ *Civil (Registo):* ${config.venue.civilName} (${config.venue.civilTime || '10:30h'})` : '';
  const receptionPart = config.venue?.receptionName ? `\n🥂 *Copo de Água:* ${config.venue.receptionName} (${config.venue.receptionTime || '18:00h'})\n📍 ${config.venue.receptionAddress || 'Talatona, Luanda'}` : '';
  const tablePart = guest?.tableNumber ? `\n📌 *Mesa Reservada:* ${guest.tableNumber}` : '';
  const companionPart = guest?.companionName ? `\n👤 *Acompanhante Confirmado:* ${guest.companionName}` : '';
  const tokenPart = guest?.rsvpToken ? `\n🔑 *Token de Portaria:* \`${guest.rsvpToken}\`` : '';

  const isApproved = guest?.status === 'Confirmed' || guest?.approvedByCouple;

  if (isApproved) {
    return `✨ *PASSE VIP OFICIAL & PRESENÇA CONFIRMADA* ✨\n\n${greeting}\nÉ com imensa alegria que informamos que a sua solicitação de presença no casamento de *${groom} & ${bride}* foi *APROVADA PELOS NOIVOS*! 🎉🥂\n\n💍 *Casamento de ${groom} & ${bride}*\n📅 *Data:* ${dateFormatted}${civilPart}${churchPart}${receptionPart}${tablePart}${companionPart}${tokenPart}\n\n📱 *Seu Passe Mobile Oficial com QR Code:* \nAceda ao link abaixo para visualizar seu passe digital e baixar o PDF em tamanho telemóvel para apresentar na portaria:\n🔗 ${inviteUrl}\n\nSua presença tornará o nosso dia verdadeiramente inesquecível! Nos vemos em breve! ❤️`;
  }

  return `✨ *CONVITE DE CASAMENTO* ✨\n\n${greeting}\nÉ com imensa alegria e honra que convidamos você para celebrar o nosso matrimônio!\n\n💍 *${groom} & ${bride}*\n📅 *Data:* ${dateFormatted}${civilPart}${churchPart}${receptionPart}${tablePart}${companionPart}\n\nAcesse o seu convite digital interativo e confirme a sua presença aqui:\n🔗 ${inviteUrl}\n\nSua presença tornará o nosso dia ainda mais abençoado e inesquecível! ❤️`;
}

export function sendInviteViaWhatsApp(config: WeddingConfig, guest?: Guest): void {
  const message = formatWhatsAppMessage(config, guest);
  const rawPhone = guest?.phone ? guest.phone.replace(/[^0-9]/g, '') : '';
  let url = '';
  if (rawPhone && rawPhone.length >= 8) {
    url = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(message)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }
  window.open(url, '_blank');
}

/**
 * Printable Luxury Card with QR Code specifically designed for Physical Invitations (Enclosures / Tags / Mesa)
 * Size: A6 (105 x 148 mm)
 */
export async function downloadPhysicalCardQrPdf(config: WeddingConfig, customUrl?: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a6'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background tint
  doc.setFillColor(253, 251, 247);
  doc.rect(0, 0, width, height, 'F');

  // Double Gold Border
  doc.setDrawColor(180, 142, 70);
  doc.setLineWidth(0.8);
  doc.rect(6, 6, width - 12, height - 12);

  doc.setDrawColor(218, 192, 134);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, width - 16, height - 16);

  let curY = 16;
  const groom = config.brideGroom?.groomName || 'Gabriel';
  const bride = config.brideGroom?.brideName || 'Sofia';

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text('C O N V I T E   D I G I T A L', width / 2, curY, { align: 'center' });
  curY += 6;

  doc.setTextColor(45, 30, 20);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(`${groom} & ${bride}`, width / 2, curY, { align: 'center' });
  curY += 7;

  doc.setTextColor(115, 105, 95);
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.text('Aponte a câmera do seu celular para o QR Code abaixo:', width / 2, curY, { align: 'center' });
  curY += 4;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = customUrl || `${origin}/?invite=convite&clientId=${config.clientId || 'client_1'}`;

  // Generate QR Code data URL
  try {
    const qrDataUrl = await (await import('./qrCodeHelper')).generateHighResQrPng(inviteUrl, 1000, '#1c1917');
    const qrSize = 50; // mm
    const qrX = (width - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, curY, qrSize, qrSize);
    curY += qrSize + 4;
  } catch (e) {
    curY += 54;
  }

  doc.setTextColor(180, 142, 70);
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.text('CONFIRMAÇÃO DE PRESENÇA (RSVP)', width / 2, curY, { align: 'center' });
  curY += 4.5;

  doc.setTextColor(100, 95, 90);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.text('Lista de Presentes · Localização GPS · Fotos dos Noivos', width / 2, curY, { align: 'center' });
  curY += 6;

  doc.setTextColor(150, 140, 130);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.text(inviteUrl, width / 2, curY, { align: 'center' });

  doc.save(`Cartao_QR_Fisico_${groom}_e_${bride}.pdf`);
}
