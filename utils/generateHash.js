const bcrypt = require('bcrypt');
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");
 
function generateFileHash (file) {
    const hash = crypto.createHash("md5");
    hash.update(fs.readFileSync(file));
    return hash.digest("hex");
  };

  module.exports = {
    generateFileHash
};