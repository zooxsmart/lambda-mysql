/* eslint-disable no-param-reassign */
const isEmpty = require('lodash.isempty');
const castArray = require('lodash.castarray');
const util = require('util');
const { ConflictError } = require('@zooxsmart/lambda-util').errors;

module.exports = (incomingOptions) => {
  if (isEmpty(incomingOptions.fields)) {
    throw new Error('Fields option must be defined.');
  }

  const options = {
    identifiers: ['id'],
    fields: {},
    ...incomingOptions,
  };

  return Mapper => class extends Mapper {
    async beforeCreate(select, data) {
      await super.beforeCreate(select, data);
      await this.queryResolver(select, data);
    }

    async beforeUpdate(select, id, data, query) {
      await super.beforeUpdate(select, id, data, query);
      await this.queryResolver(
        select
          .clone()
          .clearSelect()
          .clearWhere()
          .clearHaving(),
        data,
        true,
        id,
        query,
      );
    }

    async queryResolver(select, data, update = false, id = null, query = {}) {
      const rows = await this.getQuery(select, data, update, id, query);
      const errors = this.parseErrors(rows);

      if (!isEmpty(errors)) {
        throw new ConflictError(
          JSON.stringify({
            data: errors,
            message: 'Unique Validation Failed',
            type: 'ModelValidation',
          }),
        );
      }
    }

    async getQuery(select, data, update, id, query = {}) {
      let saved = {};
      if (update) {
        saved = await this.fetch(id, query);
      }

      options.fields.forEach((field) => {
        const fields = castArray(field);

        fields.forEach((fieldName) => {
          select.where(
            fieldName,
            data[fieldName] || saved[fieldName],
          );
        });

        if (update) {
          options.identifiers.forEach(identifier => select.andWhereNot(identifier, id));
        }
      });
      return select.limit(1);
    }

    // eslint-disable-next-line class-methods-use-this
    parseErrors(rows) {
      return rows.reduce((errors, error, index) => {
        if (!isEmpty(error)) {
          const fields = castArray(options.fields[index]);

          fields.forEach((field) => {
            // eslint-disable-next-line no-param-reassign
            errors[[field]] = [
              {
                keyword: 'unique',
                message: util.format('%s already in use.', options.fields[index]),
              },
            ];
          });
        }

        return errors;
      }, {});
    }
  };
};
