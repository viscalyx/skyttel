import { z } from 'zod';

const identity = {
  id: z.string().regex(/^[\w-]{1,128}$/),
  label: z
    .string()
    .min(1)
    .max(200)
    .refine((value) => Boolean(value.trim())),
};

/** Absence of value means empty; zero, false and the empty string are values. */
export const propertySchema = z.discriminatedUnion('kind', [
  z.object({ ...identity, kind: z.undefined().optional() }).strict(),
  z
    .object({ ...identity, kind: z.literal('text'), value: z.string().max(10000).optional() })
    .strict(),
  z.object({ ...identity, kind: z.literal('number'), value: z.number().optional() }).strict(),
  z.object({ ...identity, kind: z.literal('date'), value: z.iso.date().optional() }).strict(),
  z.object({ ...identity, kind: z.literal('boolean'), value: z.boolean().optional() }).strict(),
]);

export type Property = z.infer<typeof propertySchema>;
export type PropertyKind = Exclude<Property['kind'], undefined>;

/** Array position is the saved order. Labels may repeat; identities must not. */
export const propertiesSchema = z.array(propertySchema).superRefine((properties, context) => {
  const seen = new Set<string>();
  for (const [index, property] of properties.entries()) {
    if (seen.has(property.id))
      context.addIssue({ code: 'custom', message: 'duplicate_property_id', path: [index, 'id'] });
    seen.add(property.id);
  }
});
