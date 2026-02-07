const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

const communities = ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'];
const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Rohan', 'Ishaan', 'Kavya', 'Diya', 'Ananya', 'Priya', 'Neha', 'Sanjana', 'Lakshmi', 'Meera', 'Vikram', 'Suresh', 'Ramesh', 'Karthik', 'Bala'];
const lastNames = ['Kumar', 'Reddy', 'Iyer', 'Menon', 'Pillai', 'Nair', 'Chettiar', 'Gounder', 'Mudaliar', 'Nadars', 'Naidu', 'Rao', 'Sharma', 'Singh', 'Patel'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const passwordHash = bcrypt.hashSync('password123', 10);

db.serialize(() => {
    console.log('Resetting Database...');

    // Clear existing student data
    db.run("DELETE FROM applications");
    db.run("DELETE FROM users WHERE role = 'student'"); // Keep admin if any

    console.log('Seeding 10 new random students (Status: Pending)...');

    const stmtUser = db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')");
    const stmtApp = db.prepare("INSERT INTO applications (user_id, personal_details, academic_details, documents, payment_status, status, submission_date) VALUES (?, ?, ?, ?, 'paid', 'Pending', ?)");

    for (let i = 0; i < 10; i++) {
        const fname = getRandomItem(firstNames);
        const lname = getRandomItem(lastNames);
        const name = `${fname} ${lname}`;
        const email = `student_${Date.now()}_${i}@test.com`;
        const community = getRandomItem(communities);

        // Marks
        const physics = getRandomInt(100, 200) / 2;
        const chemistry = getRandomInt(100, 200) / 2;
        const maths = getRandomInt(50, 100);
        const cutoff = maths + (physics + chemistry) / 2;

        const personal = JSON.stringify({
            name: name,
            fatherName: `Mr. ${getRandomItem(firstNames)} ${lname}`,
            dob: `${getRandomInt(2005, 2008)}-${getRandomInt(1, 12).toString().padStart(2, '0')}-${getRandomInt(1, 28).toString().padStart(2, '0')}`,
            gender: Math.random() > 0.5 ? "Male" : "Female",
            community: community,
            email: email,
            mobile: "9" + getRandomInt(100000000, 999999999),
            address: `${getRandomInt(1, 999)}, Gandhi Street`,
            district: "Erode",
            state: "Tamil Nadu",
            pincode: "638001"
        });

        const academic = JSON.stringify({
            regNo: "REG" + getRandomInt(100000, 999999),
            schoolName: "Govt Higher Secondary School",
            hscGroup: "2502",
            qualifiedYear: "2025",
            markPhysics: physics,
            markChemistry: chemistry,
            markMaths: maths,
            cutoff: cutoff
        });

        const documents = JSON.stringify({
            photo: `https://picsum.photos/seed/${i}_p/200/200`,
            sign: `https://picsum.photos/seed/${i}_s/200/50`,
            marksheet10: `https://picsum.photos/seed/${i}_10/400/600`,
            marksheet12: `https://picsum.photos/seed/${i}_12/400/600`,
            communityCert: `https://picsum.photos/seed/${i}_c/400/600`,
            tc: `https://picsum.photos/seed/${i}_t/400/600`,
            aadhar: `https://picsum.photos/seed/${i}_a/400/600`
        });

        const submittedDate = new Date().toISOString().replace('T', ' ').split('.')[0];

        stmtUser.run(email, passwordHash, function (err) {
            if (err) console.error("User Insert Error:", err);
            else {
                const userId = this.lastID;
                stmtApp.run(userId, personal, academic, documents, submittedDate, function (err) {
                    if (err) console.error("App Insert Error:", err);
                    else console.log(`Created: ${name} (ID: ${userId}, Cutoff: ${cutoff})`);
                });
            }
        });
    }
});
