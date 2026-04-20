'use strict';

const fs = require('fs');
const util = require('util');

module.exports = {
  readCache: util.promisify(fs.readFile),
  writeCache: util.promisify(fs.writeFile),
  deleteCache: (filePath) => (
    util.promisify(fs.unlink)(filePath)
      .catch(() => {})
  ),
  checkCache: (filePath) => (
    util.promisify(fs.access)(filePath, fs.F_OK)
      .then((err) => (err === null))
      .catch(() => false)
  ),
};
