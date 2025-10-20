// Status helper functions
function statusClass(status) {
    status = (status || '').toLowerCase();
    if (status === 'error') return 'card-status-error';
    if (status === 'ready') return 'card-status-ready';
    if (status === 'busy' || status === 'running') return 'card-status-running';  // Changed to yellow
    return '';
}

function statusBadgeClass(status) {
    status = (status || '').toLowerCase();
    if (status === 'error') return 'status-badge-error';
    if (status === 'ready') return 'status-badge-ready';
    if (status === 'busy' || status === 'running') return 'status-badge-running';
    return '';
}

// Main function to render units
function renderUnits(units) {
    const container = document.getElementById('units-container');
    container.innerHTML = '';
    
    units.forEach(unit => {
        const statusClass = this.statusClass(unit.status);
        const statusBadgeClass = this.statusBadgeClass(unit.status);
        
        const card = document.createElement('div');
        card.className = `unit-card ${statusClass} position-relative`;
        card.dataset.unitId = unit.redis_key;
        
        // Create title based on whether tag exists
        let cardTitle = '';
        if (unit.tag && unit.tag !== '-') {
            cardTitle = `${unit.tag} - ${unit.redis_key || ''}`;
        } else {
            cardTitle = unit.redis_key || '';
        }

        console.log(unit);
        // Inject once: compact font & chart styles (better consistency, fewer inline font-size declarations)
        if (!document.getElementById('tuscChartStyles')) {
            document.head.insertAdjacentHTML('beforeend', `
            <style id="tuscChartStyles">
            :root {
                --tusc-font-xs: .70rem;
                --tusc-font-sm: .75rem;
                --tusc-font-base: .80rem;
                --tusc-font-lg: .95rem;
            }
            .tusc-chart-wrap {display:flex; flex-direction:column; align-items:center; margin-top:6px; gap:10px;}
            .tusc-chart {width:140px; height:140px; border-radius:50%; position:relative; margin:0 auto;}
            .tusc-chart-inner {
                position:absolute; inset:18px; background:#1e1e1e; border-radius:50%;
                display:flex; align-items:center; justify-content:center;
                font-size:var(--tusc-font-xs); font-weight:600; letter-spacing:.5px;
            }
            .tusc-legend {
                font-size: var(--tusc-font-sm);
                line-height: 1.2;
                width: 100%;
                margin-top: 8px;
            }
            .tusc-legend-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px 16px;
                width: 100%;
                justify-content: center;
            }
            .tusc-legend-row {display:flex; align-items:center; gap:6px; white-space:nowrap; font-size:0.75rem; padding:2px 4px;}
            .tusc-swatch {width:10px; height:10px; border-radius:2px; flex:0 0 10px;}
            @media (min-width:1400px){
                .tusc-chart {width:160px; height:160px;}
                .tusc-chart-inner {
                    font-size:var(--tusc-font-sm);
                    inset: 22px;
                }
                .tusc-legend {font-size:var(--tusc-font-base);}
                .tusc-legend-row {font-size:0.8rem;}
            }
            </style>`);
        }

        card.innerHTML = `
            <div class="card-status-indicator"></div>
            <div class="card-body d-flex flex-column">
            <div class="card-title text-center" style="font-size:var(--tusc-font-lg);">${cardTitle}</div>
            
            <div class="card-info-item flex-column" style="font-size:var(--tusc-font-base); align-items:center; justify-content:center; text-align:center;">
                <span class="card-info-label mb-1">Status:</span>
                <span class="status-badge ${statusBadgeClass} d-inline-flex align-items-center justify-content-center fw-semibold"
                      style="font-size:0.9rem; padding:.45rem .75rem; text-transform:uppercase; letter-spacing:.5px; box-shadow:0 0 0 1px rgba(255,255,255,.08),0 2px 6px rgba(0,0,0,.4);">
                  ${(() => {
                    const st = (unit.status || '').toLowerCase();
                    const icon = st==='ready' ? 'bi-check-circle-fill'
                            : st==='error' ? 'bi-exclamation-triangle-fill'
                            : (st==='running'||st==='busy') ? 'bi-cpu-fill'
                            : 'bi-question-circle-fill';
                    return `<i class="bi ${icon} me-1"></i>${unit.status || 'Unknown'}`;
                  })()}
                </span>
            </div>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Run ID:</span>
                <span class="card-info-value">
                    ${unit.testrail_status && unit.testrail_status.id ? 
                        `<a href="http://titan.zebra.lan/testrail/index.php?/runs/view/${unit.testrail_status.id}" target="_blank" class="testrail-link" title="Open in TestRail">${unit.testrail_status.id}</a>` : 
                        '-'}
                </span>
            </div>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Address:</span>
                <span class="card-info-value" title="${unit.address || '-'}">${unit.address || '-'}</span>
            </div>

            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Test Run Name:</span>
                <span class="card-info-value" title="${unit.name || '-'}">${unit.name || '-'}</span>
            </div>
            
            <hr class="my-2">
            <div class="card-info-item mt-auto" style="flex-direction:column;align-items:stretch;">
                ${(() => {
                const ts = unit.testrail_status || {};
                const passed = ts.passed_count || 0;
                const failed = ts.failed_count || 0;
                const retest = ts.retest_count || 0;
                const blocked = ts.blocked_count || 0;
                const untested = ts.untested_count || 0;
                const unexpected_reset = ts.unexpected_reset_count || 0;
                const error = ts.error_count || 0;
                const setup_issue = ts.setup_issue_count || 0;
                const total = passed + failed + retest + blocked + untested || 1;
                const deg = 360 / total;
                const d1 = passed * deg;
                const d2 = d1 + failed * deg;
                const d3 = d2 + retest * deg;
                const d4 = d3 + blocked * deg;
                const gradient = `conic-gradient(
                    #198754 0deg ${d1}deg,
                    #dc3545 ${d1}deg ${d2}deg,
                    #ffc107 ${d2}deg ${d3}deg,
                    #0d6efd ${d3}deg ${d4}deg,
                    #6c757d ${d4}deg 360deg
                )`;
                const passedPercentage = typeof ts.passed_percentage === 'number' ? ts.passed_percentage : null;
                    return `
                    <div class="tusc-chart-wrap" aria-label="TestRail status distribution">
                        <div class="tusc-chart" style="background:${gradient};">
                            <div class="tusc-chart-inner" style="flex-direction:column;">
                                <div style="font-size:1.5em; font-weight:700;">${passedPercentage !== null ? passedPercentage + '%' : '-'}</div>
                                <div style="font-size:0.9em; color:#888;">${total} tests</div>
                            </div>
                        </div>
                        <div class="tusc-legend">
                            <div class="tusc-legend-grid">
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#198754"></span>Passed: ${passed}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#dc3545"></span>Failed: ${failed}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#ffc107"></span>Retest: ${retest}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#0d6efd"></span>Blocked: ${blocked}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#6c757d"></span>Untested: ${untested}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#F527E4"></span>Resets: ${unexpected_reset}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#F5A927"></span>Error: ${error}</div>
                                <div class="tusc-legend-row"><span class="tusc-swatch" style="background:#B027F5"></span>Setup: ${setup_issue}</div>
                            </div>
                        </div>
                    </div>`;
                })()}
            </div>
            </div>
        `;
        
        // Add click handler for card details
        card.addEventListener('click', function() {
            showUnitDetails(unit);
        });
        
        container.appendChild(card);
    });
    
    // Add modal to the page if it doesn't exist
    if (!document.getElementById('unitDetailsModal')) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'unitDetailsModal';
        modal.tabIndex = '-1';
        modal.setAttribute('aria-labelledby', 'unitDetailsModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="unitDetailsModalLabel">Unit Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="unitDetailsModalBody">
                        <!-- Details will be inserted here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// Fetch units data from the API
function fetchUnits() {
    fetch('/api/units')
        .then(response => response.json())
        .then(data => renderUnits(data));
}

// Client-side enhancements (filter functionality)

// Client-side enhancements (filter functionality)
(function(){
    const searchEl = document.getElementById('unit-search');
    const filterEl = document.getElementById('status-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const autoToggle = document.getElementById('auto-refresh-toggle');
    const lastUpdatedEl = document.getElementById('summary-last-updated');
    const counts = {
        total: document.getElementById('count-total'),
        ready: document.getElementById('count-ready'),
        running: document.getElementById('count-running'),
        error: document.getElementById('count-error')
    };
    let allUnits = [];
    let autoTimer = null;

    const originalFetchUnits = window.fetchUnits;
    window.fetchUnits = function(){
        originalFetchUnits();
    };

    const originalRenderUnits = window.renderUnits;
    window.renderUnits = function(units){
        allUnits = units.slice();
        updateCounts(allUnits);
        applyFilters();
        lastUpdatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString();
    };

    function updateCounts(list){
        const agg = {total:list.length, ready:0, running:0, error:0};
        list.forEach(u=>{
            const st = (u.status||'').toLowerCase();
            if(st==='ready') agg.ready++;
            if(st==='running' || st==='busy') agg.running++;
            if(st==='error') agg.error++;
        });
        counts.total.textContent = agg.total;
        counts.ready.textContent = agg.ready;
        counts.running.textContent = agg.running;
        counts.error.textContent = agg.error;
    }

    function applyFilters(){
        const term = (searchEl.value||'').toLowerCase();
        const statusFilter = (filterEl.value||'').toLowerCase();
        const filtered = allUnits.filter(u=>{
            const matchTerm = !term || [u.redis_key,u.tag,u.address,u.cradle_address].some(v=>(v||'').toLowerCase().includes(term));
            const st = (u.status||'').toLowerCase();
            const matchStatus = !statusFilter || st===statusFilter || (statusFilter==='running' && (st==='busy'||st==='running'));
            return matchTerm && matchStatus;
        });
        originalRenderUnits(filtered);
    }

    searchEl.addEventListener('input', ()=>{
        applyFilters();
    });
    filterEl.addEventListener('change', applyFilters);
    refreshBtn.addEventListener('click', ()=>{
        fetchUnits();
    });
    autoToggle.addEventListener('change', ()=>{
        if(autoToggle.checked){
            if(!autoTimer) autoTimer = setInterval(fetchUnits,5000);
        } else {
            clearInterval(autoTimer); autoTimer=null;
        }
    });

    // Re-wire interval handling
    clearInterval(window.__tuscInterval);
    if(autoToggle.checked){
        autoTimer = setInterval(fetchUnits,5000);
    }
})();

// Handle link clicks inside cards to prevent event propagation
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('testrail-link')) {
        // Stop the event from bubbling up to the card
        event.stopPropagation();
    }
});

// Function to show unit details in modal
function showUnitDetails(unit) {
    const modalTitle = document.getElementById('unitDetailsModalLabel');
    const modalBody = document.getElementById('unitDetailsModalBody');
    
    // Set modal title
    if (unit.tag && unit.tag !== '-') {
        modalTitle.textContent = `${unit.tag} - ${unit.redis_key || ''} Details`;
    } else {
        modalTitle.textContent = `${unit.redis_key || ''} Details`;
    }
    
    // Generate HTML content for the modal body
    let content = `
        <div class="detail-section">
            <h6 class="detail-title"><i class="bi bi-info-circle"></i> Additional Information</h6>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Address:</span>
                <span class="card-info-value" title="${unit.address || '-'}">${unit.address || '-'}</span>
            </div>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Cradle Address:</span>
                <span class="card-info-value">${unit.cradle_address || '-'}</span>
            </div>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Debugging:</span>
                <span class="card-info-value">${unit.debugging || '-'}</span>
            </div>
            
            <div class="card-info-item" style="font-size:var(--tusc-font-base);">
                <span class="card-info-label">Custom Parameters:</span>
                <span class="card-info-value">${unit.customparameters || '-'}</span>
            </div>
        </div>
    `;
    
    // Add testrail status details if available
    if (unit.testrail_status && typeof unit.testrail_status === 'object') {
        content += `
            <div class="detail-section">
                <h6 class="detail-title"><i class="bi bi-pie-chart"></i> TestRail Status Details</h6>
                <table class="table table-sm table-bordered">
                    <tr>
                        <td>Run Name</td>
                        <td>${unit.testrail_status.name || '-'}</td>
                    </tr>
                    <tr>
                        <td>Run ID</td>
                        <td>${unit.testrail_status.id || '-'}</td>
                    </tr>
                    <tr>
                        <td>State</td>
                        <td>${unit.testrail_status.state || '-'}</td>
                    </tr>
                    <tr>
                        <td>Total Cases</td>
                        <td>${unit.testrail_status.total_count || '0'}</td>
                    </tr>
                    <tr>
                        <td>Pass Rate</td>
                        <td>${unit.testrail_status.passed_percentage || '0'}%</td>
                    </tr>
                </table>
            </div>
        `;
    }
    
    // Set the HTML content to the modal body
    modalBody.innerHTML = content;
    
    // Show the modal
    const modalElement = document.getElementById('unitDetailsModal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Initial load and refresh every 5 seconds
fetchUnits();
setInterval(fetchUnits, 5000);