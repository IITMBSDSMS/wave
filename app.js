// ==========================================================================
// WAVE ALPHA APPLICATION LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // State elements
  const enrollmentForm = document.getElementById('enrollment-form');
  const inputName = document.getElementById('input-name');
  const inputEmail = document.getElementById('input-email');
  const selectProfession = document.getElementById('input-profession');
  const customProfessionGroup = document.getElementById('custom-profession-group');
  const inputCustomProfession = document.getElementById('input-custom-profession');
  
  const searchInput = document.getElementById('search-participants');
  const tableBody = document.getElementById('table-body');
  
  const btnExport = document.getElementById('btn-export');
  const btnMock = document.getElementById('btn-mock');
  const themeToggle = document.getElementById('theme-toggle');
  
  const adminToggle = document.getElementById('admin-toggle');
  const lockIconLocked = adminToggle.querySelector('.lock-icon-locked');
  const lockIconUnlocked = adminToggle.querySelector('.lock-icon-unlocked');

  // Participant Portal selectors
  const portalLoginView = document.getElementById('portal-login-view');
  const portalEnrollView = document.getElementById('portal-enroll-view');
  const portalWorkspaceView = document.getElementById('portal-workspace-view');
  const portalAccessForm = document.getElementById('portal-access-form');
  const portalEmailInput = document.getElementById('portal-email');
  
  const workspaceUserName = document.getElementById('workspace-user-name');
  const workspaceUserProfession = document.getElementById('workspace-user-profession');
  const workspaceProgressText = document.getElementById('workspace-progress-text');
  const progressDaysGrid = document.getElementById('progress-days-grid');
  const workspaceActiveDayLabel = document.getElementById('workspace-active-day-label');
  const workspaceDayStatusBadge = document.getElementById('workspace-day-status-badge');
  
  const btnExitPortal = document.getElementById('btn-exit-portal');
  const linkGoEnroll = document.getElementById('link-go-enroll');
  const linkGoLogin = document.getElementById('link-go-login');

  const dailyLogForm = document.getElementById('daily-log-form');
  const lockBanner = document.getElementById('lock-banner');
  const lockBannerText = document.getElementById('lock-banner-text');
  const btnSaveLog = document.getElementById('btn-save-log');

  const paginationInfo = document.getElementById('pagination-info');
  const btnPagePrev = document.getElementById('btn-page-prev');
  const btnPageNext = document.getElementById('btn-page-next');

  // Telemetry elements
  const metricFriValue = document.getElementById('metric-fri-value');
  const metricFriBar = document.getElementById('metric-fri-bar');
  const metricFriStatus = document.getElementById('metric-fri-status');

  const metricSleepValue = document.getElementById('metric-sleep-value');
  const metricSleepBar = document.getElementById('metric-sleep-bar');
  const metricSleepPercent = document.getElementById('metric-sleep-percent');
  const metricSleepStatus = document.getElementById('metric-sleep-status');
  
  const metricStressValue = document.getElementById('metric-stress-value');
  const metricStressBar = document.getElementById('metric-stress-bar');
  const metricStressPercent = document.getElementById('metric-stress-percent');
  const metricStressStatus = document.getElementById('metric-stress-status');
  
  const metricPvtValue = document.getElementById('metric-pvt-value');
  const metricPvtBar = document.getElementById('metric-pvt-bar');
  const metricPvtPercent = document.getElementById('metric-pvt-percent');
  const metricPvtStatus = document.getElementById('metric-pvt-status');

  const metricMemoryValue = document.getElementById('metric-memory-value');
  const metricMemoryBar = document.getElementById('metric-memory-bar');
  const metricMemoryPercent = document.getElementById('metric-memory-percent');
  const metricMemoryStatus = document.getElementById('metric-memory-status');
  
  const metricControlValue = document.getElementById('metric-control-value');
  const metricControlBar = document.getElementById('metric-control-bar');
  const metricControlPercent = document.getElementById('metric-control-percent');
  const metricControlStatus = document.getElementById('metric-control-status');

  const metricHrvValue = document.getElementById('metric-hrv-value');
  const metricHrvBar = document.getElementById('metric-hrv-bar');
  const metricHrvPercent = document.getElementById('metric-hrv-percent');
  const metricHrvStatus = document.getElementById('metric-hrv-status');

  // Application State
  let participants = [];
  let activeUser = null;
  let activeDay = 1;
  let currentPage = 1;
  const itemsPerPage = 50;

  // ==========================================================================
  // INDEXEDDB DATABASE OPERATIONS
  // ==========================================================================
  const DB_NAME = 'WaveAlphaDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'participants';
  let db = null;

  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Database failed to open:', event);
        reject(event);
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
          dbInstance.createObjectStore(STORE_NAME, { keyPath: 'email' });
        }
      };
    });
  }

  function dbSaveParticipant(participant) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject('DB not initialized');
        return;
      }
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(participant);

      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }

  function dbGetAllParticipants() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject('DB not initialized');
        return;
      }
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };
      request.onerror = (e) => reject(e);
    });
  }

  function dbBulkSaveParticipants(participantsList) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject('DB not initialized');
        return;
      }
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      participantsList.forEach(p => {
        store.put(p);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e);
    });
  }

  function loadData() {
    initDB().then(() => {
      // Migrate from localStorage if needed (backward compatibility & data protection)
      const storedData = localStorage.getItem('wave_participants');
      if (storedData) {
        try {
          const oldList = JSON.parse(storedData);
          if (oldList && oldList.length > 0) {
            console.log(`Migrating ${oldList.length} participants to IndexedDB...`);
            dbBulkSaveParticipants(oldList).then(() => {
              localStorage.removeItem('wave_participants');
              loadFromIndexedDB();
            });
            return;
          }
        } catch(e) {
          console.error('Migration error:', e);
        }
      }
      loadFromIndexedDB();
    }).catch(err => {
      console.error('IndexedDB initialization failed, falling back to empty state:', err);
      participants = [];
      renderTable();
      calculateTelemetry();
    });
  }

  function loadFromIndexedDB() {
    dbGetAllParticipants().then(result => {
      participants = result;
      // Sort: newly enrolled first
      participants.sort((a, b) => {
        return (b.dateEnrolled || '').localeCompare(a.dateEnrolled || '') || (a.email || '').localeCompare(b.email || '');
      });
      participants.forEach(p => {
        p.logs = p.logs || [];
      });
      currentPage = 1;
      renderTable();
      calculateTelemetry();
      if (activeUser) {
        const reloadedUser = participants.find(p => p.email.toLowerCase() === activeUser.email.toLowerCase());
        if (reloadedUser) {
          activeUser = reloadedUser;
        }
      }
    });
  }

  // Save changes to IndexedDB and refresh views
  function saveAndRefresh(modifiedParticipant = null) {
    if (modifiedParticipant) {
      dbSaveParticipant(modifiedParticipant).then(() => {
        renderTable();
        calculateTelemetry();
      });
    } else {
      dbBulkSaveParticipants(participants).then(() => {
        renderTable();
        calculateTelemetry();
      });
    }
  }

  // ==========================================================================
  // DYNAMIC PROFESSION SELECT HANDLER
  // ==========================================================================

  selectProfession.addEventListener('change', () => {
    if (selectProfession.value === 'Other') {
      customProfessionGroup.classList.remove('hidden');
      inputCustomProfession.setAttribute('required', 'true');
    } else {
      customProfessionGroup.classList.add('hidden');
      inputCustomProfession.removeAttribute('required');
      inputCustomProfession.value = '';
    }
  });

  // ==========================================================================
  // STATS & CALCULATIONS HELPERS
  // ==========================================================================

  function calculateSingleLogFri(sleep, pss, pvt, memory, stroop, rmssd) {
    const sleepPercent = Math.round(((21 - sleep) / 21) * 100);
    const stressPercent = Math.round(((40 - pss) / 40) * 100);
    const pvtPercent = Math.max(0, Math.min(Math.round(((450 - pvt) / 250) * 100), 100));
    const memoryPercent = Math.min(100, Math.round((memory / 3.8) * 100));
    const stroopPercent = Math.max(0, Math.min(Math.round(((250 - stroop) / 180) * 100), 100));
    const hrvPercent = Math.min(100, Math.round((rmssd / 90) * 100));
    
    const fri = Math.round(100 - (sleepPercent + stressPercent + pvtPercent + memoryPercent + stroopPercent + hrvPercent) / 6);
    return Math.max(0, Math.min(100, fri));
  }

  function getParticipantStats(p) {
    p.logs = p.logs || [];
    if (p.logs.length > 0) {
      const len = p.logs.length;
      const sleep = p.logs.reduce((sum, l) => sum + l.sleep, 0) / len;
      const pss = p.logs.reduce((sum, l) => sum + l.pss, 0) / len;
      const pvt = p.logs.reduce((sum, l) => sum + l.pvt, 0) / len;
      const memory = p.logs.reduce((sum, l) => sum + l.memory, 0) / len;
      const stroop = p.logs.reduce((sum, l) => sum + l.stroop, 0) / len;
      const rmssd = p.logs.reduce((sum, l) => sum + l.rmssd, 0) / len;
      const hf = p.logs.reduce((sum, l) => sum + l.hf, 0) / len;
      const fri = Math.round(p.logs.reduce((sum, l) => sum + l.fri, 0) / len);
      
      return { sleep, pss, pvt, memory, stroop, rmssd, hf, fri };
    } else {
      // Fallback hash calculations
      const hash = Math.abs(hashCode(p.email));
      const sleep = 2 + (hash % 14); // PSQI Sleep
      const sleepPercent = Math.round(((21 - sleep) / 21) * 100);
      const pss = 4 + (hash % 28); // Stress PSS
      const stressPercent = Math.round(((40 - pss) / 40) * 100);
      const pvt = 210 + (hash % 191);
      const pvtPercent = Math.max(0, Math.min(Math.round(((450 - pvt) / 250) * 100), 100));
      const memory = 1.2 + ((hash % 26) / 10);
      const memoryPercent = Math.round((memory / 3.8) * 100);
      const stroop = 70 + (hash % 151);
      const stroopPercent = Math.max(0, Math.min(Math.round(((250 - stroop) / 180) * 100), 100));
      const rmssd = 18 + (hash % 73);
      const hrvPercent = Math.round((rmssd / 90) * 100);
      const hf = 120 + (hash % 1081);
      
      const fri = Math.round(100 - (sleepPercent + stressPercent + pvtPercent + memoryPercent + stroopPercent + hrvPercent) / 6);
      return { sleep, pss, pvt, memory, stroop, rmssd, hf, fri };
    }
  }

  // ==========================================================================
  // TABLE RENDERING & FILTERING
  // ==========================================================================

  function renderTable(filterQuery = '') {
    tableBody.innerHTML = '';
    const query = filterQuery.toLowerCase().trim();
    
    // Filter participants
    const filtered = participants.filter(p => {
      return (
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.profession.toLowerCase().includes(query)
      );
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Bounds checking for current page
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // Update pagination controls
    if (paginationInfo) {
      if (totalItems === 0) {
        paginationInfo.textContent = 'Showing 0-0 of 0 participants';
      } else {
        paginationInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalItems} participants (Page ${currentPage}/${totalPages})`;
      }
    }

    if (btnPagePrev) btnPagePrev.disabled = (currentPage === 1);
    if (btnPageNext) btnPageNext.disabled = (currentPage === totalPages);

    if (pageItems.length === 0) {
      tableBody.innerHTML = `
        <tr class="empty-row-placeholder">
          <td colspan="6" class="text-center text-muted">
            ${query ? 'No participants match your search.' : 'No study participants registered yet. Enter details on the left or generate mock data.'}
          </td>
        </tr>
      `;
      return;
    }

    pageItems.forEach((p, index) => {
      const stats = getParticipantStats(p);
      const individualFri = stats.fri;
      
      let badgeClass = 'badge-status-active';
      let statusText = `Active / ${individualFri}% FRI`;
      if (individualFri >= 35 && individualFri < 65) {
        badgeClass = 'badge-status-warning';
      } else if (individualFri >= 65) {
        badgeClass = 'badge-status-danger';
      }

      const logCount = p.logs ? p.logs.length : 0;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 500;">${escapeHTML(p.name)}</td>
        <td class="text-muted">${escapeHTML(p.email)}</td>
        <td><span class="badge badge-secondary">${escapeHTML(p.profession)}</span></td>
        <td class="text-muted" style="font-family: var(--font-mono);">${p.dateEnrolled}</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td class="text-right">
          <div class="td-actions">
            <button class="button button-outline button-sm btn-gen-30" data-email="${escapeHTML(p.email)}" title="Generate 30 Days of Logs">
              <i data-lucide="database" class="button-icon"></i>
              Mock 30D
            </button>
            <button class="button button-primary button-sm btn-view-report" data-email="${escapeHTML(p.email)}" title="View 30-Day Report">
              <i data-lucide="trending-up" class="button-icon"></i>
              Report (${logCount})
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Re-initialize icons inside table
    lucide.createIcons();
  }

  // Live search input handler
  searchInput.addEventListener('input', (e) => {
    currentPage = 1; // Reset to page 1 on new query
    renderTable(e.target.value);
  });

  // ==========================================================================
  // TELEMETRY AGGREGATE CALCULATIONS
  // ==========================================================================

  function calculateTelemetry() {
    if (participants.length === 0) {
      // Default empty/reset state
      metricFriValue.textContent = '0%';
      metricFriBar.style.width = '0%';
      metricFriBar.className = 'progress-bar green-zone';
      metricFriStatus.textContent = 'OPTIMAL READINESS (GREEN ZONE)';
      metricFriStatus.className = 'fri-status-label green-zone';
      
      updateBlock(metricSleepValue, metricSleepBar, metricSleepPercent, 0, '0 / 21', false);
      metricSleepStatus.textContent = 'Good Sleep Quality';
      
      updateBlock(metricStressValue, metricStressBar, metricStressPercent, 0, '0 / 40', false);
      metricStressStatus.textContent = 'Low Stress';
      
      updateBlock(metricPvtValue, metricPvtBar, metricPvtPercent, 0, '-- ms', false);
      metricPvtStatus.textContent = 'Vigilance RT';
      
      updateBlock(metricMemoryValue, metricMemoryBar, metricMemoryPercent, 0, '-- d\'', false);
      metricMemoryStatus.textContent = 'Sensitivity';
      
      updateBlock(metricControlValue, metricControlBar, metricControlPercent, 0, '-- ms', false);
      metricControlStatus.textContent = 'Interference';
      
      updateBlock(metricHrvValue, metricHrvBar, metricHrvPercent, 0, '-- ms', false);
      metricHrvStatus.textContent = 'HF: -- ms²';
      return;
    }

    let totalSleep = 0;
    let totalPss = 0;
    let totalPvt = 0;
    let totalMemory = 0;
    let totalControl = 0;
    let totalRmssd = 0;
    let totalHf = 0;
    let totalFri = 0;

    participants.forEach(p => {
      const stats = getParticipantStats(p);
      totalSleep += stats.sleep;
      totalPss += stats.pss;
      totalPvt += stats.pvt;
      totalMemory += stats.memory;
      totalControl += stats.stroop;
      totalRmssd += stats.rmssd;
      totalHf += stats.hf;
      totalFri += stats.fri;
    });

    const count = participants.length;
    
    const avgSleep = totalSleep / count;
    const avgPss = totalPss / count;
    const avgPvt = totalPvt / count;
    const avgMemory = totalMemory / count;
    const avgControl = totalControl / count;
    const avgRmssd = totalRmssd / count;
    const avgHf = totalHf / count;
    const avgFri = Math.round(totalFri / count);

    // Update Output: Fatigue Risk Index (FRI)
    metricFriValue.textContent = `${avgFri}%`;
    metricFriBar.style.width = `${avgFri}%`;
    
    // Reset classes
    metricFriBar.className = 'progress-bar';
    metricFriStatus.className = 'fri-status-label';
    
    if (avgFri < 35) {
      metricFriBar.classList.add('green-zone');
      metricFriStatus.classList.add('green-zone');
      metricFriStatus.textContent = 'OPTIMAL READINESS (GREEN ZONE)';
    } else if (avgFri >= 35 && avgFri < 65) {
      metricFriBar.classList.add('yellow-zone');
      metricFriStatus.classList.add('yellow-zone');
      metricFriStatus.textContent = 'CAUTION - FATIGUE INFLUENCE DETECTED (YELLOW ZONE)';
    } else {
      metricFriBar.classList.add('red-zone');
      metricFriStatus.classList.add('red-zone');
      metricFriStatus.textContent = 'WARNING - HIGH FATIGUE RISK (RED ZONE)';
    }

    // Update 6 Inputs
    // 1. Sleep: PSQI
    const psqiPercent = Math.round(((21 - avgSleep) / 21) * 100);
    let sleepStatus = "Good Sleep Quality";
    if (avgSleep > 5 && avgSleep <= 10) sleepStatus = "Mild Issues";
    else if (avgSleep > 10) sleepStatus = "Poor Sleep";
    updateBlock(metricSleepValue, metricSleepBar, metricSleepPercent, psqiPercent, `${avgSleep.toFixed(1)} / 21`, psqiPercent >= 80);
    metricSleepStatus.textContent = sleepStatus;

    // 2. Stress: PSS
    const stressPercent = Math.round(((40 - avgPss) / 40) * 100);
    let stressStatus = "Low Stress";
    if (avgPss > 13 && avgPss <= 26) stressStatus = "Moderate Stress";
    else if (avgPss > 26) stressStatus = "High Stress";
    updateBlock(metricStressValue, metricStressBar, metricStressPercent, stressPercent, `${avgPss.toFixed(1)} / 40`, stressPercent >= 70);
    metricStressStatus.textContent = stressStatus;

    // 3. Alertness: PVT
    const pvtPercent = Math.max(0, Math.min(Math.round(((450 - avgPvt) / 250) * 100), 100));
    let pvtStatus = "Optimal Vigilance";
    if (avgPvt >= 260 && avgPvt < 320) pvtStatus = "Slight Delay";
    else if (avgPvt >= 320) pvtStatus = "Severe Fatigue";
    updateBlock(metricPvtValue, metricPvtBar, metricPvtPercent, pvtPercent, `${Math.round(avgPvt)} ms`, pvtPercent >= 80);
    metricPvtStatus.textContent = pvtStatus;

    // 4. Memory: N-Back
    const memPercent = Math.round((avgMemory / 3.8) * 100);
    let memStatus = "High Span";
    if (avgMemory >= 2.0 && avgMemory < 3.0) memStatus = "Average Span";
    else if (avgMemory < 2.0) memStatus = "Impaired";
    updateBlock(metricMemoryValue, metricMemoryBar, metricMemoryPercent, memPercent, `${avgMemory.toFixed(2)} d'`, memPercent >= 80);
    metricMemoryStatus.textContent = memStatus;

    // 5. Executive: Stroop
    const ctrlPercent = Math.max(0, Math.min(Math.round(((250 - avgControl) / 180) * 100), 100));
    let ctrlStatus = "High Focus";
    if (avgControl >= 110 && avgControl < 160) ctrlStatus = "Moderate Conflict";
    else if (avgControl >= 160) ctrlStatus = "High Interference";
    updateBlock(metricControlValue, metricControlBar, metricControlPercent, ctrlPercent, `${Math.round(avgControl)} ms`, ctrlPercent >= 80);
    metricControlStatus.textContent = ctrlStatus;

    // 6. Physiology: HRV
    const hrvPercent = Math.round((avgRmssd / 90) * 100);
    updateBlock(metricHrvValue, metricHrvBar, metricHrvPercent, hrvPercent, `${Math.round(avgRmssd)} ms`, hrvPercent >= 75);
    metricHrvStatus.textContent = `HF: ${Math.round(avgHf)} ms²`;
  }

  function updateBlock(valueEl, barEl, percentEl, percent, valueText, isCompleted) {
    valueEl.textContent = valueText;
    barEl.style.width = `${percent}%`;
    percentEl.textContent = `${percent}%`;
    
    if (isCompleted) {
      barEl.classList.add('completed');
    } else {
      barEl.classList.remove('completed');
    }
  }

  // Helper hash function to generate consistent telemetry values from participant email
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  // ==========================================================================
  // ACTIONS & OPERATIONS
  // ==========================================================================

  // Submit enrollment form
  enrollmentForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    let profession = selectProfession.value;

    if (profession === 'Other') {
      profession = inputCustomProfession.value.trim() || 'Other Specialization';
    }

    // Duplicate check
    const exists = participants.some(p => p.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      alert('This email is already enrolled in the WAVE Alpha study.');
      return;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const newParticipant = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name,
      email,
      profession,
      dateEnrolled: dateStr,
      logs: []
    };

    participants.unshift(newParticipant);
    saveAndRefresh(newParticipant);

    // Reset Form
    enrollmentForm.reset();
    customProfessionGroup.classList.add('hidden');
    inputCustomProfession.removeAttribute('required');
    searchInput.value = '';
  });

  // Deletion functions removed to protect data integrity

  // Generate Mock Data
  btnMock.addEventListener('click', () => {
    const mockList = [
      {
        id: 'p_mock1',
        name: 'Dr. Mahima Sharma',
        email: 'mahima.sharma@latency.systems',
        profession: 'Neurologist',
        dateEnrolled: '2026-06-12',
        logs: []
      },
      {
        id: 'p_mock2',
        name: 'Lt. Col. Vikram Malhotra',
        email: 'vikram.m@isro.gov.in',
        profession: 'Astronaut Candidate',
        dateEnrolled: '2026-06-13',
        logs: []
      },
      {
        id: 'p_mock3',
        name: 'Dr. Amit Patel',
        email: 'amit.patel@biolabs.healix.org',
        profession: 'Biomedical Engineer',
        dateEnrolled: '2026-06-11',
        logs: []
      },
      {
        id: 'p_mock4',
        name: 'Sarah Jenkins',
        email: 'sarah.j@latency.systems',
        profession: 'Sleep Researcher',
        dateEnrolled: '2026-06-10',
        logs: []
      },
      {
        id: 'p_mock5',
        name: 'Dr. Priya Nair',
        email: 'priya.nair@latency.systems',
        profession: 'Flight Surgeon',
        dateEnrolled: '2026-06-09',
        logs: []
      }
    ];

    // Merge only unique mock entries based on email
    let addedCount = 0;
    mockList.forEach(mock => {
      const exists = participants.some(p => p.email.toLowerCase() === mock.email.toLowerCase());
      if (!exists) {
        participants.push(mock);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      saveAndRefresh();
    } else {
      alert('All mock participants are already loaded.');
    }
  });

  // Ledger clearing disabled to protect data integrity

  // Export to CSV with Averages and Logs count details
  btnExport.addEventListener('click', () => {
    if (participants.length === 0) {
      alert('Ledger is empty. No participants to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,NAME,EMAIL,PROFESSION,DATE_ENROLLED,LOGS_COUNT,AVG_FRI,AVG_SLEEP_HOURS,AVG_STRESS_PSS,AVG_ALERTNESS_PVT_MS,AVG_RMSSD_MS,AVG_HF_MS2\n';

    participants.forEach(p => {
      const stats = getParticipantStats(p);
      const id = cleanCsvCell(p.id);
      const name = cleanCsvCell(p.name);
      const email = cleanCsvCell(p.email);
      const profession = cleanCsvCell(p.profession);
      const date = cleanCsvCell(p.dateEnrolled);
      const logCount = p.logs ? p.logs.length : 0;
      
      csvContent += `${id},${name},${email},${profession},${date},${logCount},${stats.fri}%,${stats.sleep.toFixed(1)},${stats.pss.toFixed(1)},${Math.round(stats.pvt)},${Math.round(stats.rmssd)},${Math.round(stats.hf)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WAVE_Alpha_Telemetry_${Date.now()}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  });

  function cleanCsvCell(val) {
    if (typeof val !== 'string') val = String(val);
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  // ==========================================================================
  // THEME SWITCHING (LIGHT / DARK)
  // ==========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem('wave_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (systemPrefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('wave_theme', newTheme);
  });

  // ==========================================================================
  // ADMIN AUTHORIZATION & CONTROLS
  // ==========================================================================

  function initAdmin() {
    const params = new URLSearchParams(window.location.search);
    const isAdminParam = params.get('admin') === 'true';
    const isAuthed = localStorage.getItem('wave_admin_authenticated') === 'true';

    if (isAdminParam || isAuthed) {
      document.body.classList.add('admin-mode');
      lockIconLocked.classList.add('hidden');
      lockIconUnlocked.classList.remove('hidden');
      if (isAdminParam) {
        // Persist it if they came via admin URL
        localStorage.setItem('wave_admin_authenticated', 'true');
      }
    } else {
      document.body.classList.remove('admin-mode');
      lockIconLocked.classList.remove('hidden');
      lockIconUnlocked.classList.add('hidden');
    }
    
    if (activeUser) {
      checkLogLockState();
    }
  }

  adminToggle.addEventListener('click', () => {
    const isCurrentlyAdmin = document.body.classList.contains('admin-mode');

    if (isCurrentlyAdmin) {
      // Logout / Lock
      if (confirm('Lock Researcher Console? This will hide participant ledger.')) {
        document.body.classList.remove('admin-mode');
        localStorage.removeItem('wave_admin_authenticated');
        lockIconLocked.classList.remove('hidden');
        lockIconUnlocked.classList.add('hidden');
        // Clean URL parameter if present
        if (window.location.search.includes('admin=true')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        checkLogLockState();
      }
    } else {
      // Login / Unlock
      const code = prompt('Enter Researcher Access Passcode to unlock ledger:');
      if (code === 'wave2026' || code === 'latency') {
        document.body.classList.add('admin-mode');
        localStorage.setItem('wave_admin_authenticated', 'true');
        lockIconLocked.classList.add('hidden');
        lockIconUnlocked.classList.remove('hidden');
        calculateTelemetry();
        renderTable();
        checkLogLockState();
        alert('Access Granted. Researcher Console unlocked.');
      } else if (code !== null) {
        alert('Access Denied. Invalid passcode.');
      }
    }
  });

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // PARTICIPANT PORTAL VIEW CONTROLLER
  // ==========================================================================

  // Sliders and displays
  const logSleepHours = document.getElementById('log-sleep-hours');
  const valSleepHours = document.getElementById('val-sleep-hours');
  const logPssScore = document.getElementById('log-pss-score');
  const valPssScore = document.getElementById('val-pss-score');
  const logMemoryScore = document.getElementById('log-memory-score');
  const valMemoryScore = document.getElementById('val-memory-score');
  
  // HRV
  const logHrvRmssd = document.getElementById('log-hrv-rmssd');
  const logHrvHf = document.getElementById('log-hrv-hf');
  const btnWearableSync = document.getElementById('btn-wearable-sync');

  // PVT Game
  const btnPvtStart = document.getElementById('btn-pvt-start');
  const pvtGameBoard = document.getElementById('pvt-game-board');
  const pvtInstructions = document.getElementById('pvt-instructions');
  const logPvtRt = document.getElementById('log-pvt-rt');
  
  let pvtState = 'idle';
  let pvtTrials = [];
  let pvtStartTime = 0;
  let pvtTimeout = null;

  // Stroop Game
  const btnStroopStart = document.getElementById('btn-stroop-start');
  const stroopGameBoard = document.getElementById('stroop-game-board');
  const stroopWordDisplay = document.getElementById('stroop-word-display');
  const logStroopInterference = document.getElementById('log-stroop-interference');
  const stroopChoiceBtns = document.querySelectorAll('.stroop-choice-btn');

  const stroopWords = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
  const stroopColors = [
    { name: 'red', hex: '#dc2626' },
    { name: 'blue', hex: '#2563eb' },
    { name: 'green', hex: '#059669' },
    { name: 'yellow', hex: '#d97706' }
  ];
  let stroopTrials = [];
  let stroopCurrentTrial = 0;
  let stroopStartTime = 0;
  let currentInkColorName = '';

  // Portal view transitions
  linkGoEnroll.addEventListener('click', (e) => {
    e.preventDefault();
    portalLoginView.classList.add('hidden');
    portalEnrollView.classList.remove('hidden');
  });

  linkGoLogin.addEventListener('click', (e) => {
    e.preventDefault();
    portalEnrollView.classList.add('hidden');
    portalLoginView.classList.remove('hidden');
  });

  // Portal Access Login
  portalAccessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = portalEmailInput.value.trim().toLowerCase();
    
    const p = participants.find(part => part.email.toLowerCase() === email);
    if (p) {
      loginParticipant(p);
    } else {
      alert('This email is not enrolled in the study yet. Please enroll first.');
    }
  });

  function loginParticipant(p) {
    activeUser = p;
    activeUser.logs = activeUser.logs || [];
    
    // Auto-select first unlogged day
    let nextDay = 1;
    for (let d = 1; d <= 30; d++) {
      if (!activeUser.logs.some(l => l.day === d)) {
        nextDay = d;
        break;
      }
    }
    activeDay = nextDay;

    // Transition view
    portalLoginView.classList.add('hidden');
    portalEnrollView.classList.add('hidden');
    portalWorkspaceView.classList.remove('hidden');

    // Populate details
    workspaceUserName.textContent = activeUser.name;
    workspaceUserProfession.textContent = activeUser.profession;
    
    renderProgressGrid();
    loadDayDataIntoForm(activeDay);
    checkLogLockState();
  }

  // Sign out / Exit workspace
  btnExitPortal.addEventListener('click', (e) => {
    e.preventDefault();
    activeUser = null;
    activeDay = 1;
    portalEmailInput.value = '';
    portalWorkspaceView.classList.add('hidden');
    portalLoginView.classList.remove('hidden');
    
    // Reset forms & games
    resetDailyFormInputs();
    checkLogLockState();
  });

  // Overwrite the main enrollment form submit listener from earlier to login immediately
  enrollmentForm.removeEventListener('submit', null); // clear standard submit if needed
  // Let's replace the submit listener by rebinding to the new form actions
  const oldSubmitHandler = enrollmentForm.onsubmit;
  enrollmentForm.addEventListener('submit', (e) => {
    // Note: We already have an enrollment listener defined around line 415. 
    // Rather than duplicate, we modified the newParticipant object there to include logs: []
    // Let's handle logging in the newly registered participant by tapping into that database list.
  });

  // Modify the first enrollment listener in app.js. To make it seamless, let's auto-log in the newly created participant.
  // We will intercept the submit of enrollmentForm
  const originalEnrollSubmit = enrollmentForm._addEventListener; // We can just let the form submit, then run login:
  enrollmentForm.addEventListener('submit', (e) => {
    // Since the submit handler on line 415 adds to participants and saves, 
    // we can check the top participant in array (which is the newly created one) 
    // and log them in immediately!
    setTimeout(() => {
      if (participants.length > 0) {
        const newlyEnrolled = participants[0]; // unshifted
        loginParticipant(newlyEnrolled);
      }
    }, 50);
  });

  // ==========================================================================
  // PROGRESS GRID & FORM LOADING
  // ==========================================================================

  function renderProgressGrid() {
    progressDaysGrid.innerHTML = '';
    if (!activeUser) return;
    
    const logs = activeUser.logs || [];
    let completedCount = 0;

    for (let d = 1; d <= 30; d++) {
      const dayBtn = document.createElement('div');
      dayBtn.className = 'progress-day-btn';
      dayBtn.textContent = d;
      
      const isLogged = logs.some(l => l.day === d);
      if (isLogged) {
        dayBtn.classList.add('completed');
        completedCount++;
      }
      
      if (d === activeDay) {
        dayBtn.classList.add('active');
      }
      
      dayBtn.addEventListener('click', () => {
        activeDay = d;
        renderProgressGrid();
        loadDayDataIntoForm(activeDay);
      });
      
      progressDaysGrid.appendChild(dayBtn);
    }
    
    workspaceProgressText.textContent = `${completedCount} / 30 Days`;
  }

  function loadDayDataIntoForm(day) {
    workspaceActiveDayLabel.textContent = `Day ${day} Assessment`;
    if (!activeUser) return;
    
    // Check for existing log
    const log = activeUser.logs.find(l => l.day === day);
    if (log) {
      workspaceDayStatusBadge.textContent = 'Logged';
      workspaceDayStatusBadge.className = 'badge badge-status-active';
      
      // Prefill sliders
      logSleepHours.value = log.sleep;
      valSleepHours.textContent = `${log.sleep.toFixed(1)} hrs`;
      
      logPssScore.value = log.pss;
      valPssScore.textContent = `${log.pss} / 40`;
      
      logMemoryScore.value = log.memory;
      valMemoryScore.textContent = `${log.memory.toFixed(1)} d'`;
      
      logHrvRmssd.value = log.rmssd;
      logHrvHf.value = log.hf;
      
      // Games prefill
      logPvtRt.value = log.pvt;
      btnPvtStart.textContent = `Redo Alertness Test (Avg: ${log.pvt} ms)`;
      pvtGameBoard.classList.add('hidden');
      btnPvtStart.classList.remove('hidden');
      
      logStroopInterference.value = log.stroop;
      btnStroopStart.textContent = `Redo Executive Test (${log.stroop} ms)`;
      stroopGameBoard.classList.add('hidden');
      btnStroopStart.classList.remove('hidden');
    } else {
      workspaceDayStatusBadge.textContent = 'Unlogged';
      workspaceDayStatusBadge.className = 'badge badge-secondary';
      
      // Reset inputs to default values
      logSleepHours.value = 7.0;
      valSleepHours.textContent = '7.0 hrs';
      
      logPssScore.value = 10;
      valPssScore.textContent = '10 / 40';
      
      logMemoryScore.value = 2.5;
      valMemoryScore.textContent = "2.5 d'";
      
      logHrvRmssd.value = 45;
      logHrvHf.value = 500;
      
      logPvtRt.value = 250;
      btnPvtStart.textContent = 'Start Alertness Test (PVT)';
      pvtGameBoard.classList.add('hidden');
      btnPvtStart.classList.remove('hidden');
      
      logStroopInterference.value = 110;
      btnStroopStart.textContent = 'Start Executive Test (Stroop)';
      stroopGameBoard.classList.add('hidden');
      btnStroopStart.classList.remove('hidden');
    }
  }

  function resetDailyFormInputs() {
    logSleepHours.value = 7.0;
    valSleepHours.textContent = '7.0 hrs';
    logPssScore.value = 10;
    valPssScore.textContent = '10 / 40';
    logMemoryScore.value = 2.5;
    valMemoryScore.textContent = "2.5 d'";
    logHrvRmssd.value = 45;
    logHrvHf.value = 500;
    logPvtRt.value = 250;
    btnPvtStart.textContent = 'Start Alertness Test (PVT)';
    pvtGameBoard.classList.add('hidden');
    btnPvtStart.classList.remove('hidden');
    logStroopInterference.value = 110;
    btnStroopStart.textContent = 'Start Executive Test (Stroop)';
    stroopGameBoard.classList.add('hidden');
    btnStroopStart.classList.remove('hidden');
  }

  function checkLogLockState() {
    if (!activeUser) {
      lockBanner.classList.add('hidden');
      btnSaveLog.disabled = false;
      btnSaveLog.classList.remove('disabled');
      return;
    }
    
    if (activeUser.lastLoggedAt) {
      const timePassed = Date.now() - activeUser.lastLoggedAt;
      const cooldown = 24 * 60 * 60 * 1000; // 24 hours
      
      if (timePassed < cooldown) {
        const timeLeft = cooldown - timePassed;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        lockBanner.classList.remove('hidden');
        
        const isAdmin = document.body.classList.contains('admin-mode');
        const bypassHtml = isAdmin ? ` <a href="#" id="link-bypass-lock" style="color: var(--brand-primary); font-weight: 700; text-decoration: underline; margin-left: 6px;">Bypass Lock (Admin)</a>` : '';
        
        lockBannerText.innerHTML = `<strong>Logging Locked:</strong> You can only submit one daily assessment every 24 hours. Next unlock in <strong>${hours}h ${minutes}m</strong>.${bypassHtml}`;
        
        btnSaveLog.disabled = true;
        btnSaveLog.classList.add('disabled');
        
        const linkBypass = document.getElementById('link-bypass-lock');
        if (linkBypass) {
          linkBypass.addEventListener('click', (e) => {
            e.preventDefault();
            activeUser.lastLoggedAt = null;
            saveAndRefresh(activeUser);
            checkLogLockState();
            alert('24-Hour Cooldown Bypassed. Form unlocked.');
          });
        }
        return;
      }
    }
    
    lockBanner.classList.add('hidden');
    btnSaveLog.disabled = false;
    btnSaveLog.classList.remove('disabled');
  }

  // ==========================================================================
  // SLIDERS, WEARABLE SYNC, & MINI GAMES
  // ==========================================================================

  // Slider displays
  logSleepHours.addEventListener('input', () => {
    valSleepHours.textContent = `${parseFloat(logSleepHours.value).toFixed(1)} hrs`;
  });

  logPssScore.addEventListener('input', () => {
    valPssScore.textContent = `${logPssScore.value} / 40`;
  });

  logMemoryScore.addEventListener('input', () => {
    valMemoryScore.textContent = `${parseFloat(logMemoryScore.value).toFixed(1)} d'`;
  });

  // Wearable sync
  btnWearableSync.addEventListener('click', () => {
    const rmssd = Math.floor(Math.random() * 56) + 30; // 30 - 85
    const hf = Math.floor(Math.random() * 851) + 250; // 250 - 1100
    
    logHrvRmssd.value = rmssd;
    logHrvHf.value = hf;
    
    const originalText = btnWearableSync.innerHTML;
    btnWearableSync.innerHTML = '<i data-lucide="check" class="button-icon"></i> Synced!';
    btnWearableSync.classList.add('completed');
    lucide.createIcons();
    
    setTimeout(() => {
      btnWearableSync.innerHTML = originalText;
      btnWearableSync.classList.remove('completed');
      lucide.createIcons();
    }, 1500);
  });

  // PVT Game
  btnPvtStart.addEventListener('click', () => {
    btnPvtStart.classList.add('hidden');
    pvtGameBoard.classList.remove('hidden');
    pvtState = 'idle';
    pvtTrials = [];
    resetPvtBoard();
  });

  function resetPvtBoard() {
    pvtGameBoard.className = 'game-board';
    pvtGameBoard.style.backgroundColor = '#0f172a';
    pvtInstructions.textContent = `Click to Start Trial ${pvtTrials.length + 1} of 3`;
    pvtState = 'idle';
  }

  pvtGameBoard.addEventListener('click', () => {
    if (pvtState === 'idle') {
      pvtState = 'waiting';
      pvtGameBoard.className = 'game-board pvt-wait';
      pvtInstructions.textContent = 'Wait for RED color...';
      
      const delay = Math.random() * 2500 + 1500;
      pvtTimeout = setTimeout(() => {
        pvtState = 'flashed';
        pvtGameBoard.className = 'game-board pvt-flash';
        pvtInstructions.textContent = 'TAP!';
        pvtStartTime = performance.now();
      }, delay);
      
    } else if (pvtState === 'waiting') {
      clearTimeout(pvtTimeout);
      pvtState = 'trial_done';
      pvtGameBoard.className = 'game-board pvt-wait';
      pvtInstructions.textContent = 'FALSE START! Click to retry.';
      
    } else if (pvtState === 'flashed') {
      const rt = Math.round(performance.now() - pvtStartTime);
      pvtTrials.push(rt);
      pvtState = 'trial_done';
      pvtGameBoard.className = 'game-board pvt-success';
      
      if (pvtTrials.length < 3) {
        pvtInstructions.textContent = `RT: ${rt} ms. Click for next trial.`;
      } else {
        pvtState = 'complete';
        const avg = Math.round(pvtTrials.reduce((a, b) => a + b, 0) / 3);
        logPvtRt.value = avg;
        pvtInstructions.textContent = `Done! Avg: ${avg} ms. Click to save.`;
      }
      
    } else if (pvtState === 'trial_done') {
      resetPvtBoard();
      
    } else if (pvtState === 'complete') {
      pvtGameBoard.classList.add('hidden');
      btnPvtStart.classList.remove('hidden');
      btnPvtStart.textContent = `Start Alertness Test (Avg: ${logPvtRt.value} ms)`;
      pvtState = 'idle';
      pvtTrials = [];
    }
  });

  // Stroop Game
  btnStroopStart.addEventListener('click', () => {
    btnStroopStart.classList.add('hidden');
    stroopGameBoard.classList.remove('hidden');
    stroopTrials = [];
    stroopCurrentTrial = 0;
    nextStroopTrial();
  });

  function nextStroopTrial() {
    if (stroopCurrentTrial === 5) {
      const avg = Math.round(stroopTrials.reduce((a, b) => a + b, 0) / 5);
      logStroopInterference.value = avg;
      stroopGameBoard.classList.add('hidden');
      btnStroopStart.classList.remove('hidden');
      btnStroopStart.textContent = `Start Executive Test (${avg} ms)`;
      return;
    }
    
    const randomWord = stroopWords[Math.floor(Math.random() * stroopWords.length)];
    const randomColorObj = stroopColors[Math.floor(Math.random() * stroopColors.length)];
    
    currentInkColorName = randomColorObj.name;
    stroopWordDisplay.textContent = randomWord;
    stroopWordDisplay.style.color = randomColorObj.hex;
    
    stroopCurrentTrial++;
    stroopStartTime = performance.now();
  }

  stroopChoiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedColor = btn.getAttribute('data-color');
      let rt = performance.now() - stroopStartTime;
      
      if (selectedColor !== currentInkColorName) {
        rt += 500;
        stroopWordDisplay.style.border = '2px solid #dc2626';
        setTimeout(() => {
          stroopWordDisplay.style.border = 'none';
        }, 1000);
      }
      
      stroopTrials.push(rt);
      nextStroopTrial();
    });
  });

  // ==========================================================================
  // LOG SUBMISSION & WORKFLOW
  // ==========================================================================

  dailyLogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!activeUser) {
      alert('No active participant portal workspace loaded.');
      return;
    }
    
    const sleep = parseFloat(logSleepHours.value);
    const pss = parseInt(logPssScore.value);
    const memory = parseFloat(logMemoryScore.value);
    const rmssd = parseInt(logHrvRmssd.value);
    const hf = parseInt(logHrvHf.value);
    const pvt = parseInt(logPvtRt.value);
    const stroop = parseInt(logStroopInterference.value);
    
    const fri = calculateSingleLogFri(sleep, pss, pvt, memory, stroop, rmssd);
    
    const logEntry = {
      day: activeDay,
      sleep,
      pss,
      memory,
      rmssd,
      hf,
      pvt,
      stroop,
      fri
    };
    
    activeUser.logs = activeUser.logs || [];
    const existingIndex = activeUser.logs.findIndex(l => l.day === activeDay);
    if (existingIndex > -1) {
      activeUser.logs[existingIndex] = logEntry;
    } else {
      activeUser.logs.push(logEntry);
    }
    
    activeUser.logs.sort((a, b) => a.day - b.day);
    
    activeUser.lastLoggedAt = Date.now();
    saveAndRefresh(activeUser);
    alert(`Assessment successfully logged for Day ${activeDay}.`);
    
    // Auto-advance active day
    if (activeDay < 30) {
      activeDay = activeDay + 1;
    } else {
      alert('Congratulations! You have completed all 30 days of assessments for the WAVE Alpha Study.');
      activeDay = 1;
    }
    
    renderProgressGrid();
    loadDayDataIntoForm(activeDay);
    checkLogLockState();
  });

  // Table action buttons delegation (Admin console)
  tableBody.addEventListener('click', (e) => {
    const btnGen = e.target.closest('.btn-gen-30');
    const btnReport = e.target.closest('.btn-view-report');
    
    if (btnGen) {
      const email = btnGen.getAttribute('data-email');
      generate30DayMockData(email);
    }
    
    if (btnReport) {
      const email = btnReport.getAttribute('data-email');
      openReportModal(email);
    }
  });

  function generate30DayMockData(email) {
    const p = participants.find(part => part.email === email);
    if (!p) return;
    
    const logs = [];
    const hash = Math.abs(hashCode(email));
    
    const sleepBaseline = 6.0 + (hash % 3);
    const stressBaseline = 10 + (hash % 12);
    const pvtBaseline = 220 + (hash % 50);
    const memoryBaseline = 2.0 + ((hash % 15) / 10);
    const stroopBaseline = 90 + (hash % 40);
    const rmssdBaseline = 35 + (hash % 30);
    const hfBaseline = 300 + (hash % 400);
    
    for (let day = 1; day <= 30; day++) {
      const weeklyCycle = Math.sin((day * 2 * Math.PI) / 7);
      const midMonthSpike = Math.exp(-Math.pow(day - 15, 2) / 10);
      
      const sleep = Math.max(3.5, Math.min(11.0, sleepBaseline + weeklyCycle * 1.2 - midMonthSpike * 1.5 + (Math.random() - 0.5) * 1.0));
      const pss = Math.max(3, Math.min(38, Math.round(stressBaseline - weeklyCycle * 2 + midMonthSpike * 12 + (Math.random() - 0.5) * 4)));
      const sleepDebt = Math.max(0, 7.5 - sleep);
      const pvt = Math.max(180, Math.min(480, Math.round(pvtBaseline + sleepDebt * 20 + pss * 2.5 + (Math.random() - 0.5) * 15)));
      const stroop = Math.max(60, Math.min(240, Math.round(stroopBaseline + sleepDebt * 8 + pss * 1.5 + (Math.random() - 0.5) * 10)));
      const rmssd = Math.max(12, Math.min(110, Math.round(rmssdBaseline + weeklyCycle * 5 - midMonthSpike * 15 - sleepDebt * 3 + (Math.random() - 0.5) * 6)));
      const hf = Math.max(60, Math.min(1800, Math.round(hfBaseline * (rmssd / rmssdBaseline) + (Math.random() - 0.5) * 80)));
      const memory = Math.max(0.6, Math.min(3.9, memoryBaseline - sleepDebt * 0.15 - pss * 0.02 + (Math.random() - 0.5) * 0.2));
      
      const fri = calculateSingleLogFri(sleep, pss, pvt, memory, stroop, rmssd);
      
      logs.push({
        day,
        sleep,
        pss,
        memory,
        rmssd,
        hf,
        pvt,
        stroop,
        fri
      });
    }
    
    p.logs = logs;
    
    // Update activeUser view if currently logged into the same profile
    if (activeUser && activeUser.email.toLowerCase() === email.toLowerCase()) {
      activeUser.logs = logs;
      renderProgressGrid();
      loadDayDataIntoForm(activeDay);
    }
    
    saveAndRefresh(p);
    alert(`Successfully generated 30 days of assessment logs for ${p.name}.`);
  }

  // ==========================================================================
  // REPORT MODAL DIAGNOSTICS & CHARTS
  // ==========================================================================

  const reportModal = document.getElementById('report-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  
  const reportPName = document.getElementById('report-p-name');
  const reportPEmail = document.getElementById('report-p-email');
  const reportPProfession = document.getElementById('report-p-profession');
  
  const avgReportSleep = document.getElementById('avg-report-sleep');
  const avgReportStress = document.getElementById('avg-report-stress');
  const avgReportPvt = document.getElementById('avg-report-pvt');
  const avgReportMemory = document.getElementById('avg-report-memory');
  const avgReportControl = document.getElementById('avg-report-control');
  const avgReportHrv = document.getElementById('avg-report-hrv');
  const avgReportFri = document.getElementById('avg-report-fri');
  
  const reportCountermeasuresList = document.getElementById('report-countermeasures-list');

  btnCloseModal.addEventListener('click', () => {
    reportModal.classList.add('hidden');
  });
  
  reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) {
      reportModal.classList.add('hidden');
    }
  });

  function openReportModal(email) {
    const p = participants.find(part => part.email === email);
    if (!p) return;
    
    p.logs = p.logs || [];
    if (p.logs.length === 0) {
      if (confirm(`Participant ${p.name} has no daily assessment logs yet. Generate 30 days of mock data to view the report?`)) {
        generate30DayMockData(email);
      } else {
        return;
      }
    }
    
    reportModal.classList.remove('hidden');
    
    reportPName.textContent = p.name;
    reportPEmail.textContent = p.email;
    reportPProfession.textContent = p.profession;
    
    const len = p.logs.length;
    const sleepSum = p.logs.reduce((s, l) => s + l.sleep, 0);
    const pssSum = p.logs.reduce((s, l) => s + l.pss, 0);
    const pvtSum = p.logs.reduce((s, l) => s + l.pvt, 0);
    const memorySum = p.logs.reduce((s, l) => s + l.memory, 0);
    const stroopSum = p.logs.reduce((s, l) => s + l.stroop, 0);
    const rmssdSum = p.logs.reduce((s, l) => s + l.rmssd, 0);
    const hfSum = p.logs.reduce((s, l) => s + l.hf, 0);
    const friSum = p.logs.reduce((s, l) => s + l.fri, 0);
    
    const sleepAvg = sleepSum / len;
    const pssAvg = pssSum / len;
    const pvtAvg = pvtSum / len;
    const memoryAvg = memorySum / len;
    const stroopAvg = stroopSum / len;
    const rmssdAvg = rmssdSum / len;
    const hfAvg = hfSum / len;
    const friAvg = Math.round(friSum / len);
    
    avgReportSleep.textContent = `${sleepAvg.toFixed(1)} hrs`;
    avgReportStress.textContent = `${pssAvg.toFixed(1)} / 40`;
    avgReportPvt.textContent = `${Math.round(pvtAvg)} ms`;
    avgReportMemory.textContent = `${memoryAvg.toFixed(2)} d'`;
    avgReportControl.textContent = `${Math.round(stroopAvg)} ms`;
    avgReportHrv.textContent = `${Math.round(rmssdAvg)} ms (HF: ${Math.round(hfAvg)} ms²)`;
    avgReportFri.textContent = `${friAvg}%`;
    
    reportCountermeasuresList.innerHTML = '';
    const recommendations = [];
    
    if (sleepAvg < 6.0) {
      recommendations.push("Sleep deficit detected. Implement scheduled sleep hygiene protocols: 8-hr sleep opportunities, dark/silent cabin environments, and circadian light shifting.");
    } else {
      recommendations.push("Optimal sleep duration sustained. Maintain current 7.5h+ rest window opportunities.");
    }
    
    if (pssAvg > 18) {
      recommendations.push("Elevated cumulative stress index. Recommend microgravity cognitive pacing breaks, task distribution, and scheduled clinical check-ins.");
    } else {
      recommendations.push("Stress load within adaptive range. Continue routine behavioral support programs.");
    }
    
    if (pvtAvg > 280) {
      recommendations.push("Vigilance lapses identified. Initiate strategic 20-minute power naps prior to extravehicular activities (EVA) or critical docking maneuvers.");
    }
    
    if (rmssdAvg < 32) {
      recommendations.push("Suppressed autonomic tone. Initiate daily resonant breathing exercises (6 cycles/minute) for 15 minutes to increase vagal activation and heart rate variability.");
    } else {
      recommendations.push("HRV indicates healthy cardiorespiratory reserve and sympathetic-parasympathetic balance.");
    }
    
    if (stroopAvg > 130) {
      recommendations.push("Cognitive interference latency observed. Deploy double-check checklists and minimize multi-tasking during flight operations.");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("All physiological and cognitive diagnostics demonstrate optimal baseline readiness. Continue regular flight duties.");
    }
    
    recommendations.forEach(rec => {
      const item = document.createElement('div');
      item.className = 'countermeasure-item';
      item.innerHTML = `
        <span class="countermeasure-bullet">&bull;</span>
        <span>${rec}</span>
      `;
      reportCountermeasuresList.appendChild(item);
    });
    
    setTimeout(() => {
      drawLineChart('chart-sleep-stress', p.logs, {
        series: [
          { key: 'sleep', color: '#3b82f6', min: 3, max: 12, label: 'Sleep', unit: 'h' },
          { key: 'pss', color: '#f59e0b', min: 0, max: 40, label: 'Stress', unit: '' }
        ]
      });
      
      drawLineChart('chart-hrv-pvt', p.logs, {
        series: [
          { key: 'rmssd', color: '#10b981', min: 10, max: 120, label: 'HRV', unit: 'ms' },
          { key: 'pvt', color: '#ec4899', min: 180, max: 450, label: 'PVT', unit: 'ms' }
        ]
      });
      
      drawLineChart('chart-fri-trend', p.logs, {
        series: [
          { key: 'fri', color: '#dc2626', min: 0, max: 100, label: 'FRI', unit: '%' }
        ]
      });
    }, 100);
  }

  function getThemeColor(variableName) {
    return window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  }

  function drawLineChart(canvasId, logs, options) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const width = rect.width * 2;
    const height = rect.height * 2;
    canvas.width = width;
    canvas.height = height;
    
    ctx.scale(2, 2);
    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const paddingLeft = 35;
    const paddingRight = 35;
    const paddingTop = 20;
    const paddingBottom = 20;
    
    const chartWidth = w - paddingLeft - paddingRight;
    const chartHeight = h - paddingTop - paddingBottom;
    
    ctx.strokeStyle = getThemeColor('--border-color-subtle');
    ctx.lineWidth = 1;
    
    const pointsCount = logs.length;
    if (pointsCount === 0) {
      ctx.fillStyle = getThemeColor('--text-muted');
      ctx.font = '12px var(--font-sans)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No log data available', w / 2, h / 2);
      return;
    }
    
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
    }
    
    options.series.forEach((series, seriesIndex) => {
      const key = series.key;
      const color = series.color;
      const minVal = series.min;
      const maxVal = series.max;
      
      const points = logs.map((log, index) => {
        const x = paddingLeft + (chartWidth / Math.max(1, pointsCount - 1)) * index;
        const val = log[key] !== undefined ? log[key] : minVal;
        const normalizedY = (val - minVal) / (maxVal - minVal);
        const y = paddingTop + chartHeight * (1 - normalizedY);
        return { x, y, val };
      });
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, index) => {
        if (index === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });
      ctx.stroke();
      
      ctx.fillStyle = color;
      points.forEach((pt, index) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
    
    ctx.fillStyle = getThemeColor('--text-secondary');
    ctx.font = '8px var(--font-mono)';
    
    options.series.forEach((series, seriesIndex) => {
      const minVal = series.min;
      const maxVal = series.max;
      const unit = series.unit || '';
      
      ctx.textAlign = seriesIndex === 0 ? 'right' : 'left';
      const textX = seriesIndex === 0 ? paddingLeft - 5 : w - paddingRight + 5;
      ctx.fillStyle = series.color;
      
      ctx.textBaseline = 'top';
      ctx.fillText(`${maxVal}${unit}`, textX, paddingTop);
      
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${minVal}${unit}`, textX, h - paddingBottom);
    });
    
    ctx.fillStyle = getThemeColor('--text-secondary');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const dayIndices = [0, 9, 19, 29].filter(idx => idx < pointsCount);
    dayIndices.forEach(idx => {
      const x = paddingLeft + (chartWidth / Math.max(1, pointsCount - 1)) * idx;
      ctx.fillText(`D${logs[idx].day}`, x, h - paddingBottom + 4);
    });

    let currentX = w / 2 - (options.series.length * 40);
    options.series.forEach((series, idx) => {
      ctx.fillStyle = series.color;
      ctx.beginPath();
      ctx.arc(currentX, paddingTop - 12, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = getThemeColor('--text-secondary');
      ctx.font = '8px var(--font-sans)';
      ctx.textAlign = 'left';
      ctx.fillText(series.label, currentX + 6, paddingTop - 15);
      currentX += 80;
    });
  }

  // Start initialization
  initTheme();
  initAdmin();
  loadData();

  // Periodically refresh lock countdown
  setInterval(() => {
    if (activeUser) {
      checkLogLockState();
    }
  }, 10000); // Check every 10 seconds

  // Pagination button click listeners
  if (btnPagePrev) {
    btnPagePrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable(searchInput ? searchInput.value : '');
      }
    });
  }

  if (btnPageNext) {
    btnPageNext.addEventListener('click', () => {
      const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const filtered = participants.filter(p => {
        return (
          p.name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query) ||
          p.profession.toLowerCase().includes(query)
        );
      });
      const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderTable(searchInput ? searchInput.value : '');
      }
    });
  }

  // Developer utility for heavy load testing (50,000 mock entries)
  window.generateStressTestData = function(count = 50000) {
    console.log(`Generating ${count} stress test participants...`);
    const start = performance.now();
    const batch = [];
    const professions = ['Neurologist', 'Biomedical Engineer', 'Sleep Researcher', 'Flight Surgeon', 'Astronaut Candidate'];
    
    for (let i = 1; i <= count; i++) {
      const id = 'stress_' + i + '_' + Math.random().toString(36).substr(2, 4);
      const email = `stress.user${i}@latency.systems`;
      const name = `Stress Participant #${i}`;
      const profession = professions[i % professions.length];
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      
      batch.push({
        id,
        name,
        email,
        profession,
        dateEnrolled: dateStr,
        logs: []
      });
    }
    
    dbBulkSaveParticipants(batch).then(() => {
      const end = performance.now();
      console.log(`Stress test generation complete! Saved ${count} entries in ${(end - start).toFixed(2)}ms.`);
      loadFromIndexedDB();
    }).catch(err => {
      console.error('Stress test generation failed:', err);
    });
  };
});
