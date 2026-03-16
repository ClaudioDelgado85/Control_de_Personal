const EMPLEADOS_DEFAULT = [
    'Acuña',
    'Claudio',
    'Colaborador'
];

const ACTIVIDADES_DEFAULT = [
    'Intimación por obstrucción vía pública (ramas, escombros)',
    'Intimación por vehículo abandonado',
    'Intimación por falta de limpieza de terrenos',
    'Intimación por falta de habilitación/reempadronamiento',
    'Expedientes de comercio',
    'Expedientes de obras',
    'Reclamos',
    'Infracciones',
    'Relevamientos',
    'Otros'
];

let db = {
    empleados: [],
    actividades: [],
    registros: []
};

let empleadoActual = null;
let chart = null;

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`/api/${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

async function initDB() {
    try {
        const data = await fetchAPI('data');
        if (data && !data.error) {
            db.empleados = data.empleados || [];
            db.actividades = data.actividades || [];
            db.registros = data.registros || [];
            renderEmployees(); // Render again after fetching data
        } else {
            console.error('Error loading data from server');
        }
    } catch (e) {
        console.error('Error loading DB:', e);
    }
}

async function saveDB() {
    await fetchAPI('data', 'POST', db);
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    const target = document.getElementById(sectionId);
    target.classList.remove('hidden');
    target.classList.add('active');
}

function getFechaActual() {
    return new Date().toISOString().split('T')[0];
}

function increment(index) {
    const input = document.getElementById('actividad_' + index);
    if (input) input.value = parseInt(input.value) + 1;
}

function decrement(index) {
    const input = document.getElementById('actividad_' + index);
    if (input) {
        const val = parseInt(input.value);
        if (val > 0) input.value = val - 1;
    }
}

function renderEmployees(filtro = '') {
    const container = document.getElementById('employee-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!db.empleados || !Array.isArray(db.empleados)) return;
    
    const searchLower = filtro.toLowerCase().trim();
    
    db.empleados.forEach(function(empleado) {
        if (empleado.toLowerCase().includes(searchLower)) {
            var btn = document.createElement('button');
            btn.className = 'employee-button';
            btn.textContent = empleado;
            btn.onclick = function() { selectEmployee(empleado); };
            container.appendChild(btn);
        }
    });
}

function selectEmployee(empleado) {
    empleadoActual = empleado;
    document.getElementById('employee-title').textContent = empleado;
    document.getElementById('task-date').value = document.getElementById('selected-date').value;
    renderTaskCounters();
    loadRegistroDia();
    showSection('tasks-section');
}

function renderTaskCounters() {
    var container = document.getElementById('task-counter-list');
    if (!container) return;
    container.innerHTML = '';
    
    if (!db.actividades || !Array.isArray(db.actividades)) return;
    
    db.actividades.forEach(function(actividad, index) {
        var div = document.createElement('div');
        div.className = 'task-counter-item';
        div.innerHTML = 
            '<label for="actividad_' + index + '">' + actividad + '</label>' +
            '<div class="counter">' +
                '<button type="button" onclick="decrement(' + index + ')">-</button>' +
                '<input type="number" id="actividad_' + index + '" data-actividad="' + actividad + '" value="0" min="0">' +
                '<button type="button" onclick="increment(' + index + ')">+</button>' +
            '</div>';
        container.appendChild(div);
    });
}

function loadRegistroDia() {
    if (!empleadoActual) return;
    
    var fecha = document.getElementById('task-date').value || getFechaActual();
    var registro = null;
    
    if (db.registros && Array.isArray(db.registros)) {
        registro = db.registros.find(function(r) {
            return r.fecha === fecha && r.empleado === empleadoActual;
        });
    }
    
    var inputs = document.querySelectorAll('.task-counter-item input');
    inputs.forEach(function(input) {
        var actividad = input.dataset.actividad;
        if (registro && registro.actividades && registro.actividades[actividad] !== undefined) {
            input.value = registro.actividades[actividad];
        } else {
            input.value = 0;
        }
    });
}

function initMetrics() {
    var today = getFechaActual();
    var firstDay = new Date();
    firstDay.setDate(1);
    
    document.getElementById('start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('end-date').value = today;
    
    renderMetrics();
}

function renderMetrics() {
    var start = document.getElementById('start-date').value;
    var end = document.getElementById('end-date').value;
    
    if (!start || !end) return;
    
    var filtered = [];
    if (db.registros && Array.isArray(db.registros)) {
        filtered = db.registros.filter(function(r) {
            return r.fecha >= start && r.fecha <= end;
        });
    }
    
    renderChart(filtered, start, end);
    renderSummary(filtered);
}

function renderChart(registros, start, end) {
    if (typeof Chart === 'undefined') {
        alert('Cargando gráfico...');
        return;
    }
    
    var canvas = document.getElementById('performance-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    
    var startDate = new Date(start);
    var endDate = new Date(end);
    var days = [];
    
    for (var d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(d.toISOString().split('T')[0]);
    }
    
    var empleados = db.empleados || [];
    var colors = ['#2d3436', '#00b894', '#0984e3', '#d63031', '#6c5ce7'];
    
    var datasets = empleados.map(function(emp, i) {
        var data = days.map(function(day) {
            var reg = null;
            if (registros && Array.isArray(registros)) {
                reg = registros.find(function(r) {
                    return r.fecha === day && r.empleado === emp;
                });
            }
            if (!reg || !reg.actividades) return 0;
            return Object.values(reg.actividades).reduce(function(a, b) { return a + b; }, 0);
        });
        
        return {
            label: emp,
            data: data,
            borderColor: colors[i % colors.length],
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6
        };
    });
    
    if (chart) {
        chart.destroy();
    }
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(function(d) {
                var date = new Date(d);
                return date.getDate() + '/' + (date.getMonth() + 1);
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderSummary(registros) {
    var container = document.getElementById('summary-table');
    if (!container) return;
    
    var summary = {};
    var empleados = db.empleados || [];
    
    empleados.forEach(function(emp) {
        summary[emp] = { total: 0, dias: new Set(), actividades: {} };
    });
    
    if (registros && Array.isArray(registros)) {
        registros.forEach(function(r) {
            if (summary[r.empleado]) {
                summary[r.empleado].dias.add(r.fecha);
                if (r.actividades) {
                    Object.keys(r.actividades).forEach(function(act) {
                        var cant = r.actividades[act];
                        summary[r.empleado].total += cant;
                        summary[r.empleado].actividades[act] = (summary[r.empleado].actividades[act] || 0) + cant;
                    });
                }
            }
        });
    }
    
    var html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th>Empleado</th><th>Días trab.</th><th>Total act.</th><th>Promedio/día</th><th>Detalle por Actividad</th></tr></thead><tbody>';
    
    Object.keys(summary).forEach(function(emp) {
        var s = summary[emp];
        var dias = s.dias.size;
        var promedio = dias > 0 ? (s.total / dias).toFixed(1) : '0';
        
        var desglose = '';
        if (s.total > 0) {
            var items = [];
            Object.keys(s.actividades).forEach(function(act) {
                if (s.actividades[act] > 0) {
                    items.push('<b>' + act + '</b>: ' + s.actividades[act]);
                }
            });
            desglose = '<ul style="text-align: left; margin: 0; padding-left: 20px; font-size: 0.9em;"><li>' + items.join('</li><li>') + '</li></ul>';
        } else {
            desglose = '<span style="color: #999;">Sin actividades</span>';
        }
        
        html += '<tr><td>' + emp + '</td><td>' + dias + '</td><td>' + s.total + '</td><td>' + promedio + '</td><td>' + desglose + '</td></tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;

    // Efficiency computation
    var effBox = document.getElementById('efficiency-box');
    if (!effBox) return;

    if (!registros || registros.length === 0) {
        effBox.innerHTML = '';
        return;
    }

    var totalGlobal = 0;
    var empStats = [];
    Object.keys(summary).forEach(function(emp) {
        var t = summary[emp].total;
        totalGlobal += t;
        empStats.push({ emp: emp, total: t });
    });

    if (totalGlobal === 0) {
        effBox.innerHTML = '';
        return;
    }

    empStats.sort(function(a, b) { return b.total - a.total; });
    var highest = empStats[0];
    var lowest = empStats[empStats.length - 1]; // This is the lowest, it might be 0.

    var effHtml = '<div style="background: #fdfbfb; border: 2px solid #e1b12c; border-radius: 8px; padding: 15px; text-align: center;">' +
        '<h3 style="margin-bottom: 10px; color: #333;">Desempeño Destacado</h3>' +
        '<p style="font-size: 1.1em; margin-bottom: 15px;">Total general de actividades: <b>' + totalGlobal + '</b></p>' +
        '<div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px;">' +
        '<div style="background: #e6fcf5; border: 1px solid #20c997; padding: 10px; border-radius: 6px; flex: 1; min-width: 200px;">' +
        '<div style="color: #20c997; font-weight: bold; margin-bottom: 5px;">🏆 Más Eficiente</div>' +
        '<div style="font-size: 1.2em; color: var(--text-main); font-weight: 600;">' + highest.emp + '</div>' +
        '<div style="color: var(--text-muted);">' + highest.total + ' act (' + ((highest.total / totalGlobal) * 100).toFixed(1) + '%)</div>' +
        '</div>' +
        '<div style="background: #fff5f5; border: 1px solid #ff8787; padding: 10px; border-radius: 6px; flex: 1; min-width: 200px;">' +
        '<div style="color: #fa5252; font-weight: bold; margin-bottom: 5px;">📉 Menos Eficiente</div>' +
        '<div style="font-size: 1.2em; color: var(--text-main); font-weight: 600;">' + lowest.emp + '</div>' +
        '<div style="color: var(--text-muted);">' + lowest.total + ' act (' + ((lowest.total / totalGlobal) * 100).toFixed(1) + '%)</div>' +
        '</div>' +
        '</div></div>';
    
    effBox.innerHTML = effHtml;
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if token exists
    if(localStorage.getItem('fake-jwt-token')) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        initDB();
    }

    document.getElementById('btn-login').onclick = async function() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const btn = this;
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('fake-jwt-token', data.token);
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('app').style.display = 'block';
                document.getElementById('login-error').style.display = 'none';
                initDB();
            } else {
                document.getElementById('login-error').style.display = 'block';
            }
        } catch(e) {
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('login-error').innerText = 'Error de conexión';
        } finally {
            btn.disabled = false;
        }
    };

    document.getElementById('btn-logout').onclick = function() {
        localStorage.removeItem('fake-jwt-token');
        document.getElementById('app').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    };

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);
    
    script.onload = function() {
        console.log('Chart.js cargado');
    };
    
    document.getElementById('selected-date').value = getFechaActual();
    document.getElementById('task-date').value = getFechaActual();
    
    // Setup Search Event Listener for Empleados
    var searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            renderEmployees(e.target.value);
        });
    }

    // Setup Search Event Listener for Actividades
    var taskSearchInput = document.getElementById('task-search');
    if (taskSearchInput) {
        taskSearchInput.addEventListener('input', function(e) {
            var filtro = e.target.value.toLowerCase().trim();
            var items = document.querySelectorAll('.task-counter-item');
            items.forEach(function(item) {
                var label = item.querySelector('label');
                if (label && label.textContent.toLowerCase().includes(filtro)) {
                    item.style.display = ''; // Revert to default
                } else {
                    item.style.display = 'none'; // Hide
                }
            });
        });
    }
    
    renderEmployees();
    
    document.getElementById('btn-back').onclick = function() {
        showSection('employees-section');
    };

    document.getElementById('btn-save').onclick = function() {
        var fecha = document.getElementById('task-date').value;
        var actividades = {};
        
        var inputs = document.querySelectorAll('.task-counter-item input');
        inputs.forEach(function(input) {
            var actividad = input.dataset.actividad;
            var valor = parseInt(input.value) || 0;
            if (valor > 0) actividades[actividad] = valor;
        });
        
        var idx = -1;
        if (db.registros && Array.isArray(db.registros)) {
            idx = db.registros.findIndex(function(r) {
                return r.fecha === fecha && r.empleado === empleadoActual;
            });
        }
        
        if (Object.keys(actividades).length > 0) {
            if (idx >= 0) {
                db.registros[idx].actividades = actividades;
            } else {
                db.registros.push({ fecha: fecha, empleado: empleadoActual, actividades: actividades });
            }
        } else {
            if (idx >= 0) db.registros.splice(idx, 1);
        }
        
        saveDB();
        
        var msg = document.getElementById('save-message');
        msg.classList.remove('hidden');
        setTimeout(function() { msg.classList.add('hidden'); }, 2000);
    };

    document.getElementById('btn-metrics').onclick = function() {
        initMetrics();
        showSection('metrics-section');
    };

    document.getElementById('btn-back-metrics').onclick = function() {
        showSection('employees-section');
    };

    document.getElementById('btn-filter').onclick = renderMetrics;

    document.getElementById('btn-add-employee').onclick = function() {
        document.getElementById('modal-employee').classList.remove('hidden');
        document.getElementById('new-employee-name').value = '';
        document.getElementById('new-employee-name').focus();
    };

    document.getElementById('btn-cancel-employee').onclick = function() {
        document.getElementById('modal-employee').classList.add('hidden');
    };

    document.getElementById('btn-confirm-employee').onclick = function() {
        var nombre = document.getElementById('new-employee-name').value.trim();
        if (nombre && db.empleados.indexOf(nombre) === -1) {
            db.empleados.push(nombre);
            saveDB();
            renderEmployees();
        }
        document.getElementById('modal-employee').classList.add('hidden');
    };

    document.getElementById('btn-add-task').onclick = function() {
        document.getElementById('modal-task').classList.remove('hidden');
        document.getElementById('new-task-name').value = '';
        document.getElementById('new-task-name').focus();
    };

    document.getElementById('btn-cancel-task').onclick = function() {
        document.getElementById('modal-task').classList.add('hidden');
    };

    document.getElementById('btn-confirm-task').onclick = function() {
        var nombre = document.getElementById('new-task-name').value.trim();
        if (nombre && db.actividades.indexOf(nombre) === -1) {
            db.actividades.push(nombre);
            saveDB();
        }
        document.getElementById('modal-task').classList.add('hidden');
    };

    function renderManageEmployees() {
        var container = document.getElementById('manage-employees-list');
        if(!container) return;
        container.innerHTML = '';
        db.empleados.forEach(function(emp) {
            var div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '8px';
            div.style.background = '#f1f2f6';
            div.style.borderRadius = '6px';
            div.innerHTML = '<span>' + emp + '</span>' +
                '<div style="display: flex; gap: 5px;">' +
                '<button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8em;" onclick="openEditEmployee(\'' + emp.replace(/'/g, "\\'") + '\')">✏️</button>' +
                '<button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8em; background: #ff7675; color: white; border: none;" onclick="deleteEmployee(\'' + emp.replace(/'/g, "\\'") + '\')">🗑️</button>' +
                '</div>';
            container.appendChild(div);
        });
    }

    window.openEditEmployee = function(oldName) {
        document.getElementById('edit-employee-old-name').value = oldName;
        document.getElementById('edit-employee-name').value = oldName;
        document.getElementById('modal-edit-employee').classList.remove('hidden');
    };

    document.getElementById('btn-cancel-edit-employee').onclick = function() {
        document.getElementById('modal-edit-employee').classList.add('hidden');
    };

    document.getElementById('btn-confirm-edit-employee').onclick = function() {
        var oldName = document.getElementById('edit-employee-old-name').value;
        var newName = document.getElementById('edit-employee-name').value.trim();
        
        if (newName && newName !== oldName && db.empleados.indexOf(newName) === -1) {
            var idx = db.empleados.indexOf(oldName);
            if (idx !== -1) {
                db.empleados[idx] = newName;
                
                // Update historical records to match the new employee name
                if (db.registros && Array.isArray(db.registros)) {
                    db.registros.forEach(function(r) {
                        if (r.empleado === oldName) {
                            r.empleado = newName;
                        }
                    });
                }
                
                // If the employee currently selected is renamed, update it
                if (empleadoActual === oldName) {
                    empleadoActual = newName;
                    var titleEl = document.getElementById('employee-title');
                    if (titleEl) titleEl.textContent = newName;
                }
                
                saveDB();
                renderManageEmployees();
                renderEmployees();
                renderMetrics();
                document.getElementById('modal-edit-employee').classList.add('hidden');
            }
        } else if (newName === oldName) {
            document.getElementById('modal-edit-employee').classList.add('hidden');
        } else {
            alert('Nombre inválido o ya existe.');
        }
    };

    window.deleteEmployee = function(empName) {
        if(confirm('¿Estás seguro que deseas eliminar al empleado "' + empName + '"?')) {
            var idx = db.empleados.indexOf(empName);
            if (idx !== -1) {
                db.empleados.splice(idx, 1);
                saveDB();
                renderManageEmployees();
                renderEmployees();
                renderMetrics();
            }
        }
    };

    document.getElementById('btn-manage-employees').onclick = function() {
        renderManageEmployees();
        document.getElementById('modal-manage-employees').classList.remove('hidden');
    };

    document.getElementById('btn-close-manage-employees').onclick = function() {
        document.getElementById('modal-manage-employees').classList.add('hidden');
    };

    function renderManageTasks() {
        var container = document.getElementById('manage-tasks-list');
        if(!container) return;
        container.innerHTML = '';
        db.actividades.forEach(function(act) {
            var div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '8px';
            div.style.background = '#f1f2f6';
            div.style.borderRadius = '6px';
            div.innerHTML = '<span>' + act + '</span>' +
                '<button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8em;" onclick="openEditTask(\'' + act.replace(/'/g, "\\'") + '\')">✏️</button>';
            container.appendChild(div);
        });
    }

    window.openEditTask = function(oldName) {
        document.getElementById('edit-task-old-name').value = oldName;
        document.getElementById('edit-task-name').value = oldName;
        document.getElementById('modal-edit-task').classList.remove('hidden');
    };

    document.getElementById('btn-manage-tasks').onclick = function() {
        renderManageTasks();
        document.getElementById('modal-manage-tasks').classList.remove('hidden');
    };

    document.getElementById('btn-close-manage-tasks').onclick = function() {
        document.getElementById('modal-manage-tasks').classList.add('hidden');
        renderTaskCounters(); 
    };

    document.getElementById('btn-cancel-edit-task').onclick = function() {
        document.getElementById('modal-edit-task').classList.add('hidden');
    };

    document.getElementById('btn-confirm-edit-task').onclick = function() {
        var oldName = document.getElementById('edit-task-old-name').value;
        var newName = document.getElementById('edit-task-name').value.trim();
        
        if (newName && newName !== oldName && db.actividades.indexOf(newName) === -1) {
            var idx = db.actividades.indexOf(oldName);
            if (idx !== -1) {
                db.actividades[idx] = newName;
                
                // Update historical records to match the new name
                if (db.registros && Array.isArray(db.registros)) {
                    db.registros.forEach(function(r) {
                        if (r.actividades && r.actividades[oldName] !== undefined) {
                            r.actividades[newName] = r.actividades[oldName];
                            delete r.actividades[oldName];
                        }
                    });
                }
                
                saveDB();
                renderManageTasks();
                renderMetrics();
                document.getElementById('modal-edit-task').classList.add('hidden');
            }
        } else if (newName === oldName) {
            document.getElementById('modal-edit-task').classList.add('hidden');
        } else {
            alert('Nombre inválido o ya existe.');
        }
    };

    document.getElementById('btn-clear-data').onclick = function() {
        document.getElementById('modal-confirm-clear').classList.remove('hidden');
    };

    document.getElementById('btn-print-report').onclick = function() {
        window.print();
    };

    document.getElementById('selected-date').onchange = function() {
        document.getElementById('task-date').value = this.value;
    };

    document.getElementById('task-date').onchange = loadRegistroDia;

    document.getElementById('btn-cancel-clear').onclick = function() {
        document.getElementById('modal-confirm-clear').classList.add('hidden');
    };

    document.getElementById('btn-confirm-clear').onclick = function() {
        db.registros = [];
        db.empleados = []; // CLEAR ALL EMPLOYEES
        saveDB();
        renderMetrics();
        renderEmployees(); // Update main employee list
        document.getElementById('modal-confirm-clear').classList.add('hidden');
        
        var msg = document.getElementById('save-message');
        if(msg) {
            msg.innerText = 'Historial borrado permanentemente.';
            msg.style.color = '#d63031';
            msg.classList.remove('hidden');
            setTimeout(function() { 
                msg.classList.add('hidden'); 
                msg.style.color = 'var(--success)';
                msg.innerText = '¡Guardado exitosamente!';
            }, 3000);
        }
    };
});
