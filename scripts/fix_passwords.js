const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // Requires NODE_PATH to be set

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

const newPassword = "password123";
const hash = bcrypt.hashSync(newPassword, 10);
console.log(`Generated hash for '${newPassword}': ${hash}`);

db.serialize(() => {
    // Update the last 10 users (assuming they are the test users)
    // A safer way would be to update users where email like 'student%'
    db.run("UPDATE users SET password_hash = ? WHERE email LIKE 'student%'", [hash], function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Updated ${this.changes} users with new password hash.`);
        }
    });
});
