import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout } from 'node:timers/promises';
import test from 'node:test';
import {
   HocuspocusProvider,
   HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import WebSocket from 'ws';
import type { XmlElement, XmlText } from 'yjs';
import { auth } from '@/utils/auth.js';
import { educationRepository as repo } from './educationRepository.js';
import { attachEducationCollaboration } from './educationRoutes.js';
import { summaryPermissions } from './educationTypes.js';

async function waitFor(condition: () => boolean) {
   for (let attempt = 0; attempt < 100; attempt++) {
      if (condition()) return;
      await setTimeout(30);
   }
   assert.ok(condition(), 'Timed out waiting for collaboration sync');
}

test(
   'assigned editors share text and cursor identity, persist Markdown, and reject other users',
   { timeout: 7000 },
   async (t) => {
      t.mock.method(
         auth.api,
         'getSession',
         async ({ headers }: { headers: Headers }) => {
            const id = headers.get('cookie');
            return id ? { user: { id, name: id, status: 'ACTIVE' } } : null;
         },
      );
      t.mock.method(
         repo,
         'getSummaryPermissions',
         async () => new Set([summaryPermissions.edit]),
      );
      t.mock.method(repo, 'findCollaborationDocument', async () => ({
         status: 'DRAFT',
         content: 'Saved text',
         collaborationState: null,
         collaborationRevision: 0,
         editors: [{ userId: 'Alice' }, { userId: 'Bob' }],
      }));
      const store = t.mock.method(
         repo,
         'storeCollaborationDocument',
         async () => undefined,
      );
      const server = createServer();
      attachEducationCollaboration(server);
      await new Promise<void>((resolve) =>
         server.listen(0, '127.0.0.1', resolve),
      );
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const url = `ws://127.0.0.1:${address.port}/api/internal/education/collaboration`;
      const connections: Array<{
         provider: HocuspocusProvider;
         websocket: HocuspocusProviderWebsocket;
      }> = [];
      const connect = (user: string) => {
         let denied = false;
         const websocket = new HocuspocusProviderWebsocket({
            url,
            WebSocketPolyfill: class extends WebSocket {
               constructor(target: string) {
                  super(target, {
                     headers: { Origin: 'http://localhost:3000', Cookie: user },
                  });
               }
            },
            autoConnect: false,
         });
         const provider = new HocuspocusProvider({
            name: 'summary-1:0',
            token: 'session',
            websocketProvider: websocket,
            onAuthenticationFailed: () => {
               denied = true;
            },
         });
         connections.push({ provider, websocket });
         provider.attach();
         void websocket.connect();
         return { provider, isDenied: () => denied };
      };

      try {
         const { provider: alice } = connect('Alice');
         const { provider: bob } = connect('Bob');
         const outsider = connect('Eve');
         await waitFor(() => alice.synced && bob.synced && outsider.isDenied());
         const fragment = (provider: HocuspocusProvider) =>
            provider.document.getXmlFragment('default');
         assert.match(fragment(alice).toString(), /Saved text/);
         alice.setAwarenessField('user', {
            name: 'Fake name',
            color: '#ffffff',
         });
         await waitFor(() =>
            [...(bob.awareness?.getStates().values() ?? [])].some(
               (state) => state.user?.name === 'Alice',
            ),
         );

         const append = (provider: HocuspocusProvider, value: string) => {
            const paragraph = fragment(provider).get(0) as XmlElement;
            const text = paragraph.get(0) as XmlText;
            text.insert(text.length, value);
         };
         append(alice, ' and Alice');
         append(bob, ' and Bob');
         await waitFor(
            () =>
               fragment(alice).toString() === fragment(bob).toString() &&
               store.mock.calls.some(
                  ({ arguments: [, , , markdown] }) =>
                     /Alice/.test(String(markdown)) &&
                     /Bob/.test(String(markdown)),
               ),
         );
         assert.match(fragment(bob).toString(), /Alice/);
         assert.match(fragment(bob).toString(), /Bob/);
      } finally {
         for (const { provider, websocket } of connections) {
            provider.destroy();
            websocket.destroy();
            provider.document.destroy();
         }
         await new Promise<void>((resolve) => server.close(() => resolve()));
      }
   },
);
