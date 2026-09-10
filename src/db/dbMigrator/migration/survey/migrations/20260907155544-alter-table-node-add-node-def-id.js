'use strict'

var dbm
var type
var seed
var fs = require('fs')
var path = require('path')
var Promise

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate
  type = dbm.dataType
  seed = seedLink
  Promise = options.Promise
}

exports.up = function (db) {
  var filePath = path.join(__dirname, 'sqls', '20260907155544-alter-table-node-add-node-def-id-up.sql')
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
      if (err) return reject(err)
      console.log('received data: ' + data)

      resolve(data)
    })
  })
    .then(function (data) {
      return db.runSql(data)
    })
    .then(function () {
      // db-migrate wraps every migration's up() in BEGIN/COMMIT (see startMigration/endMigration
      // in db-migrate-pg), but VACUUM cannot run inside a transaction block. Commit the schema
      // change above, run VACUUM FULL standalone to reclaim the dropped column's space, then
      // reopen a transaction so the framework's own closing COMMIT has an (empty) one to close.
      return db
        .runSql('COMMIT;')
        .then(function () {
          return db.runSql('VACUUM (FULL, ANALYZE) node;')
        })
        .then(function () {
          return db.runSql('BEGIN;')
        })
    })
}

exports.down = function (db) {
  var filePath = path.join(__dirname, 'sqls', '20260907155544-alter-table-node-add-node-def-id-down.sql')
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function (err, data) {
      if (err) return reject(err)
      console.log('received data: ' + data)

      resolve(data)
    })
  }).then(function (data) {
    return db.runSql(data)
  })
}

exports._meta = {
  version: 1,
}
