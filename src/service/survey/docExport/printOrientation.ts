import type { NodeDefEntity } from '@openforis/arena-core'

import type { PrintOrientation } from './types'

type EntityPropsWithPrintOrientation = {
  printOrientation?: PrintOrientation
}

/** Default document orientation when none is specified. */
export const DEFAULT_PRINT_ORIENTATION: PrintOrientation = 'portrait'

/**
 * Resolves the print orientation for an entity, falling back to the document default.
 *
 * @param entityDef - Entity definition, if any.
 * @param documentDefault - Document-level default orientation.
 * @returns Resolved print orientation.
 */
export const resolvePrintOrientation = (
  entityDef: NodeDefEntity | undefined,
  documentDefault: PrintOrientation
): PrintOrientation => {
  const props = entityDef?.props as EntityPropsWithPrintOrientation | undefined
  return props?.printOrientation ?? documentDefault
}
