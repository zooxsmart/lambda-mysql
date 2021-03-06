/* eslint-disable no-unused-vars,no-empty-function,class-methods-use-this */
const createError = require('http-errors');
const Knex = require('./knex');
const Query = require('./query');
const Save = require('./save');

class Mapper {
  constructor(model, config = {}) {
    this.model = model;
    this.config = {
      client: 'mysql',
      connection: {
        port: 3306,
        connectionLimit: 10,
        timezone: 'Z',
        connectTimeout: 4000,
        dateStrings: true,
        charset: 'utf8mb4',
      },
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 30,
      },
      ...config,
    };
  }

  /**
   * @param id
   * @param {{fields: array, withDeleted: boolean}} query
   * @returns {Knex.QueryBuilder}
   */
  async fetch(id, query) {
    const knex = await Knex.getDb(this.config);

    const select = knex(this.model.tableName)
      .select(query.fields || null)
      .where('id', id);

    await this.beforeFetch(select, id, query);

    let result = await select.first();

    if (!result || result.length === 0) {
      throw new createError.NotFound();
    }

    result = this.model.filter(result);

    await this.afterFetch(result, id, query);

    return this.model.fromDatabase(result, false);
  }

  async fetchAll(query) {
    const knex = await Knex.getDb(this.config);

    let result = await Query(knex)(this.model, query, (...args) => this.beforeFetchAll(...args));

    result = await result.map(entity => this.model.filter(entity));

    await this.afterFetchAll(result);

    return result.map(entity => this.model.fromDatabase(entity, false));
  }

  async countAll(query) {
    const knex = await Knex.getDb(this.config);

    const result = await Query(knex)(this.model, query, async (select, query2) => {
      await this.beforeFetchAll(select, query2);
      select.count();
    });

    return result[0]['count(*)'];
  }

  async create(body) {
    const knex = await Knex.getDb(this.config);

    const saveFunc = new Save(knex);

    return saveFunc.create(
      this.model,
      body,
      (...args) => this.beforeCreate(...args),
      (...args) => this.afterCreate(...args),
    );
  }

  async update(id, body, query) {
    const knex = await Knex.getDb(this.config);

    const saveFunc = new Save(knex);

    return saveFunc.update(
      this.model,
      id,
      body,
      query,
      (...args) => this.beforeUpdate(...args),
      (...args) => this.afterUpdate(...args),
    );
  }

  async delete(id) {
    const knex = await Knex.getDb(this.config);

    const select = knex(this.model.tableName).where('id', id).delete();

    await this.beforeDelete(select, id);

    const result = await select;

    if (!result || result.length === 0) {
      throw new createError.NotFound();
    }

    await this.afterDelete(result, id);
  }

  async beforeFetch(select, id, query) {}

  async beforeFetchAll(select, query) {}

  async beforeCountAll(select, query) {}

  async beforeCreate(select, data) {}

  async beforeUpdate(select, id, data, query) {}

  async beforeDelete(select, id) {}

  async afterFetch(result, id, query) {}

  async afterFetchAll(result) {}

  async afterCreate(result) {}

  async afterUpdate(result, id, numUpdated) {}

  async afterDelete(select, id) {}
}

module.exports = Mapper;
