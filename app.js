(function(){
const main = document.querySelector('main');
let kpiData = JSON.parse(localStorage.getItem('kpiData') || '[]');

function updateChart(){
    const ctx = document.getElementById('kpi-chart').getContext('2d');
    if(window.kpiChart) window.kpiChart.destroy();
    window.kpiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: kpiData.map((_,i)=>`Semana ${i+1}`),
            datasets: [{label:'KPI', data:kpiData, borderColor:'#3498db'}]
        }
    });
}

function saveReport(){
    const reports = JSON.parse(localStorage.getItem('reports')||'[]');
    const num = reports.length + 1;
    const reportHtml = document.body.innerHTML;
    reports.push({num, html: reportHtml, date: new Date().toISOString()});
    localStorage.setItem('reports', JSON.stringify(reports));
    const kpi = parseFloat(prompt('Ingrese valor KPI de la semana', '0'));
    if(!isNaN(kpi)) {
        kpiData.push(kpi);
        localStorage.setItem('kpiData', JSON.stringify(kpiData));
        updateChart();
    }
    alert('Reporte guardado #' + num);
}

function createBlock(type){
    const section = document.createElement('section');
    section.className = 'card editable';
    let inner = '';
    switch(type){
        case 'text': inner = '<p contenteditable="true">Nuevo texto...</p>'; break;
        case 'image': inner = '<input type="file" accept="image/*">'; break;
        case 'kpi': inner = '<p contenteditable="true">KPI:</p>'; break;
        case 'table': inner = '<table><tr><td contenteditable="true"></td></tr></table>'; break;
        case 'note': inner = '<p contenteditable="true">Nota...</p>'; break;
    }
    section.innerHTML = inner + '<button class="delete-block">Eliminar</button>';
    main.appendChild(section);
}

function setupTemplateManager(){
    document.getElementById('edit-templates-btn').addEventListener('click', ()=>{
        const type = prompt('Tipo de bloque (text, image, kpi, table, note)');
        if(type) createBlock(type);
    });
    main.addEventListener('click', e=>{
        if(e.target.classList.contains('delete-block')){
            e.target.parentElement.remove();
        }
    });
}

function loadReports(){
    const btn = document.getElementById('view-reports-btn');
    btn.addEventListener('click', ()=>{
        const reports = JSON.parse(localStorage.getItem('reports')||'[]');
        const list = reports.map(r=>`#${r.num} - ${new Date(r.date).toLocaleDateString()}`).join('\n');
        alert('Reportes guardados:\n'+list);
    });
}

function generatePDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.html(document.body, { callback: doc=>{ doc.save('reporte.pdf'); } });
}

document.getElementById('save-report').addEventListener('click', saveReport);

document.getElementById('generate-pdf').addEventListener('click', generatePDF);

setupTemplateManager();
loadReports();
updateChart();
})();
