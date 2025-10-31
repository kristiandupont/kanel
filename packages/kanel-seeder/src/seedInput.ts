import { z } from "zod";

const seedInput = z.object({
  config: z
    .object({
      schema: z.string(),
    })
    .optional(),
  defaults: z.record(z.string(), z.string()).optional(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.string()))),
});

export type SeedInput = z.infer<typeof seedInput>;

export default seedInput;
