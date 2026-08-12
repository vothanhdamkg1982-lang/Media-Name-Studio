/**
 * MEDIA NAME STUDIO - Core Application Script
 * Architecture: ES6 Modules Pattern (Single File implementation)
 */

// ==========================================
// 1. UTILITIES
// ==========================================
const Utils = {
    removeVietnameseTones(str) {
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
        str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
        str = str.replace(/đ/g,"d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
        str = str.replace(/\u02C6|\u0306|\u031B/g, "");
        return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    },
    formatDateForFile(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}-${String(d.getSeconds()).padStart(2,'0')}`;
    },
    formatDateDisplay(date) {
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    },
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), duration);
    }
};

// ==========================================
// 2. DATABASE (IndexedDB)
// ==========================================
class AppDB {
    constructor() {
        this.dbName = 'MediaNameStudioDB';
        this.version = 2;
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('students')) {
                    db.createObjectStore('students', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('media')) {
                    db.createObjectStore('media', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e);
        });
    }

    async setSetting(key, value) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key, value });
            tx.oncomplete = () => resolve();
        });
    }

    async getSetting(key, defaultValue) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        });
    }

    async saveStudents(studentsArray) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            studentsArray.forEach(s => store.put(s));
            tx.oncomplete = () => resolve();
        });
    }

    async getStudents() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('students', 'readonly');
            const req = tx.objectStore('students').getAll();
            req.onsuccess = () => resolve(req.result);
        });
    }

    async clearStudents() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('students', 'readwrite');
            tx.objectStore('students').clear();
            tx.oncomplete = () => resolve();
        });
    }

    async saveMedia(mediaObj) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('media', 'readwrite');
            tx.objectStore('media').put(mediaObj);
            tx.oncomplete = () => resolve();
        });
    }

    async getAllMedia() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('media', 'readonly');
            const req = tx.objectStore('media').getAll();
            req.onsuccess = () => resolve(req.result.sort((a,b) => b.timestamp - a.timestamp));
        });
    }
    
    async deleteMedia(ids) {
        return new Promise((resolve) => {
            const tx = this.db.transaction('media', 'readwrite');
            const store = tx.objectStore('media');
            ids.forEach(id => store.delete(id));
            tx.oncomplete = () => resolve();
        });
    }
}
const db = new AppDB();

// ==========================================
// 3. APPLICATION STATE & CONTROLLER
// ==========================================
const App = {
    settings: {
        unitName: 'TRƯỜNG TIỂU HỌC TRẦN QUỐC TOẢN', // Default customized as requested
        showUnit: true,
        showDate: true,
        position: 'bottom',
        align: 'center',
        fontSize: 40,
        color: '#ffffff',
        bgColor: 'rgba(0,0,0,0.5)'
    },
    currentStudent: null,
    cameraFacingMode: 'environment', // Mặc định camera sau
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    recordStartTime: 0,
    recordTimer: null,
    rawStream: null,
    animationFrameId: null,

    async init() {
        try {
            await db.init();
            await this.loadSettings();
            this.bindEvents();
            this.initSettingsUI();
            await this.loadStudentList();
            await this.loadGallery();
            this.startCamera();
        } catch (error) {
            Utils.showToast("Lỗi khởi tạo hệ thống!");
            console.error(error);
        }
    },

    async loadSettings() {
        const stored = await db.getSetting('appSettings', null);
        if (stored) Object.assign(this.settings, stored);
    },

    async saveSettings() {
        this.settings.unitName = document.getElementById('setUnitName').value;
        this.settings.showUnit = document.getElementById('setShowUnit').checked;
        this.settings.showDate = document.getElementById('setShowDate').checked;
        this.settings.position = document.getElementById('setPosition').value;
        this.settings.align = document.getElementById('setAlign').value;
        this.settings.fontSize = parseInt(document.getElementById('setFontSize').value);
        this.settings.color = document.getElementById('setColor').value;
        this.settings.bgColor = document.getElementById('setBgColor').value;
        
        await db.setSetting('appSettings', this.settings);
        Utils.showToast('Đã lưu cấu hình!');
    },

    initSettingsUI() {
        document.getElementById('setUnitName').value = this.settings.unitName;
        document.getElementById('setShowUnit').checked = this.settings.showUnit;
        document.getElementById('setShowDate').checked = this.settings.showDate;
        document.getElementById('setPosition').value = this.settings.position;
        document.getElementById('setAlign').value = this.settings.align;
        document.getElementById('setFontSize').value = this.settings.fontSize;
        document.getElementById('setColor').value = this.settings.color;
        document.getElementById('setBgColor').value = this.settings.bgColor;
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                
                const target = e.currentTarget.dataset.target;
                e.currentTarget.classList.add('active');
                document.getElementById(target).classList.add('active');
                
                // Quản lý tài nguyên camera khi chuyển tab
                if(target === 'tab-camera') this.startCamera();
                else this.stopCamera();

                if(target === 'tab-gallery') this.loadGallery();
            });
        });

        // Settings
        document.getElementById('btnSaveSettings').addEventListener('click', () => this.saveSettings());

        // Students List
        document.getElementById('excelUpload').addEventListener('change', (e) => this.handleExcelImport(e));
        document.getElementById('btnClearList').addEventListener('click', () => this.clearStudents());
        document.getElementById('btnAddManual').addEventListener('click', () => this.addManualStudent());
        document.getElementById('searchStudent').addEventListener('input', (e) => this.filterStudents(e.target.value));
        // Thêm nút tải file mẫu
        document.getElementById('btnDownloadSample').addEventListener('click', () => this.downloadSampleExcel());
        
        // Hỗ trợ nhấn Enter để thêm tên thủ công nhanh hơn
        document.getElementById('manualName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManualStudent();
        });

        // Camera Controls
        document.getElementById('btnSwitchCamera').addEventListener('click', () => this.switchCamera());
        document.getElementById('btnCapturePhoto').addEventListener('click', () => this.takePhoto());
        document.getElementById('btnRecordVideo').addEventListener('click', () => this.toggleRecordVideo());

        // Gallery
        document.getElementById('btnExportSelected').addEventListener('click', () => this.exportSelectedMedia());
        document.getElementById('btnDeleteSelected').addEventListener('click', () => this.deleteSelectedMedia());
        document.getElementById('filterType').addEventListener('change', () => this.loadGallery());
    },

    // ==========================================
    // MODULE: CAMERA & CANVAS PROCESSING
    // ==========================================
    async startCamera() {
        if(this.rawStream) return; // Đang chạy rồi
        const video = document.getElementById('rawVideo');
        
        try {
            const constraints = {
                video: { facingMode: this.cameraFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: true 
            };
            this.rawStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.rawStream;
            video.onloadedmetadata = () => {
                video.play();
                this.startCanvasLoop();
            };
        } catch (err) {
            Utils.showToast('Không thể mở Camera/Mic. Vui lòng cấp quyền!');
            console.error(err);
        }
    },

    stopCamera() {
        if(this.isRecording) this.toggleRecordVideo(); // Stop recording if switching tab
        if(this.rawStream) {
            this.rawStream.getTracks().forEach(track => track.stop());
            this.rawStream = null;
        }
        if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    },

    switchCamera() {
        this.stopCamera();
        this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
        this.startCamera();
    },

    startCanvasLoop() {
        const video = document.getElementById('rawVideo');
        const canvas = document.getElementById('outputCanvas');
        const ctx = canvas.getContext('2d');

        const draw = () => {
            if(video.readyState === video.HAVE_ENOUGH_DATA) {
                // 1. Cập nhật kích thước canvas khớp với video
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                
                // 2. CHỈ vẽ video thuần túy lên canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // 3. ĐÃ XÓA/TẮT LỆNH VẼ CHỮ (renderTextOverlay)
                // // this.renderTextOverlay(ctx, canvas); 
            }
            this.animationFrameId = requestAnimationFrame(draw);
        };
        draw();
    },

    renderTextOverlay(ctx, canvas) {
        if (!this.currentStudent) return;
        
        // 1. Lấy kích thước thực từ canvas
        const w = canvas.width;
        const h = canvas.height;
        
        const text = this.currentStudent.name.toUpperCase();
        
        // 2. Tính toán font size tỉ lệ theo chiều cao video (để chữ luôn sắc nét)
        const fontSize = Math.floor(h * 0.04); 
        ctx.font = `bold ${fontSize}px Arial`;
        
        // 3. Tính toán kích thước hộp chứa
        const padding = 20;
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + (padding * 2);
        const boxHeight = fontSize + (padding * 2);
        
        // 4. Ép vị trí cố định: Góc dưới bên phải (cách mép 40px)
        const boxX = w - boxWidth - 40;
        const boxY = h - boxHeight - 40;

        // 5. Vẽ nền đen mờ
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // 6. Vẽ chữ trắng
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(text, boxX + padding, boxY + padding);
    },

    // ==========================================
    // MODULE: MEDIA CAPTURE
    // ==========================================
    async takePhoto() {
        if(!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            document.querySelector('[data-target="tab-list"]').click(); // Chuyển sang tab chọn
            return;
        }

        const canvas = document.getElementById('outputCanvas');
        canvas.toBlob(async (blob) => {
            const timestamp = Date.now();
            const cleanName = Utils.removeVietnameseTones(this.currentStudent.name);
            const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.jpg`;

            const mediaData = {
                id: timestamp.toString(),
                type: 'photo',
                blob: blob,
                studentName: this.currentStudent.name,
                fileName: fileName,
                timestamp: timestamp
            };

            await db.saveMedia(mediaData);
            Utils.showToast(`Đã lưu ảnh: ${this.currentStudent.name}`);
            
            // Hiệu ứng nháy flash
            canvas.style.opacity = '0';
            setTimeout(() => canvas.style.opacity = '1', 100);
        }, 'image/jpeg', 0.9);
    },

    toggleRecordVideo() {
        if(!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi quay!");
            return;
        }

        const btn = document.getElementById('btnRecordVideo');
        if(!this.isRecording) {
            this.startRecording();
            btn.innerHTML = '<i class="fa-solid fa-stop"></i> DỪNG';
            btn.classList.replace('btn-danger', 'btn-secondary');
        } else {
            this.stopRecording();
            btn.innerHTML = '<i class="fa-solid fa-video"></i> QUAY';
            btn.classList.replace('btn-secondary', 'btn-danger');
        }
    },

    startRecording() {
        const canvas = document.getElementById('outputCanvas');
        let canvasStream;
        
        try {
            // Lấy stream hình ảnh đã đóng chữ từ canvas (30fps)
            canvasStream = canvas.captureStream(30); 
            
            // Trích xuất audio track từ camera gốc để có tiếng
            const audioTracks = this.rawStream.getAudioTracks();
            const combinedStream = new MediaStream([...canvasStream.getTracks(), ...audioTracks]);

            // Cấu hình MediaRecorder (ưu tiên mp4/webm)
            const options = { mimeType: 'video/webm; codecs=vp8,opus' };
            if(!MediaRecorder.isTypeSupported(options.mimeType)) {
                // Fallback cho Safari
                options.mimeType = 'video/mp4'; 
            }

            this.mediaRecorder = new MediaRecorder(combinedStream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
                const timestamp = Date.now();
                const cleanName = Utils.removeVietnameseTones(this.currentStudent.name);
                const ext = this.mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
                const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.${ext}`;

                const mediaData = {
                    id: timestamp.toString(),
                    type: 'video',
                    blob: blob,
                    studentName: this.currentStudent.name,
                    fileName: fileName,
                    timestamp: timestamp
                };

                await db.saveMedia(mediaData);
                Utils.showToast(`Đã lưu video: ${this.currentStudent.name}`);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            // UI Update
            this.recordStartTime = Date.now();
            document.getElementById('recordingIndicator').classList.remove('hidden');
            this.recordTimer = setInterval(() => {
                const diff = Math.floor((Date.now() - this.recordStartTime) / 1000);
                const mins = String(Math.floor(diff / 60)).padStart(2,'0');
                const secs = String(diff % 60).padStart(2,'0');
                document.getElementById('recordingTime').textContent = `${mins}:${secs}`;
            }, 1000);

        } catch (err) {
            Utils.showToast("Trình duyệt không hỗ trợ ghi video có chữ trực tiếp!");
            console.error(err);
        }
    },

    stopRecording() {
        if(this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        clearInterval(this.recordTimer);
        document.getElementById('recordingIndicator').classList.add('hidden');
        document.getElementById('recordingTime').textContent = '00:00';
    },

    // ==========================================
    // MODULE: STUDENT LIST (EXCEL)
    // ==========================================
    handleExcelImport(e) {
        const file = e.target.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                // Tìm cột chứa Tên (tự động nhận diện các header phổ biến)
                let nameKey = null;
                if(json.length > 0) {
                    const keys = Object.keys(json[0]);
                    nameKey = keys.find(k => k.toLowerCase().includes('tên') || k.toLowerCase().includes('name')) || keys[1]; // fallback cột 2
                }

                if(!nameKey) {
                    Utils.showToast("Không tìm thấy cột Tên trong Excel!");
                    return;
                }

                const newStudents = json.map(row => ({
                    id: Date.now() + Math.random().toString(16).slice(2),
                    name: row[nameKey],
                    class: row['Lớp'] || row['Class'] || ''
                })).filter(s => s.name);

                await db.saveStudents(newStudents);
                Utils.showToast(`Đã nhập ${newStudents.length} học sinh!`);
                e.target.value = ''; // Reset input
                this.loadStudentList();
            } catch(err) {
                Utils.showToast("File Excel không hợp lệ!");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    async loadStudentList(filterText = '') {
        const list = await db.getStudents();
        const ul = document.getElementById('studentList');
        ul.innerHTML = '';

        const filtered = list.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

        filtered.forEach(student => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${student.name}</strong> ${student.class ? `(${student.class})` : ''}</span>
            `;
            if(this.currentStudent && this.currentStudent.id === student.id) {
                li.classList.add('selected');
            }

            li.addEventListener('click', () => {
                this.currentStudent = student;
                document.getElementById('headerStudentName').textContent = student.name;
                // Chuyển nhanh qua Camera
                document.querySelector('[data-target="tab-camera"]').click();
                this.loadStudentList(filterText); // Re-render to show selection
            });

            ul.appendChild(li);
        });
    },

    filterStudents(text) {
        this.loadStudentList(text);
    },

    // --- 1. Hàm tạo và tải file Excel mẫu ---
    downloadSampleExcel() {
        // Dữ liệu mẫu
        const sampleData = [
            { "STT": 1, "Họ và tên": "Nguyễn Văn An", "Lớp": "5A" },
            { "STT": 2, "Họ và tên": "Trần Văn Bình", "Lớp": "5A" },
            { "STT": 3, "Họ và tên": "Lê Thị Hoa", "Lớp": "5A" },
            { "STT": 4, "Họ và tên": "Phạm Tuấn Kiệt", "Lớp": "5A" }
        ];
        
        // Sử dụng thư viện XLSX đã import để tạo file
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_sach_mau");
        
        // Tải xuống
        XLSX.writeFile(workbook, "Danh_sach_lop_mau.xlsx");
        Utils.showToast("Đã tải file Excel mẫu xuống máy!");
    },

    // --- 2. Hàm thêm học sinh thủ công ---
    async addManualStudent() {
        const input = document.getElementById('manualName');
        const name = input.value.trim();
        
        // Kiểm tra nếu người dùng chưa nhập gì
        if(!name) {
            Utils.showToast("Vui lòng nhập tên học sinh!");
            return;
        }

        const s = { id: Date.now().toString(), name: name, class: '' };
        await db.saveStudents([s]);
        
        input.value = ''; // Xóa trắng ô nhập để nhập người tiếp theo
        input.focus();    // Giữ con trỏ chuột ở ô nhập
        
        this.loadStudentList();
        Utils.showToast(`Đã thêm học sinh: ${name}`); // Thông báo thành công rõ ràng
    },

    // --- 3. Hàm xóa toàn bộ danh sách (ĐÃ BỔ SUNG LẠI) ---
    async clearStudents() {
        if(confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách?")) {
            await db.clearStudents();
            this.currentStudent = null;
            document.getElementById('headerStudentName').textContent = "Chưa chọn học sinh";
            this.loadStudentList();
            Utils.showToast("Đã xóa toàn bộ danh sách!");
        }
    },

    // ==========================================
    // MODULE: GALLERY & EXPORT
    // ==========================================
    async loadGallery() {
        const typeFilter = document.getElementById('filterType').value;
        let mediaList = await db.getAllMedia();
        
        if(typeFilter !== 'all') {
            mediaList = mediaList.filter(m => m.type === typeFilter);
        }

        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        mediaList.forEach(media => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const url = URL.createObjectURL(media.blob);
            let mediaElement;
            
            if(media.type === 'photo') {
                mediaElement = `<img src="${url}" alt="${media.studentName}">
                                <div class="media-icon"><i class="fa-solid fa-image"></i></div>`;
            } else {
                mediaElement = `<video src="${url}" preload="metadata"></video>
                                <div class="media-icon"><i class="fa-solid fa-video"></i></div>`;
            }

            item.innerHTML = `
                <input type="checkbox" class="gallery-checkbox" data-id="${media.id}" data-filename="${media.fileName}">
                ${mediaElement}
                <div class="gallery-info">
                    <div><b>${media.studentName}</b></div>
                    <div style="font-size: 0.8em; color: #aaa">${Utils.formatDateDisplay(media.timestamp)}</div>
                </div>
            `;

            // Click vào ảnh/video để xem
            item.querySelector('img, video').addEventListener('click', () => this.viewMedia(url, media.type, media.fileName, media.blob));
            
            grid.appendChild(item);
        });
    },

    viewMedia(url, type, fileName, blob) {
        if(type === 'photo') {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImg');
            const caption = document.getElementById('modalCaption');
            
            modal.style.display = 'flex';
            modalImg.src = url;
            caption.textContent = fileName;
        } else {
            // Với video, mở trong tab mới để xem
            window.open(url, '_blank');
        }
    },

    async exportSelectedMedia() {
        const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
        if(checkboxes.length === 0) {
            Utils.showToast("Vui lòng chọn ít nhất 1 file để xuất!");
            return;
        }

        Utils.showToast("Đang nén file ZIP, vui lòng đợi...");
        const zip = new JSZip();
        const mediaList = await db.getAllMedia();

        checkboxes.forEach((cb, index) => {
            const id = cb.dataset.id;
            const item = mediaList.find(m => m.id === id);
            if(item) {
                // Thêm index ở đầu để tránh trùng tên nếu trùng tên học sinh
                const safeName = `${String(index + 1).padStart(3, '0')}_${item.fileName}`;
                zip.file(safeName, item.blob);
            }
        });

        zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `MEDIA_EXPORT_${Utils.formatDateForFile(Date.now())}.zip`);
            Utils.showToast("Đã xuất file ZIP thành công!");
        });
    },

    async deleteSelectedMedia() {
        const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
        if(checkboxes.length === 0) return;

        if(confirm(`Xóa ${checkboxes.length} file đã chọn?`)) {
            const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
            await db.deleteMedia(ids);
            this.loadGallery();
            Utils.showToast("Đã xóa file!");
        }
    }
};

// Khởi chạy ứng dụng khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});