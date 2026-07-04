import {
   OpenAPIRegistry,
   OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerUrlShortenerDocs } from '@/features/url-shortener/urlDocs.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
   type: 'http',
   scheme: 'bearer',
   bearerFormat: 'JWT',
});

registerUrlShortenerDocs(registry);

export const generateOpenApiDocument = () => {
   const generator = new OpenApiGeneratorV3(registry.definitions);

   return generator.generateDocument({
      openapi: '3.0.0',
      info: {
         title: 'HIMTI Internal Tools API',
         version: '1.0.0',
         description: 'API documentation for HIMTI Internal Tools.',
      },
      servers: [
         {
            url: `http://localhost:${process.env.PORT || 8000}`,
            description: 'Local development',
         },
         {
            url: 'https://api.himtibinus.or.id',
            description: 'Production',
         },
      ],
   });
};
