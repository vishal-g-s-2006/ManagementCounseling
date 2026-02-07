const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../'))); // Serve frontend files

// Register
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);

    db.run(`INSERT INTO users (email, password_hash) VALUES (?, ?)`, [email, hash], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, email });
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });

        res.json({ id: user.id, email: user.email, role: user.role });
    });
});

// Save Application (Upsert)
app.post('/api/application/save', (req, res) => {
    const { userId, personal, academic, documents, choices } = req.body;

    // Check if exists
    db.get(`SELECT id FROM applications WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const personalStr = JSON.stringify(personal || {});
        const academicStr = JSON.stringify(academic || {});
        const documentsStr = JSON.stringify(documents || {});
        const choicesStr = JSON.stringify(choices || []);

        if (row) {
            // Update
            db.run(`UPDATE applications SET personal_details = ?, academic_details = ?, documents = ?, choices = ? WHERE user_id = ?`,
                [personalStr, academicStr, documentsStr, choicesStr, userId],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Application updated', appNo: 200000 + row.id });
                });
        } else {
            // Insert
            db.run(`INSERT INTO applications (user_id, personal_details, academic_details, documents, choices) VALUES (?, ?, ?, ?, ?)`,
                [userId, personalStr, academicStr, documentsStr, choicesStr],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ message: 'Application created', appNo: 200000 + this.lastID });
                });
        }
    });
});

// Get Application
app.get('/api/application/:userId', (req, res) => {
    const userId = req.params.userId;
    db.get(`SELECT * FROM applications WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({}); // Return empty if not found, distinct from error

        // Parse JSONs
        try {
            row.personal_details = JSON.parse(row.personal_details);
            row.academic_details = JSON.parse(row.academic_details);
            row.documents = JSON.parse(row.documents);
            row.choices = JSON.parse(row.choices || '[]');
            row.allotment_details = JSON.parse(row.allotment_details || '{}');
        } catch (e) { /* ignore parse errors */ }

        row.appNo = 200000 + row.id;
        res.json(row);
    });
});

// Submit/Payment (Simulated)
app.post('/api/application/submit', (req, res) => {
    const { userId } = req.body;
    // First get the ID to return App No
    db.get(`SELECT id FROM applications WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Application not found' });

        const appNo = 200000 + row.id;

        db.run(`UPDATE applications SET payment_status = 'paid', status = 'Pending', submission_date = CURRENT_TIMESTAMP WHERE user_id = ?`,
            [userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Application submitted successfully', appNo });
            });
    });
});


// Get Colleges
app.get('/api/colleges', (req, res) => {
    // Hardcoded list for GCE Erode
    const colleges = [
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Civil Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Mechanical Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Automobile Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Electrical and Electronics Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Electronics and Communication Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Computer Science and Engineering' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Information Technology' },
        { code: '2603', name: 'Government College of Engineering, Erode', branch: 'Artificial Intelligence and Data Science' }
    ];
    res.json(colleges);
});

// --- Admin Endpoints ---

// Get all applications
app.get('/api/admin/applications', (req, res) => {
    // Join with users table to get email/username if needed
    const query = `
        SELECT 
            a.id, a.user_id, a.status, a.payment_status, a.submission_date,
            a.personal_details, a.academic_details, a.documents,
            u.email
        FROM applications a
        JOIN users u ON a.user_id = u.id
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Parse JSON fields for frontend convenience
        const applications = rows.map(row => {
            try {
                row.personal_details = JSON.parse(row.personal_details || '{}');
                row.academic_details = JSON.parse(row.academic_details || '{}');
                row.documents = JSON.parse(row.documents || '{}');
            } catch (e) { }
            return row;
        });

        res.json(applications);
    });
});

// Mock Email Sender
function sendMockEmail(to, subject, body) {
    console.log(`\n--- [MOCK EMAIL] ---`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}\n--------------------\n`);
}

// Update Application Status
app.post('/api/admin/update-status', (req, res) => {
    const { applicationId, status } = req.body;

    // 1. Fetch Email First
    db.get(`
        SELECT u.email, a.personal_details 
        FROM applications a 
        JOIN users u ON a.user_id = u.id 
        WHERE a.id = ?`,
        [applicationId],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Application not found' });

            const email = row.email;
            let name = 'Student';
            try {
                const personal = JSON.parse(row.personal_details || '{}');
                name = personal.name || 'Student';
            } catch (e) { }

            // 2. Update Status
            db.run(`UPDATE applications SET status = ? WHERE id = ?`, [status, applicationId], function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // 3. Send Email
                const subject = `Application Status Update: ${status}`;
                const body = `Dear ${name},\n\nYour application status has been updated to: ${status}.\n\nRegards,\nTNEA Admin`;
                sendMockEmail(email, subject, body);

                res.json({ message: 'Status updated successfully' });
            });
        });
});

// Generate Rank List PDF
const PDFDocument = require('pdfkit');

app.get('/api/admin/generate-ranklist', (req, res) => {
    // 1. Fetch all applications
    const query = `
        SELECT 
            a.id, a.user_id, a.status, a.payment_status,
            a.personal_details, a.academic_details,
            u.email
        FROM applications a
        JOIN users u ON a.user_id = u.id
        WHERE a.status = 'approved' OR a.status = 'submitted' -- Consider only submitted/approved
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Process Data: Parse JSON and Calculate Cutoff
        let students = rows.map(row => {
            let personal = {};
            let academic = {};
            try {
                personal = JSON.parse(row.personal_details || '{}');
                academic = JSON.parse(row.academic_details || '{}');
            } catch (e) { }

            // Extract Marks (ensure numbers)
            // Note: In script.js getFormData, marks are in academic object or bundled in personal depending on implementation.
            // Based on previous step, Step 3 inputs (Marks) are now IDs: markPhysics, markChemistry, markMaths
            // And script.js bundles Step 3 into 'academic' key IF correctly implemented, 
            // OR checks for ID. script.js puts Step 1, 2, 3 into 'personal', 'academic', 'documents'
            // My script.js getFormData:
            // const step3Data = {}; 
            // document.getElementById('step3').querySelectorAll... step3Data[el.id] = el.value
            // return { academic: step3Data }
            // So marks are in row.academic_details.markPhysics etc.

            const maths = parseFloat(academic.markMaths || 0);
            const physics = parseFloat(academic.markPhysics || 0);
            const chemistry = parseFloat(academic.markChemistry || 0);

            // Cutoff = Maths + (Physics / 2) + (Chemistry / 2)
            const cutoff = maths + (physics / 2) + (chemistry / 2);

            // DOB for Age Tie-breaker
            const dob = personal.dob ? new Date(personal.dob) : new Date(0); // Older first = smaller date value

            return {
                appNo: 200000 + row.id, // Generate App No
                name: personal.name || 'Unknown',
                community: personal.caste || 'OC', // index.html id="caste"
                cutoff: parseFloat(cutoff.toFixed(2)),
                maths,
                physics,
                chemistry,
                dob,
                rawDob: personal.dob
            };
        });

        // 3. Sort Logic: Cutoff DESC > Maths DESC > Physics DESC > DOB ASC (Age - Older first)
        students.sort((a, b) => {
            if (b.cutoff !== a.cutoff) return b.cutoff - a.cutoff;
            if (b.maths !== a.maths) return b.maths - a.maths;
            if (b.physics !== a.physics) return b.physics - a.physics;
            return a.dob - b.dob; // Older date is smaller number
        });

        // 4. Assign Ranks
        // Calculate General Rank
        students.forEach((s, index) => s.generalRank = index + 1);

        // Calculate Community Rank
        // Group by community then assign rank within group?
        // Simpler: iterate and count. Or sort by community then rank.
        // Let's use a map to track current rank for each community
        const communityCounters = {};
        students.forEach(s => {
            const comm = s.community || 'OC';
            if (!communityCounters[comm]) communityCounters[comm] = 0;
            communityCounters[comm]++;
            s.communityRank = communityCounters[comm];
        });

        // 5. Generate PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=ranklist.pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(18).text('TNEA 2026 - Rank List', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Table Header
        const tableTop = 150;
        const colX = [50, 100, 180, 250, 400, 500]; // X positions
        const headers = ['Gen Rank', 'Comm Rank', 'App No', 'Name', 'Community', 'Cutoff'];

        doc.font('Helvetica-Bold');
        let y = tableTop;

        // Draw Header Row
        headers.forEach((h, i) => {
            doc.text(h, colX[i], y, { width: (colX[i + 1] || 550) - colX[i], align: 'left' });
        });

        y += 20;
        doc.moveTo(30, y).lineTo(560, y).stroke();
        y += 10;

        // Table Body
        doc.font('Helvetica');
        students.forEach(s => {
            if (y > 750) { // New Page
                doc.addPage();
                y = 50;
                headers.forEach((h, i) => { // Redraw Header
                    doc.text(h, colX[i], y, { width: (colX[i + 1] || 550) - colX[i], align: 'left' });
                });
                y += 20;
                doc.moveTo(30, y).lineTo(560, y).stroke();
                y += 10;
            }

            doc.text(s.generalRank.toString(), colX[0], y);
            doc.text(s.communityRank.toString(), colX[1], y);
            doc.text(s.appNo.toString(), colX[2], y);
            doc.text(s.name, colX[3], y, { width: 140, ellipsis: true }); // Truncate long names
            doc.text(s.community, colX[4], y);
            doc.text(s.cutoff.toFixed(2), colX[5], y);

            y += 20;
        });

        doc.end();
    });
});



// --- Seat Allotment Logic ---

app.post('/api/admin/run-allotment', (req, res) => {
    // 1. Fetch Approved Students with Choices
    const query = `
        SELECT 
            a.id, a.user_id, a.choices, a.personal_details, a.academic_details,
            u.email
        FROM applications a
        JOIN users u ON a.user_id = u.id
        WHERE a.status = 'Approved' AND a.choices IS NOT NULL
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Prepare Data (Parse JSONs & Calculate Cutoff)
        let students = rows.map(row => {
            let personal = {}, academic = {}, choices = [];
            try {
                personal = JSON.parse(row.personal_details || '{}');
                academic = JSON.parse(row.academic_details || '{}');
                choices = JSON.parse(row.choices || '[]');
            } catch (e) { }

            const maths = parseFloat(academic.markMaths || 0);
            const physics = parseFloat(academic.markPhysics || 0);
            const chemistry = parseFloat(academic.markChemistry || 0);
            const cutoff = maths + (physics / 2) + (chemistry / 2);
            const dob = personal.dob ? new Date(personal.dob) : new Date(0);

            return {
                id: row.id,
                userId: row.user_id,
                name: personal.name,
                community: personal.community || 'OC', // Default to OC if missing
                cutoff: parseFloat(cutoff.toFixed(2)),
                dob: dob,
                choices: choices
            };
        });

        // 3. Sort by Merit (Cutoff DESC, DOB ASC)
        students.sort((a, b) => {
            if (b.cutoff !== a.cutoff) return b.cutoff - a.cutoff;
            return a.dob - b.dob; // Older preferred
        });

        // 4. Initialize Seat Matrix (21 seats per dept)
        const branches = ['Civil Engineering', 'Mechanical Engineering', 'Automobile Engineering',
            'Electrical and Electronics Engineering', 'Electronics and Communication Engineering',
            'Computer Science and Engineering', 'Information Technology', 'Artificial Intelligence and Data Science'];

        const seatMatrix = {};
        branches.forEach(branch => {
            seatMatrix[branch] = {
                OC: 7,
                BC: 6,
                BCM: 1,
                MBC: 4,
                SC: 3,
                SCA: 0,
                ST: 0
            };
        });

        // 5. Allotment Loop
        const allotments = [];

        // Sort students once before allotment
        students.forEach((student, index) => {
            let allotted = null;

            // Try to allot one of the choices
            for (const choice of student.choices) {
                const branch = choice.branch;
                const matrix = seatMatrix[branch];
                if (!matrix) continue;

                let quotaAllocated = null;

                // Priority 1: Open Competition (OC) - Available to everyone
                if (matrix.OC > 0) {
                    matrix.OC--;
                    quotaAllocated = 'OC';
                }
                // Priority 2: Community Category
                else if (matrix[student.community] && matrix[student.community] > 0) {
                    matrix[student.community]--;
                    quotaAllocated = student.community;
                }

                if (quotaAllocated) {
                    allotted = {
                        collegeName: choice.name,
                        collegeCode: choice.code,
                        branch: branch,
                        quota: quotaAllocated,
                        rank: index + 1,
                        community: student.community
                    };
                    break; // Stop checking choices for this student
                }
            }

            if (allotted) {
                allotments.push({
                    studentId: student.userId,
                    allotment: allotted
                });
            }
        });

        // 6. Save Allocations to DB
        const updates = allotments.map(a => {
            return new Promise((resolve, reject) => {
                const details = JSON.stringify(a.allotment);
                db.run(`UPDATE applications SET allotment_details = ?, status = 'Allotted' WHERE user_id = ?`,
                    [details, a.studentId], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        });

        Promise.all(updates)
            .then(() => {
                res.json({
                    message: 'Allotment generated successfully',
                    totalStudents: students.length,
                    allottedCount: allotments.length
                });
            })
            .catch(err => {
                console.error(err);
                if (!res.headersSent) res.status(500).json({ error: 'Failed to save allotments' });
            });
    });
});


app.post('/api/application/confirm-allotment', (req, res) => {
    const { userId, option } = req.body;
    // Options: 'Admission_Confirmed', 'Upward_Movement', 'Declined'

    if (!['Admission_Confirmed', 'Upward_Movement', 'Declined'].includes(option)) {
        return res.status(400).json({ error: 'Invalid option' });
    }

    db.run(`UPDATE applications SET status = ? WHERE user_id = ?`,
        [option, userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Response recorded successfully' });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
