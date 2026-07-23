import { Resend } from 'resend';
import { OUTLOOK_VERIFICATION_TOKEN_TTL_HOURS } from '@/config/verification.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOutlookVerificationEmail = async (
   to: string,
   verifyLink: string,
) => {
   try {
      const { data, error } = await resend.emails.send({
         from: 'HIMTI Registration <registration@himtibinus.or.id>',
         to: [to],
         subject: 'One quick step: verify your BINUS email',
         html: `
            <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">Confirm your BINUS email and continue your HIMTI registration.</div>
            <div style="background-color: #f3f7fb; padding: 40px 16px;">
               <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; overflow: hidden; border: 1px solid #dce7f1; border-radius: 16px; background-color: #ffffff; color: #203047;">
                  <div style="background-color: #073763; padding: 24px 32px; color: #ffffff;">
                     <p style="margin: 0; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">HIMTI BINUS University</p>
                  </div>
                  <div style="padding: 36px 32px;">
                     <h1 style="margin: 0 0 18px; color: #073763; font-size: 28px; line-height: 1.25;">You are almost there!</h1>
                     <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">Hi there,</p>
                     <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7;">Thanks for joining the HIMTI community. We just need to make sure this BINUS email belongs to you before you continue your registration.</p>
                     <p style="margin: 0 0 26px; font-size: 16px; line-height: 1.7;">Tap the button below and we will take care of the rest.</p>
                     <div style="margin: 0 0 28px;">
                        <a href="${verifyLink}" style="display: inline-block; padding: 14px 24px; border-radius: 8px; background-color: #0078d4; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">Verify my BINUS email</a>
                     </div>
                     <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #5b6b7f;">If the button does not work, copy and paste this link into your browser:</p>
                     <p style="margin: 0; font-size: 13px; line-height: 1.6; word-break: break-all;"><a href="${verifyLink}" style="color: #0078d4;">${verifyLink}</a></p>
                     <div style="margin-top: 28px; padding: 14px 16px; border-radius: 8px; background-color: #f3f7fb;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #5b6b7f;">This link expires in ${OUTLOOK_VERIFICATION_TOKEN_TTL_HOURS} hours. If you did not request it, you can safely ignore this email.</p>
                     </div>
                     <p style="margin: 30px 0 0; font-size: 15px; line-height: 1.7;">See you around,<br><strong>HIMTI Research and Development Team</strong></p>
                  </div>
               </div>
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
