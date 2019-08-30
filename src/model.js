/* eslint-disable class-methods-use-this,no-param-reassign */
const { ValidationError } = require('@zooxsmart/lambda-util').errors;
const Ajv = require('ajv');
const AjvErrors = require('ajv-errors');

class Model {
  static get tableName() {
    return '';
  }

  static get jsonSchema() {
    return {};
  }

  static get updateJsonSchema() {
    return this.jsonSchema;
  }

  static get filterJsonSchema() {
    return this.jsonSchema;
  }

  static get jsonAttributes() {
    return [];
  }

  static validate(data, schema = null, ajv = null) {
    if (ajv === null) {
      ajv = new Ajv({
        allErrors: true,
        removeAdditional: 'all',
        jsonPointers: true,
      });
    }

    AjvErrors(ajv);

    if (schema === null) {
      schema = this.constructor.jsonSchema;
    }

    if (!ajv.validate(schema, data)) {
      throw new ValidationError(JSON.stringify(ajv.errors));
    }

    return data;
  }

  static filter(data, schema = null, ajv = null) {
    if (ajv === null) {
      ajv = new Ajv({
        allErrors: true,
        removeAdditional: 'all',
      });
    }

    if (schema === null) {
      schema = this.filterJsonSchema;
    }

    ajv.validate(schema, data);

    return data;
  }

  toJSON() {
    const json = {};
    const keys = Object.keys(this);
    for (let i = 0, l = keys.length; i < l; i += 1) {
      const key = keys[i];
      json[key] = this[key];
    }
    return json;
  }

  static fromDatabase(data) {
    const model = new this();
    Object.keys(data).forEach((key) => {
      let value = data[key];
      if (this.jsonAttributes.indexOf(key) >= 0 && typeof value === 'string') {
        value = JSON.parse(value);
      }
      model[key] = value;
    });
    return model;
  }

  toDatabase() {
    const json = {};
    Object.keys(this).forEach((key) => {
      let value = this[key];
      if (this.constructor.jsonAttributes.indexOf(key) >= 0 && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      json[key] = value;
    });
    return json;
  }
}

module.exports = Model;
