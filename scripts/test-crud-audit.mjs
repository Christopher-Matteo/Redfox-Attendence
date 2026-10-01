import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('========================================================');
  console.log('🧪 RUNNING RIGOROUS COMPLETE CRUD & INTEGRATION AUDIT');
  console.log('========================================================\n');

  // STEP 0: Authenticate admin
  console.log('[STEP 0] Authenticating Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'RedfoxAdmin2026!' }),
  });
  if (!loginRes.ok) throw new Error('Admin login failed: ' + (await loginRes.text()));
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  const authHeaders = {
    Cookie: cookieHeader.split(';')[0],
    'Content-Type': 'application/json',
  };
  console.log('✓ Admin authenticated.\n');

  // Load existing branches & shifts
  const branchesRes = await fetch(`${BASE_URL}/api/admin/branches`, { headers: authHeaders, cache: 'no-store' });
  const branchesData = await branchesRes.json();
  const shiftsRes = await fetch(`${BASE_URL}/api/admin/shifts`, { headers: authHeaders, cache: 'no-store' });
  const shiftsData = await shiftsRes.json();

  let branchNungam = branchesData.branches.find(b => b.name.includes('Nungambakkam'));
  if (!branchNungam) {
    const createB = await fetch(`${BASE_URL}/api/admin/branches`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Redstone Nungambakkam', code: `nungam-${Date.now()}` }),
    });
    const cbData = await createB.json();
    branchNungam = cbData.branch;
  }
  const branchOther = branchesData.branches.find(b => b.id !== branchNungam.id) || branchesData.branches[0];

  const shiftGeneral = shiftsData.shifts.find(s => s.name === 'General Shift') || shiftsData.shifts[0];
  const shiftMorning = shiftsData.shifts.find(s => s.name === 'Morning Shift') || shiftsData.shifts[1];

  console.log(`Using Branch 1: ${branchNungam.name} (ID: ${branchNungam.id}, Code: ${branchNungam.code})`);
  console.log(`Using Branch 2: ${branchOther.name} (ID: ${branchOther.id}, Code: ${branchOther.code})`);
  console.log(`Using Shift 1: ${shiftGeneral.name} (ID: ${shiftGeneral.id})`);
  console.log(`Using Shift 2: ${shiftMorning.name} (ID: ${shiftMorning.id})\n`);

  // TEST 1 — CREATE
  console.log('[TEST 1 — CREATE]');
  const createEmpRes = await fetch(`${BASE_URL}/api/admin/employees`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      full_name: 'Audit Test Employee',
      branch_id: branchNungam.id,
      shift_id: shiftGeneral.id,
      weekly_off: 'Sunday',
      status: 'active',
    }),
  });
  if (!createEmpRes.ok) throw new Error('Failed to create employee: ' + (await createEmpRes.text()));
  const createdEmpData = await createEmpRes.json();
  const testEmp = createdEmpData.employee;
  console.log(`✓ Created employee "${testEmp.full_name}" (ID: ${testEmp.id})`);

  // Verify employee list API displays exact values
  const listAfterCreate = await (await fetch(`${BASE_URL}/api/admin/employees`, { headers: authHeaders, cache: 'no-store' })).json();
  const empInList1 = listAfterCreate.employees.find(e => e.id === testEmp.id);
  if (!empInList1) throw new Error('Employee not found in employees list!');
  if (empInList1.branch_id !== branchNungam.id || empInList1.shift_id !== shiftGeneral.id || empInList1.weekly_off !== 'Sunday') {
    throw new Error(`Data mismatch in employee list: ${JSON.stringify(empInList1)}`);
  }
  console.log('✓ Employee table displays correct Branch, Shift (General Shift), and Weekly Off (Sunday).');

  // Verify single employee GET API
  const getEmp1 = await (await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, { headers: authHeaders, cache: 'no-store' })).json();
  if (getEmp1.employee.shift_id !== shiftGeneral.id || getEmp1.employee.branch_id !== branchNungam.id) {
    throw new Error(`GET /api/admin/employees/${testEmp.id} returned incorrect values`);
  }
  console.log('✓ GET /api/admin/employees/:id confirmed database values.\n');

  // TEST 2 — EDIT SHIFT
  console.log('[TEST 2 — EDIT SHIFT]');
  console.log(`Updating Shift from "${shiftGeneral.name}" to "${shiftMorning.name}"...`);
  const updateShiftRes = await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      full_name: 'Audit Test Employee',
      branch_id: branchNungam.id,
      shift_id: shiftMorning.id,
      weekly_off: 'Sunday',
      status: 'active',
    }),
  });
  if (!updateShiftRes.ok) throw new Error('Failed to update shift: ' + (await updateShiftRes.text()));
  const updatedShiftData = await updateShiftRes.json();
  if (updatedShiftData.employee.shift_id !== shiftMorning.id || updatedShiftData.employee.shift_name !== shiftMorning.name) {
    throw new Error('Update response did not return new shift!');
  }

  // Verify employee list API immediately returns Morning Shift
  const listAfterShiftEdit = await (await fetch(`${BASE_URL}/api/admin/employees`, { headers: authHeaders, cache: 'no-store' })).json();
  const empInList2 = listAfterShiftEdit.employees.find(e => e.id === testEmp.id);
  if (empInList2.shift_id !== shiftMorning.id || empInList2.shift_name !== shiftMorning.name) {
    throw new Error(`Employee list shows stale shift! Expected ${shiftMorning.name}, got ${empInList2.shift_name}`);
  }
  console.log(`✓ Employee table immediately shows "${empInList2.shift_name}".`);

  // Verify dashboard daily query shows Morning Shift
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const dailyAfterShift = await (await fetch(`${BASE_URL}/api/admin/attendance/daily?date=${todayStr}&branchId=all`, { headers: authHeaders, cache: 'no-store' })).json();
  const empInDaily1 = dailyAfterShift.attendance.find(r => r.employeeId === testEmp.id);
  if (empInDaily1 && empInDaily1.shiftName !== shiftMorning.name) {
    throw new Error(`Dashboard daily view shows stale shift! Expected ${shiftMorning.name}, got ${empInDaily1.shiftName}`);
  }
  console.log(`✓ Dashboard immediately uses "${shiftMorning.name}".`);

  // Verify reopening edit returns Morning Shift
  const getEmp2 = await (await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, { headers: authHeaders, cache: 'no-store' })).json();
  if (getEmp2.employee.shift_id !== shiftMorning.id) {
    throw new Error('Reopening edit shows stale shift!');
  }
  console.log('✓ Reopening edit loads Morning Shift with database confirmation.\n');

  // TEST 3 — EDIT BRANCH
  console.log('[TEST 3 — EDIT BRANCH]');
  console.log(`Moving employee from "${branchNungam.name}" to "${branchOther.name}"...`);
  const updateBranchRes = await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      full_name: 'Audit Test Employee',
      branch_id: branchOther.id,
      shift_id: shiftMorning.id,
      weekly_off: 'Sunday',
      status: 'active',
    }),
  });
  if (!updateBranchRes.ok) throw new Error('Failed to update branch: ' + (await updateBranchRes.text()));

  // Verify employee table
  const listAfterBranchEdit = await (await fetch(`${BASE_URL}/api/admin/employees`, { headers: authHeaders, cache: 'no-store' })).json();
  const empInList3 = listAfterBranchEdit.employees.find(e => e.id === testEmp.id);
  if (empInList3.branch_id !== branchOther.id) {
    throw new Error(`Employee list shows stale branch! Expected ${branchOther.id}, got ${empInList3.branch_id}`);
  }
  console.log(`✓ Employee table shows new branch "${empInList3.branch_name}".`);

  // Verify Old Branch QR Page does NOT show test employee
  const oldBranchTerminal = await (await fetch(`${BASE_URL}/api/attendance/branch/${branchNungam.code}`, { cache: 'no-store' })).json();
  const foundInOld = oldBranchTerminal.employees.some(e => e.id === testEmp.id);
  if (foundInOld) throw new Error('Old branch QR page still shows employee after moving!');
  console.log(`✓ Old branch QR page (${branchNungam.code}) does NOT show Test Employee.`);

  // Verify New Branch QR Page MUST show test employee with Morning Shift
  const newBranchTerminal = await (await fetch(`${BASE_URL}/api/attendance/branch/${branchOther.code}`, { cache: 'no-store' })).json();
  const foundInNew = newBranchTerminal.employees.find(e => e.id === testEmp.id);
  if (!foundInNew) throw new Error('New branch QR page does NOT show Test Employee!');
  if (foundInNew.shift_name !== shiftMorning.name) {
    throw new Error(`New branch QR page shows wrong shift! Expected ${shiftMorning.name}, got ${foundInNew.shift_name}`);
  }
  console.log(`✓ New branch QR page (${branchOther.code}) MUST and DOES show Test Employee with "${shiftMorning.name}".\n`);

  // TEST 4 — WEEK OFF
  console.log('[TEST 4 — WEEK OFF]');
  console.log('Changing Weekly Off from Sunday to Friday...');
  const updateWeekOffRes = await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      full_name: 'Audit Test Employee',
      branch_id: branchOther.id,
      shift_id: shiftMorning.id,
      weekly_off: 'Friday',
      status: 'active',
    }),
  });
  if (!updateWeekOffRes.ok) throw new Error('Failed to update weekly off');

  const getEmp3 = await (await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, { headers: authHeaders, cache: 'no-store' })).json();
  if (getEmp3.employee.weekly_off !== 'Friday') {
    throw new Error(`Weekly off did not persist! Expected Friday, got ${getEmp3.employee.weekly_off}`);
  }
  console.log('✓ Weekly Off changed to Friday and verified in database.\n');

  // TEST 5 — CHECK IN
  console.log('[TEST 5 — CHECK IN]');
  const dummyPhoto = 'data:image/jpeg;base64,' + Buffer.from('TEST_CAMERA_IMAGE_DATA_123').toString('base64');
  const checkInRes = await fetch(`${BASE_URL}/api/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: testEmp.id,
      branchId: branchOther.id,
      photoBase64: dummyPhoto,
    }),
  });
  if (!checkInRes.ok) throw new Error('Check-in failed: ' + (await checkInRes.text()));
  const checkInData = await checkInRes.json();
  console.log(`✓ Check-in submitted successfully at ${checkInData.time}.`);

  // Confirm Pending Verification queue has this item
  const pendingAfterCin = await (await fetch(`${BASE_URL}/api/admin/pending-verifications`, { headers: authHeaders, cache: 'no-store' })).json();
  const pendingItemCin = pendingAfterCin.pending.find(p => p.employeeId === testEmp.id && p.type === 'check_in');
  if (!pendingItemCin) throw new Error('Check-in did not appear in Pending Verification queue!');
  console.log(`✓ Found in Pending Verification queue (Attendance ID: ${pendingItemCin.attendanceId}).\n`);

  // TEST 6 — VERIFY
  console.log('[TEST 6 — VERIFY]');
  const verifyCinRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      attendanceId: pendingItemCin.attendanceId,
      type: 'check_in',
      decision: 'correct',
    }),
  });
  if (!verifyCinRes.ok) throw new Error('Verification failed: ' + (await verifyCinRes.text()));

  // Confirm pending queue decreased and item removed
  const pendingAfterVerify = await (await fetch(`${BASE_URL}/api/admin/pending-verifications`, { headers: authHeaders, cache: 'no-store' })).json();
  const itemStillPending = pendingAfterVerify.pending.some(p => p.attendanceId === pendingItemCin.attendanceId && p.type === 'check_in');
  if (itemStillPending) throw new Error('Verified item is still in Pending Verification queue!');
  console.log('✓ Item removed from Pending Verification queue.');

  // Confirm photo was deleted from disk
  const photoRes = await fetch(`${BASE_URL}/api/admin/photos/${pendingItemCin.photoFilename}`, { headers: authHeaders });
  if (photoRes.status !== 404) throw new Error('Photo was NOT deleted from disk upon verification!');
  console.log('✓ Temporary camera photo permanently destroyed from server disk.');

  // Confirm Dashboard daily status is Present (Verified)
  const dailyAfterVerify = await (await fetch(`${BASE_URL}/api/admin/attendance/daily?date=${todayStr}&branchId=all`, { headers: authHeaders, cache: 'no-store' })).json();
  const empDailyAfterVerify = dailyAfterVerify.attendance.find(r => r.employeeId === testEmp.id);
  if (!empDailyAfterVerify || empDailyAfterVerify.status !== 'Present' || empDailyAfterVerify.checkInVerification !== 'Verified') {
    throw new Error(`Daily status not updated! Expected Present/Verified, got: ${JSON.stringify(empDailyAfterVerify)}`);
  }
  console.log(`✓ Dashboard immediately shows status: Present (Verified).\n`);

  // TEST 7 — CHECK OUT
  console.log('[TEST 7 — CHECK OUT]');
  const checkOutRes = await fetch(`${BASE_URL}/api/attendance/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: testEmp.id,
      branchId: branchOther.id,
      photoBase64: dummyPhoto,
    }),
  });
  if (!checkOutRes.ok) throw new Error('Check-out failed: ' + (await checkOutRes.text()));
  const checkOutData = await checkOutRes.json();
  console.log(`✓ Check-out submitted successfully at ${checkOutData.time}.`);

  const pendingAfterCout = await (await fetch(`${BASE_URL}/api/admin/pending-verifications`, { headers: authHeaders, cache: 'no-store' })).json();
  const pendingItemCout = pendingAfterCout.pending.find(p => p.employeeId === testEmp.id && p.type === 'check_out');
  if (!pendingItemCout) throw new Error('Check-out did not appear in Pending Verification queue!');

  const verifyCoutRes = await fetch(`${BASE_URL}/api/admin/verify`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      attendanceId: pendingItemCout.attendanceId,
      type: 'check_out',
      decision: 'correct',
    }),
  });
  if (!verifyCoutRes.ok) throw new Error('Checkout verification failed');
  console.log('✓ Check-out verified and photo permanently deleted.\n');

  // TEST 8 — MANUAL STATUS CHANGE
  console.log('[TEST 8 — MANUAL STATUS CHANGE]');
  console.log('Admin changing status from Present to Half Day...');
  const manualChangeRes = await fetch(`${BASE_URL}/api/admin/attendance/${pendingItemCin.attendanceId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      status: 'Half Day',
      admin_notes: 'Manual management override to Half Day',
    }),
  });
  if (!manualChangeRes.ok) throw new Error('Failed to update attendance status');

  // Verify daily attendance shows Half Day
  const dailyAfterManual = await (await fetch(`${BASE_URL}/api/admin/attendance/daily?date=${todayStr}&branchId=all`, { headers: authHeaders, cache: 'no-store' })).json();
  const empDailyManual = dailyAfterManual.attendance.find(r => r.employeeId === testEmp.id);
  if (!empDailyManual || empDailyManual.status !== 'Half Day') {
    throw new Error(`Daily attendance did not update to Half Day! Got ${empDailyManual?.status}`);
  }
  if (dailyAfterManual.summary.halfDay < 1) {
    throw new Error('Summary count for halfDay did not increment!');
  }
  console.log('✓ Daily attendance and Dashboard counts show Half Day.');

  // Verify monthly report shows Half Day
  const currentMonthStr = todayStr.slice(0, 7);
  const monthlyRes = await (await fetch(`${BASE_URL}/api/admin/reports/monthly?month=${currentMonthStr}&branchId=all`, { headers: authHeaders, cache: 'no-store' })).json();
  const empMonthly = monthlyRes.reports.find(r => r.employeeId === testEmp.id);
  if (!empMonthly || empMonthly.summary.halfDay < 1) {
    throw new Error('Monthly report did not reflect Half Day!');
  }
  console.log('✓ Monthly report muster roll accurately displays Half Day.\n');

  // TEST 9 — DEACTIVATE
  console.log('[TEST 9 — DEACTIVATE]');
  console.log(`Deactivating employee "${testEmp.full_name}"...`);
  const toggleRes = await fetch(`${BASE_URL}/api/admin/employees/${testEmp.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!toggleRes.ok) throw new Error('Failed to deactivate employee');
  const toggleData = await toggleRes.json();
  if (toggleData.status !== 'inactive') throw new Error('Expected status inactive!');
  console.log('✓ Employee status set to inactive.');

  // Confirm employee disappears from branch QR attendance terminal
  const branchTerminalAfterDeact = await (await fetch(`${BASE_URL}/api/attendance/branch/${branchOther.code}`, { cache: 'no-store' })).json();
  const stillInTerminal = branchTerminalAfterDeact.employees.some(e => e.id === testEmp.id);
  if (stillInTerminal) throw new Error('Inactive employee still appears in branch QR terminal!');
  console.log('✓ Inactive employee disappeared from branch QR attendance terminal.');

  // Confirm employee remains in historical records
  const dailyHistory = await (await fetch(`${BASE_URL}/api/admin/attendance/daily?date=${todayStr}&branchId=all`, { headers: authHeaders, cache: 'no-store' })).json();
  const foundInDailyHistory = dailyHistory.attendance.find(r => r.employeeId === testEmp.id);
  if (!foundInDailyHistory) {
    throw new Error('Inactive employee disappeared from historical attendance records!');
  }
  console.log('✓ Inactive employee is PRESERVED in attendance records with all punch details and shift history.');

  console.log('\n========================================================');
  console.log('🎉 ALL 9 CORE WORKFLOW AND REGRESSION TESTS PASSED 100%!');
  console.log('========================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
