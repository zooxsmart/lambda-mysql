/* eslint-disable no-param-reassign */
const has = require('lodash.has');
const createError = require('http-errors');

module.exports = function Save(knex) {
  this.knex = knex;

  return this;
};

module.exports.prototype.create = async function create(model, body, beforeCreate, afterCreate) {
  body = model.validate(body, model.jsonSchema);

  const entity = model.fromDatabase(body);

  const res = this.knex(model.tableName);

  const data = entity.toDatabase();

  await beforeCreate(res, data);

  let result = await res.insert(data);
  if (!has(data, 'id') || data.id === null) {
    // eslint-disable-next-line prefer-destructuring
    data.id = result[0];
  }

  result = await this.knex(model.tableName)
    .select()
    .where('id', data.id).first();

  result = model.filter(result);

  await afterCreate(result);

  return model.fromDatabase(result, false);
};

module.exports.prototype.update = async function update(model, id, body, query, beforeUpdate, afterUpdate) {
  body = model.validate(body, model.updateJsonSchema);

  const entity = model.fromDatabase(body);

  const res = this.knex(model.tableName).where({ id });

  const data = entity.toDatabase();

  await beforeUpdate(res, id, data, query);

  const numUpdated = await res.update(data);
  if (numUpdated === 0) {
    throw new createError.NotFound();
  }

  let result = await this.knex(model.tableName)
    .select()
    .where('id', id).first();

  result = model.filter(result);

  await afterUpdate(result, id, numUpdated);

  return model.fromDatabase(result, false);
};
