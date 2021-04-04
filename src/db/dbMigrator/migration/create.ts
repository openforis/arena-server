import path from 'path'

import { Schemata } from '../../schemata'
import { DBMigrate } from '../dbMigrate'

enum ArgName {
  name = 'name',
  cwd = 'cwd',
  schema = 'schema',
}

const usage = `yarn dbmigrate:create --${ArgName.name}=$NAME [--${ArgName.schema}=$SCHEMA][--${ArgName.cwd}=$CWD]`

const getArgv = (name: ArgName, defaultValue?: string): string => {
  const namePattern = `--${name}=`
  const arg = process.argv.find((arg) => arg.startsWith(namePattern))
  if (!arg) {
    if (defaultValue) return defaultValue

    console.error(`Argument ${name} is required`)
    console.error(`Usage: ${usage}`)
    process.exit(1)
  }
  return arg.split(namePattern)[1]
}

const name = getArgv(ArgName.name)
const schema = getArgv(ArgName.schema, Schemata.PUBLIC)
const cwd = getArgv(ArgName.cwd, path.resolve(__dirname, '..'))

const dbMigrate = DBMigrate.getInstance(schema, cwd)
dbMigrate.create(name)
