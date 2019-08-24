const yn = require('yn');
const { BadRequest } = require('@zooxsmart/lambda-util').errors;

module.exports = function Query(options) {
  const opts = options || {};

  this.ops = opts.ops || [
    'eq',
    'gt',
    'gte',
    'lt',
    'lte',
    'ne',
    'in',
    'notin',
    'like',
    'null',
    'nnull',
    'between',
    'nbetween',
  ];
  this.alias = opts.alias || {};
  this.blacklist = opts.blacklist || {};
  this.whitelist = opts.whitelist || {};

  // String Value Parsing
  opts.string = opts.string || {};
  this.string = opts.string || {};
  this.string.toBoolean = typeof opts.string.toBoolean === 'boolean' ? opts.string.toBoolean : true;
  this.string.toNumber = typeof opts.string.toNumber === 'boolean' ? opts.string.toNumber : true;

  this.keyRegex = opts.keyRegex || /^[a-zæøå0-9-_.]+$/i;
  this.valRegex = opts.valRegex || /[^a-zæøå0-9-_.* ]/i;
  this.arrRegex = opts.arrRegex || /^[a-zæøå0-9-_.]+(\[])?$/i;

  return this;
};

module.exports.prototype.withModel = function withModel(model) {
  this.model = model;
  return this;
};

module.exports.prototype.withQuery = function withQuery(query, maxLimit = 100) {
  const filter = JSON.parse(query.filter || '{}');
  // noinspection JSUnresolvedVariable
  const fields = query.fields || [];
  const limit = query.limit || 25;
  const page = query.page || 1;
  const order = query.order || null;

  if (limit > maxLimit) {
    throw new BadRequest(`Limit must be less then ${maxLimit}`);
  }

  if (page < 1) {
    throw new BadRequest('Page must be greater than 0');
  }

  const select = this.model
    .query()
    .select(fields)
    .limit(limit)
    .offset((page - 1) * limit);

  if (order !== null) {
    select.orderBy(order[0], order[1] || 'asc');
  }

  if (typeof this.model.isSoftDelete !== 'undefined' && yn(query.withDeleted, { default: false }) === false) {
    select.whereNotDeleted();
  }

  return this.applyFilter(select, filter);
};

module.exports.prototype.count = async function count(query) {
  const filter = query.filter || {};

  const res = this.model.query().count();

  if (typeof this.model.isSoftDelete !== 'undefined' && yn(query.withDeleted, { default: false }) === false) {
    res.whereNotDeleted();
  }

  const result = await this.applyFilter(res, filter).first();

  return result['count(*)'];
};

module.exports.prototype.applyFilter = function applyFilter(select, filter) {
  Object.keys(filter).forEach((k) => {
    let key = k;
    const val = filter[key];
    // normalize array keys
    if (val instanceof Array) {
      key = key.replace(/\[]$/, '');
    }

    // whitelist
    if (Object.keys(this.whitelist).length && !this.whitelist[key]) {
      return;
    }

    // blacklist
    if (this.blacklist[key]) {
      return;
    }

    // alias
    if (this.alias[key]) {
      key = this.alias[key];
    }

    // string key
    if (typeof val === 'string' && !this.keyRegex.test(key)) {
      return;

      // array key
    }
    if (val instanceof Array && !this.arrRegex.test(key)) {
      return;
    }

    // array key
    if (typeof val === 'object') {
      Object.keys(val).forEach((subk) => {
        const subkey = subk;
        const subval = val[subkey];
        if (this.ops.indexOf(subkey) >= 0) {
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
              select.whereNot(key, subval);
              break;
            case 'in':
              select.whereIn(key, subval);
              break;
            case 'nin':
              select.whereNotIn(key, subval);
              break;
            case 'null':
              select.whereNull(key);
              break;
            case 'nnull':
              select.whereNotNull(key);
              break;
            case 'between':
              select.whereBetween(key, subval);
              break;
            case 'nbetween':
              select.whereNotBetween(key, subval);
              break;
            default:
          }
        } else {
          throw new Error(`Invalid operand ${subkey}`);
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
