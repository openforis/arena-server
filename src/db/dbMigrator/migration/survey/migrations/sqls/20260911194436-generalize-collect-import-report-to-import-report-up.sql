ALTER TABLE collect_import_report RENAME TO import_report;
ALTER TABLE import_report RENAME CONSTRAINT collect_import_report_node_def_fk TO import_report_node_def_fk;

ALTER TABLE import_report
  ADD COLUMN source text NOT NULL DEFAULT 'collect';

ALTER TABLE import_report
  ADD CONSTRAINT import_report_source_check CHECK (source IN ('collect', 'odk'));
