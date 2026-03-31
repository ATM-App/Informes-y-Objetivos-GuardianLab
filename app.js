// --- FUNCIONES GLOBALES ---
function cerrarModal(id){ document.getElementById(id).style.display='none'; }

function validarRango(input, min, max) {
    let val = parseInt(input.value);
    if (isNaN(val) || input.value === '') { input.value = ''; }
    else if (val < min) { input.value = min; }
    else if (val > max) { input.value = max; }
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
let evaluacionesTemporales = [];
let competenciaSeleccionada = null;
let ACCIONES_EVALUACION = {
    "DEFENSIVAS": ["Blocaje Frontales Medio y Raso", "Blocaje lateral raso", "Blocaje lateral media altura", "Desvío raso", "Desvío a Media Altura", "Reducción de espacios y Posición Cruz", "Apertura", "Reincorporaciones", "Blocaje Aéreo", "Despeje de Puños"],
    "OFENSIVAS": ["Pase mano raso", "Pase mano alto", "Pase mano picado", "Perfilamiento y Controles", "Pase Raso con el Píe", "Pase alto con el Píe", "Voleas"]
};

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    auth.signInAnonymously().then(() => console.log("Sesión anónima iniciada.")).catch((error) => console.error(error));

    auth.onAuthStateChanged((user) => {
        if (user) {
            cargarPorteros();
            cargarHistorialObjetivos();
            cargarHistorialInformes();
            cargarHistorialTorneos(); 
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const fObj = document.getElementById('obj-fecha'); if(fObj) fObj.value=today;
    if(localStorage.getItem('guardian_theme') === 'light'){ document.body.classList.add('light-mode'); }
});

// --- NAVEGACIÓN ESTILO iOS ---
window.alternarTema = function() { 
    document.body.classList.toggle('light-mode'); 
    localStorage.setItem('guardian_theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); 
}

window.cambiarSeccion = function(sec) {
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
}

// --- PORTEROS ---
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
        const c = document.getElementById('lista-porteros'); c.innerHTML = '';
        const def = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
        lista.forEach(p => { c.innerHTML += `<div class="portero-card"><div style="display:flex; align-items:center;"><img src="${p.foto||def}" class="mini-foto-list"><div><div class="card-title">${p.nombre}</div><div class="card-subtitle">${p.equipo} (${p.anio||'-'})</div></div></div><div><button class="btn-icon-action" onclick="window.cargarDatosEdicion('${p.id}')">✏️</button><button class="btn-trash" onclick="window.borrarPortero('${p.id}')">🗑️</button></div></div>`; });
        const opts = '<option value="">Seleccionar...</option>' + lista.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join('');
        if(document.getElementById('obj-portero')) document.getElementById('obj-portero').innerHTML = opts;
        if(document.getElementById('inf-portero')) document.getElementById('inf-portero').innerHTML = opts;
        if(document.getElementById('tor-portero')) document.getElementById('tor-portero').innerHTML = opts; 
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
        prom.then(() => { window.cancelarEdicion(); }).catch(e => alert("Error: " + e.message)).finally(() => { btn.innerText = "Añadir / Actualizar"; btn.disabled = false; });
    };
    if(file) { const r = new FileReader(); r.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); const max = 300; let w = img.width; let h = img.height; if(w>h){ if(w>max){ h*=max/w; w=max; } } else { if(h>max){ w*=max/h; h=max; } } canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h); guardar(canvas.toDataURL('image/jpeg', 0.5)); }; }; r.readAsDataURL(file); } else { guardar(null); }
}
window.cargarDatosEdicion = function(id) { db.collection("porteros").doc(id).get().then(doc => { const p = doc.data(); document.getElementById('nombrePortero').value = p.nombre; document.getElementById('anioPortero').value = p.anio; document.getElementById('catPortero').value = p.categoria; window.actualizarEquipos(); document.getElementById('equipoPortero').value = p.equipo; document.getElementById('fotoPreview').src = p.foto || ""; document.getElementById('nacionalidadPortero').value = p.nacionalidad || ""; document.getElementById('piePortero').value = p.pie || "DIESTRO"; document.getElementById('anosClub').value = p.anosClub || ""; porteroEnEdicionId = id; document.getElementById('btn-save').innerText = "Guardar Cambios"; document.getElementById('btn-cancel').style.display = "inline-block"; window.scrollTo({top:0, behavior:'smooth'}); }); }
window.cancelarEdicion = function() { porteroEnEdicionId = null; document.getElementById('nombrePortero').value = ''; document.getElementById('anioPortero').value = ''; document.getElementById('catPortero').value = ''; document.getElementById('equipoPortero').innerHTML = ''; document.getElementById('nacionalidadPortero').value = ''; document.getElementById('anosClub').value = ''; document.getElementById('fotoPreview').src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4="; document.getElementById('btn-save').innerText = "Añadir / Actualizar"; document.getElementById('btn-cancel').style.display = "none"; }
window.borrarPortero = function(id) { if(confirm("¿Borrar?")) db.collection("porteros").doc(id).delete(); }

// --- OBJETIVOS ---
window.resetearEvaluacionTemporal = function() { evaluacionesTemporales = []; competenciaSeleccionada = null; window.selectCompetencia(null); window.renderizarListaTemporal(); document.getElementById('contenedor-evaluacion-temporal').style.display = 'none'; document.getElementById('obj-observacion').value = ''; window.cargarAccionesObjetivos(); }
window.cargarAccionesObjetivos = function() { const tipo = document.getElementById('obj-tipo').value; const sel = document.getElementById('obj-accion'); sel.innerHTML = '<option value="">Seleccionar Acción...</option>'; sel.disabled = true; if (tipo && ACCIONES_EVALUACION[tipo]) { sel.disabled = false; ACCIONES_EVALUACION[tipo].forEach(acc => { if (!evaluacionesTemporales.some(e => e.accion === acc)) { sel.innerHTML += `<option value="${acc}">${acc}</option>`; } }); } }
window.selectCompetencia = function(val) { competenciaSeleccionada = val; document.querySelectorAll('.btn-comp').forEach(b => b.classList.remove('active')); if(val) document.querySelector(`.btn-comp.comp-${val}`).classList.add('active'); document.getElementById('obj-competencia-val').value = val; }
window.agregarEvaluacionTemporal = function() { const pid = document.getElementById('obj-portero').value; const tipo = document.getElementById('obj-tipo').value; const accion = document.getElementById('obj-accion').value; const comp = competenciaSeleccionada; const score = document.getElementById('obj-puntaje').value; if(!pid || !accion || !comp) return alert("Completa los datos"); evaluacionesTemporales.push({ accion: accion, tipo: tipo, competencia: parseInt(comp), puntaje: parseInt(score) }); window.renderizarListaTemporal(); document.getElementById('obj-accion').value = ""; window.selectCompetencia(null); document.getElementById('obj-puntaje').value = "1"; window.cargarAccionesObjetivos(); document.getElementById('contenedor-evaluacion-temporal').style.display = 'block'; }
window.renderizarListaTemporal = function() { const cont = document.getElementById('lista-temp-evaluaciones'); cont.innerHTML = ''; evaluacionesTemporales.forEach(item => { let col='#ccc', txt=''; if(item.competencia===1){col='var(--comp-1)';txt='Inc. Inconsciente';} if(item.competencia===2){col='var(--comp-2)';txt='Inc. Consciente';} if(item.competencia===3){col='var(--comp-3)';txt='Comp. Consciente';} if(item.competencia===4){col='var(--comp-4)';txt='Comp. Inconsciente';} cont.innerHTML += `<div class="item-temp-eval" style="border-left: 4px solid ${col}"><strong>${item.accion}</strong><br><span style="color:${col}">${txt}</span> | Nota: ${item.puntaje}</div>`; }); }
window.guardarReporteObjetivosCompleto = function() { const pid = document.getElementById('obj-portero').value; const fecha = document.getElementById('obj-fecha').value; const observacion = document.getElementById('obj-observacion').value; if(!pid || !fecha || evaluacionesTemporales.length === 0) return alert("Sin datos"); const reporte = { porteroId: pid, fecha: fecha, acciones: evaluacionesTemporales, observacion: observacion, timestamp: Date.now() }; db.collection("reportes_objetivos").add(reporte).then(() => { generarPDFObjetivos(reporte); window.resetearEvaluacionTemporal(); }); }

function generarPDFObjetivos(reporte) {
    db.collection("porteros").doc(reporte.porteroId).get().then(doc => {
        const p = doc.data(); const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
        let filas = ''; let sum = 0; reporte.acciones.forEach(item => { sum += parseInt(item.puntaje); let bg='#ccc', fg='white', label=''; if(item.competencia===1){bg='#E74C3C';label='INCOMP. INCONSCIENTE';} if(item.competencia===2){bg='#E67E22';label='INCOMP. CONSCIENTE';} if(item.competencia===3){bg='#F1C40F';label='COMP. CONSCIENTE';fg='black';} if(item.competencia===4){bg='#27AE60';label='COMP. INCONSCIENTE';} filas += `<tr><td style="padding:8px; border-bottom:1px solid #eee;">${item.accion}</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center;"><span style="background:${bg}; color:${fg}; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold;">${label}</span></td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center; font-weight:bold;">${item.puntaje}</td></tr>`; });
        const media = (sum / reporte.acciones.length).toFixed(1);
        const obsHtml = reporte.observacion ? `<div class="pdf-obs-box"><div class="pdf-obs-header">OBSERVACIÓN FINAL</div><div style="font-size:12px; white-space: pre-wrap;">${reporte.observacion}</div></div>` : '';
        const html = `<div class="pdf-objectives-container"><div class="pdf-top-header"><div class="pdf-top-title">SEGUIMIENTO DE OBJETIVOS</div><img src="ESCUDO ATM.png" style="height:40px;"></div><div class="pdf-player-card" style="margin-bottom:20px;"><img src="${foto}" class="pdf-player-photo"><div class="pdf-player-info"><div class="pdf-player-name">${p.nombre}</div><div class="pdf-info-row"><span>EQUIPO: ${p.equipo}</span><span>FECHA: ${reporte.fecha}</span></div><div class="pdf-info-row" style="font-weight:bold;">NOTA MEDIA: ${media}</div></div></div><table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr style="background:#f0f0f0;"><th style="padding:10px; text-align:left">Acción</th><th style="padding:10px; text-align:center;">Nivel</th><th style="padding:10px; text-align:center;">Nota</th></tr></thead><tbody>${filas}</tbody></table>${obsHtml}</div>`;
        document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait');
        document.getElementById('preview-content').innerHTML = html; document.getElementById('printable-area').innerHTML = html; document.getElementById('modal-pdf-preview').style.display = 'flex';
    });
}
function cargarHistorialObjetivos() { db.collection("reportes_objetivos").orderBy("timestamp", "desc").limit(10).onSnapshot(snap => { const cont = document.getElementById('lista-seguimientos'); cont.innerHTML = ''; snap.forEach(doc => { const rep = doc.data(); db.collection("porteros").doc(rep.porteroId).get().then(pDoc => { if(pDoc.exists) { const p = pDoc.data(); cont.innerHTML += `<div class="eval-card"><div><div style="font-weight:bold;">${p.nombre}</div><div style="font-size:0.8rem;">${rep.fecha} - ${rep.acciones.length} Acciones</div></div><div style="display:flex;gap:5px;"><button class="btn-icon-action" onclick='verPDFObjetivosGuardado(${JSON.stringify(rep).replace(/'/g, "&#39;")})'>📄</button><button class="btn-trash" onclick="db.collection('reportes_objetivos').doc('${doc.id}').delete()">🗑️</button></div></div>`; } }); }); }); }
window.verPDFObjetivosGuardado = function(rep) { generarPDFObjetivos(rep); }

// ==========================================
// --- INFORMES SEMESTRALES ---
// ==========================================

window.editarInformeSemestral = function(id) {
    db.collection("informes_semestrales").doc(id).get().then(doc => {
        const d = doc.data();
        const data = d.datos;
        informeEnEdicionId = id; 

        document.getElementById('inf-portero').value = d.porteroId;
        document.getElementById('inf-titulo').value = data.titulo || '';
        document.getElementById('inf-tipo').value = data.tipoInforme || 'INFORME DICIEMBRE';

        document.getElementById('perfil-pos-1').value = data.perfil.pos1 || '';
        document.getElementById('perfil-pos-2').value = data.perfil.pos2 || '';
        document.getElementById('perfil-val-general').value = data.perfil.val_gen || 'MEDIA';

        document.getElementById('dc-jornada').value = data.dc.jornada || '';
        document.getElementById('dc-convocatorias').value = data.dc.convocatorias || '';
        document.getElementById('dc-titular').value = data.dc.titular || '';
        document.getElementById('dc-min1').value = data.dc.min1 || '';
        document.getElementById('dc-min2').value = data.dc.min2 || '';
        document.getElementById('dc-goles').value = data.dc.goles || '';
        document.getElementById('dc-lesion').value = data.dc.lesion || '';
        document.getElementById('dc-disciplina').value = data.dc.disciplina || '';
        document.getElementById('dc-tecnica').value = data.dc.tecnica || '';
        document.getElementById('dc-torneos-asist').value = data.dc.t_asist || '';
        document.getElementById('dc-torneos-conv').value = data.dc.t_conv || '';

        document.getElementById('cg-tec-def').value = data.cg.tec_def || '';
        document.getElementById('cg-tec-of').value = data.cg.tec_of || '';
        document.getElementById('cg-rec-tec').value = data.cg.rec_tec || '';
        document.getElementById('cg-niv-comp').value = data.cg.niv_comp || '';
        document.getElementById('cg-const').value = data.cg.const || '';
        document.getElementById('cg-comp-juego').value = data.cg.comp_juego || '';
        document.getElementById('cg-imp').value = data.cg.imp || '';
        document.getElementById('cg-lid').value = data.cg.lid || '';
        document.getElementById('cg-des').value = data.cg.des || '';
        document.getElementById('cg-con').value = data.cg.con || '';
        document.getElementById('cg-mot').value = data.cg.mot || '';
        document.getElementById('cg-act').value = data.cg.act || '';

        document.getElementById('cpp-pos').value = data.cpp.pos || '';
        document.getElementById('cpp-bloc').value = data.cpp.bloc || '';
        document.getElementById('cpp-col').value = data.cpp.col || '';
        document.getElementById('cpp-desp').value = data.cpp.desp || '';
        document.getElementById('cpp-aereo').value = data.cpp.aereo || '';
        document.getElementById('cpp-pie').value = data.cpp.pie || '';
        document.getElementById('cpp-1v1').value = data.cpp.uno || '';
        document.getElementById('cpp-vel').value = data.cpp.vel || '';
        document.getElementById('cpp-agi').value = data.cpp.agi || '';

        document.getElementById('vfj-ataque').value = data.vfj.ataque || '';
        document.getElementById('vfj-tr-def').value = data.vfj.tr_def || '';
        document.getElementById('vfj-defensa').value = data.vfj.defensa || '';
        document.getElementById('vfj-tr-of').value = data.vfj.tr_of || '';
        document.getElementById('vfj-obs').value = data.vfj.obs || '';

        document.getElementById('vac-soc').value = data.vac.soc || '';
        document.getElementById('vac-const').value = data.vac.const || '';
        document.getElementById('vac-disc').value = data.vac.disc || '';
        document.getElementById('vac-act').value = data.vac.act || '';
        document.getElementById('vac-comp').value = data.vac.comp || '';
        document.getElementById('vac-evo').value = data.vac.evo || '';
        document.getElementById('vac-obs').value = data.vac.obs || '';

        document.getElementById('aca-1-media').value = data.aca.ev1.media || '';
        document.getElementById('aca-1-asig').value = data.aca.ev1.asig || '';
        document.getElementById('aca-1-susp').value = data.aca.ev1.susp || '';
        document.getElementById('aca-2-media').value = data.aca.ev2.media || '';
        document.getElementById('aca-2-asig').value = data.aca.ev2.asig || '';
        document.getElementById('aca-2-susp').value = data.aca.ev2.susp || '';
        document.getElementById('aca-3-media').value = data.aca.ev3.media || '';
        document.getElementById('aca-3-asig').value = data.aca.ev3.asig || '';
        document.getElementById('aca-3-susp').value = data.aca.ev3.susp || '';

        document.getElementById('btn-save-informe').innerText = "💾 ACTUALIZAR Y VER INFORME";
        document.getElementById('btn-cancel-informe').style.display = "inline-block";
        window.scrollTo({top:0, behavior:'smooth'});
    });
}

window.cancelarEdicionInforme = function() {
    informeEnEdicionId = null;
    document.getElementById('inf-portero').value = '';
    const textInputs = ['inf-titulo', 'perfil-pos-1', 'perfil-pos-2', 'dc-jornada', 'dc-convocatorias', 'dc-titular', 'dc-min1', 'dc-min2', 'dc-goles', 'dc-lesion', 'dc-disciplina', 'dc-tecnica', 'dc-torneos-asist', 'dc-torneos-conv', 'cg-tec-def', 'cg-tec-of', 'cg-rec-tec', 'cg-niv-comp', 'cg-const', 'cg-comp-juego', 'cg-imp', 'cg-lid', 'cg-des', 'cg-con', 'cg-mot', 'cg-act', 'cpp-pos', 'cpp-bloc', 'cpp-col', 'cpp-desp', 'cpp-aereo', 'cpp-pie', 'cpp-1v1', 'cpp-vel', 'cpp-agi', 'vfj-ataque', 'vfj-tr-def', 'vfj-defensa', 'vfj-tr-of', 'vfj-obs', 'vac-soc', 'vac-const', 'vac-disc', 'vac-act', 'vac-comp', 'vac-evo', 'vac-obs', 'aca-1-media', 'aca-1-asig', 'aca-1-susp', 'aca-2-media', 'aca-2-asig', 'aca-2-susp', 'aca-3-media', 'aca-3-asig', 'aca-3-susp'];
    textInputs.forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('inf-tipo').value = 'INFORME DICIEMBRE';
    document.getElementById('perfil-val-general').value = 'MEDIA';
    document.getElementById('btn-save-informe').innerText = "💾 GENERAR Y GUARDAR INFORME";
    document.getElementById('btn-cancel-informe').style.display = "none";
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

    const operacion = informeEnEdicionId 
        ? db.collection('informes_semestrales').doc(informeEnEdicionId).update({ datos: datos })
        : db.collection('informes_semestrales').add({ porteroId: pid, fecha: new Date().toISOString(), datos: datos });

    operacion.then(() => { 
        db.collection("porteros").doc(pid).get().then(doc => { 
            const p = doc.data(); 
            const html = construirHTMLInformeVertical(p, datos); 
            document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait'); 
            document.getElementById('preview-content').innerHTML = html; 
            document.getElementById('printable-area').innerHTML = html; 
            document.getElementById('modal-pdf-preview').style.display = 'flex'; 
            cancelarEdicionInforme();
        }); 
    });
}

function construirHTMLInformeVertical(p, d) {
    const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
    const rowRat = (label, val) => `<div class="pdf-rating-row"><span>${label}</span><span class="pdf-rating-val">${val||'-'}</span></div>`;
    const rowStat = (lbl, val) => `<div class="pdf-stat-cell"><span class="pdf-stat-label">${lbl}</span><span class="pdf-stat-num">${val||'-'}</span></div>`;
    let valClass = "val-media"; if(d.perfil.val_gen === "BAJA") valClass = "val-baja"; if(d.perfil.val_gen === "ALTA") valClass = "val-alta"; if(d.perfil.val_gen === "EXCEPCIONAL") valClass = "val-excepcional";

    return `
    <div class="pdf-slide">
        <div class="pdf-top-header"><div><div class="pdf-top-title">VALORACIÓN POSICIÓN</div><div class="pdf-top-subtitle">${d.titulo}</div><div style="font-size:10px; color:#1C2C5B; font-weight:bold;">${d.tipoInforme}</div></div><img src="ESCUDO ATM.png" style="height:40px;"></div>
        
        <div class="pdf-row">
            <div style="width:40%" class="pdf-player-card">
                <img src="${foto}" class="pdf-player-photo">
                <div class="pdf-player-info"><div class="pdf-player-name">${p.nombre}</div><div class="pdf-info-row"><span>NAC: ${p.anio}</span><span>NAC: ${p.nacionalidad||'-'}</span></div><div class="pdf-info-row"><span>CAT: ${p.categoria}</span><span>EQ: ${p.equipo}</span></div><div class="pdf-info-row"><span>AÑOS: ${p.anosClub||'-'}</span><span>PIE: ${p.pie||'-'}</span></div><div class="pdf-info-row" style="margin-top:5px; font-weight:bold; color:#1C2C5B">PROY: 1ª ${d.perfil.pos1} | 2ª ${d.perfil.pos2}</div>
                <div class="pdf-mini-field"><div class="field-line field-center"></div><div class="field-line field-circle"></div><div class="field-line field-area"></div><div class="field-pos-1">1</div></div>
                </div>
            </div>
            <div style="width:60%" class="pdf-rating-box"><div class="pdf-box-title">2. DATOS DE COMPETICIÓN</div><div class="pdf-stats-grid">${rowStat("Jornada Actual", d.dc.jornada)}${rowStat("Convocatorias", d.dc.convocatorias)}${rowStat("Titular", d.dc.titular)}${rowStat("Min. Pos 1", d.dc.min1)}${rowStat("Min. Pos 2", d.dc.min2)}${rowStat("Goles Enc.", d.dc.goles)}${rowStat("Ausencia Lesión", d.dc.lesion)}${rowStat("Ausencia Disc.", d.dc.disciplina)}</div><div class="pdf-stats-grid" style="margin-top:2px;">${rowStat("Ausencia Tec.", d.dc.tecnica)}${rowStat("Torneos Asist.", d.dc.t_asist)}${rowStat("Torneos Conv.", d.dc.t_conv)}</div></div>
        </div>

        <div class="pdf-section-header">3. VALORACIÓN DEPORTIVA</div>
        <div class="pdf-row">
            <div class="pdf-half-col pdf-rating-box"><div class="pdf-box-title">CUALIDADES GENERALES</div>${rowRat("Repertorio técnico defensivo", d.cg.tec_def)}${rowRat("Repertorio técnico ofensivo", d.cg.tec_of)}${rowRat("Adecuación uso recursos", d.cg.rec_tec)}${rowRat("Nivel competitivo", d.cg.niv_comp)}${rowRat("Constancia rendimiento", d.cg.const)}${rowRat("Comprensión del juego", d.cg.comp_juego)}${rowRat("Implicación entrenamientos", d.cg.imp)}${rowRat("Liderazgo con el grupo", d.cg.lid)}${rowRat("Destreza general etapa", d.cg.des)}${rowRat("Conciencia objetivos", d.cg.con)}${rowRat("Motivación individual", d.cg.mot)}${rowRat("Comportamiento actitudinal", d.cg.act)}</div>
            <div class="pdf-half-col pdf-rating-box"><div class="pdf-box-title">CUALIDADES PUESTO PROYECCIÓN 1: PORTERO</div>${rowRat("Posición básica", d.cpp.pos)}${rowRat("Blocaje", d.cpp.bloc)}${rowRat("Colocación", d.cpp.col)}${rowRat("Desplazamientos y caídas", d.cpp.desp)}${rowRat("Dominio área (aéreo)", d.cpp.aereo)}${rowRat("Reinicio (mano y pie)", d.cpp.pie)}${rowRat("Uno contra uno", d.cpp.uno)}${rowRat("Velocidad específica", d.cpp.vel)}${rowRat("Agilidad", d.cpp.agi)}</div>
        </div>

        <div class="pdf-section-header">4. VALORES POR FASE DE JUEGO (1-5)</div>
        <div class="pdf-rating-box">
            <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:bold; margin-bottom:4px; padding:0 10px;"><span>ATAQUE: ${d.vfj.ataque}</span><span>TRANS. DEF: ${d.vfj.tr_def}</span><span>DEFENSA: ${d.vfj.defensa}</span><span>TRANS. OF: ${d.vfj.tr_of}</span></div>
            <div class="pdf-box-title" style="margin-top:5px; background:#ddd; color:#333;">OBSERVACIONES TÉCNICO-TÁCTICAS</div>
            <div class="pdf-text-obs">${d.vfj.obs}</div>
        </div>

        <div class="pdf-section-header">5. VALORES ACTITUDINALES (1-5)</div>
        <div class="pdf-rating-box">
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:5px;">${rowRat("Sociabilidad", d.vac.soc)}${rowRat("Constancia", d.vac.const)}${rowRat("Disciplina", d.vac.disc)}${rowRat("Actitud", d.vac.act)}${rowRat("Compromiso", d.vac.comp)}${rowRat("Evolución", d.vac.evo)}</div>
            <div class="pdf-box-title" style="margin-top:5px; background:#ddd; color:#333;">OBSERVACIONES ACTITUDINALES</div>
            <div class="pdf-text-obs">${d.vac.obs}</div>
        </div>

        <div class="pdf-rating-box"><div class="pdf-box-title">6. CONTROL ACADÉMICO</div><div class="pdf-academic-box"><div class="pdf-aca-item"><span><strong>1ª EVAL:</strong></span> Media: ${d.aca.ev1.media} | Asig: ${d.aca.ev1.asig} | Susp: ${d.aca.ev1.susp}</div><div class="pdf-aca-item"><span><strong>2ª EVAL:</strong></span> Media: ${d.aca.ev2.media} | Asig: ${d.aca.ev2.asig} | Susp: ${d.aca.ev2.susp}</div><div class="pdf-aca-item" style="border:none"><span><strong>3ª EVAL:</strong></span> Media: ${d.aca.ev3.media} | Asig: ${d.aca.ev3.asig} | Susp: ${d.aca.ev3.susp}</div></div></div>
        
        <div style="margin-top:auto; padding-top:10px; text-align:center;">
            <div style="font-size:12px; font-weight:bold; color:#1C2C5B; margin-bottom:6px; text-transform:uppercase;">VALORACIÓN GENERAL DEL SEMESTRE</div>
            <div class="${valClass}" style="display:inline-block; padding:10px 40px; border-radius:25px; font-size:18px; font-weight:800; border: 2px solid rgba(0,0,0,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">${d.perfil.val_gen || 'NO EVALUADO'}</div>
        </div>
        
        <div style="text-align:center; font-size:8px; margin-top:5px; color:#999;">GuardianLab ATM - Informe Técnico</div>
    </div>`;
}

function cargarHistorialInformes() { 
    db.collection("informes_semestrales").orderBy("fecha", "desc").limit(10).onSnapshot(snap => { 
        const cont = document.getElementById('lista-informes-guardados'); if(!cont) return; 
        cont.innerHTML = ''; 
        snap.forEach(doc => { 
            const inf = doc.data(); 
            db.collection("porteros").doc(inf.porteroId).get().then(pDoc => { 
                if(pDoc.exists) { 
                    const p = pDoc.data(); 
                    cont.innerHTML += `<div class="eval-card"><div><div style="font-weight:bold;">${p.nombre}</div><div style="font-size:0.8rem;">${inf.datos.titulo}</div><div style="font-size:0.7rem; color:#aaa">${inf.fecha.substring(0,10)}</div></div><div style="display:flex; gap:5px;"><button class="btn-icon-action" onclick="window.editarInformeSemestral('${doc.id}')" title="Editar">✏️</button><button class="btn-icon-action" onclick="window.verPDFInformeGuardado('${doc.id}')" title="Ver PDF">📄</button><button class="btn-trash" onclick="db.collection('informes_semestrales').doc('${doc.id}').delete()">🗑️</button></div></div>`; 
                } 
            }); 
        }); 
    }); 
}

window.verPDFInformeGuardado = function(id) { db.collection("informes_semestrales").doc(id).get().then(doc => { if(doc.exists) { const data = doc.data(); db.collection("porteros").doc(data.porteroId).get().then(pDoc => { const html = construirHTMLInformeVertical(pDoc.data(), data.datos); document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait'); document.getElementById('preview-content').innerHTML = html; document.getElementById('printable-area').innerHTML = html; document.getElementById('modal-pdf-preview').style.display = 'flex'; }); } }); }
window.imprimirPDFNativo = function() { window.print(); }

// ==========================================
// --- MÓDULO DE TORNEOS ---
// ==========================================

const optGoles = '<option value="">-</option>' + Array.from({length: 21}, (_, i) => `<option value="${i}">${i}</option>`).join('');
const optFases = `<option value="Grupos J1">Grupos J1</option><option value="Grupos J2">Grupos J2</option><option value="Grupos J3">Grupos J3</option><option value="Grupos J4">Grupos J4</option><option value="Grupos J5">Grupos J5</option><option value="Grupos J6">Grupos J6</option><option value="Grupos J7">Grupos J7</option><option value="Grupos J8">Grupos J8</option><option value="1/16 Final">1/16 Final</option><option value="1/8 Final">1/8 Final</option><option value="1/4 Final">1/4 Final</option><option value="Semifinal">Semifinal</option><option value="Final">Final</option><option value="3º/4º Puesto">3º/4º Puesto</option>`;

function cargarHistorialTorneos() {
    db.collection("informes_torneo").orderBy("fecha", "desc").limit(20).onSnapshot(snap => {
        const cont = document.getElementById('lista-torneos-guardados');
        const selCopiar = document.getElementById('tor-copiar-base');
        if(!cont) return;
        cont.innerHTML = '';
        
        let opcionesCopiar = '<option value="">-- Seleccionar Torneo --</option>';

        snap.forEach(doc => {
            const inf = doc.data();
            
            db.collection("porteros").doc(inf.porteroId).get().then(pDoc => {
                if(pDoc.exists) {
                    const p = pDoc.data();
                    
                    cont.innerHTML += `<div class="eval-card">
                        <div>
                            <div style="font-weight:bold;">${p.nombre}</div>
                            <div style="font-size:0.8rem; color:var(--text-sec);">${inf.datos.torneo}</div>
                            <div style="font-size:0.7rem; color:var(--atm-red);">${inf.fecha.substring(0,10)}</div>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-icon-action" onclick="window.editarInformeTorneo('${doc.id}')" title="Editar">✏️</button>
                            <button class="btn-icon-action" onclick="window.verPDFTorneoGuardado('${doc.id}')" title="Ver">📄</button>
                            <button class="btn-trash" onclick="db.collection('informes_torneo').doc('${doc.id}').delete()" title="Borrar">🗑️</button>
                        </div>
                    </div>`;

                    opcionesCopiar += `<option value="${doc.id}">${inf.datos.torneo} - ${p.nombre}</option>`;
                    if(selCopiar) selCopiar.innerHTML = opcionesCopiar;
                }
            });
        });
    });
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
        
        document.getElementById('contenedor-partidos').innerHTML = '';
        if(data.partidos) {
            data.partidos.forEach(p => window.agregarFilaPartido(p));
        }
        
        selectEl.value = "";
    });
}

window.agregarFilaPartido = function(data = null) {
    const container = document.getElementById('contenedor-partidos');
    const div = document.createElement('div');
    div.className = 'partido-row';
    
    div.innerHTML = `
        <div class="row align-items-center">
            <select class="p-jornada" style="flex:1">${optFases}</select>
            <input type="text" class="p-pais" placeholder="País (Opcional)" style="flex:1">
            <input type="text" class="p-rival" placeholder="Nombre Rival" style="flex:2">
        </div>
        <div class="row align-items-end">
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Goles ATM</label><select class="p-goles-atm" onchange="window.actualizarFilaPartido(this)">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Goles Rival</label><select class="p-goles-riv" onchange="window.actualizarFilaPartido(this)">${optGoles}</select></div>
            <div style="flex:1; display:none;" class="p-gc-portero-container"><label style="font-size:0.6rem; color:var(--atm-red); font-weight:bold;">G.C. Portero</label><select class="p-gc-portero">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:#aaa;">Min. Jugados</label><input type="number" class="p-min" placeholder="Min"></div>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:var(--atm-red); font-size:1.2rem; cursor:pointer;">❌</button>
        </div>
        <div class="p-penaltis-container row" style="display:none; background:rgba(203,53,36,0.1); padding:10px; border-radius:10px; margin-top:5px; border:1px dashed var(--atm-red);">
            <div style="flex:1.5; display:flex; align-items:center;">
                <input type="checkbox" class="p-jugo-pen" style="width:auto; margin-right:10px;">
                <label style="font-size:0.75rem; color:var(--text-main);">¿Portero en Penaltis?</label>
            </div>
            <div style="flex:1"><label style="font-size:0.6rem; color:var(--atm-red);">Pen. ATM</label><select class="p-pen-atm">${optGoles}</select></div>
            <div style="flex:1"><label style="font-size:0.6rem; color:var(--atm-red);">Pen. Rival</label><select class="p-pen-riv">${optGoles}</select></div>
        </div>
    `;
    container.appendChild(div);
    
    if (data) {
        div.querySelector('.p-jornada').value = data.jornada || 'Grupos J1';
        div.querySelector('.p-pais').value = data.pais || '';
        div.querySelector('.p-rival').value = data.rival || '';
        div.querySelector('.p-goles-atm').value = data.golesAtm || '';
        div.querySelector('.p-goles-riv').value = data.golesRival || '';
        div.querySelector('.p-min').value = data.minutos || '';
        
        div.querySelector('.p-gc-portero').value = data.golesEncajados !== undefined ? data.golesEncajados : (data.golesRival || '0');
        
        window.actualizarFilaPartido(div.querySelector('.p-goles-atm'));
        
        if (data.penAtm !== "" && data.penRival !== "") {
            div.querySelector('.p-jugo-pen').checked = data.jugoPen || false;
            div.querySelector('.p-pen-atm').value = data.penAtm || '';
            div.querySelector('.p-pen-riv').value = data.penRival || '';
        }
    }
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
        row.querySelector('.p-jugo-pen').checked = false;
        row.querySelector('.p-pen-atm').value = '';
        row.querySelector('.p-pen-riv').value = '';
    }

    if (riv && parseInt(riv) > 0) {
        gcContainer.style.display = 'block';
    } else {
        gcContainer.style.display = 'none';
        row.querySelector('.p-gc-portero').value = '0';
    }
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

        document.getElementById('contenedor-partidos').innerHTML = '';
        if(data.partidos) data.partidos.forEach(p => window.agregarFilaPartido(p));

        const val = data.val || {};
        document.getElementById('tor-val-personalidad').value = val.personalidad || '';
        document.getElementById('tor-val-mando').value = val.mando || '';
        document.getElementById('tor-val-conc').value = val.concentracion || '';
        document.getElementById('tor-val-error').value = val.error || '';
        document.getElementById('tor-val-confianza').value = val.confianza || '';
        document.getElementById('tor-val-mentalidad').value = val.mentalidad || '';
        document.getElementById('tor-val-actitud-gol').value = val.actitudGol || '';
        document.getElementById('tor-val-primer-ultimo').value = val.primerUltimo || '';
        document.getElementById('tor-val-ritmo').value = val.ritmo || '';
        document.getElementById('tor-val-mejora-bajon').value = val.mejoraBajon || '';
        document.getElementById('tor-val-entorno').value = val.entorno || '';
        document.getElementById('tor-val-1v1').value = val.unoVuno || '';
        document.getElementById('tor-val-org').value = val.organizacion || '';
        document.getElementById('tor-val-com').value = val.comunicacion || '';

        const obs = data.obs || {};
        document.getElementById('tor-obs-penaltis').value = obs.penaltis || '';
        document.getElementById('tor-obs-decisivas').value = obs.decisivas || '';
        document.getElementById('tor-obs-pos').value = obs.pos || '';
        document.getElementById('tor-obs-neg').value = obs.neg || '';
        document.getElementById('tor-obs-trans').value = obs.trans || '';
        
        document.getElementById('tor-val-general').value = data.val_gen || 'MEDIA';

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
    document.getElementById('contenedor-partidos').innerHTML = '';
    
    ['personalidad', 'mando', 'conc', 'error', 'confianza', 'mentalidad', 'actitud-gol', 'primer-ultimo', 'ritmo', 'mejora-bajon', 'entorno', '1v1', 'org', 'com'].forEach(id => {
        document.getElementById('tor-val-' + id).value = '';
    });
    
    ['penaltis', 'decisivas', 'pos', 'neg', 'trans'].forEach(id => {
        document.getElementById('tor-obs-' + id).value = '';
    });

    document.getElementById('tor-val-general').value = 'MEDIA';
    
    document.getElementById('btn-save-torneo').innerText = "💾 GENERAR Y GUARDAR INFORME";
    document.getElementById('btn-cancel-torneo').style.display = "none";
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
            jugoPen: row.querySelector('.p-jugo-pen').checked,
            penAtm: row.querySelector('.p-pen-atm').value,
            penRival: row.querySelector('.p-pen-riv').value
        });
    });

    const datos = {
        torneo: document.getElementById('tor-nombre').value,
        ubicacion: document.getElementById('tor-ubicacion').value,
        posFinal: document.getElementById('tor-pos-final').value,
        superficie: document.getElementById('tor-superficie').value,
        partidos: partidos,
        val: {
            personalidad: document.getElementById('tor-val-personalidad').value,
            mando: document.getElementById('tor-val-mando').value,
            concentracion: document.getElementById('tor-val-conc').value,
            error: document.getElementById('tor-val-error').value,
            confianza: document.getElementById('tor-val-confianza').value,
            mentalidad: document.getElementById('tor-val-mentalidad').value,
            actitudGol: document.getElementById('tor-val-actitud-gol').value,
            primerUltimo: document.getElementById('tor-val-primer-ultimo').value,
            ritmo: document.getElementById('tor-val-ritmo').value,
            mejoraBajon: document.getElementById('tor-val-mejora-bajon').value,
            entorno: document.getElementById('tor-val-entorno').value,
            unoVuno: document.getElementById('tor-val-1v1').value,
            organizacion: document.getElementById('tor-val-org').value,
            comunicacion: document.getElementById('tor-val-com').value
        },
        obs: {
            penaltis: document.getElementById('tor-obs-penaltis').value,
            decisivas: document.getElementById('tor-obs-decisivas').value,
            pos: document.getElementById('tor-obs-pos').value,
            neg: document.getElementById('tor-obs-neg').value,
            trans: document.getElementById('tor-obs-trans').value
        },
        val_gen: document.getElementById('tor-val-general').value
    };

    const operacion = torneoEnEdicionId 
        ? db.collection('informes_torneo').doc(torneoEnEdicionId).update({ datos: datos })
        : db.collection('informes_torneo').add({ porteroId: pid, fecha: new Date().toISOString(), datos: datos });

    operacion.then(() => {
        db.collection("porteros").doc(pid).get().then(doc => {
            const html = construirHTMLTorneo(doc.data(), datos);
            document.body.classList.remove('print-landscape'); 
            document.body.classList.add('print-portrait');
            document.getElementById('preview-content').innerHTML = html;
            document.getElementById('printable-area').innerHTML = html;
            document.getElementById('modal-pdf-preview').style.display = 'flex';
            
            cancelarEdicionTorneo(); 
        });
    });
}

function construirHTMLTorneo(p, d) {
    const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
    const rowRat = (label, val) => `<div class="pdf-rating-row"><span>${label}</span><span class="pdf-rating-val">${val||'-'}</span></div>`;
    
    const val = d.val || {};
    const obs = d.obs || {};

    let filasPartidos = '';
    let tMin = 0, tGol = 0;
    
    if (d.partidos) {
        d.partidos.forEach(m => {
            tMin += parseInt(m.minutos || 0); 
            const gcReal = m.golesEncajados !== undefined ? m.golesEncajados : (m.golesRival || 0);
            tGol += parseInt(gcReal);
            
            let resClass = '';
            let j = m.jornada.toLowerCase();
            if (j.includes('grupo')) resClass = 'fase-grupos';
            else if (j.includes('1/16')) resClass = 'fase-16';
            else if (j.includes('1/8')) resClass = 'fase-8';
            else if (j.includes('1/4')) resClass = 'fase-4';
            else if (j.includes('semi')) resClass = 'fase-semi';
            else if (j.includes('final') || j.includes('puesto')) resClass = 'fase-final';
            
            let paisTxt = m.pais ? `<span style="font-weight:bold; color:#1C2C5B;">${m.pais}</span> - ` : '';
            let resTxt = (m.golesAtm !== "" && m.golesRival !== "") ? `${m.golesAtm} - ${m.golesRival}` : '-';
            
            if (m.penAtm !== "" && m.penRival !== "") {
                resTxt += ` <br><span style="font-size:8px; color:#CB3524; font-weight:bold;">(Pen: ${m.penAtm} - ${m.penRival})</span>`;
            }

            filasPartidos += `<tr class="${resClass}"><td>${m.jornada}</td><td>${paisTxt}${m.rival}</td><td>${resTxt}</td><td>${m.minutos}'</td><td style="font-weight:bold;">${gcReal}</td></tr>`;
        });
    }

    const mediaGoles = (d.partidos && d.partidos.length > 0) ? (tGol / d.partidos.length).toFixed(1) : 0;

    let valClass = "val-media";
    if(d.val_gen === "BAJA") valClass = "val-baja";
    if(d.val_gen === "ALTA") valClass = "val-alta";
    if(d.val_gen === "EXCEPCIONAL") valClass = "val-excepcional";

    return `
    <div class="pdf-slide">
        <div class="pdf-top-header">
            <div>
                <div class="pdf-top-title">INFORME DE TORNEO</div>
                <div class="pdf-top-subtitle">${d.torneo}</div>
                <div style="font-size:10px; color:#1C2C5B; font-weight:bold;">${d.ubicacion} | ${d.superficie}</div>
            </div>
            <img src="ESCUDO ATM.png" style="height:40px;">
        </div>
        
        <div class="pdf-row">
            <div style="width:40%" class="pdf-player-card">
                <img src="${foto}" class="pdf-player-photo">
                <div class="pdf-player-info">
                    <div class="pdf-player-name">${p.nombre}</div>
                    <div class="pdf-info-row"><span>CAT: ${p.categoria}</span><span>EQ: ${p.equipo}</span></div>
                    <div class="pdf-info-row" style="font-weight:bold; color:#CB3524;">POS. FINAL: 🏆 ${d.posFinal}</div>
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

        <div class="pdf-section-header">DETALLE DE PARTIDOS</div>
        <table class="pdf-table-torneo">
            <thead><tr><th>Jornada/Fase</th><th>País y Rival</th><th>Resultado ATM - RIV</th><th>Minutos</th><th>G.C.</th></tr></thead>
            <tbody>${filasPartidos}</tbody>
        </table>

        <div class="pdf-section-header">ANÁLISIS DE RENDIMIENTO (1-5)</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom:5px;">
            <div class="pdf-rating-box">
                <div class="pdf-box-title" style="background:#ddd; color:#333; border:none;">PSICOLOGÍA Y LIDERAZGO</div>
                ${rowRat("Personalidad", val.personalidad)}${rowRat("Mando", val.mando)}${rowRat("Concentración", val.concentracion)}${rowRat("Gestión Error", val.error)}${rowRat("Confianza", val.confianza)}${rowRat("Mentalidad", val.mentalidad)}${rowRat("Actitud tras Gol", val.actitudGol)}
            </div>
            <div class="pdf-rating-box">
                <div class="pdf-box-title" style="background:#ddd; color:#333; border:none;">EVOLUCIÓN EN TORNEO</div>
                ${rowRat("1º vs Último", val.primerUltimo)}${rowRat("Adapt. Ritmo", val.ritmo)}${rowRat("Mejora/Bajón", val.mejoraBajon)}${rowRat("Adapt. Entorno", val.entorno)}
                <div class="pdf-box-title" style="background:#ddd; color:#333; border:none; margin-top:8px;">TÉCNICO / TÁCTICO</div>
                ${rowRat("Rend. 1vs1", val.unoVuno)}${rowRat("Organización", val.organizacion)}${rowRat("Comunicación", val.comunicacion)}
            </div>
            <div class="pdf-rating-box" style="display:flex; flex-direction:column;">
                <div class="pdf-box-title" style="background:#27AE60; color:white; border:none;">PUNTOS POSITIVOS</div>
                <div class="pdf-text-obs" style="flex:1;">${obs.pos || '-'}</div>
                <div class="pdf-box-title" style="background:#E74C3C; color:white; border:none; margin-top:5px;">ÁREAS DE MEJORA</div>
                <div class="pdf-text-obs" style="flex:1;">${obs.neg || '-'}</div>
            </div>
        </div>

        <div class="pdf-section-header">SITUACIONES ESPECÍFICAS Y CONCLUSIÓN</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div class="pdf-rating-box"><div class="pdf-box-title">Rendimiento en Penaltis</div><div class="pdf-text-obs">${obs.penaltis || '-'}</div></div>
            <div class="pdf-rating-box"><div class="pdf-box-title">Acciones Decisivas</div><div class="pdf-text-obs">${obs.decisivas || '-'}</div></div>
            <div class="pdf-rating-box"><div class="pdf-box-title" style="background:#1C2C5B; color:white;">Trascendencia en el Torneo</div><div class="pdf-text-obs">${obs.trans || '-'}</div></div>
        </div>

        <div style="margin-top:auto; padding-top:15px; text-align:center;">
            <div style="font-size:12px; font-weight:bold; color:#1C2C5B; margin-bottom:8px; text-transform:uppercase;">VALORACIÓN GENERAL DEL TORNEO</div>
            <div class="${valClass}" style="display:inline-block; padding:10px 40px; border-radius:25px; font-size:18px; font-weight:800; border: 2px solid rgba(0,0,0,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">${d.val_gen || 'NO EVALUADO'}</div>
        </div>

        <div style="text-align:center; font-size:8px; margin-top:5px; color:#999;">GuardianLab ATM - Informe de Torneo</div>
    </div>`;
}

window.verPDFTorneoGuardado = function(id) {
    db.collection("informes_torneo").doc(id).get().then(doc => {
        const data = doc.data();
        db.collection("porteros").doc(data.porteroId).get().then(pDoc => {
            const html = construirHTMLTorneo(pDoc.data(), data.datos);
            document.body.classList.remove('print-landscape');
            document.body.classList.add('print-portrait');
            document.getElementById('preview-content').innerHTML = html;
            document.getElementById('printable-area').innerHTML = html;
            document.getElementById('modal-pdf-preview').style.display = 'flex';
        });
    });
}