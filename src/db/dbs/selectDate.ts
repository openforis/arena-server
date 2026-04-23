export const selectDate = (field: string, fieldAlias?: string) =>
  `to_char(${field},'YYYY-MM-DD"T"HH24:MI:ss.MS"Z"') AS ${fieldAlias ?? field}`
