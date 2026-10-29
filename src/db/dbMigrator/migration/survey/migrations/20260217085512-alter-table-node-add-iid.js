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
  var filePath = path.join(__dirname, 'sqls', '20260217085512-alter-table-node-add-iid-up.sql')
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

exports.down = function () {
  // Irreversible: the up migration permanently drops node.uuid/node.parent_uuid to reclaim
  // their storage. Those are randomly generated values with no way to reconstruct them from
  // i_id/p_i_id, so there is nothing a down migration could correctly restore. Refuse outright
  // rather than leave the schema in a partially-reverted, silently-broken state.
  return Promise.reject(
    new Error(
      'Migration 20260217085512-alter-table-node-add-iid cannot be reverted: ' +
        'it permanently drops node.uuid and node.parent_uuid, which cannot be reconstructed.'
    )
  )
}

exports._meta = {
  version: 1,
}
