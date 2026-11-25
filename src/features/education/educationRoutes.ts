import type { Server } from 'node:http';
import { Hocuspocus } from '@hocuspocus/server';
import { fromNodeHeaders } from 'better-auth/node';
import { WebSocketServer } from 'ws';
import { trustedOrigins } from '@/config/origins.js';
import { auth } from '@/utils/auth.js';
import { educationService } from './educationService.js';
import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createVideo,
   deleteVideo,
   getVideo,
   listVideos,
   updateVideo,
} from './videoController.js';
import {
   approveResponsi,
   assignResponsiEditors,
   createCourseGroup,
   createResponsi,
   deleteResponsi,
   getCourseGroup,
   getResponsi,
   listCourseGroups,
   listResponsiEditorCandidates,
   listResponsiVersions,
   listResponsies,
   restoreResponsiVersion,
   updateCourseGroup,
   updateResponsi,
} from './educationController.js';

import { summaryPermissions } from './educationTypes.js';

const router: Router = express.Router();

// Education scope protection
router.use(
   '/internal/education/videos',
   requireAuth,
   requirePermission('manage_education'),
);
router.use('/internal/education/course-groups', requireAuth);
router.use(
   '/internal/education/responsi',
   requireAuth,
   requirePermission(
      summaryPermissions.legacy,
      ...Object.values(summaryPermissions),
   ),
);

router.route('/internal/education/videos').get(listVideos).post(createVideo);

router
   .route('/internal/education/videos/:videoId')
   .get(getVideo)
   .patch(updateVideo)
   .delete(deleteVideo);

// Course Groups
router
   .route('/internal/education/course-groups')
   .get(
      requirePermission(
         summaryPermissions.legacy,
         ...Object.values(summaryPermissions),
      ),
      listCourseGroups,
   )
   .post(requirePermission(summaryPermissions.legacy), createCourseGroup);

router
   .route('/internal/education/course-groups/:courseId')
   .get(
      requirePermission(
         summaryPermissions.legacy,
         ...Object.values(summaryPermissions),
      ),
      getCourseGroup,
   )
   .patch(requirePermission(summaryPermissions.legacy), updateCourseGroup);

// Responsi
router.get(
   '/internal/education/responsi/editor-candidates',
   listResponsiEditorCandidates,
);
router
   .route('/internal/education/responsi')
   .get(listResponsies)
   .post(createResponsi);

router
   .route('/internal/education/responsi/:responsiId')
   .get(getResponsi)
   .patch(updateResponsi)
   .delete(deleteResponsi);

router
   .route('/internal/education/responsi/:responsiId/versions')
   .get(listResponsiVersions);

router.post(
   '/internal/education/responsi/:responsiId/versions/:versionId/restore',
   restoreResponsiVersion,
);

router.post(
   '/internal/education/responsi/:responsiId/approve',
   approveResponsi,
);
router.put(
   '/internal/education/responsi/:responsiId/editors',
   assignResponsiEditors,
);

export default router;

export function attachEducationCollaboration(server: Server) {
   const getActor = async (headers: Headers) => {
      const session = await auth.api.getSession({
         headers,
         query: { disableCookieCache: true },
      });
      if (!session || session.user.status !== 'ACTIVE') {
         throw new Error('Sign in to edit this summary');
      }
      return {
         actor: await educationService.summaryActor(session.user.id),
         name: session.user.name,
      };
   };
   const collaboration = new Hocuspocus<Awaited<ReturnType<typeof getActor>>>({
      debounce: 300,
      maxDebounce: 1000,
      async onAuthenticate({ requestHeaders, documentName }) {
         const user = await getActor(requestHeaders);
         await educationService.authorizeCollaboration(
            documentName,
            user.actor,
         );
         return user;
      },
      async beforeHandleMessage({ requestHeaders, documentName }) {
         const user = await getActor(requestHeaders);
         await educationService.authorizeCollaboration(
            documentName,
            user.actor,
         );
      },
      async beforeHandleAwareness({ states, context }) {
         if (!context) return;
         for (const state of states.values()) {
            if (state.user)
               state.user = { name: context.name, color: '#2563eb' };
         }
      },
      async onLoadDocument({ document, documentName, context }) {
         await educationService.loadCollaboration(
            documentName,
            context.actor,
            document,
         );
      },
      async onStoreDocument({ document, documentName }) {
         await educationService.storeCollaboration(documentName, document);
      },
   });
   educationService.useCollaborationDocuments(collaboration.documents);
   const sockets = new WebSocketServer({
      noServer: true,
      maxPayload: 1024 * 1024,
   });
   const heartbeat = setInterval(() => {
      for (const socket of sockets.clients) socket.ping();
   }, 25_000).unref();
   server.once('close', () => {
      clearInterval(heartbeat);
      educationService.useCollaborationDocuments(new Map());
   });
   server.on('upgrade', (req, socket, head) => {
      if (
         req.url !== '/api/internal/education/collaboration' ||
         !trustedOrigins.includes(req.headers.origin ?? '')
      ) {
         socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
         return;
      }
      sockets.handleUpgrade(req, socket, head, (websocket) => {
         const request = new Request(
            'http://localhost/api/internal/education/collaboration',
            {
               headers: fromNodeHeaders(req.headers),
            },
         );
         const connection = collaboration.handleConnection(websocket, request);
         websocket.on('message', (message) => {
            const data = Array.isArray(message)
               ? Buffer.concat(message)
               : new Uint8Array(message);
            connection.handleMessage(data);
         });
         websocket.on('pong', () => connection.touch());
         websocket.on('close', (code, reason) =>
            connection.handleClose({ code, reason: reason.toString() }),
         );
         websocket.on('error', () => websocket.terminate());
      });
   });
}
