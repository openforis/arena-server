-- Remove the empty dictionaries from node meta (e.g. "childApplicability": {}) to save space:
-- a missing dictionary is equivalent to an empty one (child applicable, editable, visible; no children count).
-- Note: the updated rows leave dead tuples behind; VACUUM makes their space reusable,
-- VACUUM FULL (or pg_repack) is needed to give it back to the operating system.

UPDATE node
SET meta = meta - ARRAY(
    SELECT e.key
    FROM jsonb_each(meta) AS e
    WHERE e.key IN ('childApplicability', 'cEdit', 'cVis', 'childrenMaxCount', 'childrenMinCount')
      AND e.value = '{}'::jsonb
)
WHERE meta -> 'childApplicability' = '{}'::jsonb
   OR meta -> 'cEdit' = '{}'::jsonb
   OR meta -> 'cVis' = '{}'::jsonb
   OR meta -> 'childrenMaxCount' = '{}'::jsonb
   OR meta -> 'childrenMinCount' = '{}'::jsonb;
