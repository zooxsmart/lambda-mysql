/* eslint-disable import/no-extraneous-dependencies,global-require */
const Knex = require('knex');
const debug = require('debug')('lambda-mysql');

const useXRay = process.env.USE_XRAY || false;
let xray;
if (useXRay) {
  xray = require('aws-xray-sdk');
  require('knex-aws-xray')(xray);
}

let knex = null;

async function getDb(config) {
  if (knex !== null) {
    debug('Returning previously created pool ...');
    return knex;
  }
  debug('Creating pool ...');

  knex = Knex(config);
  if (useXRay) {
    knex = xray.captureKnex(knex);
  }

  debug('Pool created.');
  return knex;
}

module.exports = {
  getDb,
};
