import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOutlookVerificationEmail = async (
   to: string,
   verifyLink: string,
) => {
   try {
      const { data, error } = await resend.emails.send({
         from: 'HIMTI Registration <registration@himtibinus.or.id>',
         to: [to],
         subject: 'Verifikasi Email Outlook BINUS',
         html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
               <h2 style="color: #0078D4;">Verifikasi Akun Kamu</h2>
               <p>Halo,</p>
               <p>Terima kasih telah melengkapi profil. Sebagai mahasiswa Computer Science BINUS, kami perlu memverifikasi email Outlook kamu agar kamu bisa mengakses fitur penuh.</p>
               <p>Silakan klik tombol di bawah ini untuk memverifikasi email kamu:</p>
               <div style="margin: 30px 0;">
                  <a href="${verifyLink}" style="padding: 12px 24px; color: white; background-color: #0078D4; text-decoration: none; border-radius: 6px; font-weight: bold;">Verifikasi Email Outlook</a>
               </div>
               <p style="font-size: 14px; color: #666;">Atau salin tautan berikut ke browser kamu:</p>
               <p style="font-size: 14px; word-break: break-all;"><a href="${verifyLink}" style="color: #0078D4;">${verifyLink}</a></p>
               <p style="font-size: 12px; color: #999; margin-top: 40px;">Link ini akan kadaluarsa dalam 24 jam.</p>
            </div>
         `,
      });

      if (error) {
         console.error('Resend API Error:', error);
         throw new Error(error.message);
      }

      console.log('Email sent successfully:', data?.id);
      return data;
   } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
   }
};
