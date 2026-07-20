export const buildDeletedUniqueValue = (
   value: string,
   id: string,
   maxLength: number,
) => {
   const suffix = `_del_${id}`;
   const base = value.slice(0, maxLength - suffix.length);

   return `${base}${suffix}`;
};
