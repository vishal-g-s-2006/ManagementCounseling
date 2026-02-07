const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("=== USERS TABLE ===");
    db.each("SELECT * FROM users", (err, row) => {
        if (err) console.error(err);
        else console.log(row);
    });

    console.log("\n=== APPLICATIONS TABLE ===");
    db.each("SELECT id, user_id, status, payment_status, submission_date, choices, allotment_details, personal_details FROM applications", (err, row) => {
        if (err) console.error(err);
        else {
            // Truncate long JSON strings for readability
            if (row.personal_details && row.personal_details.length > 50) {
                row.personal_details = row.personal_details.substring(0, 50) + "...";
            }
            if (!row.choices) row.choices = "[]";
            if (!row.allotment_details) row.allotment_details = "{}";

            console.log(row);
        }
    });
});
