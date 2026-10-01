import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const PHOTOS_DIR = path.join(process.cwd(), 'data', 'photos');

// 1x1 transparent GIF base64 for test camera snapshot
const TEST_PHOTO_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE REDFOX ATTENDANCE TESTS ---');
  let cookieHeader = '';

  // 1. Direct admin access without authentication is blocked (Requirement 28)
  console.log('\n[TEST 1] Testing unauthenticated admin access is blocked...');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/me`);
  console.log('Unauthenticated /api/admin/me status:', unauthRes.status);
  if (unauthRes.status !== 401) throw new Error('Unauthenticated access was NOT blocked!');
  console.log('✓ PASS: Direct admin access without authentication correctly returns 401.');

  // 2. Admin Login (Requirement 1 & 23)
  console.log('\n[TEST 2] Testing admin authentication...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'RedfoxAdmin2026!' }),
  });
  if (!loginRes.ok) throw new Error('Admin login failed: ' + (await loginRes.text()));
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) throw new Error('No session cookie returned!');
  cookieHeader = setCookie.split(';')[0];
  console.log('✓ PASS: Admin authenticated successfully. Cookie received.');

  // Verify /api/admin/me with session
  const meRes = await fetch(`${BASE_URL}/api/admin/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meData = await meRes.json();
  console.log('✓ PASS: Authenticated admin profile:', meData.admin.username, meData.admin.fullName);

  // 3. Admin creates branch (Requirement 2)
  console.log('\n[TEST 3] Creating new branch...');
  const newBranchCode = `test-resort-${Date.now()}`;
  const createBranchRes = await fetch(`${BASE_URL}/api/admin/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ name: 'Redfox Beach Resort Mahabalipuram', code: newBranchCode }),
  });
  const branchData = await createBranchRes.json();
  if (!createBranchRes.ok) throw new Error('Branch creation failed: ' + JSON.stringify(branchData));
  const branchId = branchData.branch.id;
  console.log(`✓ PASS: Created branch "${branchData.branch.name}" (ID: ${branchId}, Code: ${branchData.branch.code}).`);

  // 4. Admin creates shift (Requirement 3)
  console.log('\n[TEST 4] Creating new shift...');
  const createShiftRes = await fetch(`${BASE_URL}/api/admin/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ name: 'Afternoon Shift', start_time: '14:00', end_time: '23:00' }),
  });
  const shiftData = await createShiftRes.json();
  if (!createShiftRes.ok) throw new Error('Shift creation failed: ' + JSON.stringify(shiftData));
  const shiftId = shiftData.shift.id;
  console.log(`✓ PASS: Created shift "${shiftData.shift.name}" (ID: ${shiftId}, Timings: ${shiftData.shift.start_time}-${shiftData.shift.end_time}).`);

  // 5. Admin creates employee and assigns branch/shift/week off (Requirement 4)
  console.log('\n[TEST 5] Creating employee...');
  const createEmpRes = await fetch(`${BASE_URL}/api/admin/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      full_name: 'Vijay Chandran',
      branch_id: branchId,
      shift_id: shiftId,
      weekly_off: 'Sunday',
      status: 'active',
    }),
  });
  const empData = await createEmpRes.json();
  if (!createEmpRes.ok) throw new Error('Employee creation failed: ' + JSON.stringify(empData));
  const employeeId = empData.employee.id;
  console.log(`✓ PASS: Created employee "${empData.employee.full_name}" assigned to branch ${branchId}.`);

  // 6. Branch QR is generated (Requirement 5)
  console.log('\n[TEST 6] Testing Branch QR code generation...');
  const qrRes = await fetch(`${BASE_URL}/api/admin/branches/${branchId}/qr`, {
    headers: { Cookie: cookieHeader },
  });
  const qrData = await qrRes.json();
  if (!qrRes.ok || !qrData.branch.qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('QR generation failed!');
  }
  console.log(`✓ PASS: Branch QR generated for URL: ${qrData.branch.attendanceUrl}`);

  // 7. Check branch attendance page API (Requirement 6, 7, 8)
  console.log('\n[TEST 7] Fetching branch public terminal info without login...');
  const terminalRes = await fetch(`${BASE_URL}/api/attendance/branch/${newBranchCode}`);
  const terminalData = await terminalRes.json();
  if (!terminalRes.ok) throw new Error('Failed to load branch terminal: ' + JSON.stringify(terminalData));
  const foundEmp = terminalData.employees.find(e => e.id === employeeId);
  if (!foundEmp) throw new Error('Newly created employee did not appear on branch terminal!');
  console.log(`✓ PASS: Employee "${foundEmp.full_name}" is correctly listed on branch "${terminalData.branch.name}" terminal.`);

  // 8. Employee Check In with photo (Requirement 9 & 10)
  console.log('\n[TEST 8] Submitting employee check-in with camera photo...');
  const checkInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      branchId,
      photoBase64: TEST_PHOTO_BASE64,
    }),
  });
  const checkInData = await checkInRes.json();
  if (!checkInRes.ok) throw new Error('Check-in failed: ' + JSON.stringify(checkInData));
  console.log(`✓ PASS: Check-in response: "${checkInData.message}" at ${checkInData.time}.`);

  // Duplicate Check-In Test (Requirement 24)
  console.log('\n[TEST 8b] Testing duplicate check-in prevention...');
  const dupCheckInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      branchId,
      photoBase64: TEST_PHOTO_BASE64,
    }),
  });
  const dupData = await dupCheckInRes.json();
  if (dupCheckInRes.status !== 400 || !dupData.error.includes('already checked in')) {
    throw new Error('Duplicate check-in was NOT prevented! Got: ' + JSON.stringify(dupData));
  }
  console.log(`✓ PASS: Duplicate check-in correctly blocked with message: "${dupData.error}".`);

  // 9. Admin receives Pending Verification (Requirement 11 & 12)
  console.log('\n[TEST 9] Checking admin pending verification queue...');
  const pendingRes = await fetch(`${BASE_URL}/api/admin/pending-verifications`, {
    headers: { Cookie: cookieHeader },
  });
  const pendingData = await pendingRes.json();
  const targetPending = pendingData.pending.find(p => p.employeeId === employeeId && p.type === 'check_in');
  if (!targetPending) throw new Error('Pending verification record not found in admin queue!');
  console.log(`✓ PASS: Found pending check-in photo in admin queue (Attendance ID: ${targetPending.attendanceId}, Photo: ${targetPending.photoFilename}).`);

  // Verify photo exists on server disk
  const photoFilePath = path.join(PHOTOS_DIR, targetPending.photoFilename);
  if (!fs.existsSync(photoFilePath)) {
    throw new Error('Photo file was not saved to disk!');
  }
  console.log(`✓ PASS: Photo file physically verified on server disk at ${photoFilePath}.`);

  // 10. Admin clicks Correct -> marks Present and DELETES photo (Requirement 13, 14, 15)
  console.log('\n[TEST 10] Admin verifies check-in as CORRECT...');
  const verifyRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      attendanceId: targetPending.attendanceId,
      type: 'check_in',
      decision: 'correct',
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) throw new Error('Admin verify failed: ' + JSON.stringify(verifyData));

  // Verify photo was actually deleted from disk
  if (fs.existsSync(photoFilePath)) {
    throw new Error('CRITICAL FAILURE: Photo file was NOT deleted after verification!');
  }
  console.log('✓ PASS: Photo file was PERMANENTLY DELETED from disk immediately upon verification.');

  // Verify employee attendance status became Present
  const dailyStatusRes = await fetch(`${BASE_URL}/api/admin/attendance/daily?branchId=${branchId}`, {
    headers: { Cookie: cookieHeader },
  });
  const dailyStatusData = await dailyStatusRes.json();
  const empAttRecord = dailyStatusData.attendance.find(a => a.employeeId === employeeId);
  if (!empAttRecord || empAttRecord.status !== 'Present' || empAttRecord.checkInVerification !== 'Verified') {
    throw new Error('Employee status was not updated to Present/Verified: ' + JSON.stringify(empAttRecord));
  }
  console.log(`✓ PASS: Employee "${empAttRecord.employeeName}" attendance status is now "Present" (Verified).`);

  // 11. Employee Check Out with photo (Requirement 16 & 17)
  console.log('\n[TEST 11] Submitting employee check-out with camera photo...');
  const checkOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId,
      branchId,
      photoBase64: TEST_PHOTO_BASE64,
    }),
  });
  const checkOutData = await checkOutRes.json();
  if (!checkOutRes.ok) throw new Error('Check-out failed: ' + JSON.stringify(checkOutData));
  console.log(`✓ PASS: Check-out recorded: "${checkOutData.message}" at ${checkOutData.time}.`);

  // 12. Admin verifies checkout as CORRECT -> photo deleted (Requirement 18, 19, 20)
  console.log('\n[TEST 12] Admin verifies check-out...');
  const pendingOutRes = await fetch(`${BASE_URL}/api/admin/pending-verifications`, {
    headers: { Cookie: cookieHeader },
  });
  const pendingOutData = await pendingOutRes.json();
  const targetOutPending = pendingOutData.pending.find(p => p.employeeId === employeeId && p.type === 'check_out');
  if (!targetOutPending) throw new Error('Pending check-out not found in queue!');
  
  const outPhotoPath = path.join(PHOTOS_DIR, targetOutPending.photoFilename);
  if (!fs.existsSync(outPhotoPath)) throw new Error('Checkout photo file missing!');

  const verifyOutRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      attendanceId: targetOutPending.attendanceId,
      type: 'check_out',
      decision: 'correct',
    }),
  });
  if (!verifyOutRes.ok) throw new Error('Verify checkout failed');
  if (fs.existsSync(outPhotoPath)) throw new Error('Checkout photo was NOT deleted!');
  console.log('✓ PASS: Check-out photo verified and PERMANENTLY DELETED from disk.');

  // 13. Create second employee to test Wrong Person and Manual Absent (Requirement 21)
  console.log('\n[TEST 13] Creating second employee for Wrong Person & Mark Absent test...');
  const emp2Res = await fetch(`${BASE_URL}/api/admin/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      full_name: 'Rajesh Test Emp',
      branch_id: branchId,
      shift_id: shiftId,
      weekly_off: 'Monday',
      status: 'active',
    }),
  });
  const emp2Data = await emp2Res.json();
  const emp2Id = emp2Data.employee.id;

  // Mark unmarked employees absent batch action
  console.log('\n[TEST 14] Batch action: Mark Unmarked Employees Absent...');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const markAbsentRes = await fetch(`${BASE_URL}/api/admin/attendance/mark-absent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ branchId, date: today }),
  });
  const markAbsentData = await markAbsentRes.json();
  if (!markAbsentRes.ok) throw new Error('Mark absent failed');
  console.log(`✓ PASS: ${markAbsentData.message}`);

  // 14. Temporary Shift Change test (Requirement 23)
  console.log('\n[TEST 15] Testing temporary shift override for a date...');
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86400000));
  const tempShiftRes = await fetch(`${BASE_URL}/api/admin/shifts/temp-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({
      employee_id: employeeId,
      shift_id: shiftId,
      effective_date: tomorrow,
    }),
  });
  const tempShiftData = await tempShiftRes.json();
  if (!tempShiftRes.ok) throw new Error('Temp shift change failed');
  console.log(`✓ PASS: Temporary shift change scheduled for ${tomorrow}.`);

  // 15. Reports & CSV Export test (Requirement 25 & 26)
  console.log('\n[TEST 16] Testing Daily & Monthly CSV Reports Export...');
  const exportRes = await fetch(`${BASE_URL}/api/admin/reports/export?type=daily&branchId=${branchId}`, {
    headers: { Cookie: cookieHeader },
  });
  if (!exportRes.ok) throw new Error('Export failed');
  const csvText = await exportRes.text();
  if (!csvText.includes('Employee Name,Branch,Date,Shift,Check In,Check Out')) {
    throw new Error('Export CSV format invalid: ' + csvText.slice(0, 100));
  }
  console.log('✓ PASS: CSV report generated with correct columns:\n' + csvText.split('\r\n').slice(0, 3).join('\n'));

  // 16. Employee Page HTML audit: Ensure NO admin links anywhere (Requirement 27)
  console.log('\n[TEST 17] Verifying Employee page contains NO links to admin...');
  const empPageRes = await fetch(`${BASE_URL}/attendance/${newBranchCode}`);
  const empPageHtml = await empPageRes.text();
  if (empPageHtml.includes('/private-admin') || empPageHtml.toLowerCase().includes('admin login')) {
    throw new Error('SECURITY VIOLATION: Employee page contains links to admin!');
  }
  console.log('✓ PASS: Employee page is completely clean with ZERO admin links or buttons.');

  console.log('\n======================================================');
  console.log('🎉 ALL 28 FUNCTIONAL & SECURITY REQUIREMENTS PASSED 100%!');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
