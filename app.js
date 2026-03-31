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
    
    // Ocultar todas las secciones y quitar estado activo de TODOS los botones del nav
    ['porteros','sesiones','informes', 'torneos'].forEach(id => {
        document.getElementById('section-'+id).style.display = 'none';
        const btn = document.getElementById('btn-'+id);
        if(btn) btn.classList.remove('active');
    });

    // Mostrar sección actual y darle estado activo a su botón
    document.getElementById('section-'+sec).style.display = 'block';
    const targetBtn = document.getElementById('btn-'+sec);
    if(targetBtn) targetBtn.classList.add('active');
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

// --- INFORMES SEMESTRALES (VERTICAL A4 DEFINITIVO) ---
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
    db.collection('informes_semestrales').add({ porteroId: pid, fecha: new Date().toISOString(), datos: datos }).then(() => { db.collection("porteros").doc(pid).get().then(doc => { const p = doc.data(); const html = construirHTMLInformeVertical(p, datos); document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait'); document.getElementById('preview-content').innerHTML = html; document.getElementById('printable-area').innerHTML = html; document.getElementById('modal-pdf-preview').style.display = 'flex'; }); });
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
        
        <div class="pdf-rating-box ${valClass}" style="margin-top:auto;"><div class="pdf-box-title" style="background:rgba(0,0,0,0.2);">7. VALORACIÓN GENERAL</div><div style="font-size:24px; font-weight:800; padding:10px; text-align:center;">${d.perfil.val_gen}</div></div>
        
        <div style="text-align:center; font-size:8px; margin-top:5px; color:#999;">GuardianLab ATM - Informe Técnico</div>
    </div>`;
}

function cargarHistorialInformes() { db.collection("informes_semestrales").orderBy("fecha", "desc").limit(10).onSnapshot(snap => { const cont = document.getElementById('lista-informes-guardados'); if(!cont) return; cont.innerHTML = ''; snap.forEach(doc => { const inf = doc.data(); db.collection("porteros").doc(inf.porteroId).get().then(pDoc => { if(pDoc.exists) { const p = pDoc.data(); cont.innerHTML += `<div class="eval-card"><div><div style="font-weight:bold;">${p.nombre}</div><div style="font-size:0.8rem;">${inf.datos.titulo}</div><div style="font-size:0.7rem; color:#aaa">${inf.fecha.substring(0,10)}</div></div><div style="display:flex; gap:5px;"><button class="btn-icon-action" onclick="window.verPDFInformeGuardado('${doc.id}')">📄</button><button class="btn-trash" onclick="db.collection('informes_semestrales').doc('${doc.id}').delete()">🗑️</button></div></div>`; } }); }); }); }
window.verPDFInformeGuardado = function(id) { db.collection("informes_semestrales").doc(id).get().then(doc => { if(doc.exists) { const data = doc.data(); db.collection("porteros").doc(data.porteroId).get().then(pDoc => { const html = construirHTMLInformeVertical(pDoc.data(), data.datos); document.body.classList.remove('print-landscape'); document.body.classList.add('print-portrait'); document.getElementById('preview-content').innerHTML = html; document.getElementById('printable-area').innerHTML = html; document.getElementById('modal-pdf-preview').style.display = 'flex'; }); } }); }
window.imprimirPDFNativo = function() { window.print(); }

// ==========================================
// --- MÓDULO DE TORNEOS ---
// ==========================================

window.agregarFilaPartido = function() {
    const container = document.getElementById('contenedor-partidos');
    const div = document.createElement('div');
    div.className = 'partido-row';
    div.innerHTML = `
        <div class="row">
            <select class="p-fase" style="flex:1.5">
                <option value="Fase Grupos">Fase Grupos</option>
                <option value="1/16 Final">1/16 Final</option>
                <option value="1/8 Final">1/8 Final</option>
                <option value="1/4 Final">1/4 Final</option>
                <option value="Semifinal">Semifinal</option>
                <option value="Final">Final</option>
                <option value="3º/4º Puesto">3º/4º Puesto</option>
            </select>
            <input type="text" class="p-rival" placeholder="Rival" style="flex:2">
        </div>
        <div class="row">
            <input type="text" class="p-res" placeholder="Res (ej: 2-1)" style="flex:1">
            <input type="number" class="p-min" placeholder="Minutos" style="flex:1">
            <input type="number" class="p-goles" placeholder="Goles Enc." style="flex:1">
            <button onclick="this.parentElement.parentElement.remove()" style="background:none; border:none; color:var(--atm-red); font-size:1.2rem; cursor:pointer;">❌</button>
        </div>
    `;
    container.appendChild(div);
}

window.generarPDFTorneo = function() {
    const pid = document.getElementById('tor-portero').value;
    if(!pid) return alert("Selecciona un portero");

    const partidos = [];
    document.querySelectorAll('.partido-row').forEach(row => {
        partidos.push({
            fase: row.querySelector('.p-fase').value,
            rival: row.querySelector('.p-rival').value,
            resultado: row.querySelector('.p-res').value,
            minutos: row.querySelector('.p-min').value || 0,
            goles: row.querySelector('.p-goles').value || 0
        });
    });

    const datos = {
        torneo: document.getElementById('tor-nombre').value,
        ubicacion: document.getElementById('tor-ubicacion').value,
        posFinal: document.getElementById('tor-pos-final').value,
        superficie: document.getElementById('tor-superficie').value,
        partidos: partidos,
        val: {
            entorno: document.getElementById('tor-val-entorno').value,
            concentracion: document.getElementById('tor-val-conc').value,
            presion: document.getElementById('tor-val-presion').value,
            aereo: document.getElementById('tor-val-aereo').value,
            comunicacion: document.getElementById('tor-val-com').value,
            penaltis: document.getElementById('tor-val-penaltis').value
        },
        obs: {
            pos: document.getElementById('tor-obs-pos').value,
            neg: document.getElementById('tor-obs-neg').value,
            trans: document.getElementById('tor-obs-trans').value
        }
    };

    db.collection('informes_torneo').add({ porteroId: pid, fecha: new Date().toISOString(), datos: datos }).then(() => {
        db.collection("porteros").doc(pid).get().then(doc => {
            const html = construirHTMLTorneo(doc.data(), datos);
            document.body.classList.remove('print-landscape'); 
            document.body.classList.add('print-portrait');
            document.getElementById('preview-content').innerHTML = html;
            document.getElementById('printable-area').innerHTML = html;
            document.getElementById('modal-pdf-preview').style.display = 'flex';
        });
    });
}

function construirHTMLTorneo(p, d) {
    const foto = p.foto || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNMTIgOGEzIDMgMCAxIDAgMCA2IDMgMyAwIDAgMCAwLTZ6bS01IDlsMTAgMGE3IDcgMCAwIDEtMTAgMHoiLz48L3N2Zz4=";
    
    let filasPartidos = '';
    let tMin = 0, tGol = 0;
    d.partidos.forEach(m => {
        tMin += parseInt(m.minutos); tGol += parseInt(m.goles);
        filasPartidos += `<tr><td>${m.fase}</td><td>${m.rival}</td><td>${m.resultado}</td><td>${m.minutos}'</td><td>${m.goles}</td></tr>`;
    });

    const mediaGoles = d.partidos.length > 0 ? (tGol / d.partidos.length).toFixed(1) : 0;

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
                    <div class="pdf-info-row" style="font-weight:bold; color:#CB3524;">POS. FINAL: ${d.posFinal}</div>
                </div>
            </div>
            <div style="width:60%" class="pdf-rating-box">
                <div class="pdf-box-title">RESUMEN ESTADÍSTICO</div>
                <div class="pdf-resumen-box">
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${d.partidos.length}</span>PJ</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${tMin}'</span>MIN</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${tGol}</span>GC</div>
                    <div class="pdf-resumen-item"><span class="pdf-resumen-val">${mediaGoles}</span>MEDIA</div>
                </div>
            </div>
        </div>

        <div class="pdf-section-header">DETALLE DE PARTIDOS</div>
        <table class="pdf-table-torneo">
            <thead><tr><th>Fase</th><th>Rival</th><th>Resultado</th><th>Minutos</th><th>G.E.</th></tr></thead>
            <tbody>${filasPartidos}</tbody>
        </table>

        <div class="pdf-section-header">VALORACIÓN TÉCNICA DEL TORNEO (1-5)</div>
        <div class="pdf-row">
            <div class="pdf-half-col pdf-rating-box">
                <div class="pdf-rating-row"><span>Adaptación Entorno</span><span class="pdf-rating-val">${d.val.entorno || '-'}</span></div>
                <div class="pdf-rating-row"><span>Nivel Concentración</span><span class="pdf-rating-val">${d.val.concentracion || '-'}</span></div>
                <div class="pdf-rating-row"><span>Gestión de Presión</span><span class="pdf-rating-val">${d.val.presion || '-'}</span></div>
            </div>
            <div class="pdf-half-col pdf-rating-box">
                <div class="pdf-rating-row"><span>Juego Aéreo</span><span class="pdf-rating-val">${d.val.aereo || '-'}</span></div>
                <div class="pdf-rating-row"><span>Comunicación</span><span class="pdf-rating-val">${d.val.comunicacion || '-'}</span></div>
                <div class="pdf-rating-row"><span>Penaltis</span><span class="pdf-rating-val">${d.val.penaltis || 'N/A'}</span></div>
            </div>
        </div>

        <div class="pdf-section-header">ANÁLISIS CUALITATIVO</div>
        <div class="pdf-rating-box">
            <div class="pdf-box-title" style="background:#27AE60; color:white; border:none;">PUNTOS POSITIVOS</div>
            <div class="pdf-text-obs">${d.obs.pos}</div>
            <div class="pdf-box-title" style="background:#E74C3C; color:white; border:none; margin-top:5px;">ÁREAS DE MEJORA</div>
            <div class="pdf-text-obs">${d.obs.neg}</div>
            <div class="pdf-box-title" style="background:#1C2C5B; color:white; border:none; margin-top:5px;">TRASCENDENCIA EN EL TORNEO</div>
            <div class="pdf-text-obs">${d.obs.trans}</div>
        </div>

        <div style="text-align:center; font-size:8px; margin-top:5px; color:#999;">GuardianLab ATM - Informe de Torneo</div>
    </div>`;
}

function cargarHistorialTorneos() {
    db.collection("informes_torneo").orderBy("fecha", "desc").limit(10).onSnapshot(snap => {
        const cont = document.getElementById('lista-torneos-guardados');
        if(!cont) return;
        cont.innerHTML = '';
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
                            <button class="btn-icon-action" onclick="window.verPDFTorneoGuardado('${doc.id}')">📄</button>
                            <button class="btn-trash" onclick="db.collection('informes_torneo').doc('${doc.id}').delete()">🗑️</button>
                        </div>
                    </div>`;
                }
            });
        });
    });
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