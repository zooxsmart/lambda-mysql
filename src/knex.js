/* eslint-disable import/no-extraneous-dependencies,global-require */
const { Model, knexSnakeCaseMappers } = require('objection');
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

  const useKnexSnakeCaseMappers = process.env.USE_SNAKE_CASE || 'true';
  if (useKnexSnakeCaseMappers === 'true') {
    // eslint-disable-next-line no-param-reassign
    config = { ...config, ...knexSnakeCaseMappers() };
  }
  knex = Knex(config);
  if (useXRay) {
    knex = xray.captureKnex(knex);
  }

  // Give the knex object to objection.
  Model.knex(knex);

  debug('Pool created.');
  return knex;
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
  getDb,
  Model,
};
