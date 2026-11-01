-- Add the general-purpose category used for products that do not fit another
-- existing shop category. Safe to re-run if the category is already present.
INSERT INTO "Category" (id, name, slug, description, accent, image, "order", published, hidden, "createdAt", "updatedAt")
SELECT
  'category-miscellaneous',
  'Miscellaneous',
  'miscellaneous',
  'A little bit of everything else, handmade with care.',
  'lavender',
  NULL,
  COALESCE((SELECT MAX("order") + 1 FROM "Category"), 0),
  true,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" WHERE slug = 'miscellaneous'
)
ON CONFLICT (id) DO NOTHING;
