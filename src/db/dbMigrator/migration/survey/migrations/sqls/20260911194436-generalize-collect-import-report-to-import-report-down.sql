ALTER TABLE import_report DROP CONSTRAINT IF EXISTS import_report_source_check;
ALTER TABLE import_report DROP COLUMN IF EXISTS source;
ALTER TABLE import_report RENAME CONSTRAINT import_report_node_def_fk TO collect_import_report_node_def_fk;
ALTER TABLE import_report RENAME TO collect_import_report;
