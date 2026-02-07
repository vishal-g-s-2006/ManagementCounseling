const API_URL = 'http://localhost:3000/api';
let currentUserId = localStorage.getItem('tnea_user_id');
let currentStep = 1;

// Elements
const form = document.getElementById("applicationForm");
const steps = document.querySelectorAll(".step");
const formSteps = document.querySelectorAll(".form-step");
const loginPage = document.getElementById("login-page");
const appContent = document.getElementById("app-content");
const registrationPage = document.getElementById("registration-page");
const dashboardPage = document.getElementById("dashboard-page");

// Input Validation Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Alphabets only for Names
  const nameFields = ['name', 'guardianName', 'subCaste'];
  nameFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
      });
    }
  });

  // Numbers only for Phone/Marks/RegNo (if numeric)
  const numberFields = ['parentMobile', 'markPhysics', 'markChemistry', 'markMaths', 'tokenNo', 'hscRegNo'];
  // tokenNo might be alphanumeric? 'eg. C4000'. Removing tokenNo from purely numeric.
  // hscRegNo typically numeric but let's check. 
  // Phone is definitely numeric.
  const strictNumberFields = ['parentMobile', 'markPhysics', 'markChemistry', 'markMaths'];
  strictNumberFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
      });
    }
  });

  // Autofill Schooling Checkbox
  const autofillCheckbox = document.getElementById('autofillSchools');
  if (autofillCheckbox) {
    autofillCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        const rows = document.querySelectorAll('.school-table tbody tr');
        if (rows.length > 0) {
          const firstRow = rows[0];
          const schoolName = firstRow.querySelector('.school-input').value;
          const district = firstRow.querySelector('.district-select').value;
          const state = firstRow.querySelector('.state-select').value;

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            row.querySelector('.school-input').value = schoolName;

            const distSelect = row.querySelector('.district-select');
            distSelect.value = district;
            distSelect.dispatchEvent(new Event('change'));

            const stateSelect = row.querySelector('.state-select');
            stateSelect.value = state;
            stateSelect.dispatchEvent(new Event('change'));
          }
        }
      }
    });
  }
});

// Admin Elements
const adminDashboard = document.getElementById('admin-dashboard');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminTableBody = document.getElementById('adminTableBody');
const sidePanel = document.getElementById('sidePanel');
const panelOverlay = document.getElementById('panelOverlay');

// --- API Helper ---
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  } catch (err) {
    console.error(err);
    alert(err.message);
    throw err;
  }
}

// --- Form Data Handling ---
function getFormData() {
  const data = {};
  // Simplified extraction. In a real app, use FormData or robust recursive gathering.
  const step1Data = {};
  document.getElementById('step1').querySelectorAll('input, select').forEach(el => { if (el.id) step1Data[el.id] = el.value; });

  const step2Data = {};
  document.getElementById('step2').querySelectorAll('input, select').forEach(el => { if (el.id) step2Data[el.id] = el.value; });

  const step3Data = {};
  document.getElementById('step3').querySelectorAll('input, select').forEach(el => { if (el.id) step3Data[el.id] = el.value; });

  return {
    personal: { ...step1Data, ...step2Data },
    academic: step3Data,
    documents: {}
  };
}

async function saveApplication() {
  if (!currentUserId) return;
  const data = getFormData();
  try {
    await apiCall('/application/save', 'POST', { userId: currentUserId, ...data });
    console.log('Saved');
  } catch (e) {
    // silent fail
  }
}

// --- Navigation & Validation ---
function updateSteps(stepNumber) {
  steps.forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    if (stepNum === stepNumber) {
      step.classList.add("active");
      step.classList.remove("completed");
    } else if (stepNum < stepNumber) {
      step.classList.add("completed");
      step.classList.remove("active");
    } else {
      step.classList.remove("active", "completed");
    }
  });
}

function showStep(stepNumber) {
  formSteps.forEach((step) => {
    step.classList.add("hidden");
  });
  document.getElementById(`step${stepNumber}`).classList.remove("hidden");
  updateSteps(stepNumber);
  currentStep = stepNumber;
  window.scrollTo(0, 0);
  saveApplication();
}

function validateStep(stepNumber) {
  const stepDiv = document.getElementById(`step${stepNumber}`);
  const inputs = stepDiv.querySelectorAll("input[required], select[required], textarea[required]");
  let isValid = true;

  inputs.forEach(input => {
    // Check validity only if element is visible
    if (!input.value && !input.readOnly && input.offsetParent !== null) {
      isValid = false;
      input.style.borderColor = "red";
    } else {
      input.style.borderColor = "#e5e7eb";
    }
  });

  if (!isValid) {
    alert("Please fill all required fields marked with *");
  }

  // Mobile Length Validation for Step 1
  if (stepNumber === 1 && isValid) {
    const mobile = document.getElementById('parentMobile').value;
    if (mobile.length !== 10) {
      alert("Invalid Mobile Number: Must be exactly 10 digits.");
      return false;
    }
  }

  // Reg No Length Validation for Step 3
  if (stepNumber === 3 && isValid) {
    const regNo = document.getElementById('hscRegNo').value;
    // Assuming hscRegNo is the ID. Let's verify if not I will fix in next turn, 
    // but based on previous context hscRegNo is used.
    if (regNo && regNo.length !== 7) {
      alert("Invalid Register Number: Must be exactly 7 digits.");
      return false;
    }
  }

  // Exact Mark Validation for Step 3 (Academic)
  if (stepNumber === 3 && isValid) {
    const maths = parseFloat(document.getElementById('markMaths').value) || 0;
    const physics = parseFloat(document.getElementById('markPhysics').value) || 0;
    const chemistry = parseFloat(document.getElementById('markChemistry').value) || 0;

    if (maths < 35 || physics < 35 || chemistry < 35) {
      alert("Not Eligible: Minimum 35 marks required in Maths, Physics, and Chemistry.");
      return false;
    }

    if (maths > 100 || physics > 100 || chemistry > 100) {
      alert("Invalid Marks: Maximum mark is 100 per subject.");
      return false;
    }
  }

  return isValid;
}

window.nextStep = function (targetStep) {
  if (targetStep > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  showStep(targetStep);
}

window.prevStep = function (targetStep) {
  showStep(targetStep);
}

// --- Submission ---
window.submitApplicationForm = async function () {
  if (!currentUserId) return alert("Please login first");
  // Selector might need adjustment if multiple buttons, but usually fine
  const btn = document.querySelector('.btn-group button[onclick="submitApplicationForm()"]');
  const originalText = btn ? btn.innerText : 'Submit';

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Submitting...";
  }

  try {
    const resData = await apiCall('/application/submit', 'POST', { userId: currentUserId });
    alert(`Application Submitted Successfully!\nYour Application Number is: ${resData.appNo}`);
    if (dashboardPage) {
      if (appContent) appContent.classList.add('hidden');
      dashboardPage.classList.remove('hidden');
      // Could also display App No on Dashboard here
    } else {
      location.reload();
    }
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }
}

// --- Auth Handling ---
if (document.getElementById("studentLoginForm")) {
  document.getElementById("studentLoginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const user = await apiCall('/auth/login', 'POST', { email, password });
      currentUserId = user.id;
      localStorage.setItem('tnea_user_id', user.id);

      // Load Data
      loginPage.style.opacity = '0';
      setTimeout(async () => { // Make this async to await data
        loginPage.classList.add("hidden");

        try {
          const appData = await apiCall(`/application/${user.id}`);

          if (appData.status === 'Approved') {
            document.getElementById('choice-filling-page').classList.remove('hidden');
            initChoiceFilling();
          } else if (['Allotted', 'Admission_Confirmed', 'Upward_Movement'].includes(appData.status)) {
            document.getElementById('allotment-page').classList.remove('hidden');
            document.getElementById('allottedCollege').innerText = appData.allotment_details.collegeName || 'N/A';
            document.getElementById('allottedBranch').innerText = appData.allotment_details.branch || 'N/A';
            document.getElementById('allottedQuota').innerText = appData.allotment_details.quota || 'N/A';
            document.getElementById('allottedRank').innerText = appData.allotment_details.rank || 'N/A';
            document.getElementById('allottedCommunity').innerText = appData.allotment_details.community || 'N/A';

            // Show current status message if already confirmed
            const optionsDiv = document.getElementById('confirmation-options');
            const downloadSection = document.getElementById('download-order-section');
            if (appData.status === 'Admission_Confirmed') {
              optionsDiv.innerHTML = `<div style="background:#dbeafe; padding:1rem; border-radius:8px; color:#1e40af; border:1px solid #1e40af;">
                    <strong>✅ Admission Confirmed</strong><br>You have accepted and confirmed this seat. Please join the college.</div>`;
              if (downloadSection) downloadSection.classList.remove('hidden');
            } else if (appData.status === 'Upward_Movement') {
              optionsDiv.innerHTML = `<div style="background:#fef9c3; padding:1rem; border-radius:8px; color:#854d0e; border:1px solid #854d0e;">
                    <strong>⏳ Upward Movement Requested</strong><br>You have tentatively accepted this seat and are waiting for upgrades. (Pending Approval)</div>`;
              if (downloadSection) downloadSection.classList.add('hidden');
            } else {
              if (downloadSection) downloadSection.classList.add('hidden');
            }
          } else if (appData.status === 'Rejected' || appData.status === 'Declined') {
            document.getElementById('rejected-page').classList.remove('hidden');
            // If Declined, maybe show slightly different text? For now, re-using rejected page is fine or we can customize.
            if (appData.status === 'Declined') {
              document.querySelector('#rejected-page h3').innerText = "Seat Declined";
              document.querySelector('#rejected-page p').innerText = "You have declined the allotted seat.";
            }
            document.getElementById('rejected-page').classList.remove('hidden');
          } else {
            // Normal flow
            if (appData.status === 'Pending' && dashboardPage) {
              // Show dashboard if status is 'Pending'
              if (dashboardPage) {
                dashboardPage.classList.remove('hidden');
              } else if (appContent) {
                appContent.classList.remove("hidden");
              }
            } else if (appContent) {
              appContent.classList.remove("hidden");
            }
          }
          // TODO: Populate form fields with appData if showing form
        } catch (err) {
          // New user or error
          if (appContent) appContent.classList.remove("hidden");
        }
      }, 300);

    } catch (e) {
      // error handled in apiCall
    }
  });
}

if (document.getElementById("registrationForm")) {
  document.getElementById("registrationForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;

    if (password !== confirm) return alert("Passwords do not match");

    try {
      await apiCall('/auth/register', 'POST', { email, password });
      alert("Registration Successful! Please Login.");

      loginPage.style.opacity = '0';
      document.getElementById("registration-page").classList.add("hidden");

      setTimeout(() => {
        loginPage.classList.remove("hidden");
        loginPage.style.opacity = '1';
      }, 300);
    } catch (e) {
      // error handled
    }
  });
}

// Auth Navigation
const createAccountLink = document.getElementById("createAccountLink");
const backToLoginBtn = document.getElementById("backToLoginBtn");

if (createAccountLink) {
  createAccountLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginPage.classList.add("hidden");
    registrationPage.classList.remove("hidden");
  });
}

if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    registrationPage.classList.add("hidden");
    loginPage.classList.remove("hidden");
  });
}


// --- Admin Panel Logic ---
let currentStudentId = null;
let adminStudents = []; // Store fetched students

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminId = document.getElementById('adminIdInput').value;
    const adminPass = document.getElementById('adminPasswordInput').value;

    if (adminId === 'admin' && adminPass === '123') {
      loginPage.classList.add('hidden');
      adminDashboard.classList.remove('hidden');
      await fetchAdminData();
    } else {
      alert("Invalid Admin Credentials");
    }
  });
}

window.logoutAdmin = function () {
  adminDashboard.classList.add('hidden');
  loginPage.classList.remove('hidden');
  loginPage.style.opacity = '1';
}

window.downloadRankList = function () {
  // Generate a clean printable page locally

  // Helper to calc cutoff
  const getCutoff = (s) => {
    const m = parseFloat(s.academic?.markMaths || 0);
    const p = parseFloat(s.academic?.markPhysics || 0);
    const c = parseFloat(s.academic?.markChemistry || 0);
    return parseFloat((m + (p / 2) + (c / 2)).toFixed(2));
  };

  // Convert adminStudents to HTML table
  const sortedDetails = [...adminStudents].sort((a, b) => {
    const cutA = getCutoff(a);
    const cutB = getCutoff(b);
    if (cutB !== cutA) return cutB - cutA;
    return 0;
  });

  let rows = sortedDetails.map((s, i) => {
    const calculatedCutoff = getCutoff(s);
    return `
        <tr>
            <td>${i + 1}</td>
            <td>${s.appNo || s.id}</td>
            <td>${s.name}</td>
            <td>${s.community}</td>
            <td>${calculatedCutoff}</td>
            <td>${s.allotment_details?.rank || '-'}</td>
            <td>${s.allotment_details?.branch || '-'}</td>
            <td>${s.allotment_details?.quota || '-'}</td>
        </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
        <html>
        <head>
            <title>Rank List - TNEA 2026</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                th { background-color: #f2f2f2; }
                h1, h2 { text-align: center; }
            </style>
        </head>
        <body>
            <h1>Government College of Engineering, Erode</h1>
            <h2>Rank List - TNEA 2026</h2>
            <table>
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>App No</th>
                        <th>Name</th>
                        <th>Comm.</th>
                        <th>Cutoff</th>
                        <th>Allotment Rank</th>
                        <th>Allotted Branch</th>
                        <th>Quota</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
  printWindow.document.close();
}

async function fetchAdminData() {
  try {
    const data = await apiCall('/admin/applications');
    adminStudents = data.map(app => {
      // Flatten/Normalize data for table display
      const personal = app.personal_details || {};
      const academic = app.academic_details || {};

      return {
        id: app.id,
        userId: app.user_id,
        name: personal.name || app.email || 'Unknown', // Fallback
        email: app.email,
        corp: personal.parentCorp || 'N/A',
        region: personal.parentRegion || 'N/A', // Assuming these field names from form
        status: app.status || 'Pending',
        dob: personal.dob || 'N/A',
        gender: personal.gender || 'N/A',
        community: personal.caste || 'OC',
        personal: personal, // for detail view
        academic: academic,
        appNo: app.appNo,
        submission_date: app.submission_date, // Add submission date
        documents: app.documents,
        allotment_details: app.allotment_details
      };
    });
    window.renderAdminTable();
  } catch (e) {
    console.error("Failed to fetch admin data", e);
  }
}

let dateSortOrder = 'desc'; // Default newest first

window.toggleDateSort = function () {
  dateSortOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';

  adminStudents.sort((a, b) => {
    const dateA = new Date(a.submission_date || 0);
    const dateB = new Date(b.submission_date || 0);
    return dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  renderAdminTable();
}

// --- Render Admin Table ---
window.renderAdminTable = function () {
  const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : 'All';
  const corpFilter = document.getElementById('filterCorp') ? document.getElementById('filterCorp').value : 'All';
  const searchText = (document.getElementById('searchStudent') ? document.getElementById('searchStudent').value : '').toLowerCase();

  const adminTableBody = document.getElementById('adminTableBody');
  if (!adminTableBody) return;

  // Insert Rank/Allotment/Quota Headers dynamically for Admin view which has extra columns
  // Updated to include Date with Sort
  const thead = document.querySelector('.admin-container table thead tr');
  if (thead) {
    const arrow = dateSortOrder === 'asc' ? '↑' : '↓';
    thead.innerHTML = `
        <th>ID</th>
        <th>Details</th>
        <th style="cursor:pointer; user-select:none;" onclick="toggleDateSort()" title="Click to sort">Date ${arrow}</th>
        <th>Rank</th>
        <th>Status</th>
        <th>Allotted Branch</th>
        <th>Quota</th>
        <th>Action</th>
      `;
  }

  const filtered = adminStudents.filter(s => {
    const matchStatus = statusFilter === 'All' || (s.status || 'Pending') === statusFilter;
    const matchCorp = corpFilter === 'All' || (s.corp || 'N/A') === corpFilter;
    const matchSearch = (s.name || '').toLowerCase().includes(searchText) || (s.id || '').toString().includes(searchText);
    return matchStatus && matchCorp && matchSearch;
  });

  adminTableBody.innerHTML = filtered.map(s => {
    const allot = s.allotment_details || {};
    const rank = allot.rank || '-';
    const quota = allot.quota || '-';
    // const branch = allot.branch ? allot.branch.replace('Government College of Engineering, Erode', '').trim() : '-';
    // Using full branch name or short? Let's use full for clarity or wrap.
    const branch = allot.branch || '-';

    // Format Date
    let dateStr = '-';
    if (s.submission_date) {
      const d = new Date(s.submission_date);
      dateStr = d.toLocaleDateString();
      // dateStr += ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); // Optional time
    }

    return `
    <tr>
      <td><span style="font-family:monospace; color:var(--primary-color);">#${s.id}</span></td>
      <td>
        <div style="font-weight:600;">${s.name}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${s.gender}, ${s.community} <br> ${s.email}</div>
      </td>
      <td style="font-size:0.85rem; color:var(--text-muted);">${dateStr}</td>
      <td>${rank}</td>
      <td><span class="status-badge status-${(s.status || 'pending').toLowerCase()}">${s.status}</span></td>
      <td style="font-size:0.85rem;">${branch}</td>
      <td>${quota}</td>
      <td>
        <button class="secondary" onclick="openSidePanel(${s.id})" style="width: auto; padding: 0.25rem 0.75rem; font-size: 0.8rem;">View</button>
      </td>
    </tr>
  `}).join('');
}

window.openSidePanel = function (id) {
  const student = adminStudents.find(s => s.id === id);
  if (!student) return;
  currentStudentId = id;

  const p = student.personal || {};

  document.getElementById('panelStudentName').textContent = `${student.name} (#${student.id})`;
  document.getElementById('panelContent').innerHTML = `
    <div class="detail-row">
      <div class="detail-label">Personal Info</div>
      <div class="detail-value">${student.gender}, DOB: ${student.dob}</div>
      <div class="detail-value">Email: ${student.email}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Community</div>
      <div class="detail-value">${student.community}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Transport Details</div>
      <div class="detail-value">${student.corp} - ${student.region}</div>
    </div>
    <div class="detail-row">
        <div class="detail-label">Address</div>
        <div class="detail-value">${p.address || ''}, ${p.district || ''} - ${p.pincode || ''}</div>
    </div>
    
    <div class="cert-preview">
      <h4>key Documents</h4>
      <p>Documents would be listed here (URL/Preview)</p>
    </div>
  `;

  sidePanel.classList.add('open');
  panelOverlay.classList.add('show');
}

window.closeSidePanel = function () {
  sidePanel.classList.remove('open');
  panelOverlay.classList.remove('show');
}

window.updateStatus = async function (newStatus) {
  if (!currentStudentId) return;

  try {
    await apiCall('/admin/update-status', 'POST', { applicationId: currentStudentId, status: newStatus });

    // Update local state
    const studentIdx = adminStudents.findIndex(s => s.id === currentStudentId);
    if (studentIdx !== -1) {
      adminStudents[studentIdx].status = newStatus;
      window.renderAdminTable();
      window.closeSidePanel();

      const toast = document.createElement('div');
      toast.textContent = `Application #${currentStudentId} marked as ${newStatus}`;
      toast.style.cssText = `
          position: fixed; bottom: 20px; right: 20px; 
          background: ${newStatus === 'Approved' ? '#15803d' : '#b91c1c'}; 
          color: white; padding: 1rem 2rem; border-radius: 8px; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: fadeIn 0.3s; z-index: 2000;
        `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  } catch (e) {
    console.error(e);
  }
}


// --- Utils & Dynamic Fields ---
window.toggleDistrictInput = function (selectElement) {
  const manualInput = selectElement.nextElementSibling;
  if (selectElement.value === 'Others') {
    manualInput.style.display = 'block';
    manualInput.classList.remove('hidden');
    manualInput.required = true;
  } else {
    manualInput.style.display = 'none';
    manualInput.classList.add('hidden');
    manualInput.required = false;
    manualInput.value = '';
  }
}

window.toggleState = function (selectElement) {
  const row = selectElement.closest('tr');
  const districtSelect = row.querySelector('.district-select');
  const districtManual = row.querySelector('.district-manual');

  if (selectElement.value === 'Tamil Nadu') {
    districtSelect.classList.remove('hidden');
    districtSelect.parentElement.querySelector('.district-select').style.display = 'block'; // Ensure visibility
    districtManual.classList.add('hidden');
    districtManual.style.display = 'none';
    districtManual.required = false;
    districtSelect.required = true;
  } else {
    districtSelect.classList.add('hidden');
    districtSelect.style.display = 'none';
    districtSelect.required = false;
    districtManual.classList.remove('hidden');
    districtManual.style.display = 'block';
    districtManual.required = true;
    districtManual.value = '';
  }
}

const corpRegions = {
  "MTC": ["Chennai Central", "Chennai North", "Chennai South"],
  "SETC": ["Chennai", "Trichy", "Madurai", "Coimbatore", "Salem", "Tirunelveli", "Nagercoil"],
  "TNSTC-Coimbatore": ["Coimbatore", "Erode", "Tiruppur", "Ooty"],
  "TNSTC-Salem": ["Salem", "Dharmapuri", "Krishnagiri", "Namakkal"],
  "TNSTC-Villupuram": ["Villupuram", "Cuddalore", "Vellore", "Kancheepuram", "Tiruvannamalai", "Tiruvallur"],
  "TNSTC-Kumbakonam": ["Kumbakonam", "Trichy", "Karur", "Pudukkottai", "Karaikudi", "Nagapattinam"],
  "TNSTC-Madurai": ["Madurai", "Dindigul", "Theni", "Virudhunagar"],
  "TNSTC-Tirunelveli": ["Tirunelveli", "Tuticorin", "Nagercoil"]
};

window.toggleRegion = function () {
  const corpSelect = document.getElementById("parentCorp");
  const regionSelect = document.getElementById("parentRegion");
  const selectedCorp = corpSelect.value;
  regionSelect.innerHTML = '<option value="">Select</option>';

  if (selectedCorp && corpRegions[selectedCorp]) {
    corpRegions[selectedCorp].forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionSelect.appendChild(option);
    });
  } else {
    regionSelect.innerHTML = '<option value="">Select Corporation First</option>';
  }
}

// --- Choice Filling Logic ---
let availableColleges = [];
let myChoices = [];

async function initChoiceFilling() {
  try {
    const colleges = await apiCall('/colleges');
    availableColleges = colleges;

    // Fetch existing choices if any
    try {
      const appData = await apiCall(`/application/${currentUserId}`);
      if (appData.choices && Array.isArray(appData.choices)) {
        myChoices = appData.choices;
      }
    } catch (e) { console.log('No existing choices'); }

    renderAvailable();
    renderSelected();
  } catch (e) {
    console.error('Failed to load colleges', e);
  }
}

window.filterColleges = function () {
  const query = document.getElementById('searchCollege').value.toLowerCase();
  renderAvailable(query);
}

function renderAvailable(query = '') {
  const list = document.getElementById('availableList');
  list.innerHTML = '';

  availableColleges.forEach(college => {
    // Skip if already selected
    if (myChoices.find(c => c.code === college.code && c.branch === college.branch)) return;

    if (query && !college.name.toLowerCase().includes(query) && !college.code.includes(query)) return;

    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:0.9rem;">${college.name}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">Code: ${college.code} | ${college.branch}</div>
      </div>
      <button class="add-btn" onclick="addChoice('${college.code}', '${college.branch}')">Add</button>
    `;
    list.appendChild(item);
  });
}

function renderSelected() {
  const list = document.getElementById('selectedList');
  list.innerHTML = '';

  myChoices.forEach((choice, index) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div>
        <div style="font-weight:600; font-size:0.9rem;">${index + 1}. ${choice.name}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${choice.branch}</div>
      </div>
      <div>
        ${index > 0 ? `<button class="secondary" onclick="moveChoice(${index}, -1)">▲</button>` : ''}
        ${index < myChoices.length - 1 ? `<button class="secondary" onclick="moveChoice(${index}, 1)">▼</button>` : ''}
        <button class="remove-btn" onclick="removeChoice(${index})">✕</button>
      </div>
    `;
    list.appendChild(item);
  });
}

window.addChoice = function (code, branch) {
  const college = availableColleges.find(c => c.code === code && c.branch === branch);
  if (college) {
    myChoices.push(college);
    renderAvailable(document.getElementById('searchCollege').value.toLowerCase());
    renderSelected();
  }
}

window.removeChoice = function (index) {
  myChoices.splice(index, 1);
  renderAvailable(document.getElementById('searchCollege').value.toLowerCase());
  renderSelected();
}

window.moveChoice = function (index, direction) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < myChoices.length) {
    [myChoices[index], myChoices[newIndex]] = [myChoices[newIndex], myChoices[index]];
    renderSelected();
  }
}

window.saveChoices = async function () {
  if (!currentUserId) return;
  try {
    // We need to fetch current app data to preserve other fields, or backend handles it (backend updates specific fields)
    // Our backend update query requires all fields.
    // Let's refactor backend or fetch-modify-save here.
    // For now, let's just send what we have, and ensure backend handles it?
    // Backend: UPDATE ... SET personal_details = ?, academic_details = ?, documents = ?, choices = ?
    // So we MUST send all data.

    const appData = await apiCall(`/application/${currentUserId}`);

    await apiCall('/application/save', 'POST', {
      userId: currentUserId,
      personal: appData.personal_details,
      academic: appData.academic_details,
      documents: appData.documents,
      choices: myChoices
    });
    alert('Choices Saved Successfully!');
  } catch (e) {
    console.error(e);
    alert('Failed to save choices');
  }
}


window.submitConfirmation = async function (option) {
  if (!confirm(`Are you sure you want to choose this option?\nThis action cannot be undone.`)) return;

  try {
    await apiCall('/application/confirm-allotment', 'POST', {
      userId: currentUserId,
      option: option
    });
    alert('Response Recorded Successfully!');
    location.reload();
  } catch (e) {
    console.error(e);
    alert('Failed to submit response');
  }
}

window.logoutChoiceFilling = function () {
  document.getElementById('choice-filling-page').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('login-page').style.opacity = '1';
  localStorage.removeItem('tnea_user_id');
  currentUserId = null;
  location.reload();
}

// Initial Setup
updateSteps(1);




window.runSeatAllotment = async function () {
  if (!confirm('Are you sure you want to run seat allotment? This will process all approved applications.')) return;

  try {
    const res = await apiCall('/admin/run-allotment', 'POST');
    alert(`Allotment Complete!\n${res.message}\nTotal Students: ${res.totalStudents}\nAllotted: ${res.allottedCount}`);
    renderAdminTable();
  } catch (e) {
    console.error(e);
    alert('Failed to run allotment');
  }
}
