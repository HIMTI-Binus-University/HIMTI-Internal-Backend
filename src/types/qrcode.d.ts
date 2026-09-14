declare module 'qrcode' {
   interface QrOptions {
      type?: 'png';
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      margin?: number;
      width?: number;
   }

   const QRCode: {
      toBuffer(text: string, options?: QrOptions): Promise<Buffer>;
   };

   export default QRCode;
}
