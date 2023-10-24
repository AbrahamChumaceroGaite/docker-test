const mysql = require("mysql2");

// BD PRODUCTION
/* const connection = mysql.createConnection({
  host: 'clnxgj0z300rqpmcgfkaj89t5',
  user: 'clnxgj0z10h9zcgpm8d943ssz',
  password: 'ucA3GjsfNs7uOk4nBS3LuF2y',
  database: 'certificados'
}); */

//BD DEVELOPMENT

const connection = mysql.createConnection({
  host: 'clng7rbo600qopmcgt9jkt3t2',
  user: 'clng7rbo40e9wcgpm6woverev',
  password: 'scq0bEfIy6SiKTUv69bGWQCQ',
  database: 'certificados'
});

/* const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password@2023',
  database: 'certificados'
}); */

module.exports = connection;
