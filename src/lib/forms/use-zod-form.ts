import { useState } from 'react';
import { type z } from 'zod';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

/** First message per top-level field, in schema order. */
export function getFieldErrors<Field extends string>(error: z.ZodError): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) {
      errors[field as Field] = issue.message;
    }
  }
  return errors;
}

/**
 * Minimal form state for string fields. Errors appear after the first submit
 * attempt and then update as the user types.
 */
export function useZodForm<Field extends string, Output>(
  schema: z.ZodType<Output, Record<Field, string>>,
  initialValues: Record<Field, string>,
) {
  const [values, setValues] = useState(initialValues);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const result = schema.safeParse(values);
  const errors: FieldErrors<Field> =
    hasSubmitted && !result.success ? getFieldErrors<Field>(result.error) : {};

  function setValue(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Returns the parsed values, or null after revealing the field errors. */
  function validate(): Output | null {
    setHasSubmitted(true);
    return result.success ? result.data : null;
  }

  return { values, errors, setValue, validate };
}
