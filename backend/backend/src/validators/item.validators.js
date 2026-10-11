const { z } = require('zod');

const createItemSchema = z
  .object({
    type: z.enum(['lost', 'found']),
    title: z.string().min(3).max(120),
    description: z.string().max(2000).optional(),
    category_id: z.number().int().positive(),
    location_id: z.number().int().positive(),
    date_happened: z.string().date(), // "YYYY-MM-DD"
    hidden_detail: z.string().max(500).optional(),
    current_holder: z.enum(['finder', 'security_desk']).optional(),
    image_urls: z.array(z.string().url()).max(5).optional(),
  })
  // Business rule from the schema: only "found" items can have a holder
  .refine((data) => data.type === 'found' || !data.current_holder, {
    message: 'current_holder is only valid for found items',
    path: ['current_holder'],
  });

const createClaimSchema = z.object({
  proof_answer: z.string().min(3).max(1000),
  contact_info: z.string().max(500).optional(),
});

const reviewClaimSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  review_note: z.string().max(500).optional(),
});

const listItemsQuerySchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  location_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['open', 'claimed', 'returned', 'closed', 'expired']).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

module.exports = {
  createItemSchema,
  createClaimSchema,
  reviewClaimSchema,
  listItemsQuerySchema,
};
