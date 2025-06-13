class ReportApp {
    constructor() {
        this.currentView = 'home-view';
        this.currentTemplateId = null;
        this.currentFilledReportId = null;
        this.db = { templates: [], filledReports: [], kpiData: [] };
        this.jsPDF = window.jspdf.jsPDF;
        document.addEventListener('DOMContentLoaded', () => this.init());
        this.currentPhotos = [];
    }

    init() {
        this.loadData();
        this.showView('home-view');
        this.updateChart();
    }

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        this.currentView = viewId;
        if (viewId === 'templates-list-view') this.renderTemplatesList();
        if (viewId === 'filled-reports-list-view') this.renderFilledReports();
    }

    loadData() {
        const templates = localStorage.getItem('report_templates');
        const filled = localStorage.getItem('reports_filled');
        const kpi = localStorage.getItem('reports_kpi');
        this.db.templates = templates ? JSON.parse(templates) : [];
        this.db.filledReports = filled ? JSON.parse(filled) : [];
        this.db.kpiData = kpi ? JSON.parse(kpi) : [];
        if (this.db.templates.length === 0) this.createDefaultTemplate();
    }

    saveData() {
        localStorage.setItem('report_templates', JSON.stringify(this.db.templates));
        localStorage.setItem('reports_filled', JSON.stringify(this.db.filledReports));
        localStorage.setItem('reports_kpi', JSON.stringify(this.db.kpiData));
    }

    createDefaultTemplate() {
        const defaultTemplate = {
            id: `template-${Date.now()}`,
            name: 'Plantilla Básica',
            blocks: [
                {
                    id: `block-${Date.now()}-1`,
                    name: 'Notas Generales',
                    type: 'text',
                    collapsed: false,
                    items: [
                        { id: `item-${Date.now()}-1`, name: 'Nota', type: 'note' }
                    ]
                }
            ]
        };
        this.db.templates.push(defaultTemplate);
        this.saveData();
    }

    renderTemplatesList() {
        const grid = document.getElementById('templates-grid');
        grid.innerHTML = '';
        if (this.db.templates.length === 0) {
            grid.innerHTML = '<p>Aún no hay plantillas.</p>';
            return;
        }
        this.db.templates.forEach(t => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${t.name}</h3>
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="app.fillReport('${t.id}')">Llenar</button>
                    <button class="btn btn-secondary" onclick="app.editTemplate('${t.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="app.deleteTemplate('${t.id}')">Eliminar</button>
                </div>`;
            grid.appendChild(card);
        });
    }

    addBlockToEditor() {
        const block = {
            id: `block-${Date.now()}`,
            name: 'Nuevo Bloque',
            type: 'text',
            collapsed: false,
            items: []
        };
        document.getElementById('blocks-container').appendChild(this.createBlockElement(block));
    }

    editTemplate(id) {
        const template = this.db.templates.find(t => t.id === id);
        if (!template) return;
        this.currentTemplateId = id;
        document.getElementById('editor-title').innerText = 'Editar Plantilla';
        document.getElementById('template-name').value = template.name;
        const container = document.getElementById('blocks-container');
        container.innerHTML = '';
        template.blocks.forEach(b => container.appendChild(this.createBlockElement(b)));
        this.showView('template-editor-view');
    }

    createBlockElement(blockData) {
        const div = document.createElement('div');
        div.className = 'block';
        div.dataset.id = blockData.id;
        div.dataset.type = blockData.type;
        if (blockData.collapsed) div.classList.add('collapsed');

        let itemTypeOptions = '<option value="">+ Añadir Ítem...</option>';
        ['text','image','kpi','table','note'].forEach(typeKey => {
            itemTypeOptions += `<option value="${typeKey}">${typeKey}</option>`;
        });

        div.innerHTML = `
            <div class="block-header" onclick="app.toggleBlockCollapse(this.closest('.block'))">
                <h4 class="block-name-display">${blockData.name}</h4>
                <div class="block-header-controls">
                    <input type="text" class="block-name-input" value="${blockData.name}" oninput="this.closest('.block').querySelector('.block-name-display').innerText = this.value;">
                    <select onchange="app.addItemToBlock(this)">${itemTypeOptions}</select>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.deleteBlock(this.closest('.block'))">Eliminar Bloque</button>
                    <button class="block-collapse-btn">▼</button>
                </div>
            </div>
            <div class="block-content items-container"></div>`;

        const container = div.querySelector('.items-container');
        blockData.items.forEach(i => container.appendChild(this.createItemElement(i)));
        return div;
    }

    addItemToBlock(select) {
        const type = select.value;
        if (!type) return;
        const container = select.closest('.block').querySelector('.items-container');
        const item = { id: `item-${Date.now()}`, name: type.toUpperCase(), type };
        container.appendChild(this.createItemElement(item));
        select.value = '';
    }

    createItemElement(itemData) {
        const div = document.createElement('div');
        div.className = 'item item-full-width';
        div.dataset.itemId = itemData.id;
        div.dataset.itemType = itemData.type;
        let content = `<input type="text" class="item-name-input" value="${itemData.name}">`;
        if (itemData.type === 'note') content = `<textarea class="item-name-input">${itemData.name}</textarea>`;
        div.innerHTML = `
            <span class="item-type-badge">${itemData.type}</span>
            ${content}
            <div class="item-controls-editor">
                <button class="btn btn-danger btn-sm" onclick="app.deleteItem(this.closest('.item'))">-</button>
            </div>`;
        return div;
    }

    deleteItem(div) { div.remove(); }
    deleteBlock(div) { div.remove(); }

    saveTemplate() {
        const name = document.getElementById('template-name').value.trim();
        if (!name) { this.showMessageBox('La plantilla necesita un nombre.','warning'); return; }
        const blocks = [];
        document.querySelectorAll('#blocks-container .block').forEach(b => {
            const items = [];
            b.querySelectorAll('.item').forEach(i => {
                items.push({ id: i.dataset.itemId, name: i.querySelector('.item-name-input').value, type: i.dataset.itemType });
            });
            blocks.push({ id: b.dataset.id, name: b.querySelector('.block-name-input').value, type: 'text', collapsed: b.classList.contains('collapsed'), items });
        });
        if (this.currentTemplateId) {
            const idx = this.db.templates.findIndex(t => t.id === this.currentTemplateId);
            if (idx !== -1) this.db.templates[idx] = { id: this.currentTemplateId, name, blocks };
        } else {
            this.db.templates.push({ id: `template-${Date.now()}`, name, blocks });
        }
        this.saveData();
        this.showView('templates-list-view');
    }

    toggleBlockCollapse(blockDiv) {
        blockDiv.classList.toggle('collapsed');
    }

    deleteTemplate(id) {
        this.db.templates = this.db.templates.filter(t => t.id !== id);
        this.db.filledReports = this.db.filledReports.filter(r => r.templateId !== id);
        this.saveData();
        this.renderTemplatesList();
    }

    fillReport(templateId) {
        const template = this.db.templates.find(t => t.id === templateId);
        if (!template) return;
        this.currentTemplateId = templateId;
        document.getElementById('filler-title').innerText = `Llenando: ${template.name}`;
        // reset general editable sections
        document.getElementById('report-cover').innerHTML = '<h3>Portada del Reporte</h3><p>Escriba aquí la información inicial del reporte...</p>';
        document.getElementById('kpi-input').value = '';
        document.querySelector('#summary-table tbody').innerHTML = '<tr><td contenteditable="true"></td><td contenteditable="true"></td><td contenteditable="true"></td></tr>';
        document.getElementById('photo-input').value = '';
        document.getElementById('photo-list').innerHTML = '';
        this.currentPhotos = [];
        document.getElementById('photo-input').onchange = (e) => this.handlePhotoUpload(e);
        const container = document.getElementById('filler-blocks-container');
        container.innerHTML = '';
        template.blocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'block';
            blockDiv.innerHTML = `<div class="block-header"><h4>${block.name}</h4></div><div class="block-content items-container"></div>`;
            const itemContainer = blockDiv.querySelector('.items-container');
            block.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'checklist-item item-full-width';
                itemDiv.dataset.itemId = item.id;
                itemDiv.dataset.itemType = item.type;
                let control = `<input type="text" class="item-value">`;
                if (item.type === 'note') control = `<textarea class="item-value"></textarea>`;
                if (item.type === 'image') control = `<input type="file" class="item-value" accept="image/*">`;
                if (item.type === 'kpi') control = `<input type="number" class="item-value">`;
                if (item.type === 'table') control = `<textarea class="item-value"></textarea>`;
                itemDiv.innerHTML = `<p><strong>${item.name}</strong></p>${control}`;
                itemContainer.appendChild(itemDiv);
            });
            container.appendChild(blockDiv);
        });
        this.showView('report-filler-view');
    }

    saveFilledReport() {
        const templateId = this.currentTemplateId;
        const template = this.db.templates.find(t => t.id === templateId);
        if (!template) return;
        const itemsData = {};
        template.blocks.forEach(block => {
            block.items.forEach(item => {
                const el = document.querySelector(`.checklist-item[data-item-id="${item.id}"] .item-value`);
                if (el) itemsData[item.id] = el.value;
            });
        });
        const cover = document.getElementById('report-cover').innerHTML;
        const summaryRows = [];
        document.querySelectorAll('#summary-table tbody tr').forEach(tr => {
            const cells = Array.from(tr.cells).map(td => td.innerText.trim());
            if (cells.some(c => c)) summaryRows.push(cells);
        });
        const newReport = {
            id: `filled-${Date.now()}`,
            templateId,
            templateName: template.name,
            sequentialNumber: this.db.filledReports.filter(r => r.templateId === templateId).length + 1,
            itemsData,
            cover,
            summary: summaryRows,
            photos: this.currentPhotos.slice(),
            timestamp: Date.now()
        };
        this.db.filledReports.push(newReport);
        const kpiInput = document.querySelector('#kpi-section input[type="number"]');
        if (kpiInput && kpiInput.value) {
            const val = parseFloat(kpiInput.value);
            if (!isNaN(val)) {
                this.db.kpiData.push(val);
                this.updateChart();
            }
        }
        this.saveData();
        this.showView('filled-reports-list-view');
    }

    renderFilledReports() {
        const container = document.getElementById('filled-reports-container');
        container.innerHTML = '';
        if (this.db.filledReports.length === 0) {
            container.innerHTML = '<p>No hay reportes guardados.</p>';
            return;
        }
        this.db.filledReports.sort((a,b) => b.timestamp - a.timestamp).forEach(rep => {
            container.appendChild(this.createFilledReportCard(rep));
        });
    }

    createFilledReportCard(report) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>Reporte #${report.sequentialNumber}</h4>
            <p><strong>Plantilla:</strong> ${report.templateName}</p>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="app.exportToPDF('${report.id}')">PDF</button>
                <button class="btn btn-danger" onclick="app.deleteFilledReport('${report.id}')">Eliminar</button>
            </div>`;
        return card;
    }

    deleteFilledReport(id) {
        this.db.filledReports = this.db.filledReports.filter(r => r.id !== id);
        this.saveData();
        this.renderFilledReports();
    }

    handlePhotoUpload(event) {
        const list = document.getElementById('photo-list');
        Array.from(event.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'photo-thumb';
                list.appendChild(img);
                this.currentPhotos.push(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    formatValueForPDF(type, value) {
        if (!value) return '';
        return value;
    }

    exportToPDF(id) {
        const report = this.db.filledReports.find(r => r.id === id);
        const template = this.db.templates.find(t => t.id === report.templateId);
        if (!report || !template) return;
        const doc = new this.jsPDF();
        doc.setFontSize(18);
        doc.text(`Reporte: ${template.name} (#${report.sequentialNumber})`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        let yPos = 35;
        // Cover section
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Portada', 14, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 7;
        const coverText = report.cover.replace(/<[^>]+>/g, '');
        const split = doc.splitTextToSize(coverText, 180);
        doc.text(split, 14, yPos);
        yPos += split.length * 6 + 4;
        template.blocks.forEach(block => {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(block.name, 14, yPos);
            yPos += 7;
            const tableBody = block.items.map(item => {
                const value = report.itemsData[item.id] || '';
                return [ item.name, this.formatValueForPDF(item.type, value) ];
            });
            doc.autoTable({ startY: yPos, head: [['Ítem','Valor']], body: tableBody, styles:{fontSize:9, cellPadding:2}, headStyles:{fillColor:[44,62,80], textColor:[255,255,255], fontStyle:'bold'}, alternateRowStyles:{fillColor:[240,240,240]}, margin:{left:14, right:14} });
            yPos = doc.autoTable.previous.finalY + 10;
            if (yPos > 260) { doc.addPage(); yPos = 20; }
        });

        // Summary table
        if (report.summary && report.summary.length) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Resumen Semanal', 14, yPos);
            yPos += 7;
            doc.autoTable({ startY: yPos, head: [['Actividad','Estado','Notas']], body: report.summary, styles:{fontSize:9, cellPadding:2}, headStyles:{fillColor:[44,62,80], textColor:[255,255,255], fontStyle:'bold'}, margin:{left:14,right:14} });
            yPos = doc.autoTable.previous.finalY + 10;
        }

        // Photos
        if (report.photos && report.photos.length) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Fotografías', 14, yPos);
            yPos += 5;
            report.photos.forEach((imgData, idx) => {
                if (yPos > 250) { doc.addPage(); yPos = 20; }
                doc.addImage(imgData, 'PNG', 14, yPos, 60, 45);
                yPos += 50;
            });
        }
        if (this.db.kpiData.length) {
            const canvas = document.createElement('canvas');
            new Chart(canvas.getContext('2d'), { type:'line', data:{ labels:this.db.kpiData.map((_,i)=>`Semana ${i+1}`), datasets:[{label:'KPI', data:this.db.kpiData, borderColor:'#3498db'}] } });
            doc.addPage();
            doc.text('Histórico KPI', 14, 22);
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', 14, 30, 180, 80);
        }
        doc.save(`${template.name}_${report.sequentialNumber}.pdf`);
    }

    showMessageBox(msg, type='info') {
        const box = document.createElement('div');
        box.className = `message-box ${type}`;
        box.innerText = msg;
        document.body.appendChild(box);
        setTimeout(()=>{ box.style.opacity = 1; }, 10);
        setTimeout(()=>{ box.style.opacity = 0; box.addEventListener('transitionend', () => box.remove()); }, 3000);
    }

    updateChart() {
        const ctx = document.getElementById('kpi-chart').getContext('2d');
        if (window.kpiChart) window.kpiChart.destroy();
        window.kpiChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.db.kpiData.map((_,i)=>`Semana ${i+1}`),
                datasets: [{ label:'KPI', data:this.db.kpiData, borderColor:'#3498db' }]
            }
        });
    }
}

const app = new ReportApp();
