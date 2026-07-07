/**
 * KOKO Grocery ERP - Employee & Attendance View Controller
 * Lists staff credentials, roles mappings, and tracks clock-in logs.
 */

window.renderEmployees = function(container) {
  renderEmployeesLayout();

  function renderEmployeesLayout() {
    const list = db.getEmployees();
    const curRole = window.getCurrentRole();

    // 1. Gather all attendance logs
    const logs = [];
    list.forEach(emp => {
      if (emp.attendance) {
        emp.attendance.forEach(att => {
          logs.push({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            date: att.date,
            clockIn: att.clockIn,
            clockOut: att.clockOut
          });
        });
      }
    });
    // Sort log dates descending
    logs.sort((a,b) => new Date(b.date) - new Date(a.date));

    // 2. Identify if currently active user has clocked in today (2026-07-07)
    const todayStr = "2026-07-07";
    // For demo purposes, we will match the current global role selection to our seeded staff profiles:
    // admin -> Hiroshi Sato (EMP-001)
    // manager -> Mami Takahashi (EMP-002)
    // cashier -> Takeshi Kurosawa (EMP-003)
    const currentEmpMap = {
      admin: "EMP-001",
      manager: "EMP-002",
      cashier: "EMP-003"
    };
    const activeEmpId = currentEmpMap[curRole] || "EMP-003";
    const activeEmp = list.find(e => e.id === activeEmpId);
    
    let hasClockedInToday = false;
    let hasClockedOutToday = false;
    let todayLog = null;

    if (activeEmp && activeEmp.attendance) {
      todayLog = activeEmp.attendance.find(att => att.date === todayStr);
      if (todayLog) {
        hasClockedInToday = true;
        hasClockedOutToday = todayLog.clockOut !== "";
      }
    }

    let clockBtnHtml = "";
    if (activeEmp) {
      if (!hasClockedInToday) {
        clockBtnHtml = `<button class="btn btn-success" id="btn-clock-in">Clock In for Today</button>`;
      } else if (!hasClockedOutToday) {
        clockBtnHtml = `<button class="btn btn-danger" id="btn-clock-out">Clock Out for Today</button>`;
      } else {
        clockBtnHtml = `<button class="btn btn-secondary" disabled>Clocked In & Out today</button>`;
      }
    }

    container.innerHTML = `
      <div class="animate-fade-in grid-cols-2-1" style="height:100%;">
        
        <!-- Left: Attendance Logs and Clock widgets -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          
          <div class="glass-panel" style="padding:20px; display:flex; justify-content:space-between; align-items:center; background: linear-gradient(135deg, var(--primary-glow), var(--bg-secondary));">
            <div>
              <h4 style="font-family:var(--font-title); font-size:1.1rem; margin-bottom:4px;">Time Attendance Terminal</h4>
              <p style="font-size:0.8rem; color:var(--text-secondary);">Currently acting as: <strong>${activeEmp ? activeEmp.name : 'Guest'} (${curRole.toUpperCase()})</strong></p>
            </div>
            <div>
              ${clockBtnHtml}
            </div>
          </div>

          <div class="glass-panel panel-card" style="flex-grow:1; min-height:400px; display:flex; flex-direction:column;">
            <div class="panel-header">
              <h4 class="panel-title">Timesheet Logs</h4>
            </div>
            <div class="table-container" style="flex-grow:1; overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff Name</th>
                    <th>Role</th>
                    <th style="text-align:center;">Clock In</th>
                    <th style="text-align:center;">Clock Out</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.length === 0 ? `
                    <tr><td colspan="5" class="empty-state">No timesheet records logged.</td></tr>
                  ` : logs.map(l => `
                    <tr>
                      <td style="font-family:var(--font-mono); font-size:0.8rem;">${window.formatIndianDate(l.date)}</td>
                      <td style="font-weight:600;">${l.name}</td>
                      <td><span class="badge badge-info">${l.role.toUpperCase()}</span></td>
                      <td style="text-align:center; font-family:var(--font-mono);">${l.clockIn ? window.formatIndianTime(l.clockIn) : '-'}</td>
                      <td style="text-align:center; font-family:var(--font-mono);">${l.clockOut ? window.formatIndianTime(l.clockOut) : '<span style="color:var(--warning-hover);">On Duty</span>'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Right: Staff directory -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="glass-panel panel-card" style="flex-grow:1;">
            <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
              <h4 class="panel-title">Staff Accounts</h4>
              <button class="btn btn-secondary btn-sm" id="btn-add-staff-trigger">+ Register Staff</button>
            </div>
            <div class="panel-body" style="padding:10px 20px;">
              ${list.map(emp => `
                <div class="list-item-dense">
                  <div class="list-item-left">
                    <div class="list-item-avatar">${emp.name.substring(0, 1)}</div>
                    <div class="list-item-info">
                      <span class="list-item-title">${emp.name}</span>
                      <span class="list-item-subtitle">ID: ${emp.id}</span>
                    </div>
                  </div>
                  <div class="list-item-right">
                    <span class="badge ${emp.role === 'admin' ? 'badge-danger' : emp.role === 'manager' ? 'badge-warning' : 'badge-success'}">
                      ${emp.role.toUpperCase()}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;

    // Bind add staff button
    document.getElementById("btn-add-staff-trigger").addEventListener("click", () => {
      if (!checkRoleAccess("admin")) return;
      openAddStaffDialog();
    });

    // Clock In click trigger
    const clockInBtn = document.getElementById("btn-clock-in");
    if (clockInBtn) {
      clockInBtn.addEventListener("click", () => {
        const time = new Date().toTimeString().substring(0, 5); // HH:MM
        
        if (!activeEmp.attendance) activeEmp.attendance = [];
        activeEmp.attendance.push({
          date: todayStr,
          clockIn: time,
          clockOut: ""
        });

        db.saveEmployee(activeEmp);
        showToast(`Clocked in at ${window.formatIndianTime(time)}. Have a productive day!`, "success");
        renderEmployeesLayout();
      });
    }

    // Clock Out click trigger
    const clockOutBtn = document.getElementById("btn-clock-out");
    if (clockOutBtn) {
      clockOutBtn.addEventListener("click", () => {
        const time = new Date().toTimeString().substring(0, 5); // HH:MM
        
        const log = activeEmp.attendance.find(att => att.date === todayStr);
        if (log) {
          log.clockOut = time;
          db.saveEmployee(activeEmp);
          showToast(`Clocked out at ${window.formatIndianTime(time)}. Good work!`, "success");
          renderEmployeesLayout();
        }
      });
    }
  }

  // Register staff account dialog
  function openAddStaffDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay active";
    overlay.innerHTML = `
      <div class="modal-container glass-panel-lg" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title">Register Employee Profile</h3>
          <button class="modal-close" id="btn-close-staff-add">&times;</button>
        </div>
        <div class="modal-body">
          <form id="staff-add-form">
            <div class="form-group">
              <label for="staff-add-id">Employee ID (Unique)</label>
              <input type="text" id="staff-add-id" class="form-control" placeholder="e.g. EMP-004" required>
            </div>
            <div class="form-group">
              <label for="staff-add-name">Employee Name</label>
              <input type="text" id="staff-add-name" class="form-control" placeholder="e.g. Kenzo Suzuki" required>
            </div>
            <div class="form-group">
              <label for="staff-add-role">System Privilege Role</label>
              <select id="staff-add-role">
                <option value="cashier">POS Cashier</option>
                <option value="manager">Store Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="btn-cancel-staff-add">Cancel</button>
          <button class="btn btn-primary" id="btn-save-staff-add">Save Staff</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeActions = () => document.body.removeChild(overlay);
    document.getElementById("btn-close-staff-add").addEventListener("click", closeActions);
    document.getElementById("btn-cancel-staff-add").addEventListener("click", closeActions);

    document.getElementById("btn-save-staff-add").addEventListener("click", () => {
      const id = document.getElementById("staff-add-id").value.trim().toUpperCase();
      const name = document.getElementById("staff-add-name").value.trim();
      const role = document.getElementById("staff-add-role").value;

      if (!id || !name) {
        showToast("Please provide required fields.", "warning");
        return;
      }

      const all = db.getEmployees();
      if (all.some(e => e.id === id)) {
        showToast("Employee ID already exists.", "danger");
        return;
      }

      db.saveEmployee({
        id,
        name,
        role,
        attendance: []
      });

      showToast(`Employee profile for ${name} configured.`, "success");
      closeActions();
      renderEmployeesLayout();
    });
  }
};
