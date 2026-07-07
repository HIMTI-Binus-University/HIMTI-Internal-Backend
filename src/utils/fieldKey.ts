const MAX_FIELD_KEY_LENGTH = 100;
const DEFAULT_FIELD_KEY = 'field';

const truncateFieldKey = (fieldKey: string, maxLength = MAX_FIELD_KEY_LENGTH) =>
   fieldKey.slice(0, maxLength).replace(/_+$/g, '') || DEFAULT_FIELD_KEY;

export const createFieldKey = (label: string): string => {
   const fieldKey = label
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

   return truncateFieldKey(fieldKey || DEFAULT_FIELD_KEY);
};

export const generateUniqueFieldKeys = (labels: string[]): string[] => {
   const usedKeys = new Set<string>();

   return labels.map((label) => {
      const baseKey = createFieldKey(label);
      let fieldKey = baseKey;
      let suffix = 2;

      while (usedKeys.has(fieldKey)) {
         const suffixText = `_${suffix}`;
         const baseWithRoomForSuffix = truncateFieldKey(
            baseKey,
            MAX_FIELD_KEY_LENGTH - suffixText.length,
         );

         fieldKey = `${baseWithRoomForSuffix}${suffixText}`;
         suffix += 1;
      }

      usedKeys.add(fieldKey);
      return fieldKey;
   });
};

export const generateUniqueFieldKey = (
   label: string,
   existingFieldKeys: string[],
): string => {
   const usedKeys = new Set(existingFieldKeys);
   const baseKey = createFieldKey(label);
   let fieldKey = baseKey;
   let suffix = 2;

   while (usedKeys.has(fieldKey)) {
      const suffixText = `_${suffix}`;
      const baseWithRoomForSuffix = truncateFieldKey(
         baseKey,
         MAX_FIELD_KEY_LENGTH - suffixText.length,
      );

      fieldKey = `${baseWithRoomForSuffix}${suffixText}`;
      suffix += 1;
   }

   return fieldKey;
};
