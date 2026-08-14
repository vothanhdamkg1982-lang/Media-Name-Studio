/**
 * MEDIA NAME STUDIO - Core Application Engine
 * Unified Single File Implementation
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

    formatDateForFile(dateObj) {
        const d = new Date(dateObj);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
    },

    formatDateDisplay(dateObj) {
        const d = new Date(dateObj);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
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
        const types = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm',
            'video/mp4'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
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
            req.onsuccess = () => resolve(req.result || []);
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
            req.onsuccess = () => {
                const results = req.result || [];
                resolve(results.sort((a, b) => b.timestamp - a.timestamp));
            };
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
                if (event === 'SIGNED_IN') {
                    SyncManager.syncFromCloud();
                }
            });
        } catch (err) {
            console.error("Lỗi xác thực Auth:", err);
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
        if (!supabaseClient) {
            Utils.showToast("Chưa cấu hình Supabase Client!");
            return;
        }
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });
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
        if (!Auth.currentUser || !supabaseClient) return;
        if (mediaObj.sync_status === 'synced') return;

        try {
            const userId = Auth.currentUser.id;
            const cleanStudent = Utils.removeVietnameseTones(mediaObj.studentName || 'student');
            const filePath = `${userId}/${cleanStudent}/${mediaObj.fileName}`;
            const fileToUpload = new File([mediaObj.blob], mediaObj.fileName, { type: mediaObj.blob.type });

            // 1. Upload file lên Storage
            const { error: uploadError } = await supabaseClient.storage
                .from('media')
                .upload(filePath, fileToUpload, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Lấy URL Public
            const { data: { publicUrl } } = supabaseClient.storage
                .from('media')
                .getPublicUrl(filePath);

            // 3. Lưu bản ghi metadata vào Database (Dùng insert chuẩn)
            const { error: dbError } = await supabaseClient
                .from('media_files')
                .insert([
                    {
                        user_id: userId,
                        student_name: mediaObj.studentName,
                        file_name: mediaObj.fileName,
                        file_url: publicUrl,
                        file_type: mediaObj.type,
                        file_path: filePath,
                        created_at: new Date(mediaObj.timestamp).toISOString()
                    }
                ]);

            if (dbError) throw dbError;
            // 4. Cập nhật trạng thái Local
            mediaObj.sync_status = 'synced';
            mediaObj.file_path = filePath;
            await db.saveMedia(mediaObj);
            
            if (typeof App !== 'undefined' && App.activeTab === 'tab-gallery') {
                App.loadGallery();
            }
        } catch (err) {
            console.error("Lỗi upload media nền:", err);
            mediaObj.sync_status = 'failed';
            await db.saveMedia(mediaObj);
        }
    },

    async syncFromCloud() {
        if (!Auth.currentUser || !supabaseClient || this.isSyncing) return;
        this.isSyncing = true;

        try {
            const { data: cloudFiles, error } = await supabaseClient
                .from('media_files')
                .select('*')
                .eq('user_id', Auth.currentUser.id)
                .order('created_at', { ascending: false });

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
                                id: new Date(file.created_at).getTime().toString(),
                                type: file.file_type,
                                blob: blob,
                                studentName: file.student_name || 'Khách',
                                fileName: file.file_name,
                                timestamp: new Date(file.created_at).getTime(),
                                sync_status: 'synced',
                                file_path: file.file_path
                            };
                            await db.saveMedia(mediaObj);
                        } catch (e) {
                            console.error("Không thể tải file từ cloud:", file.file_name);
                        }
                    }
                }
                if (typeof App !== 'undefined') App.loadGallery();
            }
        } catch (err) {
            console.error("Lỗi đồng bộ từ Cloud:", err);
        } finally {
            this.isSyncing = false;
        }
    }
};

// ==========================================
// 5. MAIN APPLICATION CONTROLLER
// ==========================================
const App = {
    settings: {
        unitName: 'TRƯỜNG TIỂU HỌC TRẦN QUỐC TOẢN',
        showUnit: true,
        showDate: true,
        position: 'bottom',
        align: 'center',
        fontSize: 32,
        color: '#ffffff',
        bgColor: 'rgba(0,0,0,0.5)'
    },
    currentStudent: null,
    cameraFacingMode: 'environment',
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    recordStartTime: 0,
    recordTimer: null,
    rawStream: null,
    animationFrameId: null,
    activeTab: 'tab-camera',

    async init() {
        try {
            await db.init();
            await this.loadSettings();
            this.initSettingsUI();
            this.bindEvents();
            await Auth.init();
            await this.loadStudentList();
            await this.loadGallery();
            this.startCamera();
        } catch (error) {
            Utils.showToast("Khởi tạo ứng dụng thất bại!");
            console.error(error);
        }
    },

    async loadSettings() {
        const stored = await db.getSetting('appSettings', null);
        if (stored) Object.assign(this.settings, stored);
    },

    async saveSettings() {
        this.settings.unitName = document.getElementById('setUnitName').value.trim();
        this.settings.showUnit = document.getElementById('setShowUnit').checked;
        this.settings.showDate = document.getElementById('setShowDate').checked;
        this.settings.position = document.getElementById('setPosition').value;
        this.settings.align = document.getElementById('setAlign').value;
        this.settings.fontSize = parseInt(document.getElementById('setFontSize').value) || 32;
        this.settings.color = document.getElementById('setColor').value;
        this.settings.bgColor = document.getElementById('setBgColor').value;

        await db.setSetting('appSettings', this.settings);
        Utils.showToast('Đã lưu cấu hình Watermark!');
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
        // Auth Buttons
        document.getElementById('btnLoginGoogle')?.addEventListener('click', () => Auth.signInWithGoogle());
        document.getElementById('btnLogout')?.addEventListener('click', () => Auth.signOut());

        // Bottom Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.switchTab(target);
            });
        });

        // Settings
        document.getElementById('btnSaveSettings')?.addEventListener('click', () => this.saveSettings());

        // Student Management
        document.getElementById('excelUpload')?.addEventListener('change', (e) => this.handleExcelImport(e));
        document.getElementById('btnDownloadSample')?.addEventListener('click', () => this.downloadSampleExcel());
        document.getElementById('btnClearList')?.addEventListener('click', () => this.clearStudents());
        document.getElementById('btnAddManual')?.addEventListener('click', () => this.addManualStudent());
        document.getElementById('searchStudent')?.addEventListener('input', (e) => this.loadStudentList(e.target.value));
        document.getElementById('manualName')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addManualStudent();
        });

        // Camera Controls
        document.getElementById('btnSwitchCamera')?.addEventListener('click', () => this.switchCamera());
        document.getElementById('btnCapturePhoto')?.addEventListener('click', () => this.takePhoto());
        document.getElementById('btnRecordVideo')?.addEventListener('click', () => this.toggleRecordVideo());

        // Gallery Actions
        document.getElementById('btnExportSelected')?.addEventListener('click', () => this.exportSelectedMedia());
        document.getElementById('btnDeleteSelected')?.addEventListener('click', () => this.deleteSelectedMedia());
        document.getElementById('filterType')?.addEventListener('change', () => this.loadGallery());

        // Modals Close
        document.getElementById('closeImageModal')?.addEventListener('click', () => {
            document.getElementById('imageModal').style.display = 'none';
        });
        document.getElementById('closeVideoModal')?.addEventListener('click', () => {
            const modal = document.getElementById('videoModal');
            const video = document.getElementById('modalVideo');
            modal.style.display = 'none';
            video.pause();
            video.src = '';
        });
    },

    switchTab(targetTabId) {
        this.activeTab = targetTabId;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        const currentNavBtn = document.querySelector(`.nav-btn[data-target="${targetTabId}"]`);
        if (currentNavBtn) currentNavBtn.classList.add('active');
        document.getElementById(targetTabId)?.classList.add('active');

        if (targetTabId === 'tab-camera') {
            this.startCamera();
        } else {
            this.stopCamera();
        }

        if (targetTabId === 'tab-gallery') {
            this.loadGallery();
        }
    },

    // ==========================================
    // CAMERA & WATERMARK RENDERING
    // ==========================================
    async startCamera() {
        if (this.rawStream) return;

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
            Utils.showToast("Không thể truy cập Camera/Microphone!");
            console.error(err);
        }
    },

    stopCamera() {
        if (this.isRecording) this.stopRecording();
        if (this.rawStream) {
            this.rawStream.getTracks().forEach(track => track.stop());
            this.rawStream = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    switchCamera() {
        this.stopCamera();
        this.cameraFacingMode = (this.cameraFacingMode === 'environment') ? 'user' : 'environment';
        this.startCamera();
    },

    startCanvasLoop() {
        const video = document.getElementById('rawVideo');
        const canvas = document.getElementById('outputCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const render = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                this.drawWatermark(ctx, canvas);
            }
            if (this.rawStream) {
                this.animationFrameId = requestAnimationFrame(render);
            }
        };
        render();
    },

    drawWatermark(ctx, canvas) {
        const lines = [];
        if (this.settings.showUnit && this.settings.unitName) {
            lines.push(this.settings.unitName.toUpperCase());
        }
        if (this.currentStudent) {
            lines.push(`HỌ TÊN: ${this.currentStudent.name.toUpperCase()}`);
        }
        if (this.settings.showDate) {
            lines.push(Utils.formatDateDisplay(new Date()));
        }

        if (lines.length === 0) return;

        ctx.save();
        const fontSize = parseInt(this.settings.fontSize) || 32;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        const lineHeight = fontSize * 1.35;
        let maxWidth = 0;
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
        });

        const padding = 14;
        const boxWidth = maxWidth + (padding * 2);
        const boxHeight = (lines.length * lineHeight) + (padding * 0.5);

        let x = 20;
        let y = 20;

        if (this.settings.align === 'center') {
            x = (canvas.width - boxWidth) / 2;
        } else if (this.settings.align === 'right') {
            x = canvas.width - boxWidth - 20;
        }

        if (this.settings.position === 'center') {
            y = (canvas.height - boxHeight) / 2;
        } else if (this.settings.position === 'bottom') {
            y = canvas.height - boxHeight - 20;
        }

        // Vẽ nền chữ
        ctx.fillStyle = this.settings.bgColor || 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, boxWidth, boxHeight);

        // Vẽ từng dòng chữ
        ctx.fillStyle = this.settings.color || '#ffffff';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        lines.forEach((line, index) => {
            ctx.fillText(line, x + padding, y + (padding / 2) + (index * lineHeight));
        });

        ctx.restore();
    },

    // ==========================================
    // CAPTURE PHOTO & RECORD VIDEO
    // ==========================================
    async takePhoto() {
        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi chụp!");
            this.switchTab('tab-list');
            return;
        }
const canvas = document.getElementById('outputCanvas');
    
    // --- GỌI CỖ MÁY IN WATERMARK LÊN ẢNH ---
    WatermarkManager.drawTextToCanvas(canvas, this.currentStudent.name);
    // ----------------------------------------

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

            await db.saveMedia(mediaData);
            Utils.showToast(`Đã lưu ảnh: ${this.currentStudent.name}`);

            // Đẩy lên cloud nếu đã đăng nhập
            SyncManager.uploadSingleMedia(mediaData);

            // Hiệu ứng Flash
            canvas.style.opacity = '0.2';
            setTimeout(() => canvas.style.opacity = '1', 120);
        }, 'image/jpeg', 0.92);
    },

    toggleRecordVideo() {
        if (!this.currentStudent) {
            Utils.showToast("Vui lòng chọn học sinh trước khi quay!");
            this.switchTab('tab-list');
            return;
        }

        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    },

    startRecording() {
        const canvas = document.getElementById('outputCanvas');
        try {
            const canvasStream = canvas.captureStream(30);
            const audioTracks = this.rawStream ? this.rawStream.getAudioTracks() : [];
            const combinedStream = new MediaStream([...canvasStream.getTracks(), ...audioTracks]);

            const mimeType = Utils.getSupportedMimeType();
            if (!mimeType) {
                Utils.showToast("Trình duyệt không hỗ trợ quay phim!");
                return;
            }

            this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.recordedChunks, { type: mimeType });
                const timestamp = Date.now();
                const cleanName = Utils.removeVietnameseTones(this.currentStudent.name);
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const fileName = `${cleanName}_${Utils.formatDateForFile(timestamp)}.${ext}`;

                const mediaData = {
                    id: timestamp.toString(),
                    type: 'video',
                    blob: blob,
                    studentName: this.currentStudent.name,
                    fileName: fileName,
                    timestamp: timestamp,
                    sync_status: 'pending'
                };

                await db.saveMedia(mediaData);
                Utils.showToast(`Đã lưu video: ${this.currentStudent.name}`);
                SyncManager.uploadSingleMedia(mediaData);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Cập nhật giao diện Nút quay
            const btn = document.getElementById('btnRecordVideo');
            btn.innerHTML = '<i class="fa-solid fa-square"></i> DỪNG';
            btn.classList.replace('btn-danger', 'btn-secondary');

            document.getElementById('recordingIndicator').classList.remove('hidden');
            this.recordStartTime = Date.now();
            this.recordTimer = setInterval(() => {
                const diff = Math.floor((Date.now() - this.recordStartTime) / 1000);
                const mins = String(Math.floor(diff / 60)).padStart(2, '0');
                const secs = String(diff % 60).padStart(2, '0');
                document.getElementById('recordingTime').textContent = `${mins}:${secs}`;
            }, 1000);

        } catch (err) {
            Utils.showToast("Không thể khởi chạy bộ ghi hình!");
            console.error(err);
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.isRecording = false;
        clearInterval(this.recordTimer);

        const btn = document.getElementById('btnRecordVideo');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-video"></i> QUAY';
            btn.classList.replace('btn-secondary', 'btn-danger');
        }

        document.getElementById('recordingIndicator').classList.add('hidden');
        document.getElementById('recordingTime').textContent = '00:00';
    },

    // ==========================================
    // STUDENT MANAGEMENT
    // ==========================================
    handleExcelImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    Utils.showToast("File Excel rỗng!");
                    return;
                }

                const keys = Object.keys(json[0]);
                const nameKey = keys.find(k => k.toLowerCase().includes('tên') || k.toLowerCase().includes('name')) || keys[1] || keys[0];

                const newStudents = json.map((row, idx) => ({
                    id: (Date.now() + idx).toString(),
                    name: String(row[nameKey] || '').trim(),
                    class: String(row['Lớp'] || row['Class'] || '').trim()
                })).filter(s => s.name);

                await db.saveStudents(newStudents);
                Utils.showToast(`Đã nhập ${newStudents.length} học sinh thành công!`);
                e.target.value = '';
                this.loadStudentList();
            } catch (err) {
                Utils.showToast("Cấu trúc File Excel không hợp lệ!");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    downloadSampleExcel() {
        const sampleData = [
            { "STT": 1, "Họ và tên": "Nguyễn Văn An", "Lớp": "5A" },
            { "STT": 2, "Họ và tên": "Trần Văn Bình", "Lớp": "5A" },
            { "STT": 3, "Họ và tên": "Lê Thị Hoa", "Lớp": "5B" }
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh_sach_mau");
        XLSX.writeFile(workbook, "Danh_Sach_Hoc_Sinh_Mau.xlsx");
        Utils.showToast("Đã tải file Excel mẫu!");
    },

    async addManualStudent() {
        const input = document.getElementById('manualName');
        const name = input.value.trim();
        if (!name) {
            Utils.showToast("Vui lòng nhập họ tên học sinh!");
            return;
        }

        const student = { id: Date.now().toString(), name, class: '' };
        await db.saveStudents([student]);
        input.value = '';
        input.focus();
        this.loadStudentList();
        Utils.showToast(`Đã thêm: ${name}`);
    },

    async clearStudents() {
        if (confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách học sinh?")) {
            await db.clearStudents();
            this.currentStudent = null;
            document.getElementById('headerStudentName').textContent = "Chưa chọn học sinh";
            this.loadStudentList();
            Utils.showToast("Đã xóa danh sách!");
        }
    },

    async loadStudentList(filterText = '') {
        const list = await db.getStudents();
        const ul = document.getElementById('studentList');
        ul.innerHTML = '';

        const filtered = list.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            ul.innerHTML = '<li style="justify-content:center; color:#888;">Chưa có dữ liệu học sinh</li>';
            return;
        }

        filtered.forEach(student => {
            const li = document.createElement('li');
            if (this.currentStudent && this.currentStudent.id === student.id) {
                li.classList.add('selected');
            }

            li.innerHTML = `
                <span><strong>${student.name}</strong> ${student.class ? `(${student.class})` : ''}</span>
                <i class="fa-solid fa-circle-check" style="color: ${this.currentStudent?.id === student.id ? '#007bff' : '#555'}"></i>
            `;

            li.addEventListener('click', () => {
                this.currentStudent = student;
                document.getElementById('headerStudentName').textContent = student.name;
                this.loadStudentList(filterText);
                this.switchTab('tab-camera');
            });

            ul.appendChild(li);
        });
    },

    // ==========================================
    // GALLERY & EXPORT ZIP
    // ==========================================
    async loadGallery() {
        const filter = document.getElementById('filterType').value;
        let list = await db.getAllMedia();

        if (filter !== 'all') {
            list = list.filter(m => m.type === filter);
        }

        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        if (list.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 30px;">Chưa có ảnh/video nào</p>';
            return;
        }

        list.forEach(media => {
            const item = document.createElement('div');
            item.className = 'gallery-item';

            const url = URL.createObjectURL(media.blob);
            const isSynced = media.sync_status === 'synced';
            const syncIcon = isSynced 
                ? '<span class="sync-badge synced"><i class="fa-solid fa-cloud-check"></i></span>'
                : '<span class="sync-badge pending"><i class="fa-solid fa-cloud-arrow-up"></i></span>';

            const mediaTag = media.type === 'photo' 
                ? `<img src="${url}" alt="${media.studentName}">`
                : `<video src="${url}" preload="metadata"></video>`;

            item.innerHTML = `
                <input type="checkbox" class="gallery-checkbox" data-id="${media.id}">
                ${syncIcon}
                ${mediaTag}
                <div class="gallery-info">
                    <strong>${media.studentName}</strong>
                </div>
            `;

            item.querySelector('img, video').addEventListener('click', () => this.viewMedia(url, media.type, media.fileName));
            grid.appendChild(item);
        });
    },

    viewMedia(url, type, fileName) {
        if (type === 'photo') {
            const modal = document.getElementById('imageModal');
            const img = document.getElementById('modalImg');
            const cap = document.getElementById('modalCaption');
            img.src = url;
            cap.textContent = fileName;
            modal.style.display = 'flex';
        } else {
            const modal = document.getElementById('videoModal');
            const video = document.getElementById('modalVideo');
            const cap = document.getElementById('modalVideoCaption');
            video.src = url;
            cap.textContent = fileName;
            modal.style.display = 'flex';
            video.play();
        }
    },

    async exportSelectedMedia() {
        const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
        if (checkboxes.length === 0) {
            Utils.showToast("Vui lòng chọn ít nhất 1 file để xuất ZIP!");
            return;
        }

        Utils.showToast("Đang nén file ZIP, xin chờ...");
        const zip = new JSZip();
        const mediaList = await db.getAllMedia();
        let addedCount = 0;

        for (const cb of checkboxes) {
            const media = mediaList.find(m => m.id === cb.dataset.id);
            if (media && media.blob) {
                zip.file(media.fileName, media.blob);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            const zipName = `Media_Name_Studio_${Utils.formatDateForFile(Date.now())}.zip`;
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, zipName);
            Utils.showToast(`Đã xuất ZIP ${addedCount} file!`);
        }
    },

    async deleteSelectedMedia() {
        const checkboxes = document.querySelectorAll('.gallery-checkbox:checked');
        if (checkboxes.length === 0) {
            Utils.showToast("Vui lòng chọn ít nhất 1 file để xóa!");
            return;
        }

        if (!confirm(`Bạn có chắc muốn xóa vĩnh viễn ${checkboxes.length} file đã chọn?`)) return;

        const idsToDelete = Array.from(checkboxes).map(cb => cb.dataset.id);
        const mediaList = await db.getAllMedia();

        for (const id of idsToDelete) {
            const media = mediaList.find(m => m.id === id);
            if (media && Auth.currentUser && media.file_path) {
                try {
                    await supabaseClient.storage.from('media').remove([media.file_path]);
                    await supabaseClient.from('media_files').delete().eq('file_path', media.file_path).eq('user_id', Auth.currentUser.id);
                } catch (e) {
                    console.error("Lỗi xóa file trên đám mây:", e);
                }
            }
        }

        await db.deleteMedia(idsToDelete);
        await this.loadGallery();
        Utils.showToast(`Đã xóa ${idsToDelete.length} file!`);
    }
};

// ==========================================
// 6. SINGLE INITIALIZATION ENTRY POINT
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    if (!window.appInitialized) {
        window.appInitialized = true;
        App.init();
    }
});
// ==========================================
// BƯỚC 3: BỘ CÔNG CỤ IN WATERMARK CHUẨN
// ==========================================
const WatermarkManager = {
    drawTextToCanvas(canvas, studentName) {
        const isWatermarkEnabled = localStorage.getItem('drawWatermark') === 'true';
        if (!isWatermarkEnabled) return; // Nếu không tích thì bỏ qua

        const ctx = canvas.getContext('2d');
        
        // Lấy ngày tháng năm hiện tại
        const dateObj = new Date();
        const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        // Nội dung in: Tên - Ngày
        const watermarkText = `${studentName} - ${dateStr}`;

        // Cài đặt Font chữ và màu sắc (Màu vàng cam nổi bật)
ctx.font = 'bold 20px Arial'; 
ctx.fillStyle = 'rgb(255, 36, 7);'; // Chữ màu vàng cam (Orange)
ctx.textAlign = 'right'; // Căn lề phải
ctx.textBaseline = 'bottom'; // Căn lề dưới

        // Đổ bóng đen để chữ nổi bật trên nền sáng
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Tọa độ in (Cách góc phải dưới 15px)
        const x = canvas.width - 15;
        const y = canvas.height - 15;

        ctx.fillText(watermarkText, x, y);

        // Trả lại mặc định
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
};
// ==========================================
// BƯỚC 2: XỬ LÝ LƯU CÀI ĐẶT WATERMARK GÓC ẢNH
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const watermarkCheckbox = document.getElementById('settingWatermark');
    
    if (watermarkCheckbox) {
        // 1. Tải trạng thái đã lưu khi mở web (mặc định là false)
        const isWatermarkEnabled = localStorage.getItem('drawWatermark') === 'true';
        watermarkCheckbox.checked = isWatermarkEnabled;

        // 2. Lưu lại cài đặt ngay khi bạn tích hoặc bỏ tích
        watermarkCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('drawWatermark', e.target.checked);
            console.log("Đã cập nhật trạng thái in watermark:", e.target.checked);
        });
    }
});
// ==========================================
// TÍNH NĂNG ZOOM, ĐỘ SÁNG & TỰ ĐỘNG ẨN HIỆN THEO TAB
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const oldStyle = document.getElementById('custom-camera-style');
    if (oldStyle) oldStyle.remove();

    const customStyle = document.createElement('style');
    customStyle.id = 'custom-camera-style';
    customStyle.innerHTML = `
        /* Phóng to khung màn hình camera to rõ */
        video, #outputCanvas {
            width: 100% !important;
            max-width: 820px !important;
            height: auto !important;
            max-height: 62vh !important;
            object-fit: cover;
            border-radius: 8px;
            margin: 0 auto;
            display: block;
        }

        /* Gom bảng điều khiển và các nút bấm lại gần nhau gọn gàng */
        .camera-controls-panel {
            margin: 8px auto !important;
            max-width: 480px !important;
        }

        /* Đảm bảo tab camera có không gian cuộn mượt mà */
        #tab-camera {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-bottom: 80px;
        }
    `;
    document.head.appendChild(customStyle);

    // Tự động ẩn bảng điều khiển zoom/độ sáng khi chuyển sang các tab khác (Thư viện, Cài đặt)
    const updatePanelVisibility = () => {
        const cameraPanel = document.querySelector('.camera-controls-panel');
        const cameraTab = document.getElementById('tab-camera');
        if (cameraPanel && cameraTab) {
            const isHidden = window.getComputedStyle(cameraTab).display === 'none' || cameraTab.classList.contains('d-none');
            cameraPanel.style.display = isHidden ? 'none' : 'flex';
        }
    };

    // Lắng nghe sự kiện click chuyển tab trên toàn trang
    document.addEventListener('click', () => {
        setTimeout(updatePanelVisibility, 100);
    });
    
    // Kiểm tra ngay khi tải trang xong
    setTimeout(updatePanelVisibility, 300);

    // Logic xử lý Zoom & Độ sáng
    setTimeout(() => {
        const zoomRange = document.getElementById('zoomRange');
        const brightnessRange = document.getElementById('brightnessRange');
        const resetBtn = document.getElementById('btnResetCamera');

        const getVideoElement = () => document.querySelector('video');

        const applyCameraTransform = (zoomVal, brightnessVal) => {
            const videoElement = getVideoElement();
            if (videoElement) {
                videoElement.style.transform = `scale(${zoomVal})`;
                videoElement.style.transformOrigin = 'center center';
                
                if (brightnessVal === 1) {
                    videoElement.style.filter = 'none'; 
                } else {
                    videoElement.style.filter = `brightness(${brightnessVal})`; 
                }
            }
        };

        if (zoomRange) {
            zoomRange.addEventListener('input', (e) => {
                const zoomVal = parseFloat(e.target.value);
                const brightVal = brightnessRange ? parseFloat(brightnessRange.value) : 1;
                applyCameraTransform(zoomVal, brightVal);
            });
        }

        if (brightnessRange) {
            brightnessRange.addEventListener('input', (e) => {
                const brightVal = parseFloat(e.target.value);
                const zoomVal = zoomRange ? parseFloat(zoomRange.value) : 1;
                applyCameraTransform(zoomVal, brightVal);
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (zoomRange) zoomRange.value = 1;
                if (brightnessRange) brightnessRange.value = 1;
                
                const videoElement = getVideoElement();
                if (videoElement) {
                    videoElement.style.transform = 'scale(1)';
                    videoElement.style.filter = 'none';
                }

                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast("Đã khôi phục webcam về mặc định!");
                }
            });
        }
    }, 1200);
});