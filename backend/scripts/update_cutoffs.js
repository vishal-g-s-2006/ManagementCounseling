const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

db.serialize(() => {
    db.all("SELECT id, academic_details FROM applications", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        const updateStmt = db.prepare("UPDATE applications SET academic_details = ? WHERE id = ?");

        rows.forEach(row => {
            let academic = {};
            try {
                academic = JSON.parse(row.academic_details);
            } catch (e) {
                console.log(`Error parsing academic details for ID ${row.id}`);
            }

            // Update with new random marks
            const physics = getRandomInt(100, 200) / 2; // Allow .5
            const chemistry = getRandomInt(100, 200) / 2;
            const maths = getRandomInt(50, 100);

            // Allow some high scores
            academic.markPhysics = physics;
            academic.markChemistry = chemistry;
            academic.markMaths = maths;

            // Cutoff = M + (P+C)/2
            // Wait, standard calc: Maths (100) + Physics (100)/2 + Chem (100)/2 ?? 
            // TNEA Formula: Maths (100) + (Physics (100) + Chemistry (100)) / 2 = 200 Max.
            // My previous physics/chem were out of 100.

            // Let's stick to: P(100), C(100), M(100).
            // Cutoff = M + (P+C)/2.

            const newP = getRandomInt(70, 100);
            const newC = getRandomInt(70, 100);
            const newM = getRandomInt(70, 100);
            const newCutoff = newM + (newP + newC) / 2;

            academic.markPhysics = newP;
            academic.markChemistry = newC;
            academic.markMaths = newM;
            academic.cutoff = newCutoff;

            updateStmt.run(JSON.stringify(academic), row.id);
            console.log(`Updated ID ${row.id}: Cutoff ${newCutoff}`);
        });

        updateStmt.finalize();
    });
});
