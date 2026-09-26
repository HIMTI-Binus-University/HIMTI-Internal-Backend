import { AppError } from './appError.js';

type SortDirection = 'asc' | 'desc';

interface DefaultSort<TField extends string> {
   field: TField;
   direction: SortDirection;
}

export const parseSort = <TField extends string>(
   sort: string | undefined,
   allowedFields: readonly TField[],
   defaultSort: DefaultSort<TField>,
): DefaultSort<TField> => {
   if (!sort) return defaultSort;

   const [field, direction] = sort.split(':');

   if (
      !allowedFields.includes(field as TField) ||
      (direction !== 'asc' && direction !== 'desc')
   ) {
      throw new AppError('Invalid sort parameter', 400);
   }

   return {
      field: field as TField,
      direction,
   };
};
