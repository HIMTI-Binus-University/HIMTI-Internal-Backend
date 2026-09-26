const explicitSchemePattern = /^[a-z][a-z\d+.-]*:/i;
const httpSchemePattern = /^https?:\/\//i;
const hostWithPortPattern = /^[^/?#\s:]+:\d+(?:[/?#]|$)/;

export const normalizeHttpUrl = (value: string): string => {
   const trimmedValue = value.trim();

   const hasControlCharacter = [...trimmedValue].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
   });

   if (!trimmedValue || hasControlCharacter) {
      throw new TypeError('Invalid HTTP URL');
   }

   if (trimmedValue.includes('\\')) throw new TypeError('Invalid HTTP URL');

   let candidate = trimmedValue;

   if (!httpSchemePattern.test(candidate)) {
      if (
         /^https?:/i.test(candidate) ||
         /^https?\/\//i.test(candidate) ||
         candidate.startsWith('//') ||
         (explicitSchemePattern.test(candidate) &&
            !hostWithPortPattern.test(candidate))
      ) {
         throw new TypeError('Invalid HTTP URL');
      }

      candidate = `https://${candidate}`;
   }

   let url: URL;
   try {
      url = new URL(candidate);
   } catch {
      throw new TypeError('Invalid HTTP URL');
   }

   if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
   ) {
      throw new TypeError('Invalid HTTP URL');
   }

   return url.toString();
};

export const isHttpUrl = (value: string): boolean => {
   try {
      const url = new URL(value);
      return (
         ['http:', 'https:'].includes(url.protocol) &&
         Boolean(url.hostname) &&
         !url.username &&
         !url.password
      );
   } catch {
      return false;
   }
};
