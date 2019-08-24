const { BadRequest } = require('@zooxsmart/lambda-util').errors;
const Query = require('./query');

module.exports = function Save(options) {
  const opts = options || {};

  this.query = new Query(opts);

  this.blacklist = opts.blacklist || {};
  this.whitelist = opts.whitelist || {};

  return this;
};

module.exports.prototype.withModel = function withModel(model) {
  this.model = model;
  return this;
};

module.exports.prototype.withEvent = function withEvent(event) {
  if (event.body === null) {
    throw new BadRequest('Body must not be empty');
  }

  let { body } = event;

  if (typeof event.body === 'string') {
    body = JSON.parse(event.body);
  }

  let id = null;
  if (event.pathParameters !== null && typeof event.pathParameters === 'object') {
    id = event.pathParameters.id || null;
  }

  const res = this.model.query();
  if (id === null) {
    res.insertAndFetch(body);
  } else {
    res.patchAndFetchById(id, body);
  }
  return res;
};
