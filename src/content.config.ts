import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    slug: z.string().optional(),
    category: z.string().default('개인 칼럼'),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    status: z.enum(['draft', 'publish']).default('draft'),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { posts };
