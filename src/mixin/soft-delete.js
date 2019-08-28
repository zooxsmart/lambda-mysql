const yn = require('yn');

module.exports = (incomingOptions) => {
  const options = {
    columnName: 'deleted',
    deletedValue: true,
    notDeletedValue: false,
    ...incomingOptions,
  };

  return Mapper => class extends Mapper {
    // override the normal delete function with one that patches the row's "deleted" column
    async delete(id) {
      const patch = {};
      patch[options.columnName] = options.deletedValue;
      return this.update(id, patch);
    }

    // provide a way to actually delete the row if necessary
    async hardDelete(id) {
      return super.delete(id);
    }

    async beforeFetch(select, id, query) {
      super.beforeFetch(select, id, query);
      if (!query.withDeleted || yn(query.withDeleted) === false) {
        select.andWhere(options.columnName, options.notDeletedValue);
      }
    }

    async beforeFetchAll(select, query) {
      super.beforeFetchAll(select, query);
      if (!query.withDeleted || yn(query.withDeleted) === false) {
        select.andWhere(options.columnName, options.notDeletedValue);
      }
    }

    async beforeCountAll(select, query) {
      super.beforeCountAll(select, query);
      select.andWhere(
        options.columnName,
        query.withDeleted && yn(query.withDeleted) === true ? options.deletedValue : options.notDeletedValue,
      );
    }

    // provide a way to undo the delete
    async undelete(id) {
      const patch = {};
      patch[options.columnName] = options.notDeletedValue;
      return this.patch(id, patch);
    }

    static get isSoftDelete() {
      return true;
    }
  };
};
