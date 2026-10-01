import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}
