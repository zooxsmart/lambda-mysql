const yn = require('yn');
const knex = require('./knex');
const Query = require('./query');
const Save = require('./save');

const saveFunc = new Save();
const queryFunc = new Query();

class Mapper {
  constructor(config = {}) {
    this.config = {
      client: 'mysql',
      connection: {
        host: config.host || process.env.MYSQL_HOST,
        port: config.port || process.env.MYSQL_PORT || 3306,
        user: config.user || process.env.MYSQL_USER,
        password: config.password || process.env.MYSQL_PASS,
        database: config.database || process.env.MYSQL_NAME,
        connectionLimit: config.connectionLimit || process.env.MYSQL_CONNECTION_LIMIT || 10,
        timezone: 'Z',
        connectTimeout: 4000,
        dateStrings: true,
        charset: config.charset || process.env.MYSQL_CHARSET || 'utf8mb4',
      },
      useNullAsDefault: true,
      pool: {
        min: 1,
        max: 30,
      },
    };
  }

  /**
   * @param id
   * @param model
   * @param {{fields: array, withDeleted: boolean}} query
   * @returns {Knex.QueryBuilder}
   */
  async fetch(id, model, query) {
    await knex.getDb(this.config);

    const select = model
      .query()
      .where('id', id)
      .select(query.fields || null);

    if (typeof model.isSoftDelete !== 'undefined' && yn(query.withDeleted, { default: false }) === false) {
      select.whereNotDeleted();
    }

    return select.first();
  }

  async fetchAll(query, model) {
    await knex.getDb(this.config);

    return queryFunc.withModel(model).withQuery(query);
  }

  async countAll(query, model) {
    await knex.getDb(this.config);

    return queryFunc.withModel(model).count(query);
  }

  async save(event, context, model) {
    await knex.getDb(this.config);

    return saveFunc.withModel(model).withEvent(event);
  }

  /**
   * @param id
   * @param model
   * @param {{hardDelete: boolean}} query
   * @returns {Knex.QueryBuilder}
   */
  async delete(id, model, query) {
    await knex.getDb(this.config);

    const select = model.query().where('id', id);

    if (typeof model.isSoftDelete !== 'undefined' && yn(query.hardDelete, { default: false }) === true) {
      select.hardDelete();
    } else {
      select.delete();
    }

    return select;
  }
}

module.exports = Mapper;
