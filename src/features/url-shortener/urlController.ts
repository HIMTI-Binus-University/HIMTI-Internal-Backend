import { Request, Response } from 'express';
import { urlService } from './urlService.js';
import { handleAnalyticsLogging } from '@/utils/analyticsLogging.js';
import { CreateUrlSchema, GetUrlSchema, UpdateUrlSchema } from './urlSchema.js';

export const createUrl = async (req: Request, res: Response) => {
   const data = req.body;
   const userData = res.locals.user;
   const validation = CreateUrlSchema.safeParse(data);
   // types and request validation
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   // panggil service
   const result = await urlService.createUrl(validation.data, userData);
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const updateUrl = async (req: Request, res: Response) => {
   const data = req.body;
   const { id } = req.params;
   const userData = res.locals.user;
   const validation = UpdateUrlSchema.safeParse(data);
   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }
   // service
   const result = await urlService.updateUrl(validation.data, id, userData);
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const clickUrl = async (req: Request, res: Response) => {
   const { shortCode } = req.params;
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
   res.redirect(302, urlData.originalUrl);

   const userAgent: string = req.headers['user-agent'] || 'Unknown';
   // cek kalo di vps, local atau unknown
   const userIp: string =
      (req.headers['x-forwarded-for'] as string) || req.ip || 'Unknown';

   void handleAnalyticsLogging(urlData, userIp, userAgent);
};

export const getUrlById = async (req: Request, res: Response) => {
   const { id } = req.params;
   const result = await urlService.getUrlById(id);
   if (!result) {
      return res.status(404).json({ msg: 'Url not found' });
   }
   res.status(200).json({
      msg: 'success',
      data: result,
   });
};

export const getUrls = async (req: Request, res: Response) => {
   const query = GetUrlSchema.parse(req.query);
   const result = await urlService.getUrls(query);
   res.status(200).json({
      msg: 'success',
      ...result,
   });
};
