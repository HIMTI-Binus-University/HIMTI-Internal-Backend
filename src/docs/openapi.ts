import {
   OpenAPIRegistry,
   OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerHealthDocs } from '@/docs/healthDocs.js';
import { registerEventDocs } from '@/features/events/eventDocs.js';
import { registerPermissionDocs } from '@/features/permissions/permissionDocs.js';
import { registerRegistrationDocs } from '@/features/registration/registDocs.js';
import { registerRegistrationFormDocs } from '@/features/registration-forms/registrationFormDocs.js';
import { registerRoleDocs } from '@/features/roles/roleDocs.js';
import { registerSubEventDocs } from '@/features/sub-events/subEventDocs.js';
import { registerUrlShortenerDocs } from '@/features/url-shortener/urlDocs.js';
import { registerUserDocs } from '@/features/users/userDocs.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'sessionCookie', {
   type: 'apiKey',
   in: 'cookie',
   name: 'better-auth.session_token',
   description:
      'Protected endpoints require an active Better Auth session cookie. In HTTPS environments Better Auth may prefix the cookie name with __Secure-. Scalar sends the existing browser cookie automatically when using the current docs host.',
});

registerHealthDocs(registry);
registerRegistrationDocs(registry);
registerUserDocs(registry);
registerRoleDocs(registry);
registerPermissionDocs(registry);
registerUrlShortenerDocs(registry);
registerEventDocs(registry);
registerSubEventDocs(registry);
registerRegistrationFormDocs(registry);

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
            url: '/',
            description: 'Current docs host',
         },
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
