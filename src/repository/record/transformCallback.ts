import { Objects, Record, Validation, ValidationFactory } from '@openforis/arena-core'

export const dbTransformCallback = (options: {
  row: any
  surveyId: number
  includeValidationFields?: boolean
}): Record => {
  const { row, surveyId, includeValidationFields = true } = options

  const { validation, ...rest } = row

  const validationUpdated: Validation = includeValidationFields
    ? validation
    : {
        ...ValidationFactory.createInstance({ valid: validation.valid }),
        counts: validation.counts,
      }

  return {
    ...Objects.camelize(rest),
    surveyId,
    validation: validationUpdated,
  }
}
