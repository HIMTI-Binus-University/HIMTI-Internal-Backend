import { urlService } from '@/features/url-shortener/urlService.js';
import { GeoDataSchema } from '@/features/url-shortener/urlTypes.js';

export const handleAnalyticsLogging = async (
   urlData: any,
   userIp: string,
   userAgent: string,
) => {
   try {
      let geoData: GeoDataSchema = {};

      if (userIp !== '127.0.0.1' && userIp !== '::1' && userIp !== 'Unknown') {
         try {
            const getLocation = await fetch(`http://ip-api.com/json/${userIp}`);
            geoData = await getLocation.json();
         } catch (error) {
            console.error('Geo API Error:', error);
         }
      }

      await urlService.logClick({
         urlId: urlData.id,
         ip: userIp,
         userAgent: userAgent,
         city: geoData.city || 'Unknown',
         country: geoData.country || 'Unknown',
         region: geoData.region || 'Unknown',
         latitude: geoData.lat || 0,
         longitude: geoData.lon || 0,
         isp: geoData.isp || 'Unknown',
         timezone: geoData.timezone || 'Unknown',
      });
   } catch (error) {
      console.error('Logging Error:', error);
   }
};
