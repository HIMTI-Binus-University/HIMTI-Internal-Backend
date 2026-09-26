export const OUTLOOK_VERIFICATION_TOKEN_TTL_HOURS = 1;
export const OUTLOOK_VERIFICATION_TOKEN_TTL_MS =
   OUTLOOK_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000;

export type OutlookVerificationFlow = 'register' | 'reregister';

export const buildOutlookVerificationUrl = (
   frontendUrl: string,
   token: string,
   flow: OutlookVerificationFlow,
) => {
   const url = new URL('/verify-outlook', frontendUrl);
   if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Registration frontend URL must use HTTP or HTTPS');
   }
   url.searchParams.set('token', token);
   url.searchParams.set('flow', flow);
   return url.toString();
};

export const getRegistrationFrontendUrl = () => {
   const frontendUrl =
      process.env.REGISTRATION_FRONTEND_URL ?? process.env.FRONTEND_URL;
   if (!frontendUrl) {
      throw new Error('REGISTRATION_FRONTEND_URL is required');
   }
   return frontendUrl;
};
