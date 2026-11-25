import { getSchema, type JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap/extension-mathematics';
import { TableKit } from '@tiptap/extension-table';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { isIP } from 'node:net';
import { AppError } from '@/utils/appError.js';
import { publicEducationRepository as repo } from './publicEducationRepository.js';
import {
   publicCourseSchema,
   publicEventSchema,
   publicSummaryMetadataSchema,
} from './publicEducationSchema.js';

const extensions = [
   StarterKit.configure({ heading: { levels: [2, 3] } }),
   Image,
   TableKit,
   Mathematics,
];
const markdownManager = new MarkdownManager({ extensions });
const documentSchema = getSchema(extensions);

const safeUrl = (value: unknown) => {
   if (
      typeof value !== 'string' ||
      value.length > 2048 ||
      !/^https:\/\/[^/\s\\]/i.test(value) ||
      /[\s\\]/.test(value)
   )
      return undefined;
   const url = URL.parse(value);
   if (!url || url.username || url.password) return undefined;
   const hostname = url.hostname.replace(/\.$/, '');
   if (
      !hostname.includes('.') ||
      isIP(hostname) ||
      /\.(?:localhost|local|internal)$/i.test(hostname)
   )
      return undefined;
   for (const key of url.searchParams.keys()) {
      if (
         /^(?:x-amz-|x-goog-)|^(?:access[-_]?token|token|signature|sig)$/i.test(
            key,
         )
      )
         return undefined;
   }
   return url.href;
};

export function publicDocument(markdown: string) {
   if (Buffer.byteLength(markdown) > 256 * 1024)
      throw new Error('Summary exceeds the public document size limit');

   let count = 0;
   function sanitize(node: JSONContent, depth: number): JSONContent | null {
      if (++count > 20_000 || depth > 40)
         throw new Error(
            'Summary exceeds the public document complexity limit',
         );
      const { type, text, attrs } = node;
      const clean: JSONContent = { type };
      if (text !== undefined) clean.text = text;
      if (node.marks) {
         clean.marks = node.marks.flatMap((mark) => {
            if (mark.type !== 'link') return [{ type: mark.type }];
            const href = safeUrl(mark.attrs?.href);
            return href ? [{ type: 'link', attrs: { href } }] : [];
         });
      }
      if (type === 'image') {
         const src = safeUrl(attrs?.src);
         if (!src) return null;
         clean.attrs = { src, alt: String(attrs?.alt ?? '') };
      } else if (type === 'heading') {
         clean.attrs = { level: Number(attrs?.level) <= 2 ? 2 : 3 };
      } else if (type === 'inlineMath' || type === 'blockMath') {
         const latex = attrs?.latex;
         if (typeof latex !== 'string' || latex.length > 2048)
            throw new Error('Invalid public math expression');
         clean.attrs = { latex };
      } else if (type === 'codeBlock') {
         clean.attrs = {
            language: /^[\w+-]{1,30}$/.test(String(attrs?.language ?? ''))
               ? attrs?.language
               : null,
         };
      } else if (type === 'orderedList' && Number.isSafeInteger(attrs?.start)) {
         clean.attrs = { start: attrs?.start };
      }
      if (node.content) {
         clean.content = node.content.flatMap((child) => {
            const sanitized = sanitize(child, depth + 1);
            // Reader uses block images; keep alt text for images embedded inline.
            if (
               sanitized?.type === 'image' &&
               (type === 'paragraph' || type === 'heading')
            ) {
               const alt = sanitized.attrs?.alt;
               return alt ? [{ type: 'text', text: alt }] : [];
            }
            return sanitized ?? [];
         });
      }
      return clean;
   }

   const parsed = markdownManager.parse(markdown);
   const clean = sanitize(parsed, 0);
   const content = clean?.content ?? [];
   if (content.length)
      documentSchema.nodeFromJSON({ type: 'doc', content }).check();
   return { type: 'doc' as const, content };
}

const metadata = (
   row: { id: string; title: string; academicPeriod: string; examType: string },
   course: { id: string; semester: number | null },
) =>
   publicSummaryMetadataSchema.safeParse({
      id: row.id,
      title: row.title,
      academicPeriod: row.academicPeriod,
      examType: row.examType,
      courseId: course.id,
      semester: course.semester,
      contributors: [],
   });

export const publicEducationService = {
   async catalog() {
      const courses = [];
      const summaries = [];
      const events = [];
      for (const row of await repo.catalog()) {
         const course = publicCourseSchema.safeParse({
            id: row.id,
            name: row.name,
            semester: row.semester,
            code: row.code,
            description: row.description ?? '',
         });
         if (!course.success) continue;
         courses.push(course.data);
         for (const summary of row.summaryPublications) {
            const result = metadata(summary, row);
            if (result.success) summaries.push(result.data);
         }
         for (const event of row.studyClubSessions) {
            const videoId = event.videos[0]?.youtubeVideoId;
            const result = publicEventSchema.safeParse({
               id: event.id,
               title: event.title,
               courseId: row.id,
               type: event.type,
               startsAt: event.startsAt.toISOString(),
               endsAt: event.endsAt.toISOString(),
               location: event.location,
               description: event.description,
               quota: event.capacity ?? undefined,
               recordingUrl:
                  videoId && /^[\w-]{11}$/.test(videoId)
                     ? `https://www.youtube.com/watch?v=${videoId}`
                     : undefined,
            });
            if (result.success) events.push(result.data);
         }
      }
      return { courses, summaries, events };
   },

   async summary(id: string) {
      const row = await repo.summary(id);
      if (
         row &&
         publicCourseSchema.safeParse({
            ...row.course,
            description: row.course.description ?? '',
         }).success
      ) {
         const result = metadata(row, row.course);
         if (result.success)
            return { ...result.data, content: publicDocument(row.content) };
      }
      throw new AppError('Summary not found', 404);
   },
};
