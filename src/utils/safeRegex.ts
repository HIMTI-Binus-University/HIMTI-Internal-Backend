import safeRegex from 'safe-regex2';

const unsupportedRegexConstruct = /\\[1-9]|\\k<|\(\?<|\(\?>|\(\?\(/;

export const getRegexValidationError = (pattern: string): string | null => {
   if (pattern.length < 1 || pattern.length > 256)
      return 'Pattern must contain between 1 and 256 characters';
   if (unsupportedRegexConstruct.test(pattern))
      return 'Pattern contains an unsupported regular expression construct';
   try {
      new RegExp(`^(?:${pattern})$`, 'u');
   } catch {
      return 'Pattern is not valid JavaScript regular expression syntax';
   }
   if (!safeRegex(pattern)) return 'Pattern is potentially unsafe';
   return null;
};

export const compileFullValueRegex = (pattern: string): RegExp | null => {
   if (getRegexValidationError(pattern)) return null;
   return new RegExp(`^(?:${pattern})$`, 'u');
};
