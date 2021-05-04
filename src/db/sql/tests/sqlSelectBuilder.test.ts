import { TableAuthGroup } from '../../table'
import { SqlSelectBuilder } from '../sqlSelectBuilder'

const select = 'SELECT _ag.uuid, _ag.survey_uuid, _ag.name, _ag.permissions, _ag.record_steps'
const from = 'FROM public."auth_group" AS _ag'
const where = 'WHERE 1 = 1'
const groupBy = 'GROUP BY _ag.name, _ag.permissions'
const offset = 'OFFSET 1'
const limit = 'LIMIT 1'
const orderBy = 'ORDER BY _ag.name, _ag.permissions'

describe('SqlSelectBuilder builds correct:', () => {
  test('select throws without from', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder().select(
      tableAuthGroup.uuid,
      tableAuthGroup.surveyUuid,
      tableAuthGroup.name,
      tableAuthGroup.permissions,
      tableAuthGroup.recordSteps
    )

    expect(() => {
      sql.build()
    }).toThrow()
  })

  test('from throws without select', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder().from(tableAuthGroup)

    expect(() => {
      sql.build()
    }).toThrow()
  })

  test('selecting fields from table works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .build()

    expect(sql).toBe(`${select} ${from}`)
  })

  test('where condition works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .where('1 = 1')
      .build()

    expect(sql).toBe(`${select} ${from} ${where}`)
  })

  test('groupBy works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .where('1 = 1')
      .groupBy(tableAuthGroup.name, tableAuthGroup.permissions)
      .build()

    expect(sql).toBe(`${select} ${from} ${where} ${groupBy}`)
  })

  test('offset works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .where('1 = 1')
      .groupBy(tableAuthGroup.name, tableAuthGroup.permissions)
      .offset(1)
      .build()

    expect(sql).toBe(`${select} ${from} ${where} ${groupBy} ${offset}`)
  })

  test('limit works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .where('1 = 1')
      .groupBy(tableAuthGroup.name, tableAuthGroup.permissions)
      .offset(1)
      .limit(1)
      .build()

    expect(sql).toBe(`${select} ${from} ${where} ${groupBy} ${offset} ${limit}`)
  })

  test('orderBy works', async () => {
    const tableAuthGroup = new TableAuthGroup()

    const sql = new SqlSelectBuilder()
      .select(
        tableAuthGroup.uuid,
        tableAuthGroup.surveyUuid,
        tableAuthGroup.name,
        tableAuthGroup.permissions,
        tableAuthGroup.recordSteps
      )
      .from(tableAuthGroup)
      .where('1 = 1')
      .groupBy(tableAuthGroup.name, tableAuthGroup.permissions)
      .offset(1)
      .limit(1)
      .orderBy(tableAuthGroup.name, tableAuthGroup.permissions)
      .build()
    expect(sql).toBe(`${select} ${from} ${where} ${groupBy} ${orderBy} ${offset} ${limit}`)
  })
})
