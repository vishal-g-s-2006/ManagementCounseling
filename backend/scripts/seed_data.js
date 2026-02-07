const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../server/tnea.db');
const db = new sqlite3.Database(dbPath);

const branches = [
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Civil Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Mechanical Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Automobile Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Electrical and Electronics Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Electronics and Communication Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Computer Science and Engineering' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Information Technology' },
    { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Artificial Intelligence and Data Science' }
];

const communities = ['OC', 'BC', 'BCM', 'MBC', 'SC', 'SCA', 'ST'];
const names = ['Arun', 'Bala', 'Chitra', 'Deepa', 'Elango', 'Fathima', 'Ganesh', 'Hari', 'Indira', 'John', 'Karthik', 'Lakshmi', 'Murali', 'Nandhini', 'Omprakash', 'Priya', 'Raju', 'Sarah', 'Thara', 'Uma'];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

db.serialize(() => {
    console.log('Seeding 10 test students...');

    // We need to insert into users first to get a valid user_id
    // But since this is a prototype and we might not need login for all of them immediately (just testing admin), 
    // we can generate dummy users or just skip user table sync if we are lazy, BUT the logic joins/checks users.
    // Let's do it properly: Insert User -> Insert Application.

    const stmtUser = db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')");
    const stmtApp = db.prepare("INSERT INTO applications (user_id, personal_details, academic_details, documents, payment_status, status, submission_date, choices) VALUES (?, ?, ?, ?, 'paid', 'Approved', ?, ?)");

    for (let i = 0; i < 10; i++) {
        const name = getRandomItem(names) + ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const email = `student${Date.now()}_${i}@test.com`;
        const community = getRandomItem(communities);

        // Marks
        const physics = getRandomInt(70, 100);
        const chemistry = getRandomInt(70, 100);
        const maths = getRandomInt(70, 100);
        const cutoff = (maths + (physics + chemistry) / 2); // Engg Cutoff = M + (P+C)/2

        // Choices - Random 3 to 5 unique choices
        const numChoices = getRandomInt(3, 5);
        const studentChoices = [];
        const usedBranches = new Set();
        while (studentChoices.length < numChoices) {
            const b = getRandomItem(branches);
            if (!usedBranches.has(b.branch)) {
                studentChoices.push(b);
                usedBranches.add(b.branch);
            }
        }

        const personal = JSON.stringify({
            name: name,
            fatherName: "Father " + name,
            dob: "2007-01-01",
            gender: Math.random() > 0.5 ? "Male" : "Female",
            community: community,
            email: email,
            mobile: "9876543210",
            address: "123 Test Street",
            district: "Erode",
            state: "Tamil Nadu",
            pincode: "638012"
        });

        const academic = JSON.stringify({
            regNo: "REG" + getRandomInt(100000, 999999),
            schoolName: "Govt School",
            hscGroup: "2502",
            qualifiedYear: "2025",
            markPhysics: physics,
            markChemistry: chemistry,
            markMaths: maths,
            cutoff: cutoff
        });

        const documents = JSON.stringify({
            photo: `https://picsum.photos/seed/${i}_photo/200/200`,
            sign: `https://picsum.photos/seed/${i}_sign/200/100`,
            marksheet10: `https://picsum.photos/seed/${i}_10th/400/600`,
            marksheet12: `https://picsum.photos/seed/${i}_12th/400/600`,
            communityCert: `https://picsum.photos/seed/${i}_comm/400/600`,
            tc: `https://picsum.photos/seed/${i}_tc/400/600`,
            aadhar: `https://picsum.photos/seed/${i}_aadhar/400/600`
        });

        stmtUser.run(email, "hashed_password", function (err) {
            if (err) console.error(err);
            const userId = this.lastID;
            const submittedDate = new Date().toISOString().replace('T', ' ').split('.')[0];

            stmtApp.run(userId, personal, academic, documents, submittedDate, JSON.stringify(studentChoices), function (err) {
                if (err) console.error("App Insert Error", err);
                else console.log(`Created Student: ${name} (ID: ${userId}, Cutoff: ${cutoff})`);
            });
        });
    }


});
