/**
 * MEDIA NAME STUDIO - Core Application Engine (Rewrite)
 * Unified & Mobile First
 */

// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://whuyytjksrpyojmukftp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gpW8TcOIz4ocrrMIWUx3Qg_sZaeZqQ0';

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase SDK chưa được tải thành công!");
}

// ==========================================
// 2. UTILITIES
// ==========================================
const Utils = {
    removeVietnameseTones(str) {
        if (!str) return '';
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
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
    formatDateForFile(timestamp) {
        const d = new Date(timestamp);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    },
    formatDateDisplay(dateObj) {
        const pad = n => String(n).padStart(2, '0');
        return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
    },
    showToast(message, duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.add('hidden'), duration);
    },
    getSupportedMimeType() {
        const types = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    }
};

// ==========================================
// 3. DATABASE CONTROLLER (INDEXEDDB)
// ==========================================
class AppDB {
    constructor() {
        this.dbName = 'MediaNameStudioDB';
        this.version = 3;
        this.db = null;
    }
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('students')) db.createObjectStore('students', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
            };
            request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            request.onerror = (e) => reject(e);
        });
    }
    async setSetting(key, value) {
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readwrite');
            tx.objectStore('settings').put({ key, value });
            tx.oncomplete = () => resolve();
        });
    }
    async getSetting(key, defaultValue) {
        return new Promise(resolve => {
            const tx = this.db.transaction('settings', 'readonly');
            const req = tx.objectStore('settings').get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
        });
    }
    async saveStudents(studentsArray) {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readwrite');
            const store = tx.objectStore('students');
            studentsArray.forEach(s => store.put(s));
            tx.oncomplete = () => resolve();
        });
    }
    async getStudents() {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readonly');
            const req = tx.objectStore('students').getAll();
            req.onsuccess = () => resolve(req.result || []);
        });
    }
    async clearStudents() {
        return new Promise(resolve => {
            const tx = this.db.transaction('students', 'readwrite');
            tx.objectStore('students').clear();
            tx.oncomplete = () => resolve();
        });
    }
    async saveMedia(mediaObj) {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readwrite');
            tx.objectStore('media').put(mediaObj);
            tx.oncomplete = () => resolve();
        });
    }
    async getAllMedia() {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readonly');
            const req = tx.objectStore('media').getAll();
            req.onsuccess = () => {
                const results = req.result || [];
                resolve(results.sort((a, b) => b.timestamp - a.timestamp));
            };
        });
    }
    async deleteMedia(ids) {
        return new Promise(resolve => {
            const tx = this.db.transaction('media', 'readwrite');
            const store = tx.objectStore('media');
            ids.forEach(id => store.delete(id));
            tx.oncomplete = () => resolve();
        });
    }
}
const db = new AppDB();

// ==========================================
// 4. AUTH & CLOUD SYNC MANAGER
// ==========================================
const Auth = {
    currentUser: null,
    async init() {
        if (!supabaseClient) return;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            this.currentUser = session?.user || null;
            this.updateUI();
            supabaseClient.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.updateUI();
                if (event === 'SIGNED_IN') SyncManager.syncFromCloud();
            });
        } catch (err) {
            console.error("Lỗi Auth:", err);
        }
    },
    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        if (this.currentUser) {
            if (loginSection) loginSection.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = this.currentUser.email;
        } else {
            if (loginSection) loginSection.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    },
    async signInWithGoogle() {
        if (!supabaseClient) { Utils.showToast("Chưa cấu hình Supabase!"); return; }
        const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
        if (error) Utils.showToast('Lỗi đăng nhập: ' + error.message);
    },
    async signOut() {
        if (!supabaseClient) return;
        await supabaseClient.auth.signOut();
        this.currentUser = null;
        this.updateUI();
        Utils.showToast('Đã đăng xuất!');
    }
};

const SyncManager = {
    isSyncing: false,
    async uploadSingleMedia(mediaObj) {
        if (!Auth.currentUser || !supabaseClient || mediaObj.sync_status === 'synced') return;
        try {
            const userId = Auth.currentUser.id;
            const cleanStudent = Utils.removeVietnameseTones(mediaObj.studentName || 'student');
            const filePath = `${userId}/${cleanStudent}/${mediaObj.fileName}`;
            const fileToUpload = new File([mediaObj.blob], mediaObj.fileName, { type: mediaObj.blob.type });

            const { error: uploadError } = await supabaseClient.storage.from('media').upload(filePath, fileToUpload, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient.storage.from('media').getPublicUrl(filePath);

            const { error: dbError } = await supabaseClient.from('media_files').insert([{
                user_id: userId, student_name: mediaObj.studentName, file_name: mediaObj.fileName,
                file_url: publicUrl, file_type: mediaObj.type, file_path: filePath, created_at: new Date(mediaObj.timestamp).toISOString()
            }]);
            if (dbError) throw dbError;

            mediaObj.sync_status = 'synced';
            mediaObj.file_path = filePath;
            await db.saveMedia(mediaObj);
            if (App.activeTab === 'tab-gallery') App.loadGallery();
        } catch (err) {
            console.error("Upload error:", err);
            mediaObj.sync_status = 'failed';
            await db.saveMedia(mediaObj);
        }
    },
    async syncFromCloud() {
        if (!Auth.currentUser || !supabaseClient || this.isSyncing) return;
        this.isSyncing = true;
        try {
            const { data: cloudFiles, error } = await supabaseClient.from('media_files').select('*').eq('user_id', Auth.currentUser.id).order('created_at', { ascending: false });
            if (error) throw error;
            if (cloudFiles && cloudFiles.length > 0) {
                const localMedia = await db.getAllMedia();
                const localMap = new Map(localMedia.map(m => [m.fileName, m]));
                for (const file of cloudFiles) {
                    if (!localMap.has(file.file_name)) {
                        try {
                            const res = await fetch(file.file_url);
                            const blob = await res.blob();
                            const mediaObj = {
                                id: new Date(file.created_at).getTime().toString(), type: file.file_type, blob: blob,
                                studentName: file.student_name || 'Khách', fileName: file.file_name, timestamp: new Date(file.created_at).getTime(),
                                sync_status: 'synced', file_path: file.file_path
                            };
                            await db.saveMedia(mediaObj);
                        } catch (e) { console.error("Fetch fail:", file.file_name); }
                    }
                }
                if (App.activeTab === 'tab-gallery') App.loadGallery();
            }
        } catch (err) { console.error("Sync error:", err); } finally { this.isSyncing = false; }
    }
};

// ==========================================
// 5. UNIFIED MEDIA PIPELINE & WATERMARK
// ==========================================
const WatermarkManager = {
    drawToCanvas(canvas, studentName, settings) {
        if (!settings.enabled) return;
        const ctx = canvas.getContext('2d');
        const lines = [];

        // Legacy / Custom layout or standard Bottom-Right
        if (settings.position === 'bottom-right') {
            const dateStr = Utils.formatDateDisplay(new Date());
            lines.push(`${studentName} - ${dateStr}`);
            ctx.font = 'bold 20px Arial'; 
            ctx.fillStyle = 'rgb(255, 36, 7)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(lines[0], canvas.width - 15, canvas.height - 15);
            ctx.shadowColor = 'transparent';
        } else {
            if (settings.showUnit && settings.unitName) lines.push(settings.unitName.toUpperCase());
            if (studentName) lines.push(`HỌ TÊN: ${studentName.toUpperCase()}`);
            if (settings.showDate) lines.push(Utils.formatDateDisplay(new Date()));
            if (lines.length === 0) return;

            const fontSize = parseInt(settings.fontSize) || 32;
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            const lineHeight = fontSize * 1.35;
            let maxWidth = 0;
            lines.forEach(l => { const w = ctx.measureText(l).width; if (w > maxWidth) maxWidth = w; });

            const pad = 14;
            const bWidth = maxWidth + (pad * 2);
            const bHeight = (lines.length * lineHeight) + (pad * 0.5);
            let x = 20, y = 20;

            if (settings.align === 'center') x = (canvas.width - bWidth) / 2;
            else if (settings.align === 'right') x = canvas.width - bWidth - 20;

            if (settings.position === 'center') y = (canvas.height - bHeight) / 2;
            else if (settings.position === 'bottom') y = canvas.height - bHeight - 20;

            if (settings.bgColor !== 'transparent') {
                ctx.fillStyle = settings.bgColor || 'rgba(0,0,0,0.5)';
                ctx.fillRect(x, y, bWidth, bHeight);
            }
            ctx.fillStyle = settings.color || '#ffffff';
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            lines.forEach((l, i) => ctx.fillText(l, x + pad, y + (pad / 2) + (i * lineHeight)));
        }
    }
};

const MediaPipeline = {
    async saveMediaToApp(blob, type, studentName) {
        const timestamp = Date.now();
        const cleanName = Utils.removeVietnameseTones(studentName);
        const ext = type === 'photo' ? 'jpg' : (blob.type.includes('mp4') ? 'mp4' : 'webm');
        const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.${ext}`;

        const mediaData = {
            id: timestamp.toString(), type: type, blob: blob,
            studentName: studentName, fileName: fileName, timestamp: timestamp, sync_status: 'pending'
        };

        await db.saveMedia(mediaData);
        Utils.showToast(`Đã lưu ${type === 'photo' ? 'ảnh' : 'video'}: ${studentName}`);
        
        if (App.activeTab === 'tab-gallery') App.loadGallery();
        SyncManager.uploadSingleMedia(mediaData);
    }
};

// ==========================================
// 6. MAIN APPLICATION CONTROLLER
// ==========================================
const App = {
    settings: {
        enabled: true,
        unitName: 'TRƯỜNG TIỂU HỌC TRẦN QUỐC TOẢN', showUnit: true, showDate: true,
        position: 'bottom-right', align: 'center', fontSize: 20, color: '#ff2407', bgColor: 'transparent'
    },
    currentStudent: null,
    cameraFacingMode: 'environment',
    mediaRecorder: null, recordedChunks: [], isRecording: false, recordStartTime: 0, recordTimer: null,
    rawStream: null, animationFrameId: null, activeTab: 'tab-camera',

    async init() {
        try {
            await db.init();
            await this.loadSettings();
            this.initSettingsUI();
            this.bindEvents();
            await Auth.init();
            await this.loadStudentList();
            await this.loadGallery();
            
            // Khôi phục camera khi app active lại
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.activeTab === 'tab-camera') {
                    this.startCamera();
                } else if (document.visibilityState === 'hidden') {
                    this.stopCamera();
                }
            });
            this.startCamera();
        } catch (error) { Utils.showToast("Lỗi khởi tạo!"); console.error(error); }
    },

    async loadSettings() {
        const stored = await db.getSetting('appSettings', null);
        if (stored) Object.assign(this.settings, stored);
    },
    async saveSettings() {
        this.settings.enabled = document.getElementById('settingWatermark').checked;
        this.settings.unitName = document.getElementById('setUnitName').value.trim();
        this.settings.showUnit = document.getElementById('setShowUnit').checked;
        this.settings.showDate = document.getElementById('setShowDate').checked;
        this.settings.position = document.getElementById('setPosition').value;
        this.settings.align = document.getElementById('setAlign').value;
        this.settings.fontSize = parseInt(document.getElementById('setFontSize').value) || 20;
        this.settings.color = document.getElementById('setColor').value;
        this.settings.bgColor = document.getElementById('setBgColor').value;
        await db.setSetting('appSettings', this.settings);
        Utils.showToast('Đã lưu cấu hình!');
    },
    initSettingsUI() {
        const check = document.getElementById('settingWatermark');
        check.checked = this.settings.enabled;
        check.addEventListener('change', (e) => {
            document.getElementById('watermarkSettingsOptions').style.display = e.target.checked ? 'block' : 'none';
        });
        document.getElementById('watermarkSettingsOptions').style.display = this.settings.enabled ? 'block' : 'none';
        
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
        document.getElementById('btnLoginGoogle')?.addEventListener('click', () => Auth.signInWithGoogle());
        document.getElementById('btnLogout')?.addEventListener('click', () => Auth.signOut());

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.target));
        });

        document.getElementById('btnSaveSettings')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('excelUpload')?.addEventListener('change', (e) => this.handleExcelImport(e));
        document.getElementById('btnDownloadSample')?.addEventListener('click', () => this.downloadSampleExcel());
        document.getElementById('btnClearList')?.addEventListener('click', () => this.clearStudents());
        document.getElementById('btnAddManual')?.addEventListener('click', () => this.addManualStudent());
        document.getElementById('searchStudent')?.addEventListener('input', (e) => this.loadStudentList(e.target.value));
        document.getElementById('manualName')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addManualStudent(); });

        document.getElementById('btnSwitchCamera')?.addEventListener('click', () => this.switchCamera());
        document.getElementById('btnCapturePhoto')?.addEventListener('click', (e) => this.takePhoto(e.currentTarget));
        document.getElementById('btnRecordVideo')?.addEventListener('click', () => this.toggleRecordVideo());
        
        // Sự kiện duy nhất và bắt buộc cho Camera Gốc
        document.getElementById('btnNativeCamera')?.addEventListener('click', () => document.getElementById('nativeCameraInput').click());
        document.getElementById('nativeCameraInput')?.addEventListener('change', (e) => this.handleNativeCameraFile(e));
        
        // Zoom & Brightness
        document.getElementById('zoomRange')?.addEventListener('input', () => this.applyCameraFilters());
        document.getElementById('brightnessRange')?.addEventListener('input', () => this.applyCameraFilters());
        document.getElementById('btnResetCamera')?.addEventListener('click', () => {
            document.getElementById('zoomRange').value = 1;
            document.getElementById('brightnessRange').value = 1;
            this.applyCameraFilters();
        });

        document.getElementById('btnExportSelected')?.addEventListener('click', () => this.exportSelectedMedia());
        document.getElementById('btnDeleteSelected')?.addEventListener('click', () => this.deleteSelectedMedia());
        document.getElementById('filterType')?.addEventListener('change', () => this.loadGallery());

        // Select All Media fix
        document.getElementById('btnSelectAllMedia')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isAll = btn.dataset.state === 'all';
            document.querySelectorAll('.gallery-checkbox').forEach(cb => cb.checked = !isAll);
            btn.dataset.state = isAll ? 'none' : 'all';
            btn.innerHTML = isAll ? '<i class="fa-solid fa-check-double"></i> Chọn tất cả' : '<i class="fa-solid fa-xmark"></i> Bỏ chọn tất cả';
            btn.classList.toggle('btn-warning', !isAll);
            btn.classList.toggle('btn-secondary', isAll);
        });

        document.getElementById('closeImageModal')?.addEventListener('click', () => document.getElementById('imageModal').classList.add('hidden'));
        document.getElementById('closeVideoModal')?.addEventListener('click', () => {
            const m = document.getElementById('videoModal'); const v = document.getElementById('modalVideo');
            m.classList.add('hidden'); v.pause(); v.src = '';
        });
    },

    switchTab(targetTabId) {
        this.activeTab = targetTabId;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        document.querySelector(`.nav-btn[data-target="${targetTabId}"]`)?.classList.add('active');
        document.getElementById(targetTabId)?.classList.add('active');

        if (targetTabId === 'tab-camera') this.startCamera();
        else this.stopCamera();
        if (targetTabId === 'tab-gallery') this.loadGallery();
    },

    async initCameraSelector() {
        const selector = document.getElementById('cameraSelect');
        if (!selector) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            selector.innerHTML = '<option value="">-- Mặc định hệ thống --</option>';
            videoDevices.forEach((d, i) => {
                const opt = document.createElement('option'); opt.value = d.deviceId; opt.text = d.label || `Camera ${i + 1}`;
                selector.appendChild(opt);
            });
            selector.onchange = (e) => this.startCamera(e.target.value);
        } catch (e) { console.warn("Không thể liệt kê camera:", e); }
    },

    async startCamera(deviceId = '') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            Utils.showToast("Trình duyệt không hỗ trợ Camera Web. Dùng Camera Gốc!");
            return;
        }
        this.stopCamera();
        const video = document.getElementById('rawVideo');
        try {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: this.cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            };
            this.rawStream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.rawStream;
            video.onloadedmetadata = () => { video.play(); this.startCanvasLoop(); };
            
            const selector = document.getElementById('cameraSelect');
            if (selector && selector.options.length <= 1) this.initCameraSelector();
        } catch (err) {
            Utils.showToast(`Lỗi mở Camera: ${err.name}. Hãy dùng Camera Gốc.`);
            console.warn(err);
        }
    },
    stopCamera() {
        if (this.isRecording) this.stopRecording();
        if (this.rawStream) { this.rawStream.getTracks().forEach(t => t.stop()); this.rawStream = null; }
        if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    },
    switchCamera() {
        this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
        this.startCamera();
    },
    applyCameraFilters() {
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;
        const bright = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        const canvas = document.getElementById('outputCanvas');
        if (canvas) {
            canvas.style.transform = `scale(${zoom})`;
            canvas.style.filter = bright !== 1 ? `brightness(${bright})` : 'none';
        }
    },
    startCanvasLoop() {
        const video = document.getElementById('rawVideo');
        const canvas = document.getElementById('outputCanvas');
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d', { alpha: false });

        const render = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                WatermarkManager.drawToCanvas(canvas, this.currentStudent?.name || '', this.settings);
            }
            if (this.rawStream) this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    },

    async takePhoto(btnElement) {
        if (!this.currentStudent) { Utils.showToast("Vui lòng chọn học sinh!"); this.switchTab('tab-list'); return; }
        const canvas = document.getElementById('outputCanvas');
        if (!canvas || canvas.width === 0) { Utils.showToast("Camera chưa sẵn sàng!"); return; }

        btnElement.disabled = true;
        canvas.style.opacity = '0.2';
        setTimeout(() => canvas.style.opacity = '1', 150);

        // Chụp canvas hiện tại (đã vẽ ảnh và watermark)
        const zoom = parseFloat(document.getElementById('zoomRange')?.value) || 1;
        const bright = parseFloat(document.getElementById('brightnessRange')?.value) || 1;
        
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = canvas.width; captureCanvas.height = canvas.height;
        const ctx = captureCanvas.getContext('2d');
        if (bright !== 1) ctx.filter = `brightness(${bright})`;
        if (zoom !== 1) {
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(zoom, zoom);
            ctx.translate(-canvas.width/2, -canvas.height/2);
        }
        ctx.drawImage(document.getElementById('rawVideo'), 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'none';
        
        WatermarkManager.drawToCanvas(captureCanvas, this.currentStudent.name, this.settings);

        captureCanvas.toBlob(async (blob) => {
            if (blob) await MediaPipeline.saveMediaToApp(blob, 'photo', this.currentStudent.name);
            btnElement.disabled = false;
        }, 'image/jpeg', 0.92);
    },

    // Hàm chuẩn hoá dành riêng cho xử lý Camera Gốc
    async handleNativeCameraFile(e) {
        const file = e.target.files[0];
        e.target.value = ''; // Reset input để có thể chụp tiếp ảnh sau
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Utils.showToast("Vui lòng chọn file ảnh!");
            return;
        }

        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            this.switchTab('tab-list');
            return;
        }

        Utils.showToast("Đang xử lý ảnh từ Camera gốc...");
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; 
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Áp dụng Watermark chung 1 pipeline duy nhất giống với Camera Web
                WatermarkManager.drawToCanvas(canvas, this.currentStudent.name, this.settings);
                
                canvas.toBlob(async (blob) => {
                    if (!blob) return;

                    const timestamp = Date.now();
                    const cleanName = Utils.removeVietnameseTones(this.currentStudent.name);
                    const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.jpg`;

                    const mediaData = {
                        id: timestamp.toString(),
                        type: 'photo',
                        blob: blob,
                        studentName: this.currentStudent.name,
                        fileName: fileName,
                        timestamp: timestamp,
                        sync_status: 'pending'
                    };

                    // Lưu trực tiếp IndexedDB
                    await db.saveMedia(mediaData);
                    
                    // Reload lập tức Gallery mà không đợi f5
                    if (this.activeTab === 'tab-gallery') {
                        await this.loadGallery();
                    } else {
                        Utils.showToast(`Đã lưu ảnh: ${this.currentStudent.name}`);
                    }

                    // Đồng bộ Supabase nếu user đã Auth
                    if (Auth.currentUser) {
                        await SyncManager.uploadSingleMedia(mediaData);
                    }
                }, 'image/jpeg', 0.92);
            };
            img.src = URL.createObjectURL(file);
        } catch (err) { 
            Utils.showToast("Lỗi xử lý file!"); 
            console.error(err); 
        }
    },

    toggleRecordVideo() {
        if (!this.currentStudent) { Utils.showToast("Vui lòng chọn học sinh!"); this.switchTab('tab-list'); return; }
        this.isRecording ? this.stopRecording() : this.startRecording();
    },
    startRecording() {
        const canvas = document.getElementById('outputCanvas');
        if(!canvas || canvas.width === 0) return;
        try {
            const canvasStream = canvas.captureStream(30);
            const audioTracks = this.rawStream ? this.rawStream.getAudioTracks() : [];
            const combinedStream = new MediaStream([...canvasStream.getTracks(), ...audioTracks]);

            const mimeType = Utils.getSupportedMimeType();
            if (!mimeType) { Utils.showToast("Trình duyệt không hỗ trợ quay video!"); return; }

            this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                await MediaPipeline.saveMediaToApp(blob, 'video', this.currentStudent.name);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            const btn = document.getElementById('btnRecordVideo');
            btn.innerHTML = '<i class="fa-solid fa-square"></i> DỪNG';
            btn.classList.replace('btn-danger', 'btn-secondary');
            document.getElementById('recordingIndicator').classList.remove('hidden');
            
            this.recordStartTime = Date.now();
            this.recordTimer = setInterval(() => {
                const d = Math.floor((Date.now() - this.recordStartTime) / 1000);
                document.getElementById('recordingTime').textContent = `${String(Math.floor(d / 60)).padStart(2,'0')}:${String(d % 60).padStart(2,'0')}`;
            }, 1000);
        } catch (err) { Utils.showToast("Lỗi khởi tạo quay video!"); console.error(err); }
    },
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
        this.isRecording = false;
        clearInterval(this.recordTimer);
        const btn = document.getElementById('btnRecordVideo');
        if (btn) { btn.innerHTML = '<i class="fa-solid fa-video"></i> QUAY'; btn.classList.replace('btn-secondary', 'btn-danger'); }
        document.getElementById('recordingIndicator').classList.add('hidden');
        document.getElementById('recordingTime').textContent = '00:00';
    },

    handleExcelImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                if (json.length === 0) { Utils.showToast("File Excel rỗng!"); return; }
                const keys = Object.keys(json[0]);
                const nameKey = keys.find(k => k.toLowerCase().includes('tên') || k.toLowerCase().includes('name')) || keys[1] || keys[0];
                const newStudents = json.map((row, idx) => ({
                    id: (Date.now() + idx).toString(), name: String(row[nameKey] || '').trim(), class: String(row['Lớp'] || row['Class'] || '').trim()
                })).filter(s => s.name);
                await db.saveStudents(newStudents);
                Utils.showToast(`Đã nhập ${newStudents.length} học sinh!`);
                e.target.value = ''; this.loadStudentList();
            } catch (err) { Utils.showToast("Lỗi đọc File Excel!"); }
        };
        reader.readAsArrayBuffer(file);
    },
    downloadSampleExcel() {
        const sampleData = [{ "STT": 1, "Họ và tên": "Nguyễn Văn An", "Lớp": "5A" }];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_mau");
        XLSX.writeFile(wb, "Danh_Sach_Hoc_Sinh_Mau.xlsx");
    },
    async addManualStudent() {
        const input = document.getElementById('manualName');
        const name = input.value.trim();
        if (!name) return Utils.showToast("Nhập họ tên!");
        await db.saveStudents([{ id: Date.now().toString(), name, class: '' }]);
        input.value = ''; input.focus(); this.loadStudentList(); Utils.showToast(`Đã thêm: ${name}`);
    },
    async clearStudents() {
        if (confirm("Xóa toàn bộ danh sách?")) {
            await db.clearStudents();
            this.currentStudent = null; document.getElementById('headerStudentName').textContent = "Chưa chọn";
            this.loadStudentList();
        }
    },
    async loadStudentList(filterText = '') {
        const list = await db.getStudents();
        const ul = document.getElementById('studentList');
        ul.innerHTML = '';
        const filtered = list.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));
        if (filtered.length === 0) { ul.innerHTML = '<li style="justify-content:center; color:#888;">Chưa có dữ liệu</li>'; return; }
        
        filtered.forEach(student => {
            const li = document.createElement('li');
            if (this.currentStudent?.id === student.id) li.classList.add('selected');
            li.innerHTML = `<span><strong>${student.name}</strong> ${student.class ? `(${student.class})` : ''}</span>
                            <i class="fa-solid fa-circle-check" style="color: ${this.currentStudent?.id === student.id ? '#007bff' : '#555'}"></i>`;
            li.addEventListener('click', () => {
                this.currentStudent = student;
                document.getElementById('headerStudentName').textContent = student.name;
                this.loadStudentList(filterText); this.switchTab('tab-camera');
            });
            ul.appendChild(li);
        });
    },

    async loadGallery() {
        const filter = document.getElementById('filterType').value;
        let list = await db.getAllMedia();
        if (filter !== 'all') list = list.filter(m => m.type === filter);
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';
        if (list.length === 0) { grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Chưa có file nào</p>'; return; }

        list.forEach(media => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            const url = URL.createObjectURL(media.blob);
            const syncIcon = media.sync_status === 'synced' ? '<span class="sync-badge synced"><i class="fa-solid fa-cloud-check"></i></span>' : '<span class="sync-badge pending"><i class="fa-solid fa-cloud-arrow-up"></i></span>';
            const mediaTag = media.type === 'photo' ? `<img src="${url}" alt="photo">` : `<video src="${url}" preload="metadata"></video>`;
            item.innerHTML = `<input type="checkbox" class="gallery-checkbox" data-id="${media.id}"> ${syncIcon} ${mediaTag}
                              <div class="gallery-info"><strong>${media.studentName}</strong></div>`;
            item.querySelector('img, video').addEventListener('click', () => this.viewMedia(url, media.type, media.fileName));
            grid.appendChild(item);
        });
    },
    viewMedia(url, type, fileName) {
        if (type === 'photo') {
            document.getElementById('modalImg').src = url; document.getElementById('modalCaption').textContent = fileName;
            document.getElementById('imageModal').classList.remove('hidden');
        } else {
            const v = document.getElementById('modalVideo'); v.src = url; document.getElementById('modalVideoCaption').textContent = fileName;
            document.getElementById('videoModal').classList.remove('hidden'); v.play();
        }
    },
    async exportSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0) return Utils.showToast("Chọn ít nhất 1 file!");
        Utils.showToast("Đang nén file ZIP...");
        const zip = new JSZip(); const mediaList = await db.getAllMedia();
        for (const cb of cbs) {
            const m = mediaList.find(x => x.id === cb.dataset.id);
            if (m && m.blob) zip.file(m.fileName, m.blob);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `Media_Studio_${Utils.formatDateForFile(Date.now())}.zip`);
        Utils.showToast("Đã xuất ZIP!");
    },
    async deleteSelectedMedia() {
        const cbs = document.querySelectorAll('.gallery-checkbox:checked');
        if (cbs.length === 0 || !confirm(`Xóa vĩnh viễn ${cbs.length} file?`)) return;
        const ids = Array.from(cbs).map(c => c.dataset.id);
        const mediaList = await db.getAllMedia();
        for (const id of ids) {
            const m = mediaList.find(x => x.id === id);
            if (m && Auth.currentUser && m.file_path) {
                try {
                    await supabaseClient.storage.from('media').remove([m.file_path]);
                    await supabaseClient.from('media_files').delete().eq('file_path', m.file_path);
                } catch(e){}
            }
        }
        await db.deleteMedia(ids);
        await this.loadGallery();
        Utils.showToast("Đã xóa!");
    }
};

window.addEventListener('DOMContentLoaded', () => { if (!window.appInitialized) { window.appInitialized = true; App.init(); } });