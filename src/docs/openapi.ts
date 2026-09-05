import {
   OpenAPIRegistry,
   OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerHealthDocs } from '@/docs/healthDocs.js';
import { registerEventDocs } from '@/features/events/eventDocs.js';
import { registerEventGroupDocs } from '@/features/event-groups/eventGroupDocs.js';
import { registerEventPackageDocs } from '@/features/event-packages/eventPackageDocs.js';
import { registerRegistrationFormDocs } from '@/features/registration-forms/registrationFormDocs.js';
import { registerMembershipDocs } from '@/features/membership/membershipDocs.js';
import { registerPermissionDocs } from '@/features/permissions/permissionDocs.js';
import { registerRoleDocs } from '@/features/roles/roleDocs.js';
import { registerUrlShortenerDocs } from '@/features/url-shortener/urlDocs.js';
import { registerUserDocs } from '@/features/users/userDocs.js';
import { registerLinkWorkspaceDocs } from '@/features/link-workspaces/linkWorkspaceDocs.js';
import {
   canonicalErrorResponseSchema,
   canonicalValidationErrorResponseSchema,
} from '@/docs/commonSchemas.js';
import { registerElectionDocs } from '@/features/elections/electionDocs.js';

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'sessionCookie', {
   type: 'apiKey',
   in: 'cookie',
   name: 'better-auth.session_token',
   description:
      'Protected endpoints require an active Better Auth session cookie. In HTTPS environments Better Auth may prefix the cookie name with __Secure-. Scalar sends the existing browser cookie automatically when using the current docs host.',
});

registry.register('ApiError', canonicalErrorResponseSchema);
registry.register('ValidationApiError', canonicalValidationErrorResponseSchema);

registerHealthDocs(registry);
registerUserDocs(registry);
registerRoleDocs(registry);
registerPermissionDocs(registry);
registerUrlShortenerDocs(registry);
registerLinkWorkspaceDocs(registry);
registerEventDocs(registry);
registerEventGroupDocs(registry);
registerEventPackageDocs(registry);
registerRegistrationFormDocs(registry);
registerMembershipDocs(registry);
registerElectionDocs(registry);

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
            url: 'http://localhost:8000',
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

const sortObjectKeys = (value: unknown): unknown => {
   if (Array.isArray(value)) return value.map(sortObjectKeys);
   if (!value || typeof value !== 'object') return value;

   return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
         .sort(([left], [right]) => left.localeCompare(right))
         .map(([key, child]) => [key, sortObjectKeys(child)]),
   );
};

export const serializeOpenApiDocument = () =>
   `${JSON.stringify(sortObjectKeys(generateOpenApiDocument()), null, 3)}\n`;
