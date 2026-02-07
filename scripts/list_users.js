const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

db.each("SELECT email FROM users ORDER BY id DESC LIMIT 10", (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log(row.email);
    }
}, (err, count) => {
    console.log(`\nPassword for all: hashed_password`);
});
