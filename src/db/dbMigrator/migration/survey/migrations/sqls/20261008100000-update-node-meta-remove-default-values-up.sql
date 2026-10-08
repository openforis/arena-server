-- Remove the items having the default value from node meta to save space (a missing item is read back in the same way):
-- - empty dictionaries (they may have been stored again after the previous cleanup migration)
-- - default value / qualifier value applied flags set to false
-- - empty or null code hierarchy
-- Note: the updated rows leave dead tuples behind; VACUUM makes their space reusable,
-- VACUUM FULL (or pg_repack) is needed to give it back to the operating system.

UPDATE node
SET meta = meta - ARRAY(
    SELECT e.key
    FROM jsonb_each(meta) AS e
    WHERE (e.key IN ('childApplicability', 'cEdit', 'cVis', 'childrenMaxCount', 'childrenMinCount')
           AND e.value = '{}'::jsonb)
       OR (e.key IN ('defaultValueApplied', 'qualifierValueApplied') AND e.value = 'false'::jsonb)
       OR (e.key = 'hCode' AND e.value IN ('[]'::jsonb, 'null'::jsonb))
)
WHERE meta -> 'childApplicability' = '{}'::jsonb
   OR meta -> 'cEdit' = '{}'::jsonb
   OR meta -> 'cVis' = '{}'::jsonb
   OR meta -> 'childrenMaxCount' = '{}'::jsonb
   OR meta -> 'childrenMinCount' = '{}'::jsonb
   OR meta -> 'defaultValueApplied' = 'false'::jsonb
   OR meta -> 'qualifierValueApplied' = 'false'::jsonb
   OR meta -> 'hCode' IN ('[]'::jsonb, 'null'::jsonb);
