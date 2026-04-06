// --- FUNCIONES GLOBALES ---
function cerrarModal(id){ document.getElementById(id).style.display='none'; }

function validarRango(input, min, max) {
    let val = parseInt(input.value);
    if (isNaN(val) || input.value === '') { input.value = ''; input.classList.remove('rating-red', 'rating-yellow', 'rating-green'); return; }
    else if (val < min) { input.value = min; val = min; }
    else if (val > max) { input.value = max; val = max; }

    input.classList.remove('rating-red', 'rating-yellow', 'rating-green');
    if (max === 4 || max === 5) {
        if (val <= 2) input.classList.add('rating-red');
        else if (val === 3) input.classList.add('rating-yellow');
        else if (val >= 4) input.classList.add('rating-green');
    }
}

window.aplicarColorSelect = function(sel, max) {
    let val = parseInt(sel.value);
    sel.classList.remove('rating-red', 'rating-yellow', 'rating-green');
    if(isNaN(val)) return;

    if (max === 4 || max === 5) {
        if (val <= 2) sel.classList.add('rating-red');
        else if (val === 3) sel.classList.add('rating-yellow');
        else if (val >= 4) sel.classList.add('rating-green');
    }
    
    const formId = sel.closest('.modern-card').id;
    if(formId) window.actualizarProgresoGeneral(formId);
}

window.haptic = function(type) {
    if(!navigator.vibrate) return;
    try {
        if(type === 'light') navigator.vibrate(15);
        if(type === 'medium') navigator.vibrate(30);
        if(type === 'success') navigator.vibrate([30, 50, 30]);
        if(type === 'error') navigator.vibrate([50, 50, 50]);
    } catch(e) {}
}

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA4yVCHsCCK7y4G6Sx_vut1FmCyrKOZGcY",
  authDomain: "informes-guardianlab.firebaseapp.com",
  databaseURL: "https://informes-guardianlab-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "informes-guardianlab",
  storageBucket: "informes-guardianlab.firebasestorage.app",
  messagingSenderId: "1024215042880",
  appId: "1:1024215042880:web:e76abf0a1038835c8508a5"
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Inicializado");
} catch(e) { console.error("Error Firebase", e); }

const db = firebase.firestore();
const auth = firebase.auth(); 

// --- VARIABLES ---
let porteroEnEdicionId = null;
let torneoEnEdicionId = null; 
let informeEnEdicionId = null; 
let objetivoEnEdicionId = null; 
let evaluacionesTemporales = [];
let competenciaSeleccionada = null;

let ACCIONES_EVALUACION = {
    "DEFENSIVAS": ["Blocaje Frontales Medio y Raso", "Blocaje lateral raso", "Blocaje lateral media altura", "Desvío raso", "Desvío a Media Altura", "Reducción de espacios y Posición Cruz", "Apertura", "Reincorporaciones", "Blocaje Aéreo", "Despeje de Puños"],
    "OFENSIVAS": ["Pase mano raso", "Pase mano alto", "Pase mano picado", "Perfilamiento y Controles", "Pase Raso con el Píe", "Pase alto con el Píe", "Voleas"]
};

document.addEventListener('DOMContentLoaded', () => {
    auth.signInAnonymously().catch((error) => console.error(error));

    auth.onAuthStateChanged((user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            const id = urlParams.get('id');

            if (view && id) {
                document.querySelector('header').style.display = 'none';
                document.querySelector('main').style.display = 'none';
                document.querySelector('.floating-nav-container').style.display = 'none';
                window.renderWebView(view, id);
            } else {
                cargarPorteros();
                cargarHistorialObjetivos();
                cargarHistorialInformes();
                cargarHistorialTorneos(); 
            }
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const fObj = document.getElementById('obj-fecha'); if(fObj) fObj.value=today;
    if(localStorage.getItem('guardian_theme') === 'light'){ document.body.classList.add('light-mode'); }

    const formSemestral = document.getElementById('form-informe-semestral');
    if(formSemestral) {
        formSemestral.addEventListener('input', () => { window.actualizarProgresoGeneral('form-informe-semestral'); });
    }
});

window.renderWebView = function(tipo, id) {
    document.getElementById('web-view-container').style.display = 'block';
    document.getElementById('web-view-container').innerHTML = '<div style="text-align:center; padding:50px; color:white; font-family:Montserrat, sans-serif;">Cargando Informe Digital...</div>';
    
    let collection = tipo === 'torneo' ? 'informes_torneo' : 'informes_semestrales';
    
    db.collection(collection).doc(id).get().then(doc => {
        if(!doc.exists) { document.getElementById('web-view-container').innerHTML = '<div style="text-align:center; padding:50px; color:white; font-family:Montserrat, sans-serif;">Informe no encontrado.</div>'; return; }
        
        const data = doc.data();
        db.collection("porteros").doc(data.porteroId).get().then(pDoc => {
            const p = pDoc.exists ? pDoc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' };
            const d = data.datos;
            
            let html = `
            <div style="background:var(--bg-body); min-height:100vh; color:var(--text-main); font-family:'Montserrat', sans-serif; padding-bottom:50px;">
                <div style="background: linear-gradient(135deg, #1C2C5B, #0A0F1D); padding:40px 20px; text-align:center; border-bottom:3px solid var(--atm-red); position:relative; overflow:hidden;">
                    <img src="ESCUDO ATM.png" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:150%; opacity:0.05; z-index:0;">
                    <div style="position:relative; z-index:1;">
                        <img src="${p.foto || ''}" style="width:120px; height:120px; object-fit:cover; border-radius:50%; border:4px solid var(--atm-red); margin-bottom:15px; box-shadow:0 10px 20px rgba(0,0,0,0.5);">
                        ${d.torneoLogo ? `<img src="${d.torneoLogo}" style="width:60px; height:60px; object-fit:contain; background:white; border-radius:10px; padding:5px; position:absolute; margin-left:-30px; margin-top:80px; box-shadow:0 5px 10px rgba(0,0,0,0.5);">` : ''}
                        <h1 style="margin:0; font-size:1.8rem; font-weight:800; color:white; text-transform:uppercase;">${p.nombre}</h1>
                        <p style="margin:5px 0 15px; color:#00E676; font-weight:700; font-size:1rem;">${tipo === 'torneo' ? d.torneo : d.titulo}</p>
                        <div style="display:flex; justify-content:center; gap:10px; font-size:0.8rem; color:#aaa;">
                            <span style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:10px;">${p.categoria}</span>
                            <span style="background:rgba(255,255,255,0.1); padding:4px 10px; border-radius:10px;">${p.equipo}</span>
                        </div>
                    </div>
                </div>
                
                <div style="padding:20px; max-width:600px; margin:0 auto;">
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:20px; padding:20px; margin-bottom:20px; text-align:center;">
                        <h3 style="margin-top:0; color:var(--atm-red); font-size:1rem; margin-bottom:15px;">Perfil de Rendimiento</h3>
                        <div style="position:relative; height:250px; width:100%;"><canvas id="web-radar-chart"></canvas></div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); border-radius:20px; padding:20px; margin-bottom:20px; text-align:center;">
                        <h3 style="margin-top:0; color:var(--atm-red); font-size:1rem; margin-bottom:10px;">Valoración General</h3>
                        <div style="font-size:1.5rem; font-weight:800; color:${(d.val_gen || d.perfil?.val_gen)==='EXCEPCIONAL'?'#27AE60':((d.val_gen || d.perfil?.val_gen)==='ALTA'?'#F1C40F':'#E74C3C')}">${d.val_gen || d.perfil?.val_gen || 'NO EVALUADO'}</div>
                    </div>
                </div>
            </div>`;
            
            document.getElementById('web-view-container').innerHTML = html;

            if (tipo === 'torneo' && d.val) {
                const parseVal = (v) => { const n = parseInt(v); return isNaN(n) ? 3 : n; };
                new Chart(document.getElementById('web-radar-chart'), {
                    type: 'radar',
                    data: {
                        labels: ['Liderazgo', 'Mentalidad', 'Concentración', 'Táctica', 'Evolución', 'Adaptación'],
                        datasets: [{
                            data: [
                                ((parseVal(d.val.personalidad) + parseVal(d.val.mando) + parseVal(d.val.comunicacion)) / 3).toFixed(1),
                                ((parseVal(d.val.error) + parseVal(d.val.actitudGol) + parseVal(d.val.mentalidad)) / 3).toFixed(1),
                                ((parseVal(d.val.concentracion) + parseVal(d.val.confianza)) / 2).toFixed(1),
                                ((parseVal(d.val.unoVuno) + parseVal(d.val.organizacion)) / 2).toFixed(1),
                                ((parseVal(d.val.primerUltimo) + parseVal(d.val.mejoraBajon)) / 2).toFixed(1),
                                ((parseVal(d.val.ritmo) + parseVal(d.val.entorno)) / 2).toFixed(1)
                            ],
                            backgroundColor: 'rgba(203, 53, 36, 0.4)', borderColor: 'rgba(203, 53, 36, 1)', pointBackgroundColor: '#1C2C5B', pointBorderColor: '#fff', borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: { r: { min: 0, max: 5, ticks: { display: false }, pointLabels: { font: { size: 10, family: 'Montserrat', weight: 'bold' }, color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' } } },
                        plugins: { legend: { display: false } }
                    }
                });
            } else if (tipo === 'semestral' && d.cg) {
                const parseVal = (v) => { const n = parseInt(v); return isNaN(n) ? 3 : n; };
                new Chart(document.getElementById('web-radar-chart'), {
                    type: 'radar',
                    data: {
                        labels: ['Técnica Def', 'Técnica Of', 'Actitud', 'Competitividad', 'Pos. Básica'],
                        datasets: [{
                            data: [parseVal(d.cg.tec_def), parseVal(d.cg.tec_of), parseVal(d.cg.act), parseVal(d.cg.niv_comp), parseVal(d.cpp.pos)],
                            backgroundColor: 'rgba(203, 53, 36, 0.4)', borderColor: 'rgba(203, 53, 36, 1)', pointBackgroundColor: '#1C2C5B', pointBorderColor: '#fff', borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: { r: { min: 0, max: 5, ticks: { display: false }, pointLabels: { font: { size: 10, family: 'Montserrat', weight: 'bold' }, color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' } } },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        });
    });
}

window.compartirFichaWeb = function(tipo, id) {
    window.haptic('medium');
    const url = window.location.origin + window.location.pathname + '?view=' + tipo + '&id=' + id;
    if (navigator.share) {
        navigator.share({ title: 'Informe Técnico ATM', text: 'Revisa este informe digital.', url: url })
        .catch(err => console.log('Error al compartir', err));
    } else {
        navigator.clipboard.writeText(url);
        alert("Enlace copiado al portapapeles:\n" + url);
    }
}

// CROMO EA FC
window.generarCromo = function(porteroId) {
    window.haptic('success');
    if(!porteroId) return alert("Selecciona un portero primero.");
    
    db.collection("porteros").doc(porteroId).get().then(pDoc => {
        const p = pDoc.data();
        
        db.collection("informes_torneo").where("porteroId", "==", porteroId).orderBy("fecha", "desc").limit(1).get().then(snap => {
            let v_ref = 82, v_blc = 80, v_saq = 78, v_pos = 83, v_lid = 85, v_fis = 81;
            
            if(!snap.empty) {
                const t = snap.docs[0].data().datos;
                const v = t.val || {};
                const calc = (n) => { let x = parseInt(n); return isNaN(x) ? 80 : (x * 15 + 24); };
                v_ref = calc(v.unoVuno);
                v_lid = calc(v.mando);
                v_pos = calc(v.organizacion);
                v_blc = calc(v.concentracion);
                v_saq = calc(v.comunicacion);
                v_fis = calc(v.ritmo);
            }
            
            const ovr = Math.round((v_ref + v_blc + v_saq + v_pos + v_lid + v_fis) / 6);
            const defFoto = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
            
            const cromoHtml = `
            <div class="cromo-container" id="cromo-capture">
                <div class="cromo-bg-pattern"></div>
                <div class="cromo-content">
                    <div class="cromo-top">
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <div class="cromo-rating">${ovr}</div>
                            <div class="cromo-pos">POR</div>
                            <img src="ESCUDO ATM.png" class="cromo-club">
                        </div>
                    </div>
                    <img src="${p.foto || defFoto}" class="cromo-photo">
                    <div class="cromo-name">${p.nombre.split(' ')[0]}</div>
                    <div class="cromo-stats">
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_ref}</span><span>REF</span></div>
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_pos}</span><span>POS</span></div>
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_blc}</span><span>BLC</span></div>
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_lid}</span><span>LÍD</span></div>
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_saq}</span><span>SAQ</span></div>
                        <div class="cromo-stat-item"><span class="cromo-stat-val">${v_fis}</span><span>FÍS</span></div>
                    </div>
                </div>
            </div>`;
            
            document.getElementById('cromo-render-area').innerHTML = cromoHtml;
            document.getElementById('modal-cromo').style.display = 'flex';
        });
    });
}

window.alternarTema = function() { 
    window.haptic('medium');
    document.body.classList.toggle('light-mode'); 
    localStorage.setItem('guardian_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); 
}

window.cambiarSeccion = function(sec) {
    window.haptic('light');
    document.getElementById('modal-pdf-preview').style.display = 'none';
    const secciones = ['porteros', 'sesiones', 'informes', 'torneos'];
    secciones.forEach(id => {
        const secElement = document.getElementById('section-' + id);
        if (secElement) secElement.style.display = 'none';
        const btnElement = document.getElementById('btn-' + id);
        if (btnElement) btnElement.classList.remove('active');
    });

    const targetSec = document.getElementById('section-' + sec);
    if (targetSec) targetSec.style.display = 'block';
    const targetBtn = document.getElementById('btn-' + sec);
    if (targetBtn) targetBtn.classList.add('active');
    
    if (sec !== 'informes' && sec !== 'torneos') {
        document.getElementById('floating-progress').classList.remove('visible');
    }
}

window.previsualizarFoto = function() {
    const file = document.getElementById('fotoPorteroInput').files[0];
    if(file){ const r = new FileReader(); r.onload = (e) => document.getElementById('fotoPreview').src = e.target.result; r.readAsDataURL(file); }
}
window.actualizarEquipos = function() {
    const cat = document.getElementById('catPortero').value; const sel = document.getElementById('equipoPortero');
    sel.innerHTML = '<option value="">Selecciona Categoría...</option>'; if(!cat) return;
    ['A','B','C','D','E','F'].forEach(l => sel.innerHTML += `<option value="${cat} ${l}">${cat} ${l}</option>`);
}

function cargarPorteros() {
    db.collection("porteros").onSnapshot((snapshot) => {
        const lista = []; snapshot.forEach(doc => lista.push({...doc.data(), id: doc.id}));
        document.getElementById('total-porteros').innerText = lista.length;
        const c = document.getElementById('lista-porteros'); 
        
        if(lista.length === 0) { c.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No hay datos aún.</div>'; }
        else { c.innerHTML = ''; }
        
        const def = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
        lista.forEach(p => { 
            c.innerHTML += `
            <div class="portero-card" onclick="window.abrirFichaPortero('${p.id}')">
                <div style="display:flex; align-items:center;">
                    <img src="${p.foto||def}" class="mini-foto-list">
                    <div><div class="card-title">${p.nombre}</div><div class="card-subtitle">${p.equipo} (${p.anio||'-'})</div></div>
                </div>
                <div>
                    <button class="btn-icon-action" onclick="event.stopPropagation(); window.cargarDatosEdicion('${p.id}')">✏️</button>
                    <button class="btn-trash" onclick="event.stopPropagation(); window.borrarPortero('${p.id}')">🗑️</button>
                </div>
            </div>`; 
        });
        
        const opts = '<option value="">Seleccionar...</option>' + lista.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
        if(document.getElementById('obj-portero')) document.getElementById('obj-portero').innerHTML = opts;
        if(document.getElementById('inf-portero')) document.getElementById('inf-portero').innerHTML = opts;
        if(document.getElementById('tor-portero')) document.getElementById('tor-portero').innerHTML = opts; 
    });
}

window.porteroActualFichaId = null;
window.cambiarTabFicha = function(tab) {
    window.haptic('light');
    document.querySelectorAll('.ficha-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ficha-content-tab').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('ficha-content-' + tab).classList.add('active');
}

window.abrirFichaPortero = function(id) {
    window.haptic('medium');
    window.porteroActualFichaId = id;
    db.collection("porteros").doc(id).get().then(doc => {
        const p = doc.data();
        const def = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
        document.getElementById('ficha-foto').src = p.foto || def;
        document.getElementById('ficha-nombre').innerText = p.nombre;
        document.getElementById('ficha-equipo').innerText = `${p.equipo} | ${p.categoria}`;
        
        document.getElementById('f-anio').innerText = p.anio || '-';
        document.getElementById('f-cat').innerText = p.categoria || '-';
        document.getElementById('f-nac').innerText = p.nacionalidad || '-';
        document.getElementById('f-pie').innerText = p.pie || '-';
        document.getElementById('f-anos').innerText = p.anosClub || '-';

        db.collection("reportes_objetivos").where("porteroId", "==", id).get().then(snap => {
            const c = document.getElementById('f-lista-obj'); c.innerHTML = '';
            if(snap.empty) c.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Sin objetivos.</div>';
            snap.forEach(d => {
                const rep = d.data();
                c.innerHTML += `<div class="eval-card"><div><strong>${rep.fecha}</strong><br><span style="font-size:0.8rem;color:#aaa">${rep.acciones.length} Acciones</span></div><button class="btn-icon-action" onclick='verPDFObjetivosGuardado(${JSON.stringify(rep).replace(/'/g, "&#39;")})'>📄</button></div>`;
            });
        });

        db.collection("informes_semestrales").where("porteroId", "==", id).get().then(snap => {
            const c = document.getElementById('f-lista-inf'); c.innerHTML = '';
            if(snap.empty) c.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Sin informes.</div>';
            snap.forEach(d => {
                const rep = d.data();
                let draftBadge = rep.isDraft ? '<span class="draft-badge">⏳ BORRADOR</span>' : '';
                c.innerHTML += `<div class="eval-card"><div><strong>${rep.datos.titulo}</strong> ${draftBadge}<br><span style="font-size:0.8rem;color:#aaa">${rep.fecha.substring(0,10)}</span></div><button class="btn-icon-action" onclick="verPDFInformeGuardado('${d.id}')">📄</button></div>`;
            });
        });

        db.collection("informes_torneo").where("porteroId", "==", id).get().then(snap => {
            const c = document.getElementById('f-lista-tor'); c.innerHTML = '';
            if(snap.empty) c.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Sin torneos.</div>';
            snap.forEach(d => {
                const rep = d.data();
                let draftBadge = rep.isDraft ? '<span class="draft-badge">⏳ BORRADOR</span>' : '';
                c.innerHTML += `<div class="eval-card"><div><strong>${rep.datos.torneo}</strong> ${draftBadge}<br><span style="font-size:0.8rem;color:#aaa">${rep.fecha.substring(0,10)}</span></div><button class="btn-icon-action" onclick="verPDFTorneoGuardado('${d.id}')">📄</button></div>`;
            });
        });

        document.getElementById('modal-ficha-portero').style.display = 'block';
        document.querySelectorAll('.ficha-tab-btn')[0].click(); 
    });
}

window.procesarPortero = function() {
    const n = document.getElementById('nombrePortero').value; const a = document.getElementById('anioPortero').value; const c = document.getElementById('catPortero').value; const eq = document.getElementById('equipoPortero').value; const nac = document.getElementById('nacionalidadPortero').value; const pie = document.getElementById('piePortero').value; const anos = document.getElementById('anosClub').value; const file = document.getElementById('fotoPorteroInput').files[0];
    if(!n || !c || !eq) return alert("Faltan datos");
    const btn = document.getElementById('btn-save'); btn.innerText = "Guardando..."; btn.disabled = true;
    const guardar = (url) => {
        const data = { nombre:n, anio:a, categoria:c, equipo:eq, nacionalidad:nac, pie:pie, anosClub:anos };
        if(url) data.foto = url;
        const prom = porteroEnEdicionId ? db.collection("porteros").doc(porteroEnEdicionId).update(data) : db.collection("porteros").add(data);
        prom.then(() => { window.haptic('success'); window.cancelarEdicion(); }).catch(e => alert("Error: " + e.message)).finally(() => { btn.innerText = "Añadir / Actualizar"; btn.disabled = false; });
    };
    if(file) { const r = new FileReader(); r.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const max = 300; let w = img.width; let h = img.height; if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } } canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h); guardar(canvas.toDataURL('image/jpeg', 0.5)); }; }; r.readAsDataURL(file); } else { guardar(null); }
}
window.cargarDatosEdicion = function(id) { db.collection("porteros").doc(id).get().then(doc => { const p = doc.data(); document.getElementById('nombrePortero').value = p.nombre; document.getElementById('anioPortero').value = p.anio; document.getElementById('catPortero').value = p.categoria; window.actualizarEquipos(); document.getElementById('equipoPortero').value = p.equipo; document.getElementById('fotoPreview').src = p.foto || ""; document.getElementById('nacionalidadPortero').value = p.nacionalidad || ""; document.getElementById('piePortero').value = p.pie || "DIESTRO"; document.getElementById('anosClub').value = p.anosClub || ""; porteroEnEdicionId = id; document.getElementById('btn-save').innerText = "Guardar Cambios"; document.getElementById('btn-cancel').style.display = "inline-block"; window.scrollTo({top:0, behavior:'smooth'}); }); }
window.cancelarEdicion = function() { porteroEnEdicionId = null; document.getElementById('nombrePortero').value = ''; document.getElementById('anioPortero').value = ''; document.getElementById('catPortero').value = ''; document.getElementById('equipoPortero').innerHTML = ''; document.getElementById('nacionalidadPortero').value = ''; document.getElementById('anosClub').value = ''; document.getElementById('fotoPreview').src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4="; document.getElementById('btn-save').innerText = "Añadir / Actualizar"; document.getElementById('btn-cancel').style.display = "none"; }
window.borrarPortero = function(id) { if(confirm("¿Borrar?")) { window.haptic('medium'); db.collection("porteros").doc(id).delete(); } }

window.resetearEvaluacionTemporal = function() { 
    evaluacionesTemporales = []; competenciaSeleccionada = null; 
    window.selectCompetencia(null); window.renderizarListaTemporal(); 
    document.getElementById('contenedor-evaluacion-temporal').style.display = 'none'; 
    document.getElementById('obj-observacion').value = ''; 
    window.cargarAccionesObjetivos();
    objetivoEnEdicionId = null;
    document.getElementById('btn-save-obj').innerText = "💾 GUARDAR Y VER PDF";
    document.getElementById('btn-cancel-obj').style.display = "none";
}
window.cargarAccionesObjetivos = function() { const tipo = document.getElementById('obj-tipo').value; const sel = document.getElementById('obj-accion'); sel.innerHTML = '<option value="">Seleccionar Acción...</option>'; sel.disabled = true; if (tipo && ACCIONES_EVALUACION[tipo]) { sel.disabled = false; ACCIONES_EVALUACION[tipo].forEach(acc => { if (!evaluacionesTemporales.some(e => e.accion === acc)) { sel.innerHTML += `<option value="${acc}">${acc}</option>`; } }); } }
window.selectCompetencia = function(val) { window.haptic('light'); competenciaSeleccionada = val; document.querySelectorAll('.btn-comp').forEach(b => b.classList.remove('active')); if(val) document.querySelector(`.btn-comp.comp-${val}`).classList.add('active'); document.getElementById('obj-competencia-val').value = val; }
window.agregarEvaluacionTemporal = function() { window.haptic('light'); const pid = document.getElementById('obj-portero').value; const tipo = document.getElementById('obj-tipo').value; const accion = document.getElementById('obj-accion').value; const comp = competenciaSeleccionada; const score = document.getElementById('obj-puntaje').value; if(!pid || !accion || !comp) return alert("Completa los datos"); evaluacionesTemporales.push({ accion: accion, tipo: tipo, competencia: parseInt(comp), puntaje: parseInt(score) }); window.renderizarListaTemporal(); document.getElementById('obj-accion').value = ""; window.selectCompetencia(null); document.getElementById('obj-puntaje').value = "1"; window.cargarAccionesObjetivos(); document.getElementById('contenedor-evaluacion-temporal').style.display = 'block'; }
window.renderizarListaTemporal = function() { const cont = document.getElementById('lista-temp-evaluaciones'); cont.innerHTML = ''; evaluacionesTemporales.forEach(item => { let col='#ccc', txt=''; if(item.competencia===1){col='var(--comp-1)';txt='Inc. Inconsciente';} if(item.competencia===2){col='var(--comp-2)';txt='Inc. Consciente';} if(item.competencia===3){col='var(--comp-3)';txt='Comp. Consciente';} if(item.competencia===4){col='var(--comp-4)';txt='Comp. Inconsciente';} cont.innerHTML += `<div class="item-temp-eval" style="border-left: 4px solid ${col}"><strong>${item.accion}</strong><br><span style="color:${col}">${txt}</span> | Nota: ${item.puntaje}</div>`; }); }

window.editarInformeObjetivos = function(id) {
    db.collection("reportes_objetivos").doc(id).get().then(doc => {
        const data = doc.data();
        objetivoEnEdicionId = id; 
        document.getElementById('obj-portero').value = data.porteroId;
        document.getElementById('obj-fecha').value = data.fecha;
        document.getElementById('obj-observacion').value = data.observacion || '';
        
        evaluacionesTemporales = data.acciones || [];
        window.renderizarListaTemporal();
        document.getElementById('contenedor-evaluacion-temporal').style.display = 'block';
        
        document.getElementById('btn-save-obj').innerText = "💾 ACTUALIZAR Y VER PDF";
        document.getElementById('btn-cancel-obj').style.display = "inline-block";
        window.scrollTo({top:0, behavior:'smooth'});
    });
}

window.cancelarEdicionObjetivos = function() {
    window.resetearEvaluacionTemporal();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('obj-fecha').value = today;
    document.getElementById('obj-portero').value = '';
}

window.guardarReporteObjetivosCompleto = function() { 
    const pid = document.getElementById('obj-portero').value; 
    const fecha = document.getElementById('obj-fecha').value; 
    const observacion = document.getElementById('obj-observacion').value; 
    if(!pid || !fecha || evaluacionesTemporales.length === 0) return alert("Sin datos"); 
    
    const reporte = { porteroId: pid, fecha: fecha, acciones: evaluacionesTemporales, observacion: observacion, timestamp: Date.now() }; 
    
    let pIdPromise = objetivoEnEdicionId 
        ? db.collection('reportes_objetivos').doc(objetivoEnEdicionId).update(reporte).then(()=>objetivoEnEdicionId)
        : db.collection('reportes_objetivos').add(reporte).then(ref=>ref.id);

    pIdPromise.then((docId) => { 
        window.haptic('success');
        generarPDFObjetivos(reporte, docId); 
        window.cancelarEdicionObjetivos(); 
    }); 
}

function generarPDFObjetivos(reporte, docId) {
    db.collection("porteros").doc(reporte.porteroId).get().then(doc => {
        const p = doc.exists ? doc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' }; 
        const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
        let filas = ''; let sum = 0; reporte.acciones.forEach(item => { sum += parseInt(item.puntaje); let bg='#ccc', fg='white', label=''; if(item.competencia===1){bg='#E74C3C';label='INCOMP. INCONSCIENTE';} if(item.competencia===2){bg='#E67E22';label='INCOMP. CONSCIENTE';} if(item.competencia===3){bg='#F1C40F';label='COMP. CONSCIENTE';fg='black';} if(item.competencia===4){bg='#27AE60';label='COMP. INCONSCIENTE';} filas += `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${item.accion}</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center;"><span style="background:${bg}; color:${fg}; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold;">${label}</span></td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center; font-weight:bold;">${item.puntaje}</td></tr>`; });
        const media = (sum / reporte.acciones.length).toFixed(1);
        const obsHtml = reporte.observacion ? `<div class="pdf-obs-box"><div class="pdf-obs-header">OBSERVACIÓN FINAL</div><div style="font-size:12px; white-space: pre-wrap;">${reporte.observacion}</div></div>` : '';
        
        let qrHtml = "";
        if (docId) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?view=objetivos&id=' + docId)}`;
            qrHtml = `<img src="${qrUrl}" class="cover-qr">`;
        }

        const coverHtml = `
        <div class="pdf-slide pdf-cover">
            <img src="ESCUDO ATM.png" class="cover-bg-logo">
            ${qrHtml}
            <div class="cover-content">
                <img src="${foto}" class="cover-photo">
                <div class="cover-subtitle">SEGUIMIENTO DE OBJETIVOS</div>
                <div class="cover-name-premium">${p.nombre}</div>
                <div class="cover-info-bar">
                    <span>${p.categoria}</span> | <span>${p.equipo}</span> | <span>${reporte.fecha}</span>
                </div>
            </div>
            <div class="cover-footer">GUARDIANLAB ATM • DEPARTAMENTO DE PORTEROS</div>
        </div>`;

        const html = coverHtml + `<div class="pdf-slide"><div class="pdf-top-header"><div class="pdf-top-title">SEGUIMIENTO DE OBJETIVOS</div><img src="ESCUDO ATM.png" style="height:40px;"></div><div class="pdf-player-card" style="margin-bottom:20px;"><img src="${foto}" class="pdf-player-photo"><div class="pdf-player-info"><div class="pdf-player-name">${p.nombre}</div><div class="pdf-info-row"><span>EQUIPO: ${p.equipo}</span><span>FECHA: ${reporte.fecha}</span></div><div class="pdf-info-row" style="font-weight:bold;">NOTA MEDIA: ${media}</div></div></div><table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr style="background:#f0f0f0;"><th style="padding:10px; text-align:left">Acción</th><th style="padding:10px; text-align:center;">Nivel</th><th style="padding:10px; text-align:center;">Nota</th></tr></thead><tbody>${filas}</tbody></table>${obsHtml}</div>`;
        
        document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait');
        const pEl = document.getElementById('preview-content');
        if(pEl) pEl.innerHTML = html;
        document.getElementById('modal-pdf-preview').style.display = 'flex';
    });
}
function cargarHistorialObjetivos() { 
    db.collection("reportes_objetivos").orderBy("timestamp", "desc").limit(10).onSnapshot(snap => { 
        const cont = document.getElementById('lista-seguimientos');
        if(snap.empty) { cont.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No hay datos aún.</div>'; return; }
        cont.innerHTML = ''; 
        snap.forEach(doc => { 
            const rep = doc.data(); 
            db.collection("porteros").doc(rep.porteroId).get().then(pDoc => { 
                if(pDoc.exists) { 
                    const p = pDoc.data(); 
                    cont.innerHTML += `<div class="eval-card"><div><div style="font-weight:bold;">${p.nombre}</div><div style="font-size:0.8rem;">${rep.fecha} - ${rep.acciones.length} Acciones</div></div><div style="display:flex;gap:5px;"><button class="btn-icon-action" onclick="window.editarInformeObjetivos('${doc.id}')" title="Editar">✏️</button><button class="btn-icon-action" onclick='verPDFObjetivosGuardado(${JSON.stringify(rep).replace(/'/g, "&#39;")}, "${doc.id}")' title="Ver PDF">📄</button><button class="btn-trash" onclick="db.collection('reportes_objetivos').doc('${doc.id}').delete()">🗑️</button></div></div>`; 
                } 
            }); 
        }); 
    }); 
}
window.verPDFObjetivosGuardado = function(rep, docId) { generarPDFObjetivos(rep, docId); }

window.actualizarProgresoGeneral = function(formId) {
    const form = document.getElementById(formId);
    if(!form) return;
    
    const inputs = form.querySelectorAll('input:not([type="date"]), select:not(#inf-portero):not(#inf-tipo):not(#perfil-val-general):not(#tor-portero):not(#tor-superficie):not(#tor-copiar-base):not(#tor-val-general), textarea');
    let filled = 0; let total = 0;
    inputs.forEach(inp => { if(!inp.id.startsWith('btn-')) { total++; if(inp.value.trim() !== '') filled++; } });
    
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    const progressEl = document.getElementById('floating-progress');
    if(progressEl) {
        progressEl.classList.add('visible');
        document.getElementById('fp-fill').style.height = pct + '%';
        document.getElementById('fp-pct-text').innerText = pct + '%';
    }
}

window.guardarBorradorSemestral = function() {
    const pid = document.getElementById('inf-portero').value;
    if(!pid) return alert("Selecciona un portero primero para guardar el borrador.");

    const btn = document.getElementById('btn-draft-informe');
    const originalText = btn.innerText;
    btn.innerText = "Guardando...";

    const datos = {
        titulo: document.getElementById('inf-titulo').value, tipoInforme: document.getElementById('inf-tipo').value, 
        perfil: { pos1: document.getElementById('perfil-pos-1').value, pos2: document.getElementById('perfil-pos-2').value, val_gen: document.getElementById('perfil-val-general').value },
        dc: { jornada: document.getElementById('dc-jornada').value, convocatorias: document.getElementById('dc-convocatorias').value, titular: document.getElementById('dc-titular').value, min1: document.getElementById('dc-min1').value, min2: document.getElementById('dc-min2').value, goles: document.getElementById('dc-goles').value, lesion: document.getElementById('dc-lesion').value, disciplina: document.getElementById('dc-disciplina').value, tecnica: document.getElementById('dc-tecnica').value, t_asist: document.getElementById('dc-torneos-asist').value, t_conv: document.getElementById('dc-torneos-conv').value },
        cg: { tec_def: document.getElementById('cg-tec-def').value, tec_of: document.getElementById('cg-tec-of').value, rec_tec: document.getElementById('cg-rec-tec').value, niv_comp: document.getElementById('cg-niv-comp').value, const: document.getElementById('cg-const').value, comp_juego: document.getElementById('cg-comp-juego').value, imp: document.getElementById('cg-imp').value, lid: document.getElementById('cg-lid').value, des: document.getElementById('cg-des').value, con: document.getElementById('cg-con').value, mot: document.getElementById('cg-mot').value, act: document.getElementById('cg-act').value },
        cpp: { pos: document.getElementById('cpp-pos').value, bloc: document.getElementById('cpp-bloc').value, col: document.getElementById('cpp-col').value, desp: document.getElementById('cpp-desp').value, aereo: document.getElementById('cpp-aereo').value, pie: document.getElementById('cpp-pie').value, uno: document.getElementById('cpp-1v1').value, vel: document.getElementById('cpp-vel').value, agi: document.getElementById('cpp-agi').value },
        vfj: { ataque: document.getElementById('vfj-ataque').value, tr_def: document.getElementById('vfj-tr-def').value, defensa: document.getElementById('vfj-defensa').value, tr_of: document.getElementById('vfj-tr-of').value, obs: document.getElementById('vfj-obs').value },
        vac: { soc: document.getElementById('vac-soc').value, const: document.getElementById('vac-const').value, disc: document.getElementById('vac-disc').value, act: document.getElementById('vac-act').value, comp: document.getElementById('vac-comp').value, evo: document.getElementById('vac-evo').value, obs: document.getElementById('vac-obs').value },
        aca: { ev1: { media: document.getElementById('aca-1-media').value, asig: document.getElementById('aca-1-asig').value, susp: document.getElementById('aca-1-susp').value }, ev2: { media: document.getElementById('aca-2-media').value, asig: document.getElementById('aca-2-asig').value, susp: document.getElementById('aca-2-susp').value }, ev3: { media: document.getElementById('aca-3-media').value, asig: document.getElementById('aca-3-asig').value, susp: document.getElementById('aca-3-susp').value } }
    };

    const payload = { porteroId: pid, fecha: new Date().toISOString(), datos: datos, isDraft: true };

    if(informeEnEdicionId) {
        db.collection('informes_semestrales').doc(informeEnEdicionId).update(payload).then(()=>{ 
            window.haptic('success');
            btn.innerText = "✅ BORRADOR GUARDADO";
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    } else {
        db.collection('informes_semestrales').add(payload).then(docRef => {
            informeEnEdicionId = docRef.id; 
            window.haptic('success');
            btn.innerText = "✅ BORRADOR GUARDADO";
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    }
}

window.editarInformeSemestral = function(id) {
    db.collection("informes_semestrales").doc(id).get().then(doc => {
        const d = doc.data();
        const data = d.datos;
        informeEnEdicionId = id; 

        document.getElementById('inf-portero').value = d.porteroId;
        document.getElementById('inf-titulo').value = data.titulo || '';
        document.getElementById('inf-tipo').value = data.tipoInforme || 'INFORME DICIEMBRE';

        const perfil = data.perfil || {};
        const dc = data.dc || {};
        const cg = data.cg || {};
        const cpp = data.cpp || {};
        const vfj = data.vfj || {};
        const vac = data.vac || {};
        const aca = data.aca || {};
        const ev1 = aca.ev1 || {};
        const ev2 = aca.ev2 || {};
        const ev3 = aca.ev3 || {};

        document.getElementById('perfil-pos-1').value = perfil.pos1 || '';
        document.getElementById('perfil-pos-2').value = perfil.pos2 || '';
        document.getElementById('perfil-val-general').value = perfil.val_gen || 'MEDIA';

        document.getElementById('dc-jornada').value = dc.jornada || '';
        document.getElementById('dc-convocatorias').value = dc.convocatorias || '';
        document.getElementById('dc-titular').value = dc.titular || '';
        document.getElementById('dc-min1').value = dc.min1 || '';
        document.getElementById('dc-min2').value = dc.min2 || '';
        document.getElementById('dc-goles').value = dc.goles || '';
        document.getElementById('dc-lesion').value = dc.lesion || '';
        document.getElementById('dc-disciplina').value = dc.disciplina || '';
        document.getElementById('dc-tecnica').value = dc.tecnica || '';
        document.getElementById('dc-torneos-asist').value = dc.t_asist || '';
        document.getElementById('dc-torneos-conv').value = dc.t_conv || '';

        document.getElementById('cg-tec-def').value = cg.tec_def || ''; window.aplicarColorSelect(document.getElementById('cg-tec-def'), 4);
        document.getElementById('cg-tec-of').value = cg.tec_of || ''; window.aplicarColorSelect(document.getElementById('cg-tec-of'), 4);
        document.getElementById('cg-rec-tec').value = cg.rec_tec || ''; window.aplicarColorSelect(document.getElementById('cg-rec-tec'), 4);
        document.getElementById('cg-niv-comp').value = cg.niv_comp || ''; window.aplicarColorSelect(document.getElementById('cg-niv-comp'), 4);
        document.getElementById('cg-const').value = cg.const || ''; window.aplicarColorSelect(document.getElementById('cg-const'), 4);
        document.getElementById('cg-comp-juego').value = cg.comp_juego || ''; window.aplicarColorSelect(document.getElementById('cg-comp-juego'), 4);
        document.getElementById('cg-imp').value = cg.imp || ''; window.aplicarColorSelect(document.getElementById('cg-imp'), 4);
        document.getElementById('cg-lid').value = cg.lid || ''; window.aplicarColorSelect(document.getElementById('cg-lid'), 4);
        document.getElementById('cg-des').value = cg.des || ''; window.aplicarColorSelect(document.getElementById('cg-des'), 4);
        document.getElementById('cg-con').value = cg.con || ''; window.aplicarColorSelect(document.getElementById('cg-con'), 4);
        document.getElementById('cg-mot').value = cg.mot || ''; window.aplicarColorSelect(document.getElementById('cg-mot'), 4);
        document.getElementById('cg-act').value = cg.act || ''; window.aplicarColorSelect(document.getElementById('cg-act'), 4);

        document.getElementById('cpp-pos').value = cpp.pos || ''; window.aplicarColorSelect(document.getElementById('cpp-pos'), 4);
        document.getElementById('cpp-bloc').value = cpp.bloc || ''; window.aplicarColorSelect(document.getElementById('cpp-bloc'), 4);
        document.getElementById('cpp-col').value = cpp.col || ''; window.aplicarColorSelect(document.getElementById('cpp-col'), 4);
        document.getElementById('cpp-desp').value = cpp.desp || ''; window.aplicarColorSelect(document.getElementById('cpp-desp'), 4);
        document.getElementById('cpp-aereo').value = cpp.aereo || ''; window.aplicarColorSelect(document.getElementById('cpp-aereo'), 4);
        document.getElementById('cpp-pie').value = cpp.pie || ''; window.aplicarColorSelect(document.getElementById('cpp-pie'), 4);
        document.getElementById('cpp-1v1').value = cpp.uno || ''; window.aplicarColorSelect(document.getElementById('cpp-1v1'), 4);
        document.getElementById('cpp-vel').value = cpp.vel || ''; window.aplicarColorSelect(document.getElementById('cpp-vel'), 4);
        document.getElementById('cpp-agi').value = cpp.agi || ''; window.aplicarColorSelect(document.getElementById('cpp-agi'), 4);

        document.getElementById('vfj-ataque').value = vfj.ataque || ''; window.aplicarColorSelect(document.getElementById('vfj-ataque'), 5);
        document.getElementById('vfj-tr-def').value = vfj.tr_def || ''; window.aplicarColorSelect(document.getElementById('vfj-tr-def'), 5);
        document.getElementById('vfj-defensa').value = vfj.defensa || ''; window.aplicarColorSelect(document.getElementById('vfj-defensa'), 5);
        document.getElementById('vfj-tr-of').value = vfj.tr_of || ''; window.aplicarColorSelect(document.getElementById('vfj-tr-of'), 5);
        document.getElementById('vfj-obs').value = vfj.obs || '';

        document.getElementById('vac-soc').value = vac.soc || ''; window.aplicarColorSelect(document.getElementById('vac-soc'), 5);
        document.getElementById('vac-const').value = vac.const || ''; window.aplicarColorSelect(document.getElementById('vac-const'), 5);
        document.getElementById('vac-disc').value = vac.disc || ''; window.aplicarColorSelect(document.getElementById('vac-disc'), 5);
        document.getElementById('vac-act').value = vac.act || ''; window.aplicarColorSelect(document.getElementById('vac-act'), 5);
        document.getElementById('vac-comp').value = vac.comp || ''; window.aplicarColorSelect(document.getElementById('vac-comp'), 5);
        document.getElementById('vac-evo').value = vac.evo || ''; window.aplicarColorSelect(document.getElementById('vac-evo'), 5);
        document.getElementById('vac-obs').value = vac.obs || '';

        document.getElementById('aca-1-media').value = ev1.media || '';
        document.getElementById('aca-1-asig').value = ev1.asig || '';
        document.getElementById('aca-1-susp').value = ev1.susp || '';
        document.getElementById('aca-2-media').value = ev2.media || '';
        document.getElementById('aca-2-asig').value = ev2.asig || '';
        document.getElementById('aca-2-susp').value = ev2.susp || '';
        document.getElementById('aca-3-media').value = ev3.media || '';
        document.getElementById('aca-3-asig').value = ev3.asig || '';
        document.getElementById('aca-3-susp').value = ev3.susp || '';

        window.actualizarProgresoGeneral('form-informe-semestral'); 

        document.getElementById('btn-save-informe').innerText = "💾 ACTUALIZAR Y VER INFORME";
        document.getElementById('btn-cancel-informe').style.display = "inline-block";
        window.scrollTo({top:0, behavior:'smooth'});
    });
}

window.cancelarEdicionInforme = function() {
    informeEnEdicionId = null;
    document.getElementById('inf-portero').value = '';
    const textInputs = ['inf-titulo', 'perfil-pos-1', 'perfil-pos-2', 'dc-jornada', 'dc-convocatorias', 'dc-titular', 'dc-min1', 'dc-min2', 'dc-goles', 'dc-lesion', 'dc-disciplina', 'dc-tecnica', 'dc-torneos-asist', 'dc-torneos-conv', 'cg-tec-def', 'cg-tec-of', 'cg-rec-tec', 'cg-niv-comp', 'cg-const', 'cg-comp-juego', 'cg-imp', 'cg-lid', 'cg-des', 'cg-con', 'cg-mot', 'cg-act', 'cpp-pos', 'cpp-bloc', 'cpp-col', 'cpp-desp', 'cpp-aereo', 'cpp-pie', 'cpp-1v1', 'cpp-vel', 'cpp-agi', 'vfj-ataque', 'vfj-tr-def', 'vfj-defensa', 'vfj-tr-of', 'vfj-obs', 'vac-soc', 'vac-const', 'vac-disc', 'vac-act', 'vac-comp', 'vac-evo', 'vac-obs', 'aca-1-media', 'aca-1-asig', 'aca-1-susp', 'aca-2-media', 'aca-2-asig', 'aca-2-susp', 'aca-3-media', 'aca-3-asig', 'aca-3-susp'];
    textInputs.forEach(id => { 
        let inp = document.getElementById(id);
        if(inp){
            inp.value = ''; 
            inp.classList.remove('rating-red', 'rating-yellow', 'rating-green');
        }
    });
    document.getElementById('inf-tipo').value = 'INFORME DICIEMBRE';
    document.getElementById('perfil-val-general').value = 'MEDIA';
    document.getElementById('btn-save-informe').innerText = "💾 GENERAR Y GUARDAR (FINAL)";
    document.getElementById('btn-cancel-informe').style.display = "none";
    document.getElementById('floating-progress').classList.remove('visible');
}

window.generarPDFInforme = function() {
    const pid = document.getElementById('inf-portero').value; if(!pid) return alert("Selecciona un portero");

    const datos = {
        titulo: document.getElementById('inf-titulo').value, tipoInforme: document.getElementById('inf-tipo').value, 
        perfil: { pos1: document.getElementById('perfil-pos-1').value, pos2: document.getElementById('perfil-pos-2').value, val_gen: document.getElementById('perfil-val-general').value },
        dc: { jornada: document.getElementById('dc-jornada').value, convocatorias: document.getElementById('dc-convocatorias').value, titular: document.getElementById('dc-titular').value, min1: document.getElementById('dc-min1').value, min2: document.getElementById('dc-min2').value, goles: document.getElementById('dc-goles').value, lesion: document.getElementById('dc-lesion').value, disciplina: document.getElementById('dc-disciplina').value, tecnica: document.getElementById('dc-tecnica').value, t_asist: document.getElementById('dc-torneos-asist').value, t_conv: document.getElementById('dc-torneos-conv').value },
        cg: { tec_def: document.getElementById('cg-tec-def').value, tec_of: document.getElementById('cg-tec-of').value, rec_tec: document.getElementById('cg-rec-tec').value, niv_comp: document.getElementById('cg-niv-comp').value, const: document.getElementById('cg-const').value, comp_juego: document.getElementById('cg-comp-juego').value, imp: document.getElementById('cg-imp').value, lid: document.getElementById('cg-lid').value, des: document.getElementById('cg-des').value, con: document.getElementById('cg-con').value, mot: document.getElementById('cg-mot').value, act: document.getElementById('cg-act').value },
        cpp: { pos: document.getElementById('cpp-pos').value, bloc: document.getElementById('cpp-bloc').value, col: document.getElementById('cpp-col').value, desp: document.getElementById('cpp-desp').value, aereo: document.getElementById('cpp-aereo').value, pie: document.getElementById('cpp-pie').value, uno: document.getElementById('cpp-1v1').value, vel: document.getElementById('cpp-vel').value, agi: document.getElementById('cpp-agi').value },
        vfj: { ataque: document.getElementById('vfj-ataque').value, tr_def: document.getElementById('vfj-tr-def').value, defensa: document.getElementById('vfj-defensa').value, tr_of: document.getElementById('vfj-tr-of').value, obs: document.getElementById('vfj-obs').value },
        vac: { soc: document.getElementById('vac-soc').value, const: document.getElementById('vac-const').value, disc: document.getElementById('vac-disc').value, act: document.getElementById('vac-act').value, comp: document.getElementById('vac-comp').value, evo: document.getElementById('vac-evo').value, obs: document.getElementById('vac-obs').value },
        aca: { ev1: { media: document.getElementById('aca-1-media').value, asig: document.getElementById('aca-1-asig').value, susp: document.getElementById('aca-1-susp').value }, ev2: { media: document.getElementById('aca-2-media').value, asig: document.getElementById('aca-2-asig').value, susp: document.getElementById('aca-2-susp').value }, ev3: { media: document.getElementById('aca-3-media').value, asig: document.getElementById('aca-3-asig').value, susp: document.getElementById('aca-3-susp').value } }
    };

    const payload = { porteroId: pid, fecha: new Date().toISOString(), datos: datos, isDraft: false }; 

    let pIdPromise = informeEnEdicionId 
        ? db.collection('informes_semestrales').doc(informeEnEdicionId).update(payload).then(()=>informeEnEdicionId)
        : db.collection('informes_semestrales').add(payload).then(ref=>ref.id);

    pIdPromise.then((docId) => { 
        window.haptic('success');
        db.collection("porteros").doc(pid).get().then(doc => { 
            const pData = doc.exists ? doc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' };
            const html = construirHTMLInformeVertical(pData, datos, docId); 
            document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait'); 
            
            const pEl = document.getElementById('preview-content');
            if(pEl) pEl.innerHTML = html; 
            document.getElementById('modal-pdf-preview').style.display = 'flex';
            cancelarEdicionInforme();
        }); 
    });
}

function construirHTMLInformeVertical(p, d, docId) {
    p = p || { nombre: 'Desconocido', equipo: '-', categoria: '-', anio: '-', nacionalidad: '-', pie: '-', anosClub: '-' };
    const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
    const rowRat = (label, val) => `<div class="pdf-rating-row"><span>${label}</span><span class="pdf-rating-val">${val||'-'}</span></div>`;
    const rowStat = (lbl, val) => `<div class="pdf-stat-cell"><span class="pdf-stat-label">${lbl}</span><span class="pdf-stat-num">${val||'-'}</span></div>`;
    
    const perfil = d.perfil || {};
    const dc = d.dc || {};
    const cg = d.cg || {};
    const cpp = d.cpp || {};
    const vfj = d.vfj || {};
    const vac = d.vac || {};
    const aca = d.aca || {};
    const ev1 = aca.ev1 || {};
    const ev2 = aca.ev2 || {};
    const ev3 = aca.ev3 || {};

    let valClass = "val-media"; 
    if(perfil.val_gen === "BAJA") valClass = "val-baja"; 
    if(perfil.val_gen === "ALTA") valClass = "val-alta"; 
    if(perfil.val_gen === "EXCEPCIONAL") valClass = "val-excepcional";

    let qrHtml = "";
    if (docId) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?view=semestral&id=' + docId)}`;
        qrHtml = `<img src="${qrUrl}" class="cover-qr">`;
    }

    const coverHtml = `
    <div class="pdf-slide pdf-cover">
        <img src="ESCUDO ATM.png" class="cover-bg-logo">
        ${qrHtml}
        <div class="cover-content">
            <img src="${foto}" class="cover-photo">
            <div class="cover-title">${d.tipoInforme || 'INFORME SEMESTRAL'}</div>
            <div class="cover-name-premium">${p.nombre}</div>
            <div class="cover-details">
                <span>${p.categoria}</span> | <span>${p.equipo}</span> | <span>${d.titulo || '-'}</span>
            </div>
        </div>
        <div class="cover-footer">GUARDIANLAB ATM • DEPARTAMENTO DE PORTEROS</div>
    </div>`;

    return coverHtml + `
    <div class="pdf-slide">
        <div class="pdf-top-header"><div><div class="pdf-top-title">VALORACIÓN POSICIÓN</div><div class="pdf-top-subtitle">${d.titulo || '-'}</div><div style="font-size:10px; color:#1C2C5B; font-weight:bold;">${d.tipoInforme || '-'}</div></div><img src="ESCUDO ATM.png" style="height:40px;"></div>
        
        <div class="pdf-row">
            <div style="width:40%" class="pdf-player-card">
                <img src="${foto}" class="pdf-player-photo">
                <div class="pdf-player-info"><div class="pdf-player-name">${p.nombre}</div><div class="pdf-info-row"><span>NAC: ${p.anio||'-'}</span><span>NAC: ${p.nacionalidad||'-'}</span></div><div class="pdf-info-row"><span>CAT: ${p.categoria}</span><span>EQ: ${p.equipo}</span></div><div class="pdf-info-row"><span>AÑOS: ${p.anosClub||'-'}</span><span>PIE: ${p.pie||'-'}</span></div><div class="pdf-info-row" style="margin-top:5px; font-weight:bold; color:#1C2C5B">PROY: 1ª ${perfil.pos1||'-'} | 2ª ${perfil.pos2||'-'}</div>
                <div class="pdf-mini-field"><div class="field-line field-center"></div><div class="field-line field-circle"></div><div class="field-line field-area"></div><div class="field-pos-1">1</div></div>
                </div>
            </div>
            <div style="width:60%" class="pdf-rating-box"><div class="pdf-box-title">2. DATOS DE COMPETICIÓN</div><div class="pdf-stats-grid">${rowStat("Jornada Actual", dc.jornada)}${rowStat("Convocatorias", dc.convocatorias)}${rowStat("Titular", dc.titular)}${rowStat("Min. Pos 1", dc.min1)}${rowStat("Min. Pos 2", dc.min2)}${rowStat("Goles Enc.", dc.goles)}${rowStat("Ausencia Lesión", dc.lesion)}${rowStat("Ausencia Disc.", dc.disciplina)}</div><div class="pdf-stats-grid" style="margin-top:2px;">${rowStat("Ausencia Tec.", dc.tecnica)}${rowStat("Torneos Asist.", dc.t_asist)}${rowStat("Torneos Conv.", dc.t_conv)}</div></div>
        </div>

        <div class="pdf-section-header">3. VALORACIÓN DEPORTIVA</div>
        <div class="pdf-row">
            <div class="pdf-half-col pdf-rating-box"><div class="pdf-box-title">CUALIDADES GENERALES</div>${rowRat("Repertorio técnico defensivo", cg.tec_def)}${rowRat("Repertorio técnico ofensivo", cg.tec_of)}${rowRat("Adecuación uso recursos", cg.rec_tec)}${rowRat("Nivel competitivo", cg.niv_comp)}${rowRat("Constancia rendimiento", cg.const)}${rowRat("Comprensión del juego", cg.comp_juego)}${rowRat("Implicación entrenamientos", cg.imp)}${rowRat("Liderazgo con el grupo", cg.lid)}${rowRat("Destreza general etapa", cg.des)}${rowRat("Conciencia objetivos", cg.con)}${rowRat("Motivación individual", cg.mot)}${rowRat("Comportamiento actitudinal", cg.act)}</div>
            <div class="pdf-half-col pdf-rating-box"><div class="pdf-box-title">CUALIDADES PUESTO PROYECCIÓN 1: PORTERO</div>${rowRat("Posición básica", cpp.pos)}${rowRat("Blocaje", cpp.bloc)}${rowRat("Colocación", cpp.col)}${rowRat("Desplazamientos y caídas", cpp.desp)}${rowRat("Dominio área (aéreo)", cpp.aereo)}${rowRat("Reinicio (mano y pie)", cpp.pie)}${rowRat("Uno contra uno", cpp.uno)}${rowRat("Velocidad específica", cpp.vel)}${rowRat("Agilidad", cpp.agi)}</div>
        </div>

        <div class="pdf-section-header">4. VALORES POR FASE DE JUEGO (1-5)</div>
        <div class="pdf-rating-box">
            <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:bold; margin-bottom:4px; padding:0 10px;"><span>ATAQUE: ${vfj.ataque||'-'}</span><span>TRANS. DEF: ${vfj.tr_def||'-'}</span><span>DEFENSA: ${vfj.defensa||'-'}</span><span>TRANS. OF: ${vfj.tr_of||'-'}</span></div>
            <div class="pdf-box-title" style="margin-top:5px; background:#ddd; color:#333;">OBSERVACIONES TÉCNICO-TÁCTICAS</div>
            <div class="pdf-text-obs">${vfj.obs||'-'}</div>
        </div>

        <div class="pdf-section-header">5. VALORES ACTITUDINALES (1-5)</div>
        <div class="pdf-rating-box">
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:5px;">${rowRat("Sociabilidad", vac.soc)}${rowRat("Constancia", vac.const)}${rowRat("Disciplina", vac.disc)}${rowRat("Actitud", vac.act)}${rowRat("Compromiso", vac.comp)}${rowRat("Evolución", vac.evo)}</div>
            <div class="pdf-box-title" style="margin-top:5px; background:#ddd; color:#333;">OBSERVACIONES ACTITUDINALES</div>
            <div class="pdf-text-obs">${vac.obs||'-'}</div>
        </div>

        <div class="pdf-rating-box"><div class="pdf-box-title">6. CONTROL ACADÉMICO</div><div class="pdf-academic-box"><div class="pdf-aca-item"><span><strong>1ª EVAL:</strong></span> Media: ${ev1.media||'-'} | Asig: ${ev1.asig||'-'} | Susp: ${ev1.susp||'-'}</div><div class="pdf-aca-item"><span><strong>2ª EVAL:</strong></span> Media: ${ev2.media||'-'} | Asig: ${ev2.asig||'-'} | Susp: ${ev2.susp||'-'}</div><div class="pdf-aca-item" style="border:none"><span><strong>3ª EVAL:</strong></span> Media: ${ev3.media||'-'} | Asig: ${ev3.asig||'-'} | Susp: ${ev3.susp||'-'}</div></div></div>
        
        <div style="margin-top:auto; padding-top:10px; text-align:center;">
            <div style="font-size:12px; font-weight:bold; color:#1C2C5B; margin-bottom:6px; text-transform:uppercase;">VALORACIÓN GENERAL DEL SEMESTRE</div>
            <div class="${valClass}" style="display:inline-block; padding:10px 40px; border-radius:25px; font-size:18px; font-weight:800; border: 2px solid rgba(0,0,0,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">${perfil.val_gen || 'NO EVALUADO'}</div>
        </div>
        
        <div style="text-align:center; font-size:8px; margin-top:5px; color:#999;">GuardianLab ATM - Informe Técnico</div>
    </div>`;
}

function cargarHistorialInformes() { 
    db.collection("informes_semestrales").orderBy("fecha", "desc").limit(10).onSnapshot(snap => { 
        const cont = document.getElementById('lista-informes-guardados');
        if(snap.empty) { cont.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No hay datos aún.</div>'; return; }
        cont.innerHTML = ''; 
        snap.forEach(doc => { 
            const inf = doc.data(); 
            db.collection("porteros").doc(inf.porteroId).get().then(pDoc => { 
                if(pDoc.exists) { 
                    const p = pDoc.data(); 
                    let draftBadge = inf.isDraft ? '<span class="draft-badge">⏳ BORRADOR</span>' : '';
                    let cardClass = inf.isDraft ? 'card-draft' : '';
                    
                    let btnAction = inf.isDraft 
                        ? `<button class="btn-icon-action" style="color:#F1C40F; border-color:#F1C40F;" onclick="window.editarInformeSemestral('${doc.id}')" title="Continuar Editando">✏️ Continuar</button>`
                        : `<button class="btn-icon-action" onclick="window.editarInformeSemestral('${doc.id}')" title="Editar">✏️</button><button class="btn-icon-action" onclick="window.compartirFichaWeb('semestral', '${doc.id}')" title="Compartir Web">🔗</button><button class="btn-icon-action" onclick="window.verPDFInformeGuardado('${doc.id}')" title="Ver PDF">📄</button>`;

                    cont.innerHTML += `<div class="eval-card ${cardClass}"><div><div style="font-weight:bold;">${p.nombre}</div><div style="font-size:0.8rem;">${inf.datos.titulo} ${draftBadge}</div><div style="font-size:0.7rem; color:#aaa">${inf.fecha.substring(0,10)}</div></div><div style="display:flex; gap:5px;">${btnAction}<button class="btn-trash" onclick="db.collection('informes_semestrales').doc('${doc.id}').delete()">🗑️</button></div></div>`; 
                } 
            }); 
        }); 
    }); 
}

window.verPDFInformeGuardado = function(id) { 
    db.collection("informes_semestrales").doc(id).get().then(doc => { 
        if(doc.exists) { 
            const data = doc.data(); 
            db.collection("porteros").doc(data.porteroId).get().then(pDoc => { 
                const pData = pDoc.exists ? pDoc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' };
                const html = construirHTMLInformeVertical(pData, data.datos, doc.id); 
                document.body.classList.remove('print-landscape'); 
                document.body.classList.add('print-portrait'); 
                
                const pEl = document.getElementById('preview-content');
                if(pEl) pEl.innerHTML = html; 
                document.getElementById('modal-pdf-preview').style.display = 'flex'; 
            }).catch(err => console.error("Error al obtener portero:", err)); 
        } 
    }).catch(err => console.error("Error al obtener informe:", err)); 
}

// ==========================================
// --- MÓDULO DE TORNEOS ---
// ==========================================

const optGoles = '<option value="">-</option>' + Array.from({length: 21}, (_, i) => `<option value="${i}">${i}</option>`).join('');
const optFases = `<option value="Grupos J1">Grupos J1</option><option value="Grupos J2">Grupos J2</option><option value="Grupos J3">Grupos J3</option><option value="Grupos J4">Grupos J4</option><option value="Grupos J5">Grupos J5</option><option value="Grupos J6">Grupos J6</option><option value="Grupos J7">Grupos J7</option><option value="Grupos J8">Grupos J8</option><option value="1/16 Final">1/16 Final</option><option value="1/8 Final">1/8 Final</option><option value="1/4 Final">1/4 Final</option><option value="Semifinal">Semifinal</option><option value="Final">Final</option><option value="3º/4º Puesto">3º/4º Puesto</option>`;

window.procesarLogoTorneo = function(input) {
    if(input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            document.getElementById('tor-logo-b64').value = e.target.result;
            const preview = document.getElementById('tor-logo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            window.actualizarProgresoGeneral('form-informe-torneo');
        };
        r.readAsDataURL(input.files[0]);
    }
}

// RADAR ANTI-CUELGUE TABLET
window.generarGraficoRadar = function(rndId, val) {
    const parseVal = (v) => { const n = parseInt(v); return isNaN(n) ? 3 : n; };
    
    const avgLiderazgo = ((parseVal(val.personalidad) + parseVal(val.mando) + parseVal(val.comunicacion)) / 3).toFixed(1);
    const avgMentalidad = ((parseVal(val.error) + parseVal(val.actitudGol) + parseVal(val.mentalidad)) / 3).toFixed(1);
    const avgConcentracion = ((parseVal(val.concentracion) + parseVal(val.confianza)) / 2).toFixed(1);
    const avgTactica = ((parseVal(val.unoVuno) + parseVal(val.organizacion)) / 2).toFixed(1);
    const avgEvolucion = ((parseVal(val.primerUltimo) + parseVal(val.mejoraBajon)) / 2).toFixed(1);
    const avgAdaptacion = ((parseVal(val.ritmo) + parseVal(val.entorno)) / 2).toFixed(1);

    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 600;
    canvas.style.position = 'absolute';
    canvas.style.top = '-9999px';
    document.body.appendChild(canvas);

    const chart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: ['Liderazgo', 'Mentalidad', 'Concentración', 'Táctica', 'Evolución', 'Adaptación'],
            datasets: [{
                data: [avgLiderazgo, avgMentalidad, avgConcentracion, avgTactica, avgEvolucion, avgAdaptacion],
                backgroundColor: 'rgba(203, 53, 36, 0.4)',
                borderColor: 'rgba(203, 53, 36, 1)',
                pointBackgroundColor: '#1C2C5B',
                pointBorderColor: '#fff',
                borderWidth: 3,
            }]
        },
        options: {
            animation: false,
            responsive: false, 
            scales: {
                r: {
                    min: 0, max: 5, ticks: { display: false },
                    pointLabels: { font: { size: 16, family: 'Montserrat', weight: 'bold' }, color: '#1C2C5B' },
                    grid: { color: 'rgba(0,0,0,0.1)' },
                    angleLines: { color: 'rgba(0,0,0,0.1)' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    setTimeout(() => {
        try {
            const imgB64 = chart.toBase64Image('image/png', 1.0);
            const imgPreview = document.getElementById(`radar-img-${rndId}`);
            if(imgPreview) { imgPreview.src = imgB64; imgPreview.style.display = 'block'; }
            chart.destroy();
            canvas.remove();
        } catch(e) { console.error("Error al generar radar:", e); }
    }, 150);
}

function cargarHistorialTorneos() {
    db.collection("informes_torneo").orderBy("fecha", "desc").limit(20).onSnapshot(snap => {
        const cont = document.getElementById('lista-torneos-guardados');
        const selCopiar = document.getElementById('tor-copiar-base');
        if(snap.empty) { 
            if(cont) cont.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">No hay datos aún.</div>'; 
            return; 
        }
        if(cont) cont.innerHTML = '';
        
        let opcionesCopiar = '<option value="">-- Seleccionar Torneo --</option>';

        snap.forEach(doc => {
            const inf = doc.data();
            
            db.collection("porteros").doc(inf.porteroId).get().then(pDoc => {
                if(pDoc.exists) {
                    const p = pDoc.data();
                    let draftBadge = inf.isDraft ? '<span class="draft-badge">⏳ BORRADOR</span>' : '';
                    let cardClass = inf.isDraft ? 'card-draft' : '';
                    
                    let btnAction = inf.isDraft 
                        ? `<button class="btn-icon-action" style="color:#F1C40F; border-color:#F1C40F;" onclick="window.editarInformeTorneo('${doc.id}')" title="Continuar Editando">✏️ Continuar</button>`
                        : `<button class="btn-icon-action" onclick="window.editarInformeTorneo('${doc.id}')" title="Editar">✏️</button><button class="btn-icon-action" onclick="window.compartirFichaWeb('torneo', '${doc.id}')" title="Compartir Web">🔗</button><button class="btn-icon-action" onclick="window.verPDFTorneoGuardado('${doc.id}')" title="Ver">📄</button>`;

                    if(cont) {
                        cont.innerHTML += `<div class="eval-card ${cardClass}">
                            <div>
                                <div style="font-weight:bold;">${p.nombre}</div>
                                <div style="font-size:0.8rem; color:var(--text-sec);">${inf.datos.torneo} ${draftBadge}</div>
                                <div style="font-size:0.7rem; color:var(--atm-red);">${inf.fecha.substring(0,10)}</div>
                            </div>
                            <div style="display:flex; gap:5px;">
                                ${btnAction}
                                <button class="btn-trash" onclick="db.collection('informes_torneo').doc('${doc.id}').delete()" title="Borrar">🗑️</button>
                            </div>
                        </div>`;
                    }

                    opcionesCopiar += `<option value="${doc.id}">${inf.datos.torneo} - ${p.nombre}</option>`;
                    if(selCopiar) selCopiar.innerHTML = opcionesCopiar;
                }
            });
        });
    });
}

window.guardarBorradorTorneo = function() {
    const pid = document.getElementById('tor-portero').value;
    if(!pid) return alert("Selecciona un portero primero para guardar el borrador.");

    const btn = document.getElementById('btn-draft-torneo');
    const originalText = btn.innerText;
    btn.innerText = "Guardando...";

    const partidos = [];
    document.querySelectorAll('.partido-row').forEach(row => {
        let riv = row.querySelector('.p-goles-riv').value;
        let gc = 0;
        if(riv && parseInt(riv) > 0) gc = row.querySelector('.p-gc-portero').value || 0;

        partidos.push({
            jornada: row.querySelector('.p-jornada').value,
            pais: row.querySelector('.p-pais').value,
            rival: row.querySelector('.p-rival').value,
            golesAtm: row.querySelector('.p-goles-atm').value,
            golesRival: riv,
            golesEncajados: gc,
            minutos: row.querySelector('.p-min').value || 0,
            penAtm: row.querySelector('.p-pen-atm').value,
            penRival: row.querySelector('.p-pen-riv').value
        });
    });

    const datos = {
        torneo: document.getElementById('tor-nombre').value,
        torneoLogo: document.getElementById('tor-logo-b64').value, 
        ubicacion: document.getElementById('tor-ubicacion').value,
        posFinal: document.getElementById('tor-pos-final').value,
        superficie: document.getElementById('tor-superficie').value,
        partidos: partidos,
        ctx: { 
            nivel: document.getElementById('tor-ctx-nivel').value, logistica: document.getElementById('tor-ctx-logistica').value, carga: document.getElementById('tor-ctx-carga').value, instalaciones: document.getElementById('tor-ctx-instalaciones').value
        },
        med: { 
            inicial: document.getElementById('tor-med-inicial').value, incidencias: document.getElementById('tor-med-incidencias').value
        },
        val: {
            personalidad: document.getElementById('tor-val-personalidad').value, mando: document.getElementById('tor-val-mando').value, concentracion: document.getElementById('tor-val-conc').value, error: document.getElementById('tor-val-error').value, confianza: document.getElementById('tor-val-confianza').value, mentalidad: document.getElementById('tor-val-mentalidad').value, actitudGol: document.getElementById('tor-val-actitud-gol').value, primerUltimo: document.getElementById('tor-val-primer-ultimo').value, ritmo: document.getElementById('tor-val-ritmo').value, mejoraBajon: document.getElementById('tor-val-mejora-bajon').value, entorno: document.getElementById('tor-val-entorno').value, unoVuno: document.getElementById('tor-val-1v1').value, organizacion: document.getElementById('tor-val-org').value, comunicacion: document.getElementById('tor-val-com').value
        },
        obs: {
            penaltis: document.getElementById('tor-obs-penaltis').value, decisivas: document.getElementById('tor-obs-decisivas').value, pos: document.getElementById('tor-obs-pos').value, neg: document.getElementById('tor-obs-neg').value, trans: document.getElementById('tor-obs-trans').value
        },
        val_gen: document.getElementById('tor-val-general').value
    };

    const payload = { porteroId: pid, fecha: new Date().toISOString(), datos: datos, isDraft: true };

    if(torneoEnEdicionId) {
        db.collection('informes_torneo').doc(torneoEnEdicionId).update(payload).then(()=>{
            window.haptic('success');
            btn.innerText = "✅ BORRADOR GUARDADO";
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    } else {
        db.collection('informes_torneo').add(payload).then(docRef => {
            torneoEnEdicionId = docRef.id; 
            window.haptic('success');
            btn.innerText = "✅ BORRADOR GUARDADO";
            setTimeout(() => btn.innerText = originalText, 2000);
        });
    }
}

window.copiarBaseTorneo = function(selectEl) {
    const id = selectEl.value;
    if(!id) return;
    
    db.collection("informes_torneo").doc(id).get().then(doc => {
        const data = doc.data().datos;
        
        document.getElementById('tor-nombre').value = data.torneo || '';
        document.getElementById('tor-ubicacion').value = data.ubicacion || '';
        document.getElementById('tor-pos-final').value = data.posFinal || '';
        document.getElementById('tor-superficie').value = data.superficie || 'Césped Natural';
        
        if (data.torneoLogo) {
            document.getElementById('tor-logo-b64').value = data.torneoLogo;
            const preview = document.getElementById('tor-logo-preview');
            preview.src = data.torneoLogo;
            preview.style.display = 'block';
        }

        if (data.ctx) {
            document.getElementById('tor-ctx-nivel').value = data.ctx.nivel || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-nivel'), 5);
            document.getElementById('tor-ctx-logistica').value = data.ctx.logistica || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-logistica'), 5);
            document.getElementById('tor-ctx-carga').value = data.ctx.carga || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-carga'), 5);
            document.getElementById('tor-ctx-instalaciones').value = data.ctx.instalaciones || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-instalaciones'), 5);
        }

        document.getElementById('contenedor-partidos').innerHTML = '';
        if(data.partidos) {
            data.partidos.forEach(p => window.agregarFilaPartido(p));
        }
        
        selectEl.value = "";
    });
}

window.agregarFilaPartido = function(data = null) {
    window.haptic('light');
    const container = document.getElementById('contenedor-partidos');
    const div = document.createElement('div');
    div.className = 'partido-row';
    
    div.innerHTML = `
        <div class="row align-items-center">
            <select class="p-jornada" style="flex:1.5" onchange="window.actualizarProgresoGeneral('form-informe-torneo')">${optFases}</select>
            <input type="text" class="p-rival" placeholder="Nombre Rival" style="flex:2" oninput="window.actualizarProgresoGeneral('form-informe-torneo')">
            <input type="text" class="p-pais" placeholder="País (Opcional)" style="flex:1" oninput="window.actualizarProgresoGeneral('form-informe-torneo')">
        </div>
        <div class="row align-items-end">
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Goles ATM</label><select class="p-goles-atm" onchange="window.actualizarFilaPartido(this)">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Goles Rival</label><select class="p-goles-riv" onchange="window.actualizarFilaPartido(this)">${optGoles}</select></div>
            <div style="flex:1; display:none;" class="p-gc-portero-container"><label style="font-size:0.6rem; color:var(--atm-red); font-weight:bold;">G.C. Portero</label><select class="p-gc-portero" onchange="window.actualizarProgresoGeneral('form-informe-torneo')">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Min. Jugados</label><input type="number" class="p-min" placeholder="Min" oninput="window.actualizarProgresoGeneral('form-informe-torneo')"></div>
            <button onclick="window.haptic('light'); this.parentElement.parentElement.remove(); window.actualizarProgresoGeneral('form-informe-torneo');" style="background:none; border:none; color:var(--atm-red); font-size:1.2rem; cursor:pointer;">❌</button>
        </div>
        <div class="p-penaltis-container row" style="display:none; background:rgba(203,53,36,0.1); padding:10px; border-radius:10px; margin-top:5px; border:1px dashed var(--atm-red);">
            <div style="flex:1.5; display:flex; align-items:center;">
                <label style="font-size:0.75rem; color:var(--text-main);">Hubo Penaltis:</label>
            </div>
            <div style="flex:1"><label style="font-size:0.6rem; color:var(--atm-red);">Pen. ATM</label><select class="p-pen-atm" onchange="window.actualizarProgresoGeneral('form-informe-torneo')">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:var(--atm-red);">Pen. Rival</label><select class="p-pen-riv" onchange="window.actualizarProgresoGeneral('form-informe-torneo')">${optGoles}</select></div>
        </div>
    `;
    container.appendChild(div);
    
    if (data) {
        div.querySelector('.p-jornada').value = data.jornada || data.fase || 'Grupos J1';
        div.querySelector('.p-pais').value = data.pais || '';
        div.querySelector('.p-rival').value = data.rival || '';
        
        let gAtm = data.golesAtm !== undefined ? data.golesAtm : '';
        let gRiv = data.golesRival !== undefined ? data.golesRival : (data.goles || '');
        
        if (data.resultado && gAtm === '' && gRiv === '') {
            let parts = data.resultado.split('-');
            if(parts.length === 2) { gAtm = parts[0].trim(); gRiv = parts[1].trim(); }
        }
        
        div.querySelector('.p-goles-atm').value = gAtm;
        div.querySelector('.p-goles-riv').value = gRiv;
        div.querySelector('.p-min').value = data.minutos || '';
        
        div.querySelector('.p-gc-portero').value = data.golesEncajados !== undefined ? data.golesEncajados : (gRiv || '0');
        
        window.actualizarFilaPartido(div.querySelector('.p-goles-atm'));
        
        if (data.penAtm !== undefined && data.penAtm !== "" && data.penRival !== undefined && data.penRival !== "") {
            div.querySelector('.p-pen-atm').value = data.penAtm || '';
            div.querySelector('.p-pen-riv').value = data.penRival || '';
            div.querySelector('.p-penaltis-container').style.display = 'flex'; 
        }
    }
    window.actualizarProgresoGeneral('form-informe-torneo');
}

window.actualizarFilaPartido = function(selectElement) {
    const row = selectElement.closest('.partido-row');
    const atm = row.querySelector('.p-goles-atm').value;
    const riv = row.querySelector('.p-goles-riv').value;
    const penContainer = row.querySelector('.p-penaltis-container');
    const gcContainer = row.querySelector('.p-gc-portero-container');
    
    if (atm === riv && atm !== "") {
        penContainer.style.display = 'flex';
    } else {
        penContainer.style.display = 'none';
        row.querySelector('.p-pen-atm').value = '';
        row.querySelector('.p-pen-riv').value = '';
    }

    if (riv && parseInt(riv) > 0) {
        gcContainer.style.display = 'block';
    } else {
        gcContainer.style.display = 'none';
        row.querySelector('.p-gc-portero').value = '0';
    }
    window.actualizarProgresoGeneral('form-informe-torneo');
}

window.editarInformeTorneo = function(id) {
    db.collection("informes_torneo").doc(id).get().then(doc => {
        const d = doc.data();
        const data = d.datos;
        torneoEnEdicionId = id; 

        document.getElementById('tor-portero').value = d.porteroId;
        document.getElementById('tor-nombre').value = data.torneo || '';
        document.getElementById('tor-ubicacion').value = data.ubicacion || '';
        document.getElementById('tor-pos-final').value = data.posFinal || '';
        document.getElementById('tor-superficie').value = data.superficie || 'Césped Natural';
        
        if (data.torneoLogo) {
            document.getElementById('tor-logo-b64').value = data.torneoLogo;
            const preview = document.getElementById('tor-logo-preview');
            preview.src = data.torneoLogo;
            preview.style.display = 'block';
        }

        const ctx = data.ctx || {};
        document.getElementById('tor-ctx-nivel').value = ctx.nivel || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-nivel'), 5);
        document.getElementById('tor-ctx-logistica').value = ctx.logistica || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-logistica'), 5);
        document.getElementById('tor-ctx-carga').value = ctx.carga || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-carga'), 5);
        document.getElementById('tor-ctx-instalaciones').value = ctx.instalaciones || ''; window.aplicarColorSelect(document.getElementById('tor-ctx-instalaciones'), 5);

        const med = data.med || {};
        document.getElementById('tor-med-inicial').value = med.inicial || '';
        document.getElementById('tor-med-incidencias').value = med.incidencias || '';

        document.getElementById('contenedor-partidos').innerHTML = '';
        if(data.partidos) data.partidos.forEach(p => window.agregarFilaPartido(p));

        const val = data.val || {};
        document.getElementById('tor-val-personalidad').value = val.personalidad || ''; window.aplicarColorSelect(document.getElementById('tor-val-personalidad'), 5);
        document.getElementById('tor-val-mando').value = val.mando || ''; window.aplicarColorSelect(document.getElementById('tor-val-mando'), 5);
        document.getElementById('tor-val-conc').value = val.concentracion || ''; window.aplicarColorSelect(document.getElementById('tor-val-conc'), 5);
        document.getElementById('tor-val-error').value = val.error || ''; window.aplicarColorSelect(document.getElementById('tor-val-error'), 5);
        document.getElementById('tor-val-confianza').value = val.confianza || ''; window.aplicarColorSelect(document.getElementById('tor-val-confianza'), 5);
        document.getElementById('tor-val-mentalidad').value = val.mentalidad || ''; window.aplicarColorSelect(document.getElementById('tor-val-mentalidad'), 5);
        document.getElementById('tor-val-actitud-gol').value = val.actitudGol || ''; window.aplicarColorSelect(document.getElementById('tor-val-actitud-gol'), 5);
        document.getElementById('tor-val-primer-ultimo').value = val.primerUltimo || ''; window.aplicarColorSelect(document.getElementById('tor-val-primer-ultimo'), 5);
        document.getElementById('tor-val-ritmo').value = val.ritmo || ''; window.aplicarColorSelect(document.getElementById('tor-val-ritmo'), 5);
        document.getElementById('tor-val-mejora-bajon').value = val.mejoraBajon || ''; window.aplicarColorSelect(document.getElementById('tor-val-mejora-bajon'), 5);
        document.getElementById('tor-val-entorno').value = val.entorno || ''; window.aplicarColorSelect(document.getElementById('tor-val-entorno'), 5);
        document.getElementById('tor-val-1v1').value = val.unoVuno || ''; window.aplicarColorSelect(document.getElementById('tor-val-1v1'), 5);
        document.getElementById('tor-val-org').value = val.organizacion || ''; window.aplicarColorSelect(document.getElementById('tor-val-org'), 5);
        document.getElementById('tor-val-com').value = val.comunicacion || ''; window.aplicarColorSelect(document.getElementById('tor-val-com'), 5);

        const obs = data.obs || {};
        document.getElementById('tor-obs-penaltis').value = obs.penaltis || '';
        document.getElementById('tor-obs-decisivas').value = obs.decisivas || '';
        document.getElementById('tor-obs-pos').value = obs.pos || '';
        document.getElementById('tor-obs-neg').value = obs.neg || '';
        document.getElementById('tor-obs-trans').value = obs.trans || '';
        
        document.getElementById('tor-val-general').value = data.val_gen || 'MEDIA';

        window.actualizarProgresoGeneral('form-informe-torneo');

        document.getElementById('btn-save-torneo').innerText = "💾 ACTUALIZAR Y VER INFORME";
        document.getElementById('btn-cancel-torneo').style.display = "inline-block";
        window.scrollTo({top:0, behavior:'smooth'});
    });
}

window.cancelarEdicionTorneo = function() {
    torneoEnEdicionId = null;
    document.getElementById('tor-portero').value = '';
    document.getElementById('tor-nombre').value = '';
    document.getElementById('tor-ubicacion').value = '';
    document.getElementById('tor-pos-final').value = '';
    document.getElementById('tor-logo-b64').value = '';
    document.getElementById('tor-logo-preview').style.display = 'none';
    document.getElementById('tor-logo-preview').src = '';
    document.getElementById('contenedor-partidos').innerHTML = '';
    document.getElementById('tor-med-inicial').value = '';
    document.getElementById('tor-med-incidencias').value = '';
    
    ['nivel', 'logistica', 'carga', 'instalaciones'].forEach(id => {
        let inp = document.getElementById('tor-ctx-' + id);
        if(inp){ inp.value = ''; inp.classList.remove('rating-red', 'rating-yellow', 'rating-green'); }
    });

    ['personalidad', 'mando', 'conc', 'error', 'confianza', 'mentalidad', 'actitud-gol', 'primer-ultimo', 'ritmo', 'mejora-bajon', 'entorno', '1v1', 'org', 'com'].forEach(id => {
        let inp = document.getElementById('tor-val-' + id);
        if(inp){ inp.value = ''; inp.classList.remove('rating-red', 'rating-yellow', 'rating-green'); }
    });
    
    ['penaltis', 'decisivas', 'pos', 'neg', 'trans'].forEach(id => {
        document.getElementById('tor-obs-' + id).value = '';
    });

    document.getElementById('tor-val-general').value = 'MEDIA';
    
    document.getElementById('btn-save-torneo').innerText = "💾 GENERAR Y GUARDAR (FINAL)";
    document.getElementById('btn-cancel-torneo').style.display = "none";
    document.getElementById('floating-progress').classList.remove('visible');
}

window.generarPDFTorneo = function() {
    const pid = document.getElementById('tor-portero').value;
    if(!pid) return alert("Selecciona un portero");

    const partidos = [];
    document.querySelectorAll('.partido-row').forEach(row => {
        let riv = row.querySelector('.p-goles-riv').value;
        let gc = 0;
        if(riv && parseInt(riv) > 0) {
            gc = row.querySelector('.p-gc-portero').value || 0;
        }

        partidos.push({
            jornada: row.querySelector('.p-jornada').value,
            pais: row.querySelector('.p-pais').value,
            rival: row.querySelector('.p-rival').value,
            golesAtm: row.querySelector('.p-goles-atm').value,
            golesRival: riv,
            golesEncajados: gc,
            minutos: row.querySelector('.p-min').value || 0,
            penAtm: row.querySelector('.p-pen-atm').value,
            penRival: row.querySelector('.p-pen-riv').value
        });
    });

    const datos = {
        torneo: document.getElementById('tor-nombre').value,
        torneoLogo: document.getElementById('tor-logo-b64').value,
        ubicacion: document.getElementById('tor-ubicacion').value,
        posFinal: document.getElementById('tor-pos-final').value,
        superficie: document.getElementById('tor-superficie').value,
        partidos: partidos,
        ctx: {
            nivel: document.getElementById('tor-ctx-nivel').value, logistica: document.getElementById('tor-ctx-logistica').value, carga: document.getElementById('tor-ctx-carga').value, instalaciones: document.getElementById('tor-ctx-instalaciones').value
        },
        med: {
            inicial: document.getElementById('tor-med-inicial').value, incidencias: document.getElementById('tor-med-incidencias').value
        },
        val: {
            personalidad: document.getElementById('tor-val-personalidad').value, mando: document.getElementById('tor-val-mando').value, concentracion: document.getElementById('tor-val-conc').value, error: document.getElementById('tor-val-error').value, confianza: document.getElementById('tor-val-confianza').value, mentalidad: document.getElementById('tor-val-mentalidad').value, actitudGol: document.getElementById('tor-val-actitud-gol').value, primerUltimo: document.getElementById('tor-val-primer-ultimo').value, ritmo: document.getElementById('tor-val-ritmo').value, mejoraBajon: document.getElementById('tor-val-mejora-bajon').value, entorno: document.getElementById('tor-val-entorno').value, unoVuno: document.getElementById('tor-val-1v1').value, organizacion: document.getElementById('tor-val-org').value, comunicacion: document.getElementById('tor-val-com').value
        },
        obs: {
            penaltis: document.getElementById('tor-obs-penaltis').value, decisivas: document.getElementById('tor-obs-decisivas').value, pos: document.getElementById('tor-obs-pos').value, neg: document.getElementById('tor-obs-neg').value, trans: document.getElementById('tor-obs-trans').value
        },
        val_gen: document.getElementById('tor-val-general').value
    };

    const payload = { porteroId: pid, fecha: new Date().toISOString(), datos: datos, isDraft: false };

    let pIdPromise = torneoEnEdicionId 
        ? db.collection('informes_torneo').doc(torneoEnEdicionId).update(payload).then(()=>torneoEnEdicionId)
        : db.collection('informes_torneo').add(payload).then(ref=>ref.id);

    pIdPromise.then((docId) => {
        window.haptic('success');
        db.collection("porteros").doc(pid).get().then(doc => {
            const pData = doc.exists ? doc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' };
            
            const rndId = Date.now();
            const html = construirHTMLTorneo(pData, datos, docId, rndId);
            
            document.body.classList.remove('print-landscape'); 
            document.body.classList.add('print-portrait');
            
            const pEl = document.getElementById('preview-content');
            if(pEl) pEl.innerHTML = html; 
            document.getElementById('modal-pdf-preview').style.display = 'flex'; 
            
            setTimeout(() => {
                window.generarGraficoRadar(rndId, datos.val);
            }, 100);

            cancelarEdicionTorneo(); 
        });
    });
}

function construirHTMLTorneo(p, d, docId, rndId) {
    p = p || { nombre: 'Desconocido', equipo: '-', categoria: '-', anio: '-', nacionalidad: '-', pie: '-', anosClub: '-' };
    const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA6IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
    const rowRat = (label, val) => `<div class="pdf-rating-row"><span>${label}</span><span class="pdf-rating-val">${val||'-'}</span></div>`;
    
    const val = d.val || {};
    const obs = d.obs || {};
    const ctx = d.ctx || {};
    const med = d.med || {};

    let filasPartidos = '';
    let tMin = 0, tGol = 0;
    
    if (d.partidos) {
        d.partidos.forEach(m => {
            tMin += parseInt(m.minutos || 0); 
            const golesRivVal = m.golesRival !== undefined ? m.golesRival : (m.goles || '');
            const gcReal = m.golesEncajados !== undefined ? m.golesEncajados : (golesRivVal || 0);
            tGol += parseInt(gcReal || 0);
            
            let jornadaVal = m.jornada || m.fase || '';
            let resClass = '';
            let j = jornadaVal.toLowerCase();
            
            if (j.includes('grupo')) resClass = 'fase-grupos';
            else if (j.includes('1/16')) resClass = 'fase-16';
            else if (j.includes('1/8')) resClass = 'fase-8';
            else if (j.includes('1/4')) resClass = 'fase-4';
            else if (j.includes('semi')) resClass = 'fase-semi';
            else if (j.includes('final') || j.includes('puesto')) resClass = 'fase-final';
            
            let paisTxt = m.pais ? ` <span class="badge-pais">${m.pais.toUpperCase()}</span>` : '';
            let resTxt = '';
            if (m.resultado) resTxt = m.resultado; 
            else if (m.golesAtm !== undefined && m.golesAtm !== "" && golesRivVal !== "") resTxt = `${m.golesAtm} - ${golesRivVal}`;
            else resTxt = '-';
            
            if (m.penAtm !== undefined && m.penAtm !== "" && m.penRival !== undefined && m.penRival !== "") {
                resTxt += ` <br><span style="font-size:8px; color:#CB3524; font-weight:bold;">(Pen: ${m.penAtm} - ${m.penRival})</span>`;
            }

            filasPartidos += `<tr class="${resClass}"><td>${jornadaVal}</td><td>${m.rival || '-'}${paisTxt}</td><td>${resTxt}</td><td>${m.minutos || 0}'</td><td style="font-weight:bold;">${gcReal}</td></tr>`;
        });
    }

    const mediaGoles = (d.partidos && d.partidos.length > 0) ? (tGol / d.partidos.length).toFixed(1) : 0;
    let valClass = "val-media";
    if(d.val_gen === "BAJA") valClass = "val-baja";
    if(d.val_gen === "ALTA") valClass = "val-alta";
    if(d.val_gen === "EXCEPCIONAL") valClass = "val-excepcional";

    const logoHtml = d.torneoLogo ? `<img src="${d.torneoLogo}" class="cover-logo-torneo">` : '';

    let qrHtml = "";
    if (docId) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?view=torneo&id=' + docId)}`;
        qrHtml = `<img src="${qrUrl}" class="cover-qr">`;
    }

    const catSolo = p.categoria || '';
    const equipoSolo = p.equipo ? p.equipo.replace(catSolo, '').trim() : '';

    const coverHtml = `
    <div class="pdf-slide pdf-cover">
        <img src="ESCUDO ATM.png" class="cover-bg-logo">
        ${qrHtml}
        <div class="cover-content">
            <div class="pdf-cromo-cover">
                <div class="pdf-cromo-top">
                    <img src="${foto}" class="pdf-cromo-img">
                    <img src="ESCUDO ATM.png" class="pdf-cromo-logo">
                </div>
                <div class="pdf-cromo-bottom">
                    <div class="pdf-cromo-line1">
                        <div class="pdf-cromo-text-cat">${catSolo} Atlético de Madrid ${equipoSolo}</div>
                        <div class="pdf-cromo-text-por">
                            <div class="pdf-cromo-por">POR</div>
                            <div class="pdf-cromo-esp">España</div>
                        </div>
                    </div>
                    <div class="pdf-cromo-line2">
                        <div class="pdf-cromo-name">${p.nombre.split(' ')[0]}</div>
                        <div class="pdf-cromo-num">1</div>
                    </div>
                </div>
            </div>
            
            <div class="cover-subtitle">INFORME DE TORNEO</div>
            <div class="cover-name-premium">${p.nombre}</div>
            <div class="cover-info-bar">
                <span>${p.categoria}</span> | <span>${p.equipo}</span> | <span style="color:#F1C40F;">🏆 ${d.torneo || '-'} 🏆</span>
            </div>
        </div>
        ${logoHtml}
        <div class="cover-footer">GUARDIANLAB ATM • DEPARTAMENTO DE PORTEROS</div>
    </div>`;

    const page2Html = `
    <div class="pdf-slide">
        <div class="pdf-top-header">
            <div>
                <div class="pdf-top-title">RESUMEN DEL TORNEO</div>
                <div class="pdf-top-subtitle">${d.torneo || '-'}</div>
                <div style="font-size:10px; color:#1C2C5B; font-weight:bold;">${d.ubicacion || '-'} | ${d.superficie || '-'}</div>
            </div>
            <img src="ESCUDO ATM.png" style="height:40px;">
        </div>
        
        <div class="pdf-row">
            <div style="width:40%" class="pdf-player-card">
                <img src="${foto}" class="pdf-player-photo">
                <div class="pdf-player-info">
                    <div class="pdf-player-name">${p.nombre}</div>
                    <div class="pdf-info-row"><span>CAT: ${p.categoria}</span><span>EQ: ${p.equipo}</span></div>
                    <div class="pdf-info-row" style="font-weight:bold; color:#CB3524;">POS. FINAL: 🏆 ${d.posFinal || '-'}</div>
                </div>
            </div>
            <div style="width:60%" class="pdf-rating-box">
                <div class="pdf-box-title">RESUMEN ESTADÍSTICO</div>
                <div class="pdf-resumen-box">
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${d.partidos ? d.partidos.length : 0}</span>PJ</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${tMin}'</span>MIN</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${tGol}</span>G.C.</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${mediaGoles}</span>MEDIA</div>
                </div>
            </div>
        </div>

        <div class="pdf-section-header">CONTEXTO DEL TORNEO Y ESTADO FÍSICO</div>
        <div class="pdf-row">
            <div class="pdf-half-col pdf-rating-box">
                <div class="pdf-box-title" style="border:none; background:#ddd; color:#333;">CONTEXTO DEL EVENTO (1-5)</div>
                ${rowRat("Nivel de Rivales", ctx.nivel)}
                ${rowRat("Logística y Hotel", ctx.logistica)}
                ${rowRat("Tiempos Recuperación", ctx.carga)}
                ${rowRat("Campos / Arbitraje", ctx.instalaciones)}
            </div>
            <div class="pdf-half-col pdf-rating-box">
                <div class="pdf-box-title" style="border:none; background:#ddd; color:#333;">CONTEXTO MÉDICO DEL PORTERO</div>
                <div style="font-size:9px; margin-bottom:5px;"><strong>Estado Inicial:</strong> <br>${med.inicial || 'Óptimo'}</div>
                <div style="font-size:9px;"><strong>Incidencias Torneo:</strong> <br>${med.incidencias || 'Ninguna'}</div>
            </div>
        </div>

        <div class="pdf-section-header">DETALLE DE PARTIDOS</div>
        <table class="pdf-table-torneo" style="margin-top:0;">
            <thead><tr><th>Jornada/Fase</th><th>Rival y País</th><th>Resultado ATM - RIV</th><th>Minutos</th><th>G.C.</th></tr></thead>
            <tbody>${filasPartidos}</tbody>
        </table>
        
        <div style="margin-top:auto; text-align:center; font-size:8px; color:#999;">Página 1 de 2 • GuardianLab ATM</div>
    </div>`;

    const page3Html = `
    <div class="pdf-slide">
        <div class="pdf-top-header">
            <div>
                <div class="pdf-top-title">ANÁLISIS DE RENDIMIENTO</div>
                <div class="pdf-top-subtitle">${p.nombre}</div>
            </div>
            <img src="ESCUDO ATM.png" style="height:40px;">
        </div>

        <div class="pdf-section-header">PERFIL TÉCNICO, TÁCTICO Y PSICOLÓGICO</div>
        <div class="pdf-row" style="margin-bottom: 5px;">
            <div style="width:40%; display:flex; justify-content:center; align-items:center; border:1px solid #ccc; border-radius:4px; padding:5px;">
                <div style="width:100%; height:150px; position:relative; display:flex; justify-content:center;">
                    <img id="radar-img-${rndId}" style="max-width:100%; max-height:100%; object-fit:contain; display:none;">
                </div>
            </div>
            <div style="width:60%; display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                <div class="pdf-rating-box" style="margin:0;">
                    <div class="pdf-box-title" style="background:#ddd; color:#333; border:none; margin-bottom:2px;">PSICOLOGÍA</div>
                    ${rowRat("Personalidad", val.personalidad)}
                    ${rowRat("Mando", val.mando)}
                    ${rowRat("Concentración", val.concentracion)}
                    ${rowRat("Confianza", val.confianza)}
                </div>
                <div class="pdf-rating-box" style="margin:0;">
                    <div class="pdf-box-title" style="background:#ddd; color:#333; border:none; margin-bottom:2px;">EVOLUCIÓN</div>
                    ${rowRat("1º vs Último", val.primerUltimo)}
                    ${rowRat("Adapt. Ritmo", val.ritmo)}
                    ${rowRat("Adapt. Entorno", val.entorno)}
                    ${rowRat("Mejora/Bajón", val.mejoraBajon)}
                </div>
                <div class="pdf-rating-box" style="margin:0;">
                    <div class="pdf-box-title" style="background:#ddd; color:#333; border:none; margin-bottom:2px;">RESILIENCIA</div>
                    ${rowRat("Gestión Error", val.error)}
                    ${rowRat("Mentalidad Comp.", val.mentalidad)}
                    ${rowRat("Actitud tras Gol", val.actitudGol)}
                </div>
                <div class="pdf-rating-box" style="margin:0;">
                    <div class="pdf-box-title" style="background:#ddd; color:#333; border:none; margin-bottom:2px;">TÁCTICA</div>
                    ${rowRat("Rend. 1vs1", val.unoVuno)}
                    ${rowRat("Organización", val.organizacion)}
                    ${rowRat("Comunicación", val.comunicacion)}
                </div>
            </div>
        </div>

        <div class="pdf-section-header">OBSERVACIONES TÉCNICAS</div>
        <div style="display:flex; gap:10px;">
            <div class="pdf-rating-box" style="flex:1;">
                <div class="pdf-box-title" style="background:#27AE60; color:white; border:none;">PUNTOS POSITIVOS</div>
                <div class="pdf-text-obs">${obs.pos || '-'}</div>
            </div>
            <div class="pdf-rating-box" style="flex:1;">
                <div class="pdf-box-title" style="background:#E74C3C; color:white; border:none;">ÁREAS DE MEJORA</div>
                <div class="pdf-text-obs">${obs.neg || '-'}</div>
            </div>
        </div>

        <div class="pdf-section-header">SITUACIONES ESPECÍFICAS Y CONCLUSIÓN</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
            <div class="pdf-rating-box"><div class="pdf-box-title">Rendimiento en Penaltis</div><div class="pdf-text-obs">${obs.penaltis || '-'}</div></div>
            <div class="pdf-rating-box"><div class="pdf-box-title">Acciones Decisivas</div><div class="pdf-text-obs">${obs.decisivas || '-'}</div></div>
            <div class="pdf-rating-box"><div class="pdf-box-title" style="background:#1C2C5B; color:white;">Trascendencia Torneo</div><div class="pdf-text-obs">${obs.trans || '-'}</div></div>
        </div>

        <div style="margin-top:auto; padding-top:5px; text-align:center;">
            <div style="font-size:11px; font-weight:bold; color:#1C2C5B; margin-bottom:4px; text-transform:uppercase;">VALORACIÓN GENERAL DEL TORNEO</div>
            <div class="${valClass}" style="display:inline-block; padding:8px 30px; border-radius:20px; font-size:16px; font-weight:800; border: 2px solid rgba(0,0,0,0.1);">${d.val_gen || 'NO EVALUADO'}</div>
        </div>

        <div style="text-align:center; font-size:8px; margin-top:4px; color:#999;">Página 2 de 2 • GuardianLab ATM</div>
    </div>`;

    return coverHtml + page2Html + page3Html;
}

window.verPDFTorneoGuardado = function(id) {
    db.collection("informes_torneo").doc(id).get().then(doc => {
        if(doc.exists) {
            const data = doc.data();
            db.collection("porteros").doc(data.porteroId).get().then(pDoc => {
                const pData = pDoc.exists ? pDoc.data() : { nombre: 'Desconocido', equipo: '-', categoria: '-' };
                
                const rndId = Date.now();
                const html = construirHTMLTorneo(pData, data.datos, doc.id, rndId);
                
                document.body.classList.remove('print-landscape');
                document.body.classList.add('print-portrait');
                
                const pEl = document.getElementById('preview-content');
                if(pEl) pEl.innerHTML = html; 
                document.getElementById('modal-pdf-preview').style.display = 'flex'; 

                setTimeout(() => {
                    window.generarGraficoRadar(rndId, data.datos.val);
                }, 100);

            }).catch(err => console.error("Error al obtener portero:", err));
        }
    }).catch(err => console.error("Error al obtener informe:", err));
}

window.imprimirPDFNativo = function() { 
    window.haptic('light');
    const pEl = document.getElementById('preview-content');
    const prEl = document.getElementById('printable-area');
    
    // Clonamos el HTML de la vista previa al área de impresión oculta
    prEl.innerHTML = pEl.innerHTML; 
    
    setTimeout(() => {
        window.print();
        setTimeout(() => { prEl.innerHTML = ''; }, 1000); // Limpiamos tras imprimir
    }, 200);
}