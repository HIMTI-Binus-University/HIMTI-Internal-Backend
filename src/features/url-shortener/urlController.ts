import { Request, Response } from 'express';
import { CreateUrlSchema } from '@/features/url-shortener/urlTypes.js';
import { urlService } from './urlService.js';

export const createUrl = async (req: Request, res: Response) => {
   const data = req.body;
   const validation = CreateUrlSchema.safeParse(data);

   // types and request validation
   if (!validation.success) {
      return res.status(400).json({ errros: validation.error.format() });
   }

   try {
      // panggil service
      const result = await urlService.createUrl(validation.data);
      res.status(200).json({
         msg: 'success',
         data: result,
      });
   } catch (error) {
      // expected standard error in object
      if (error instanceof Error) {
         console.error(error);
         res.status(500).json({ msg: error.message });
      } else {
         // non standard error
         console.error('Unknown error', error);
         res.status(500).json({ msg: 'An unknown error occurred' });
      }
   }
};

export const clickUrl = async (req: Request, res: Response) => {
   const userAgent: string = req.headers['user-agent'] || 'Unknown';
   // cek kalo di vps, local atau unknown
   const userIp: string =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown';
   const { shortCode } = req.params;

   try {
      // panggil service
      const urlData = await urlService.getUrlByCode(shortCode);

      // validations
      if (!urlData) {
         return res.status(404).json({ msg: 'Link not found' });
      }
      if (urlData.status !== 'a') {
         return res.status(404).json({ msg: 'Link is no longer active' });
      }
      if (urlData.expiresAt && new Date() > new Date(urlData.expiresAt)) {
         return res.status(410).json({ msg: 'Link has expired' });
      }

      // save the logs without await
      void urlService.logClick({
         urlId: urlData.urlId,
         ip: userIp,
         userAgent: userAgent,
      });

      // redirect
      return res.redirect(302, urlData.originalUrl);
   } catch (error) {
      // expected standard error in object
      if (error instanceof Error) {
         console.error(error);
         res.status(500).json({ msg: error.message });
      } else {
         // non standard error
         console.error('Unknown error', error);
         res.status(500).json({ msg: 'An unknown error occurred' });
      }
   }
};
