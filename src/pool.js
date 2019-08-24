const debug = require('debug')('lambda-mysql');
const { promisify } = require('util');
const xray = require('aws-xray-sdk');
let mysql = require('mysql');

let pool = null;

const useXRay = process.env.USE_XRAY || false;
if (useXRay) {
  mysql = xray.captureMySQL(mysql);
}

function createPool() {
  debug(`Creating pool to ${process.env.MYSQL_HOST} ...`);
  pool = mysql.createPool({
    connectionLimit: process.env.MYSQL_CONNECTION_LIMIT || 10,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_NAME,
    timezone: 'Z',
    connectTimeout: 4000,
    dateStrings: true,
    charset: 'utf8mb4',
  });

  // Ping database to check for common exception errors.
  pool.getConnection((err, connection) => {
    if (err) {
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        debug('Database connection was closed.');
      }
      if (err.code === 'ER_CON_COUNT_ERROR') {
        debug('Database has too many connections.');
      }
      if (err.code === 'ECONNREFUSED') {
        debug('Database connection was refused.');
      }
    }

    if (connection) connection.release();
  });

  // Promisify for Node.js async/await.
  pool.query = promisify(pool.query);

  debug('Pool created.');

  return pool;
}
/**
 * Create a new Pool instance.
 * @return {Promise<Pool>} A new MySQL pool
 * @public
 */
function getPool() {
  if (pool === null) {
    return new Promise((resolve) => {
      resolve(createPool());
    });
  }
  debug('Returning previously created pool ...');
  return Promise.resolve(pool);
}

// noinspection JSUnusedGlobalSymbols
module.exports = {
  getPool,
};
