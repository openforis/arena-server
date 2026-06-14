export type PdfElement =
  | { kind: 'title'; text: string; hasSubtitle?: boolean }
  | { kind: 'subtitle'; text: string }
  | { kind: 'heading'; text: string; level: number; pageBreak?: boolean }
  | { kind: 'fieldRow'; label: string; value?: string; placeholder?: string }
  | { kind: 'checkboxRow'; label: string; options: Array<{ text: string; checked: boolean }> }
  | { kind: 'compositeBlock'; label: string; subFields: Array<{ label: string; value?: string; placeholder?: string }> }
  | { kind: 'image'; label: string; buffer: Buffer; width: number; height: number }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'gridRow'; cells: Array<{ content: PdfElement[]; colSpan: number }>; columnCount: number }
  | { kind: 'spacer' }
