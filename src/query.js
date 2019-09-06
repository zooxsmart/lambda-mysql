/* eslint-disable no-underscore-dangle */
const createError = require('http-errors');

module.exports = (knex, incomingOptions) => {
  const options = {
    ops: {
      eq: 'eq',
      gt: 'gt',
      gte: 'gte',
      lt: 'lt',
      lte: 'lte',
      ne: 'ne',
      in: 'in',
      nin: 'nin',
      like: 'like',
      null: 'null',
      nnull: 'nnull',
      between: 'between',
      nbetween: 'nbetween',
      or: 'or',
      and: 'and',
    },

    alias: {},
    blacklist: {},
    whitelist: {},

    keyRegex: /^[a-zæøå0-9-_.]+$/i,
    valRegex: /[^a-zæøå0-9-_.* ]/i,
    arrRegex: /^[a-zæøå0-9-_.]+(\[])?$/i,

    ...incomingOptions,
  };

  const applyFilter = (select, filter) => {
    Object.keys(filter).forEach((k) => {
      let key = k;
      const val = filter[key];

      // whitelist
      if (Object.keys(options.whitelist).length && !options.whitelist[key]) {
        return;
      }

      // blacklist
      if (options.blacklist[key]) {
        return;
      }

      // alias
      if (options.alias[key]) {
        key = this.alias[key];
      }

      // string key
      if (typeof val === 'string' && !options.keyRegex.test(key)) {
        return;
      }

      // array key
      if (val instanceof Array && !options.arrRegex.test(key)) {
        return;
      }

      if (key === options.ops.null) {
        // noinspection JSUnresolvedFunction
        select.whereNull(val);
        return;
      }

      if (key === options.ops.nnull) {
        // noinspection JSUnresolvedFunction
        select.whereNotNull(val);
        return;
      }

      if (key === options.ops.or) {
        // eslint-disable-next-line func-names
        select.where(function () {
          const that = this;
          val.forEach((val2) => {
            // noinspection JSUnresolvedFunction
            applyFilter(that._bool('or'), val2);
          });
        });
        return;
      }

      if (key === options.ops.and) {
        // eslint-disable-next-line func-names
        select.where(function () {
          const that = this;
          val.forEach((val2) => {
            applyFilter(that, val2);
          });
        });
        return;
      }

      if (typeof val === 'object') {
        Object.keys(val).forEach((subk) => {
          const subkey = subk;
          const subval = val[subkey];

          if (Object.keys(options.ops).indexOf(subkey) < 0) {
            throw new Error(`Invalid operand ${subkey}`);
          }

          switch (subkey) {
            case 'like':
              select.where(key, 'like', subval);
              break;
            case 'eq':
              select.where(key, subval);
              break;
            case 'gt':
              select.where(key, '>', subval);
              break;
            case 'gte':
              select.where(key, '>=', subval);
              break;
            case 'lt':
              select.where(key, '<', subval);
              break;
            case 'lte':
              select.where(key, '<=', subval);
              break;
            case 'ne':
              // noinspection JSUnresolvedFunction
              select.whereNot(key, subval);
              break;
            case 'in':
              // noinspection JSUnresolvedFunction
              select.whereIn(key, subval);
              break;
            case 'nin':
              // noinspection JSUnresolvedFunction
              select.whereNotIn(key, subval);
              break;
            case 'between':
              // noinspection JSUnresolvedFunction
              select.whereBetween(key, subval);
              break;
            case 'nbetween':
              // noinspection JSUnresolvedFunction
              select.whereNotBetween(key, subval);
              break;
            default:
          }
        });

        return;
      }

      // value must be a string
      if (typeof val !== 'string') {
        return;
      }

      select.where(key, val);
    });

    return select;
  };

  return async (model, urlQuery, beforeFetchAll, maxLimit = 100) => {
    const filter = JSON.parse(urlQuery.filter || '{}');
    // noinspection JSUnresolvedVariable
    let fields = urlQuery.fields || null;
    const limit = urlQuery.limit || 25;
    const page = urlQuery.page || 1;
    const order = urlQuery.order || null;

    if (limit > maxLimit) {
      throw new createError.BadRequest(`Limit must be less then ${maxLimit}`);
    }

    if (page < 1) {
      throw new createError.BadRequest('Page must be greater than 0');
    }

    if (fields !== null) {
      fields = fields.split(',');
    }

    const select = knex(model.tableName)
      .select(fields)
      .limit(limit)
      .offset((page - 1) * limit);

    if (order !== null) {
      select.orderBy(order[0], order[1] || 'asc');
    }

    applyFilter(select, filter);

    await beforeFetchAll(select, urlQuery);

    return select;
  };
};
