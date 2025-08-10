// --- Constantes y Variables Globales ---
const MAX_PHOTOS = 10; // Límite de fotos
const { jsPDF } = window.jspdf; // Acceso a jsPDF

// Referencias a elementos del DOM
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// General Data Section
const fechaIngresoInput = document.getElementById('fecha-ingreso');
const fechaSalidaInput = document.getElementById('fecha-salida');
const nombreInput = document.getElementById('nombre');
const areaInput = document.getElementById('area');
const centroInput = document.getElementById('centro');

// Inventory Section
const inventoryItemsConfig = [
    { id: 'rovs', detailElement: null, quantityElement: null },
    { id: 'consoles', detailElement: null, quantityElement: null },
    { id: 'memories', detailElement: null, quantityElement: null },
    { id: 'others', detailElement: null, quantityElement: null },
    { id: 'notebook', detailElement: null, quantityElement: null },
    { id: 'gps', detailElement: null, quantityElement: null },
    { id: 'cables-rov', detailElement: null, quantityElement: null },
    { id: 'eee', detailElement: null, quantityElement: null },
    { id: 'hidrolavadoras', detailElement: null, quantityElement: null },
    { id: 'generador', detailElement: null, quantityElement: null },
    { id: 'dvr', detailElement: null, quantityElement: null },
    { id: 'extension-electrica', detailElement: null, quantityElement: null },
    { id: 'caja-herramientas', detailElement: null, quantityElement: null },
    { id: 'bidones-bencina', detailElement: null, quantityElement: null },
    { id: 'difusor', detailElement: null, quantityElement: null },
    { id: 'manguera-hidrolavadora', detailElement: null, quantityElement: null },
    { id: 'trineo', detailElement: null, quantityElement: null },
    { id: 'estanque', detailElement: null, quantityElement: null },
    { id: 'manguera-corrugada', detailElement: null, quantityElement: null }
];

// Populate elements in config
inventoryItemsConfig.forEach(item => {
    item.detailElement = document.getElementById(`${item.id}-detail`);
    item.quantityElement = document.getElementById(`${item.id}-quantity`);
});

// Observations Section
const observationsTextArea = document.getElementById('observations-text');

// Requests Section
const requestsTable = document.getElementById('requests-table');
const addRequestRowButton = document.getElementById('add-request-row');
const requestsNoteTextArea = document.getElementById('requests-note');

// Faena Status Section
const faenaStatusTextArea = document.getElementById('faena-status-text');
const faenaImageDescriptionTextArea = document.getElementById('faena-image-description');
const faenaImage1Input = document.getElementById('faena-image-1-input');
const faenaImage1Preview = document.getElementById('faena-image-1-preview');
const faenaImage2Input = document.getElementById('faena-image-2-input');
const faenaImage2Preview = document.getElementById('faena-image-2-preview');

// Photos Section
const photoGrid = document.getElementById('photo-grid');
const fileInput = document.getElementById('file-input');
const captureInput = document.getElementById('capture-input');
const captureButton = document.getElementById('capture-photo-button');
const photoLimitAlert = document.getElementById('photo-limit-alert');



// Footer Buttons and Status
const actionStatus = document.getElementById('action-status');
const actionError = document.getElementById('action-error');

// Preview Section


// Dark Mode
const darkModeButton = document.getElementById('menu-dark-mode');
const hamburgerButton = document.getElementById('hamburger-button');
const dropdownMenu = document.getElementById('dropdown-menu');
let deferredPrompt; // Variable para almacenar el evento beforeinstallprompt


// Estado de la aplicación (cargado desde localStorage)
let generalData = {
    fechaIngreso: '',
    fechaSalida: '',
    nombre: '',
    area: '',
    centro: ''
};
const initialInventory = {};
inventoryItemsConfig.forEach(item => {
    initialInventory[item.id.replace(/-/g, '')] = { quantity: 0, detail: '' };
});
let inventory = { ...initialInventory };
let observationsText = '';
let requests = []; // Array of { object: '', quantity: 0 }
let requestsNote = '';
let faenaStatus = {
    text: '',
    imageDescription: '',
    image1: null, // Base64 DataURL
    image2: null  // Base64 DataURL
};
let photos = [];


// --- IndexedDB Setup ---
const DB_NAME = 'ReporteFotosDB';
const DB_VERSION = 1;
const PHOTOS_STORE_NAME = 'photos';
let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(PHOTOS_STORE_NAME)) {
                db.createObjectStore(PHOTOS_STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Error abriendo IndexedDB:', event.target.error);
            showError('Error al inicializar la base de datos local.');
            reject(event.target.error);
        };
    });
}

async function addPhotoToDB(photo) {
    const transaction = db.transaction([PHOTOS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.add(photo);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error añadiendo foto a IndexedDB:', event.target.error);
            showError('Error al guardar la foto. Intenta reducir el tamaño o la cantidad.');
            reject(event.target.error);
        };
    });
}

async function getPhotosFromDB() {
    const transaction = db.transaction([PHOTOS_STORE_NAME], 'readonly');
    const store = transaction.objectStore(PHOTOS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error('Error obteniendo fotos de IndexedDB:', event.target.error);
            showError('Error al cargar las fotos.');
            reject(event.target.error);
        };
    });
}

async function deletePhotoFromDB(id) {
    const transaction = db.transaction([PHOTOS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error('Error eliminando foto de IndexedDB:', event.target.error);
            showError('Error al eliminar la foto.');
            reject(event.target.error);
        };
    });
}

async function updatePhotoDescriptionInDB(id, description) {
    const transaction = db.transaction([PHOTOS_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE_NAME);
    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const photo = getRequest.result;
            if (photo) {
                photo.description = description;
                const updateRequest = store.put(photo);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = (event) => {
                    console.error('Error actualizando descripción en IndexedDB:', event.target.error);
                    showError('Error al actualizar la descripción de la foto.');
                    reject(event.target.error);
                };
            } else {
                reject('Foto no encontrada para actualizar.');
            }
        };
        getRequest.onerror = (event) => {
            console.error('Error obteniendo foto para actualizar descripción:', event.target.error);
            reject(event.target.error);
        };
    });
}


// --- Funciones ---

// Cargar datos desde localStorage
async function loadData() {
    const storedGeneralData = localStorage.getItem('generalData');
    const storedInventory = localStorage.getItem('inventory');
    const storedObservationsText = localStorage.getItem('observationsText');
    const storedRequests = localStorage.getItem('requests');
    const storedRequestsNote = localStorage.getItem('requestsNote');
    const storedFaenaStatus = localStorage.getItem('faenaStatus');

    if (storedGeneralData) {
        generalData = JSON.parse(storedGeneralData);
        fechaIngresoInput.value = generalData.fechaIngreso;
        fechaSalidaInput.value = generalData.fechaSalida;
        nombreInput.value = generalData.nombre;
        areaInput.value = generalData.area;
        centroInput.value = generalData.centro;
    }
    if (storedInventory) {
        const parsedStoredInventory = JSON.parse(storedInventory);
        inventoryItemsConfig.forEach(item => {
            const key = item.id.replace(/-/g, '');
            if (parsedStoredInventory[key] && typeof parsedStoredInventory[key] === 'object') {
                Object.assign(inventory[key], parsedStoredInventory[key]);
            } else if (typeof parsedStoredInventory[key] === 'string') { // Handle old string format
                inventory[key].detail = parsedStoredInventory[key];
            }
        });
    }
    inventoryItemsConfig.forEach(item => {
        const key = item.id.replace(/-/g, '');
        if (item.detailElement) item.detailElement.value = inventory[key].detail;
        if (item.quantityElement) item.quantityElement.value = inventory[key].quantity;
    });
    if (storedObservationsText) {
        observationsText = storedObservationsText;
        observationsTextArea.value = observationsText;
    }
    if (storedRequests) {
        requests = JSON.parse(storedRequests);
    }
    if (requests.length === 0) { // Ensure at least one empty request row exists
        requests.push({ object: '', quantity: 0 });
    }
    renderRequests(); // Render requests table
    if (storedRequestsNote) {
        requestsNote = storedRequestsNote;
        requestsNoteTextArea.value = requestsNote;
    }
    if (storedFaenaStatus) {
        faenaStatus = JSON.parse(storedFaenaStatus);
        faenaStatusTextArea.value = faenaStatus.text;
        faenaImageDescriptionTextArea.value = faenaStatus.imageDescription;
        if (faenaStatus.image1) {
            faenaImage1Preview.innerHTML = `<img src="${faenaStatus.image1}" class="w-full h-full object-cover rounded">`;
        }
        if (faenaStatus.image2) {
            faenaImage2Preview.innerHTML = `<img src="${faenaStatus.image2}" class="w-full h-full object-cover rounded">`;
        }
    }
    // Cargar fotos desde IndexedDB
    try {
        photos = await getPhotosFromDB();
    } catch (e) {
        console.error("Error cargando fotos desde IndexedDB:", e);
        photos = []; // Fallback a array vacío si hay error
    }
    
    console.log('Datos cargados desde localStorage:', { generalData, inventory, observationsText, requests, requestsNote, faenaStatus, photos });
    renderPhotos();
    updatePhotoLimitAlert();
}

// Guardar datos en localStorage (las fotos se guardan en IndexedDB por separado)
function saveData() {
    try {
        localStorage.setItem('generalData', JSON.stringify(generalData));
        localStorage.setItem('inventory', JSON.stringify(inventory));
        localStorage.setItem('observationsText', observationsText);
        localStorage.setItem('requests', JSON.stringify(requests));
        localStorage.setItem('requestsNote', requestsNote);
        localStorage.setItem('faenaStatus', JSON.stringify(faenaStatus));
        
        console.log('Datos guardados en localStorage');
    } catch (e) {
        console.error("Error guardando en localStorage:", e);
        showError("No se pudieron guardar los cambios en el almacenamiento local.");
    }
}

// Mostrar una sección y ocultar las demás
function showSection(sectionId) {
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');

    // Actualizar estilo de pestañas
    tabButtons.forEach(button => {
        button.classList.remove('active-tab');
        if (button.id === `tab-${sectionId.split('-')[0]}`) {
            button.classList.add('active-tab');
        }
    });

    
}

// Renderizar la cuadrícula de fotos
function renderPhotos() {
    photoGrid.innerHTML = ''; // Limpiar grid
    photos.forEach((photo, index) => {
        const div = document.createElement('div');
        div.classList.add('relative', 'bg-white', 'p-2', 'rounded', 'shadow', 'border', 'border-gray-200');
        div.dataset.id = photo.id;

        const img = document.createElement('img');
        img.src = photo.dataUrl;
        img.alt = `Foto ${index + 1}`;
        img.classList.add('w-full', 'h-32', 'sm:h-40', 'object-cover', 'rounded', 'mb-2');

        const textarea = document.createElement('textarea');
        textarea.classList.add('w-full', 'text-sm', 'border', 'border-gray-300', 'rounded', 'p-1', 'mt-1', 'focus:outline-none', 'focus:ring-1', 'focus:ring-blue-500');
        textarea.placeholder = 'Añadir descripción...';
        textarea.rows = 2;
        textarea.value = photo.description;
        textarea.addEventListener('input', (e) => {
            updateDescription(photo.id, e.target.value);
        });

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '×'; // Icono de 'x'
        deleteButton.classList.add('absolute', 'top-1', 'right-1', 'bg-red-500', 'text-white', 'rounded-full', 'w-5', 'h-5', 'text-xs', 'flex', 'items-center', 'justify-center', 'font-bold', 'hover:bg-red-700');
        deleteButton.title = 'Eliminar foto';
        deleteButton.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres eliminar esta foto?')) {
                deletePhoto(photo.id);
            }
        });

        div.appendChild(deleteButton);
        div.appendChild(img);
        div.appendChild(textarea);
        photoGrid.appendChild(div);
    });
     // Habilitar/deshabilitar botones de acción según si hay fotos
     
}

// Añadir foto (desde archivo o captura)
async function addPhoto(file) {
     if (photos.length >= MAX_PHOTOS) {
         showError(`No se pueden añadir más fotos (límite: ${MAX_PHOTOS}).`);
         return;
     }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const newPhoto = {
            id: Date.now(), // ID simple basado en timestamp
            dataUrl: e.target.result,
            description: ''
        };
        try {
            await addPhotoToDB(newPhoto);
            photos = await getPhotosFromDB(); // Recargar fotos después de añadir
            renderPhotos();
            updatePhotoLimitAlert();
            showStatus(`Foto "${file.name || 'capturada'}" añadida.`, 2000);
        } catch (error) {
            console.error("Error al añadir foto:", error);
            showError("Error al añadir la foto.");
        }
    };
    reader.onerror = (e) => {
        console.error("Error leyendo archivo:", e);
        showError("Error al leer la imagen.");
    }
    reader.readAsDataURL(file);
}

// Eliminar foto
async function deletePhoto(id) {
    try {
        await deletePhotoFromDB(id);
        photos = await getPhotosFromDB(); // Recargar fotos después de eliminar
        renderPhotos();
        updatePhotoLimitAlert();
        showStatus("Foto eliminada.", 2000);
    } catch (error) {
        console.error("Error al eliminar foto:", error);
        showError("Error al eliminar la foto.");
    }
}

// Actualizar descripción de una foto
async function updateDescription(id, description) {
    try {
        await updatePhotoDescriptionInDB(id, description);
        // No need to re-render photos here, as only description changes
        // and the renderPhotos function already reads from the `photos` array
        // which is updated on load/add/delete.
        // If the description is updated directly in the DOM, no re-render is needed.
    } catch (error) {
        console.error("Error al actualizar descripción:", error);
        showError("Error al actualizar la descripción de la foto.");
    }
}

// Renderizar la tabla de solicitudes
function renderRequests() {
    const requestsContainer = requestsTable.querySelector('div:nth-child(2)'); // Get the div where rows are added
    requestsContainer.innerHTML = ''; // Clear existing rows

    requests.forEach((req, index) => {
        const row = document.createElement('div');
        row.classList.add('grid', 'grid-cols-3', 'gap-4', 'mb-2'); // Changed to 3 columns for delete button

        const objectInput = document.createElement('input');
        objectInput.type = 'text';
        objectInput.classList.add('border', 'border-gray-300', 'rounded', 'p-1');
        objectInput.placeholder = 'Objeto';
        objectInput.value = req.object; // Explicitly set value
        objectInput.dataset.index = index;
        objectInput.dataset.field = 'object';

        const quantityInput = document.createElement('input');
        quantityInput.type = 'number';
        quantityInput.classList.add('border', 'border-gray-300', 'rounded', 'p-1');
        quantityInput.placeholder = 'Cantidad';
        quantityInput.min = '0';
        quantityInput.value = req.quantity; // Explicitly set value
        quantityInput.dataset.index = index;
        quantityInput.dataset.field = 'quantity';

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = 'Eliminar';
        deleteButton.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white', 'font-bold', 'py-1', 'px-2', 'rounded', 'text-sm', 'delete-request-row');
        deleteButton.dataset.index = index;

        row.appendChild(objectInput);
        row.appendChild(quantityInput);
        row.appendChild(deleteButton);
        requestsContainer.appendChild(row);
    });

    // Add event listeners to newly created inputs
    requestsContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateRequestItem);
    });

    // Add event listeners to delete buttons
    requestsContainer.querySelectorAll('.delete-request-row').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteRequestRow(index);
        });
    });
}

// Eliminar una fila de solicitud
function deleteRequestRow(index) {
    requests.splice(index, 1); // Remove item from array
    if (requests.length === 0) { // If all requests are deleted, add an empty one
        requests.push({ object: '', quantity: 0 });
    }
    saveData();
    renderRequests();
}

// Actualizar un ítem de solicitud
function updateRequestItem(event) {
    const index = parseInt(event.target.dataset.index);
    const field = event.target.dataset.field;
    let value = event.target.value;

    if (field === 'quantity') {
        value = parseInt(value) || 0;
    }

    requests[index][field] = value;
    saveData();
    console.log(`Solicitud actualizada: index=${index}, field=${field}, value=${value}, requests:`, requests);
}

// Añadir una nueva fila de solicitud
function addRequestRow() {
    requests.push({ object: '', quantity: 0 });
    saveData();
    renderRequests();
}

// Load preview PDF


// --- Funciones PDF y Acciones ---

// Generar el objeto PDF (puede ser pesado)
async function generatePdfObject(forPreview = false) {
    showStatus("Generando PDF...", 0); // Mensaje persistente mientras genera
    clearError();

    return new Promise(async (resolve) => {
        await new Promise(res => setTimeout(res, 50)); // Pausa breve para UI

        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            const pageHeight = pdf.internal.pageSize.getHeight();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - 2 * margin;
            const contentHeight = pageHeight - 2 * margin;

            let currentY = margin; // Track current Y position for content
            let pageNumber = 0; // Start page number at 0 for cover page logic

            // Function to add a new page and reset Y, and add page number
            const addNewPage = () => {
                pdf.addPage();
                currentY = margin;
                pageNumber++;
                addPageNumber(pageNumber);
            };

            // Function to add page number
            const addPageNumber = (pNum) => {
                pdf.setFontSize(8);
                pdf.setTextColor(150);
                pdf.text(`Página ${pNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
                pdf.text("Created by R. Yañez", margin, pageHeight - 5, { align: 'left' }); // Watermark
                pdf.setTextColor(0);
            };

            

            // --- Encabezado y Datos Generales de la Entrega de Turno ---
            pageNumber = 1; // Start actual page numbering from 1 for content pages
            addPageNumber(pageNumber); // Add page number to the first content page
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            pdf.text("ENTREGA DE TURNO", pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 15;

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            const generalDataX = margin; // X position for general data table
            const generalDataLineHeight = 7; // Height for each row in general data

            const generalDataFields = [
                { label: "FECHA INGRESO", value: generalData.fechaIngreso },
                { label: "FECHA SALIDA", value: generalData.fechaSalida },
                { label: "NOMBRE", value: generalData.nombre },
                { label: "ÁREA", value: generalData.area },
                { label: "CENTRO", value: generalData.centro }
            ];

            generalDataFields.forEach((field, index) => {
                pdf.setFont("helvetica", "bold");
                pdf.text(`${field.label}:`, generalDataX, currentY + (index * generalDataLineHeight));
                pdf.setFont("helvetica", "normal");
                pdf.text(field.value, generalDataX + 35, currentY + (index * generalDataLineHeight)); // Adjust 35 for value alignment
            });
            currentY += (generalDataFields.length * generalDataLineHeight) + 10; // Space after general data

            // --- Inventario de Equipos, Herramientas e Insumos ---
            if ((inventory.rovs.detail?.trim() !== '' || inventory.rovs.quantity > 0) ||
                (inventory.consoles.detail?.trim() !== '' || inventory.consoles.quantity > 0) ||
                (inventory.memories.detail?.trim() !== '' || inventory.memories.quantity > 0) ||
                (inventory.others.detail?.trim() !== '' || inventory.others.quantity > 0) ||
                (inventory.notebook.detail?.trim() !== '' || inventory.notebook.quantity > 0) ||
                (inventory.gps.detail?.trim() !== '' || inventory.gps.quantity > 0) ||
                (inventory.cablesRov.detail?.trim() !== '' || inventory.cablesRov.quantity > 0) ||
                (inventory.eee.detail?.trim() !== '' || inventory.eee.quantity > 0) ||
                (inventory.hidrolavadoras.detail?.trim() !== '' || inventory.hidrolavadoras.quantity > 0) ||
                (inventory.generador.detail?.trim() !== '' || inventory.generador.quantity > 0) ||
                (inventory.dvr.detail?.trim() !== '' || inventory.dvr.quantity > 0) ||
                (inventory.extensionElectrica.detail?.trim() !== '' || inventory.extensionElectrica.quantity > 0) ||
                (inventory.cajaHerramientas.detail?.trim() !== '' || inventory.cajaHerramientas.quantity > 0) ||
                (inventory.bidonesBencina.detail?.trim() !== '' || inventory.bidonesBencina.quantity > 0) ||
                (inventory.difusor.detail?.trim() !== '' || inventory.difusor.quantity > 0) ||
                (inventory.mangueraHidrolavadora.detail?.trim() !== '' || inventory.mangueraHidrolavadora.quantity > 0) ||
                (inventory.trineo.detail?.trim() !== '' || inventory.trineo.quantity > 0) ||
                (inventory.estanque.detail?.trim() !== '' || inventory.estanque.quantity > 0) ||
                (inventory.mangueraCorrugada.detail?.trim() !== '' || inventory.mangueraCorrugada.quantity > 0)) {
                if (currentY + 20 > pageHeight - margin) { // 20 is approx height for title + some text
                    addNewPage();
                }
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("EQUIPOS, HERRAMIENTAS INSUMOS", margin, currentY);
                currentY += 10;

                const inventoryTableHeaders = [["TIPO", "CANTIDAD", "DETALLE"]];
                const inventoryTableData = [];

                // Helper function to add inventory item to table data
                const addInventoryItem = (type, item) => {
                    const detail = item?.detail?.trim() || ''; // Safely access detail and trim, fallback to empty string
                    const quantity = item?.quantity || 0; // Safely access quantity, fallback to 0
                    if (detail !== '' || quantity > 0) {
                        inventoryTableData.push([type, quantity, detail]);
                    }
                };

                addInventoryItem("ROVs", inventory.rovs);
                addInventoryItem("Consolas", inventory.consoles);
                addInventoryItem("Memorias", inventory.memories);
                addInventoryItem("Otros", inventory.others);
                addInventoryItem("NOTEBOOK", inventory.notebook);
                addInventoryItem("GPS", inventory.gps);
                addInventoryItem("CABLES ROV", inventory.cablesRov);
                addInventoryItem("EEE", inventory.eee);
                addInventoryItem("HIDROLAVADORAS", inventory.hidrolavadoras);
                addInventoryItem("GENERADOR", inventory.generador);
                addInventoryItem("DVR", inventory.dvr);
                addInventoryItem("EXTENSIÓN ELÉCTRICA", inventory.extensionElectrica);
                addInventoryItem("CAJA DE HERRAMIENTAS", inventory.cajaHerramientas);
                addInventoryItem("BIDONES DE BENCINA", inventory.bidonesBencina);
                addInventoryItem("DIFUSOR", inventory.difusor);
                addInventoryItem("MANGUERA HIDROLAVADORA", inventory.mangueraHidrolavadora);
                addInventoryItem("TRINEO", inventory.trineo);
                addInventoryItem("ESTANQUE", inventory.estanque);
                addInventoryItem("MANGUERA CORRUGADA", inventory.mangueraCorrugada);

                if (inventoryTableData.length > 0) {
                    pdf.autoTable({
                        startY: currentY,
                        head: inventoryTableHeaders,
                        body: inventoryTableData,
                        theme: 'grid',
                        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
                        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
                        columnStyles: { 0: { cellWidth: contentWidth * 0.2 }, 1: { cellWidth: contentWidth * 0.15, halign: 'center' }, 2: { cellWidth: contentWidth * 0.65 } },
                        margin: { left: margin, right: margin },
                        didDrawPage: function (data) {
                            currentY = data.cursor.y + 5; // Update currentY after table
                        }
                    });
                }
                currentY += 5; // Space after inventory
            }

            // --- Observaciones ---
            if (observationsText.trim() !== '') {
                if (currentY + 20 > pageHeight - margin) { // 20 is approx height for title + some text
                    addNewPage();
                }
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("OBSERVACIONES.", margin, currentY);
                currentY += 10;
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                const lines = pdf.splitTextToSize(observationsText, contentWidth);
                pdf.text(lines, margin, currentY);
                currentY += (lines.length * 4) + 5;
            }

            // --- Solicitudes al Taller ---
            if (requests.length > 0 || requestsNote.trim() !== '') {
                if (currentY + 20 > pageHeight - margin) {
                    addNewPage();
                }
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("SOLICITUDES AL TALLER:", margin, currentY);
                currentY += 10;

                // Requests Table
                const tableHeaders = [["OBJETO", "CANTIDAD"]];
                const tableData = requests.map(req => [req.object, req.quantity.toString()]);

                pdf.autoTable({
                    startY: currentY,
                    head: tableHeaders,
                    body: tableData,
                    startY: currentY,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
                    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: contentWidth * 0.7 }, 1: { cellWidth: contentWidth * 0.3, halign: 'center' } },
                    margin: { left: margin, right: margin },
                    didDrawPage: function (data) {
                        currentY = data.cursor.y + 5; // Update currentY after table
                    }
                });

                // Requests Note
                if (requestsNote.trim() !== '') {
                    currentY += 5; // Space after table
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "normal");
                    pdf.text("Nota:", margin, currentY);
                    const lines = pdf.splitTextToSize(requestsNote, contentWidth - 10); // Indent note slightly
                    pdf.text(lines, margin + 10, currentY);
                    currentY += (lines.length * 4) + 5;
                }
            }

            // --- Estado de Faena en Centro NINUHALAC 2 ---
            if (faenaStatus.text.trim() !== '' || faenaStatus.image1 || faenaStatus.image2) {
                if (currentY + 20 > pageHeight - margin) {
                    addNewPage();
                }
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("ESTADO DE FAENA EN CENTRO NINUHALAC 2", margin, currentY);
                currentY += 10;
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                const lines = pdf.splitTextToSize(faenaStatus.text, contentWidth);
                pdf.text(lines, margin, currentY);
                currentY += (lines.length * 4) + 5;

                if (faenaStatus.imageDescription.trim() !== '') {
                    pdf.setFontSize(10);
                    pdf.setFont("helvetica", "normal");
                    pdf.text("Descripción de la Imagen de Referencia:", margin, currentY);
                    const descLines = pdf.splitTextToSize(faenaStatus.imageDescription, contentWidth);
                    pdf.text(descLines, margin, currentY + 5);
                    currentY += (descLines.length * 4) + 5;
                }

                // Faena Images
                const faenaImages = [];
                if (faenaStatus.image1) faenaImages.push(faenaStatus.image1);
                if (faenaStatus.image2) faenaImages.push(faenaStatus.image2);

                const faenaImgWidth = contentWidth / 2 - 5; // Two images side by side
                const faenaImgMaxHeight = 70; // Max height for faena images

                for (let i = 0; i < faenaImages.length; i++) {
                    const imgData = faenaImages[i];
                    const img = new Image();
                    img.src = imgData;

                    await new Promise(resolveImg => {
                        img.onload = () => {
                            const originalWidth = img.width;
                            const originalHeight = img.height;
                            const aspectRatio = originalWidth / originalHeight;

                            let finalImgWidth = faenaImgWidth;
                            let finalImgHeight = finalImgWidth / aspectRatio;

                            if (finalImgHeight > faenaImgMaxHeight) {
                                finalImgHeight = faenaImgMaxHeight;
                                finalImgWidth = finalImgHeight * aspectRatio;
                            }

                            const imgX = margin + (i % 2) * (faenaImgWidth + 10); // 10mm spacing
                            const imgY = currentY + Math.floor(i / 2) * (faenaImgMaxHeight + 10); // 10mm spacing

                            try {
                                const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                                pdf.addImage(imgData, format, imgX + (faenaImgWidth - finalImgWidth) / 2, imgY, finalImgWidth, finalImgHeight);
                            } catch (imgError) {
                                console.error("Error al añadir imagen de faena al PDF:", imgError);
                                pdf.setFillColor(230, 230, 230);
                                pdf.rect(imgX, imgY, faenaImgWidth, faenaImgMaxHeight, 'F');
                                pdf.setTextColor(150, 0, 0);
                                pdf.setFontSize(8);
                                pdf.text("Error imagen", imgX + 5, imgY + faenaImgMaxHeight / 2);
                                pdf.setTextColor(0);
                            }
                            resolveImg();
                        };
                        img.onerror = () => {
                            console.error("Error cargando imagen de faena para PDF:", imgData);
                            pdf.setFillColor(230, 230, 230);
                            pdf.rect(margin + (i % 2) * (faenaImgWidth + 10), currentY + Math.floor(i / 2) * (faenaImgMaxHeight + 10), faenaImgWidth, faenaImgMaxHeight, 'F');
                            pdf.setTextColor(150, 0, 0);
                            pdf.setFontSize(8);
                            pdf.text("Error imagen", margin + (i % 2) * (faenaImgWidth + 10) + 5, currentY + Math.floor(i / 2) * (faenaImgMaxHeight + 10) + faenaImgMaxHeight / 2);
                            pdf.setTextColor(0);
                            resolveImg();
                        };
                    });
                }
                currentY += (Math.ceil(faenaImages.length / 2) * (faenaImgMaxHeight + 10)) + 5; // Adjust Y after faena images
            }

            // --- Registro Fotográfico (Fotos de la cuadrícula) ---
            if (photos.length > 0) {
                addNewPage();
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("Registro Fotográfico", margin, currentY);
                currentY += 10;

                const imagesPerRow = 2;
                const rowsPerPage = 3;
                const imagesPerPage = imagesPerRow * rowsPerPage; // 6 images per page

                const paddingX = 10; // Horizontal padding between images
                const paddingY = 10; // Vertical padding between image+desc blocks
                const descriptionLineHeight = 4; // Approx height of one line of description
                const maxDescriptionLines = 3; // Max lines for description
                const descriptionAreaHeight = descriptionLineHeight * maxDescriptionLines;

                const availableContentWidth = pageWidth - 2 * margin;
                const availableContentHeight = pageHeight - 2 * margin;

                const colWidth = (availableContentWidth - (imagesPerRow - 1) * paddingX) / imagesPerRow;
                const rowBlockHeight = (availableContentHeight - (rowsPerPage * paddingY) - (rowsPerPage * descriptionAreaHeight)) / rowsPerPage; // Adjusted to account for description area
                const maxImageHeight = rowBlockHeight; // Max height for image itself

                let imageCountOnPage = 0;

                for (let i = 0; i < photos.length; i++) {
                    const photo = photos[i];

                    if (imageCountOnPage >= imagesPerPage) {
                        addNewPage();
                        pdf.setFontSize(14);
                        pdf.setFont("helvetica", "bold");
                        pdf.text("Registro Fotográfico (continuación)", margin, currentY);
                        currentY += 10;
                        imageCountOnPage = 0;
                    }

                    const col = imageCountOnPage % imagesPerRow;
                    const row = Math.floor(imageCountOnPage / imagesPerRow);

                    const imgX = margin + col * (colWidth + paddingX);
                    const blockY = currentY + row * (maxImageHeight + descriptionAreaHeight + paddingY); // Y for the top of the current block

                    const img = new Image();
                    img.src = photo.dataUrl;

                    await new Promise(resolveImg => {
                        img.onload = () => {
                            const originalWidth = img.width;
                            const originalHeight = img.height;
                            const aspectRatio = originalWidth / originalHeight;

                            let finalImgWidth = colWidth;
                            let finalImgHeight = finalImgWidth / aspectRatio;

                            if (finalImgHeight > maxImageHeight) {
                                finalImgHeight = maxImageHeight;
                                finalImgWidth = finalImgHeight * aspectRatio;
                            }

                            const centeredImgX = imgX + (colWidth - finalImgWidth) / 2;
                            const centeredImgY = blockY + (maxImageHeight - finalImgHeight) / 2;

                            try {
                                const format = photo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                                pdf.addImage(photo.dataUrl, format, centeredImgX, centeredImgY, finalImgWidth, finalImgHeight);
                            } catch (imgError) {
                                console.error("Error al añadir imagen al PDF:", imgError);
                                pdf.setFillColor(230, 230, 230);
                                pdf.rect(centeredImgX, centeredImgY, finalImgWidth, finalImgHeight, 'F');
                                pdf.setTextColor(150, 0, 0);
                                pdf.setFontSize(8);
                                pdf.text("Error imagen", centeredImgX + 5, centeredImgY + finalImgHeight / 2);
                                pdf.setTextColor(0);
                            }

                            pdf.setFontSize(9);
                            pdf.setFont("helvetica", "normal");
                            const description = photo.description || '(Sin descripción)';
                            const descLines = pdf.splitTextToSize(description, colWidth);
                            pdf.text(descLines, imgX, blockY + maxImageHeight + 3);

                            resolveImg();
                        };
                        img.onerror = () => {
                            console.error("Error cargando imagen para PDF:", photo.dataUrl);
                            pdf.setFillColor(230, 230, 230);
                            pdf.rect(imgX, blockY, colWidth, maxImageHeight, 'F');
                            pdf.setTextColor(150, 0, 0);
                            pdf.setFontSize(8);
                            pdf.text("Error imagen", imgX + 5, blockY + maxImageHeight / 2);
                            pdf.setTextColor(0);

                            pdf.setFontSize(9);
                            pdf.setFont("helvetica", "normal");
                            const description = photo.description || '(Sin descripción)';
                            const descLines = pdf.splitTextToSize(description, colWidth);
                            pdf.text(descLines, imgX, blockY + maxImageHeight + 3);

                            resolveImg();
                        };
                    });

                    imageCountOnPage++;
                }
            }
            resolve(pdf); // Devolver el objeto PDF generado

        } catch (error) {
            console.error("Error generando PDF:", error);
            showError(`Error al generar PDF: ${error.message}`);
            resolve(null); // Devolver null en caso de error
        } finally {
            clearStatus(); // Limpiar mensaje "Generando..."
        }
    });
}

// Acción: Exportar PDF
async function exportPdf() {
     if (photos.length === 0) {
         
         return;
     }
    
     clearStatus();
     clearError();

    const pdf = await generatePdfObject();

    

    if (pdf) {
        try {
            pdf.save('informe-fotografico.pdf');
            showStatus("PDF exportado correctamente.", 3000);
        } catch (saveError) {
            console.error("Error al guardar PDF:", saveError);
            showError("Error al intentar guardar el PDF.");
        }
    }
}

// Acción: Compartir PDF
async function sharePdf() {
     if (photos.length === 0) {
         showError("Añade al menos una foto para compartir.");
         return;
     }

    if (!navigator.share) {
        showError("La función de compartir no está soportada en este navegador o dispositivo. Por favor, exporta el PDF manualmente.");
        return;
    }

    
     clearStatus();
     clearError();

    const pdf = await generatePdfObject();

    

    if (pdf) {
        try {
            // Generar Blob desde el PDF
            const pdfBlob = pdf.output('blob');
            const pdfFile = new File([pdfBlob], 'informe-fotografico.pdf', { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: 'Informe Fotográfico',
                    text: 'Adjunto un informe fotográfico generado con la app.',
                });
                showStatus('¡Informe compartido!', 3000);
            } else {
                 showError('No se puede compartir este tipo de archivo en este dispositivo.');
            }
        } catch (shareError) {
            // Ignorar error si el usuario cancela la acción de compartir (AbortError)
            if (shareError.name !== 'AbortError') {
                console.error('Error al compartir:', shareError);
                showError(`Error al compartir: ${shareError.message}`);
            } else {
                 console.log("Compartir cancelado por el usuario.");
                 clearStatus(); // Limpiar si había algún mensaje
            }
        }
    }
}

// Mostrar mensaje de estado temporal
let statusTimeout;
function showStatus(message, duration = 3000) {
     clearTimeout(statusTimeout);
     actionStatus.textContent = message;
     actionStatus.classList.remove('hidden');
     actionError.classList.add('hidden'); // Ocultar errores si mostramos estado
     if (duration > 0) {
         statusTimeout = setTimeout(() => {
            actionStatus.classList.add('hidden');
             actionStatus.textContent = '';
         }, duration);
     }
}
// Limpiar mensaje de estado
function clearStatus() {
     clearTimeout(statusTimeout);
     actionStatus.classList.add('hidden');
     actionStatus.textContent = '';
}


// Mostrar mensaje de error temporal
let errorTimeout;
function showError(message, duration = 5000) {
     clearTimeout(errorTimeout);
     actionError.textContent = message;
     actionError.classList.remove('hidden');
     actionStatus.classList.add('hidden'); // Ocultar estado si mostramos error
     if (duration > 0) {
         errorTimeout = setTimeout(() => {
             actionError.classList.add('hidden');
             actionError.textContent = '';
         }, duration);
     }
}
// Limpiar mensaje de error
function clearError() {
     clearTimeout(errorTimeout);
     actionError.classList.add('hidden');
     actionError.textContent = '';
}

// --- Inicialización y Event Listeners ---

// Registrar Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Importante: Service Workers solo funcionan en HTTPS o localhost.
        // Si estás ejecutando la aplicación directamente desde un archivo (file://), no funcionará.
        // Debes usar un servidor web local (ej. `npx http-server` o la extensión Live Server de VS Code).
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.log('Fallo en el registro de ServiceWorker (esto es normal si se ejecuta desde file://):', error);
                showError("Service Worker no registrado. Ejecuta la app desde un servidor web (ej. localhost) para PWA.");
            });
    });
}

// Event listeners para pestañas
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.id.replace('tab-', '') + '-section';
        showSection(sectionId);
    });
});

// Event listeners para Datos Generales
fechaIngresoInput.addEventListener('input', (e) => { generalData.fechaIngreso = e.target.value; saveData(); });
fechaSalidaInput.addEventListener('input', (e) => { generalData.fechaSalida = e.target.value; saveData(); });
nombreInput.addEventListener('input', (e) => { generalData.nombre = e.target.value; saveData(); });
areaInput.addEventListener('input', (e) => { generalData.area = e.target.value; saveData(); });
centroInput.addEventListener('input', (e) => { generalData.centro = e.target.value; saveData(); });

// Event listeners para Inventario
inventoryItemsConfig.forEach(item => {
    if (item.detailElement) {
        item.detailElement.addEventListener('input', (e) => {
            inventory[item.id.replace(/-/g, '')].detail = e.target.value;
            saveData();
        });
    }
    if (item.quantityElement) {
        item.quantityElement.addEventListener('input', (e) => {
            inventory[item.id.replace(/-/g, '')].quantity = parseInt(e.target.value) || 0;
            saveData();
        });
    }
});

// Event listener para Observaciones
observationsTextArea.addEventListener('input', (e) => { observationsText = e.target.value; saveData(); });

// Event listeners para Solicitudes al Taller
addRequestRowButton.addEventListener('click', addRequestRow);
requestsNoteTextArea.addEventListener('input', (e) => { requestsNote = e.target.value; saveData(); });

// Event listeners para Estado de Faena
faenaStatusTextArea.addEventListener('input', (e) => { faenaStatus.text = e.target.value; saveData(); });
faenaImageDescriptionTextArea.addEventListener('input', (e) => { faenaStatus.imageDescription = e.target.value; saveData(); });

faenaImage1Input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            faenaStatus.image1 = e.target.result;
            faenaImage1Preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded">`;
            saveData();
        };
        reader.readAsDataURL(file);
    }
});

faenaImage2Input.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            faenaStatus.image2 = e.target.result;
            faenaImage2Preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded">`;
            saveData();
        };
        reader.readAsDataURL(file);
    }
});

// Event listener para selección de archivos (Registro Fotográfico)
fileInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                addPhoto(file);
            } else {
                 showError(`"${file.name}" no es una imagen válida.`);
            }
        });
        // Limpiar el input para permitir seleccionar el mismo archivo otra vez
        event.target.value = null;
    }
});

// Event listener para captura de fotos (simulado/real)
captureButton.addEventListener('click', () => {
     // Comprobar si está deshabilitado por límite
     if (photos.length >= MAX_PHOTOS) {
          showError(`No se pueden añadir más fotos (límite: ${MAX_PHOTOS}).`);
         return;
     }
    // Intenta usar el input de captura real. Si no, podría simularse.
    captureInput.click();
});
captureInput.addEventListener('change', (event) => {
     const file = event.target.files[0];
     if (file && file.type.startsWith('image/')) {
         addPhoto(file);
     }
     // Limpiar input
     event.target.value = null;
 });



// Event listeners para botones de acción del footer



// Función para alternar el modo oscuro
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode); // Guardar preferencia
    // Actualizar texto del botón
    darkModeButton.innerHTML = `<i class="fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} mr-2"></i> Modo ${isDarkMode ? 'Claro' : 'Oscuro'}`;
}

// Carga inicial
document.addEventListener('DOMContentLoaded', async () => {
    await openDatabase(); // Abrir la base de datos IndexedDB
    loadData();
    showSection('general-data-section'); // Mostrar sección de datos generales por defecto

    // Cargar preferencia de modo oscuro
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        darkModeButton.innerHTML = '<i class="fas fa-sun mr-2"></i> Modo Claro';
    } else {
        darkModeButton.innerHTML = '<i class="fas fa-moon mr-2"></i> Modo Oscuro';
    }

    // PWA Install Logic
    const installAppButton = document.getElementById('menu-install-app'); // Get reference inside DOMContentLoaded

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installAppButton) { // Check if button exists
            installAppButton.classList.remove('hidden');
        }
        console.log('beforeinstallprompt event fired.');
    });

    if (installAppButton) { // Check if button exists before adding listener
        installAppButton.addEventListener('click', async () => {
            if (installAppButton) { // Check again before hiding
                installAppButton.classList.add('hidden');
            }
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response to the install prompt: ${outcome}`);
                deferredPrompt = null;
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installAppButton) { // Check if button exists
            installAppButton.classList.add('hidden');
        }
        console.log('PWA was installed');
        showStatus('¡Aplicación instalada con éxito!', 3000);
    });

    // Comprobar si la app ya está instalada al cargar
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
        if (installAppButton) { // Check if button exists
            installAppButton.classList.add('hidden');
        }
    }
});

// Event listener para el botón de hamburguesa
hamburgerButton.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
});

// Event listener para el botón de modo oscuro
darkModeButton.addEventListener('click', toggleDarkMode);

// Cerrar el menú desplegable si se hace clic fuera
document.addEventListener('click', (event) => {
    if (!dropdownMenu.contains(event.target) && !hamburgerButton.contains(event.target)) {
        dropdownMenu.classList.add('hidden');
    }
});



// Función para alternar el modo oscuro
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode); // Guardar preferencia
    // Actualizar texto del botón
    darkModeButton.innerHTML = `<i class="fas ${isDarkMode ? 'fa-sun' : 'fa-moon'} mr-2"></i> Modo ${isDarkMode ? 'Claro' : 'Oscuro'}`;
}

// Carga inicial
document.addEventListener('DOMContentLoaded', async () => {
    await openDatabase(); // Abrir la base de datos IndexedDB
    loadData();
    showSection('general-data-section'); // Mostrar sección de datos generales por defecto

    // Cargar preferencia de modo oscuro
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        darkModeButton.innerHTML = '<i class="fas fa-sun mr-2"></i> Modo Claro';
    } else {
        darkModeButton.innerHTML = '<i class="fas fa-moon mr-2"></i> Modo Oscuro';
    }
});

// Event listener para el botón de hamburguesa
hamburgerButton.addEventListener('click', () => {
    dropdownMenu.classList.toggle('hidden');
});

// Event listener para el botón de modo oscuro
darkModeButton.addEventListener('click', toggleDarkMode);

// Cerrar el menú desplegable si se hace clic fuera
document.addEventListener('click', (event) => {
    if (!dropdownMenu.contains(event.target) && !hamburgerButton.contains(event.target)) {
        dropdownMenu.classList.add('hidden');
    }
});