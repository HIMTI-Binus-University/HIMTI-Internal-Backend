import {
   OpenAPIRegistry,
   OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerHealthDocs } from '@/docs/healthDocs.js';
import { registerEventDocs } from '@/features/events/eventDocs.js';
import { registerPermissionDocs } from '@/features/permissions/permissionDocs.js';
import { registerRegistrationDocs } from '@/features/registration/registDocs.js';
import { registerRoleDocs } from '@/features/roles/roleDocs.js';
import { registerSubEventDocs } from '@/features/sub-events/subEventDocs.js';
import { registerUrlShortenerDocs } from '@/features/url-shortener/urlDocs.js';
import { registerUserDocs } from '@/features/users/userDocs.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
   type: 'http',
   scheme: 'bearer',
   bearerFormat: 'JWT',
   description:
      'Protected endpoints require an active Better Auth session accepted by the backend auth middleware.',
});

registerHealthDocs(registry);
registerRegistrationDocs(registry);
registerUserDocs(registry);
registerRoleDocs(registry);
registerPermissionDocs(registry);
registerUrlShortenerDocs(registry);
registerEventDocs(registry);
registerSubEventDocs(registry);

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
         {
            url: 'https://dev-api.himtibinus.or.id',
            description: 'Development',
         },
      ],
   });
};
