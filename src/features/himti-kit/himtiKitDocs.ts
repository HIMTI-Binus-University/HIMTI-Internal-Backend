/**
 * ==========================================
 * SWAGGER / OPENAPI DOCUMENTATION - HIMTI KIT
 * ==========================================
 * Digunakan oleh swagger-jsdoc / swagger-ui-express.
 * Sesuaikan base path (mis. /api/himti-kit) dengan konfigurasi router utama.
 */
 
export const himtiKitDocs = {
  paths: {
    // ==========================================
    // DOCS UNTUK RESOURCES
    // ==========================================
    '/himti-kit/resources': {
      get: {
        tags: ['HIMTI Kit - Resources'],
        summary: 'Get all learning resources (public, no login required)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by title' },
          { name: 'major', in: 'query', schema: { type: 'string' }, description: 'Filter by major' },
        ],
        responses: {
          200: { description: 'List of resources returned successfully' },
        },
      },
      post: {
        tags: ['HIMTI Kit - Resources'],
        summary: 'Create a new learning resource',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'major', 'downloadUrl'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  major: { type: 'string' },
                  downloadUrl: { type: 'string' },
                  coverImageUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Resource created successfully' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/himti-kit/resources/{id}': {
      get: {
        tags: ['HIMTI Kit - Resources'],
        summary: 'Get a resource by id (public, no login required)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resource found' },
          404: { description: 'Resource not found' },
        },
      },
      patch: {
        tags: ['HIMTI Kit - Resources'],
        summary: 'Update a resource by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resource updated successfully' },
          404: { description: 'Resource not found' },
        },
      },
      delete: {
        tags: ['HIMTI Kit - Resources'],
        summary: 'Delete a resource by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Resource deleted successfully' },
          404: { description: 'Resource not found' },
        },
      },
    },
 
    // ==========================================
    // DOCS UNTUK SOFTWARE
    // ==========================================
    '/himti-kit/software': {
      get: {
        tags: ['HIMTI Kit - Software'],
        summary: 'Get all software entries (public, no login required)',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by software name' },
        ],
        responses: {
          200: { description: 'List of software returned successfully' },
        },
      },
      post: {
        tags: ['HIMTI Kit - Software'],
        summary: 'Create a new software entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'downloadUrl'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  downloadUrl: { type: 'string' },
                  coverImageUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Software created successfully' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/himti-kit/software/{id}': {
      get: {
        tags: ['HIMTI Kit - Software'],
        summary: 'Get a software entry by id (public, no login required)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Software found' },
          404: { description: 'Software not found' },
        },
      },
      patch: {
        tags: ['HIMTI Kit - Software'],
        summary: 'Update a software entry by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Software updated successfully' },
          404: { description: 'Software not found' },
        },
      },
      delete: {
        tags: ['HIMTI Kit - Software'],
        summary: 'Delete a software entry by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Software deleted successfully' },
          404: { description: 'Software not found' },
        },
      },
    },
 
    // ==========================================
    // DOCS UNTUK ATTENDEE
    // ==========================================
    '/himti-kit/attendees': {
      get: {
        tags: ['HIMTI Kit - Attendees'],
        summary: 'Get all eligible attendees',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or NIM' },
        ],
        responses: {
          200: { description: 'List of attendees returned successfully' },
        },
      },
      post: {
        tags: ['HIMTI Kit - Attendees'],
        summary: 'Add a single eligible attendee manually',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'nim'],
                properties: {
                  name: { type: 'string' },
                  nim: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Attendee added successfully' },
          409: { description: 'NIM is already registered' },
        },
      },
    },
    '/himti-kit/attendees/bulk-import': {
      post: {
        tags: ['HIMTI Kit - Attendees'],
        summary: 'Bulk import eligible attendees (from CSV parsed on the frontend)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['attendees'],
                properties: {
                  attendees: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['name', 'nim'],
                      properties: {
                        name: { type: 'string' },
                        nim: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Attendees imported successfully (duplicate NIM entries are skipped)' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/himti-kit/attendees/{id}': {
      delete: {
        tags: ['HIMTI Kit - Attendees'],
        summary: 'Remove an eligible attendee by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Attendee deleted successfully' },
          404: { description: 'Attendee not found' },
        },
      },
    },
 
    // ==========================================
    // DOCS UNTUK PUBLIC NIM VALIDATION
    // ==========================================
    '/himti-kit/attendees/validate/{nim}': {
      get: {
        tags: ['HIMTI Kit - Public'],
        summary: 'Validate whether a Binusian NIM is an eligible TECHNO attendee (public, no admin auth)',
        parameters: [{ name: 'nim', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        eligible: { type: 'boolean' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};