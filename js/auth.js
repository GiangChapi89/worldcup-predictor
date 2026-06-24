// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.adminUnsubscribe = null;
        this.initAuth();
    }

    initAuth() {
        // Kiểm tra các element
        const elements = {
            loginBtn: document.getElementById('loginBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            googleLogin: document.getElementById('googleLogin'),
            emailLogin: document.getElementById('emailLogin'),
            submitLogin: document.getElementById('submitLogin'),
            submitRegister: document.getElementById('submitRegister'),
            switchToRegister: document.getElementById('switchToRegister'),
            switchToLogin: document.getElementById('switchToLogin'),
            forgotPassword: document.getElementById('forgotPassword')
        };

        // Kiểm tra element
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.warn(`⚠️ Element #${key} not found`);
            }
        }

        // Theo dõi trạng thái đăng nhập
        auth.onAuthStateChanged(async (user) => {
            console.log('🔔 Auth state changed:', user?.email || 'No user');
            
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (!doc.exists) {
                    this.showNicknameSetup(user);
                } else {
                    const userData = doc.data();
                    if (!userData.nickname) {
                        this.showNicknameSetup(user);
                    } else {
                        await this.showUserInfo(user, userData);
                        this.loadUserData(user);
                        this.listenAdminStatus(user.uid);
                    }
                }
            } else {
                this.showLoginSection();
                if (this.adminUnsubscribe) {
                    this.adminUnsubscribe();
                    this.adminUnsubscribe = null;
                }
            }
        });

        // ============================================
        // CÁC SỰ KIỆN CLICK
        // ============================================
        
        // Nút Đăng Nhập
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Nút Đăng Xuất
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Modal - Đóng khi click X
        const modal = document.getElementById('loginModal');
        const closeBtn = document.querySelector('.close');
        if (modal && closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
                this.resetForms();
            };
            window.onclick = (event) => {
                if (event.target == modal) {
                    modal.style.display = 'none';
                    this.resetForms();
                }
            };
        }

        // Đăng nhập Google
        const googleLoginBtn = document.getElementById('googleLogin');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.loginWithGoogle());
        }

        // Đăng nhập Email - Mở form email
        const emailLoginBtn = document.getElementById('emailLogin');
        if (emailLoginBtn) {
            emailLoginBtn.addEventListener('click', () => {
                document.getElementById('emailLoginForm').style.display = 'block';
                document.getElementById('registerForm').style.display = 'none';
            });
        }

        // Submit Login
        const submitLoginBtn = document.getElementById('submitLogin');
        if (submitLoginBtn) {
            submitLoginBtn.addEventListener('click', () => this.loginWithEmail());
        }

        // Submit Register
        const submitRegisterBtn = document.getElementById('submitRegister');
        if (submitRegisterBtn) {
            submitRegisterBtn.addEventListener('click', () => this.register());
        }

        // Switch to Register
        const switchToRegister = document.getElementById('switchToRegister');
        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('emailLoginForm').style.display = 'none';
                document.getElementById('registerForm').style.display = 'block';
            });
        }

        // Switch to Login
        const switchToLogin = document.getElementById('switchToLogin');
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('emailLoginForm').style.display = 'block';
                document.getElementById('registerForm').style.display = 'none';
            });
        }

        // Quên mật khẩu
        const forgotPasswordLink = document.getElementById('forgotPassword');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetPassword();
            });
        }

        // Enter key support
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const registerName = document.getElementById('registerName');
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');

        if (loginEmail) {
            loginEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (loginPassword) loginPassword.focus();
                }
            });
        }
        
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.loginWithEmail();
                }
            });
        }

        if (registerName) {
            registerName.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (registerEmail) registerEmail.focus();
                }
            });
        }
        
        if (registerEmail) {
            registerEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (registerPassword) registerPassword.focus();
                }
            });
        }
        
        if (registerPassword) {
            registerPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.register();
                }
            });
        }

        console.log('✅ Auth events initialized');
    }

    // ============================================
    // LẮNG NGHE THAY ĐỔI QUYỀN ADMIN REAL-TIME
    // ============================================
    listenAdminStatus(userId) {
        if (this.adminUnsubscribe) {
            this.adminUnsubscribe();
            this.adminUnsubscribe = null;
        }

        if (!userId) return;
        
        this.adminUnsubscribe = db.collection('users').doc(userId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    const isAdmin = data.role === 'admin' || data.isAdmin === true;
                    const adminLink = document.getElementById('adminLink');
                    
                    if (isAdmin) {
                        if (adminLink) adminLink.style.display = 'inline-block';
                        console.log('👑 Quyền admin đã được cập nhật (real-time)');
                    } else {
                        if (adminLink) adminLink.style.display = 'none';
                        console.log('👤 Quyền admin đã bị thu hồi (real-time)');
                    }
                }
            }, (error) => {
                console.error('❌ Lỗi lắng nghe quyền admin:', error);
            });
    }

    // ============================================
    // HIỂN THỊ THÔNG TIN USER
    // ============================================
    async showUserInfo(user, userData) {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        
        const displayName = userData?.nickname || userData?.name || user.displayName || user.email || 'User';
        
        if (userInfo) userInfo.style.display = 'flex';
        if (loginSection) loginSection.style.display = 'none';
        
        const displayNameEl = document.getElementById('displayName');
        const userNameEl = document.getElementById('userName');
        if (displayNameEl) displayNameEl.textContent = displayName;
        if (userNameEl) userNameEl.textContent = displayName;
        
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) welcomeMsg.style.display = 'block';
        
        this.addChangeNameButton();

        try {
            if (userData) {
                const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
                const adminLink = document.getElementById('adminLink');
                if (adminLink) {
                    adminLink.style.display = isAdmin ? 'inline-block' : 'none';
                    console.log(isAdmin ? '👑 User có quyền admin (từ userData)' : '👤 User không có quyền admin (từ userData)');
                }
            } else {
                const userRef = db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    const isAdmin = data.role === 'admin' || data.isAdmin === true;
                    const adminLink = document.getElementById('adminLink');
                    if (adminLink) {
                        adminLink.style.display = isAdmin ? 'inline-block' : 'none';
                        console.log(isAdmin ? '👑 User có quyền admin (từ Firestore)' : '👤 User không có quyền admin (từ Firestore)');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Lỗi kiểm tra quyền admin:', error);
            const adminLink = document.getElementById('adminLink');
            if (adminLink) adminLink.style.display = 'none';
        }
        
        this.enablePrediction(true);
    }

    // ============================================
    // HIỂN THỊ FORM ĐẶT NICKNAME
    // ============================================
    showNicknameSetup(user) {
        const modalHtml = `
            <div id="nicknameModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 400px;">
                    <h2 style="text-align:center;margin-bottom:20px;">👤 Đặt Tên Hiển Thị</h2>
                    <p style="text-align:center;color:#666;margin-bottom:20px;">
                        Vui lòng đặt tên hiển thị để tham gia dự đoán
                    </p>
                    <div class="form-group">
                        <label>Tên hiển thị</label>
                        <input type="text" id="nicknameInput" placeholder="Nhập tên của bạn..." 
                               style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                        <small style="color:#888;font-size:12px;margin-top:5px;display:block;">
                            Tên sẽ hiển thị trên bảng xếp hạng
                        </small>
                    </div>
                    <button onclick="authManager.saveNickname()" 
                            style="width:100%;padding:14px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:10px;">
                        ✅ Xác nhận
                    </button>
                    <button onclick="authManager.skipNickname()" 
                            style="width:100%;padding:10px;margin-top:10px;background:#f0f0f0;color:#666;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
                        ⏭️ Bỏ qua (sẽ dùng email)
                    </button>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        setTimeout(() => {
            const input = document.getElementById('nicknameInput');
            if (input) input.focus();
        }, 100);

        const nicknameInput = document.getElementById('nicknameInput');
        if (nicknameInput) {
            nicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveNickname();
                }
            });
        }
    }

    // ============================================
    // LƯU NICKNAME
    // ============================================
    async saveNickname() {
        const nicknameInput = document.getElementById('nicknameInput');
        if (!nicknameInput) {
            alert('❌ Lỗi: Không tìm thấy input!');
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        
        if (!nickname) {
            alert('⚠️ Vui lòng nhập tên hiển thị!');
            nicknameInput.focus();
            return;
        }

        if (nickname.length < 2) {
            alert('⚠️ Tên hiển thị phải có ít nhất 2 ký tự!');
            nicknameInput.focus();
            return;
        }

        if (nickname.length > 30) {
            alert('⚠️ Tên hiển thị không được quá 30 ký tự!');
            nicknameInput.focus();
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                alert('❌ Vui lòng đăng nhập lại!');
                return;
            }

            const existingUser = await db.collection('users')
                .where('nickname', '==', nickname)
                .get();

            if (!existingUser.empty) {
                let isOwnNickname = false;
                existingUser.forEach(doc => {
                    if (doc.id === user.uid) {
                        isOwnNickname = true;
                    }
                });

                if (!isOwnNickname) {
                    alert('⚠️ Tên hiển thị này đã được sử dụng! Vui lòng chọn tên khác.');
                    nicknameInput.focus();
                    return;
                }
            }

            const userRef = db.collection('users').doc(user.uid);
            await userRef.set({
                nickname: nickname,
                name: nickname,
                email: user.email || '',
                role: 'user',
                isActive: true,
                totalPoints: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                balance: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const modal = document.getElementById('nicknameModal');
            if (modal) modal.remove();

            const userData = (await userRef.get()).data();
            
            await this.showUserInfo(user, userData);
            this.loadUserData(user);
            this.listenAdminStatus(user.uid);

            console.log('✅ Đã lưu nickname:', nickname);

        } catch (error) {
            console.error('❌ Lỗi lưu nickname:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    // ============================================
    // BỎ QUA ĐẶT NICKNAME
    // ============================================
    async skipNickname() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const defaultName = user.displayName || user.email || 'Người dùng';
            
            const userRef = db.collection('users').doc(user.uid);
            await userRef.set({
                nickname: defaultName,
                name: defaultName,
                email: user.email || '',
                role: 'user',
                isActive: true,
                totalPoints: 0,
                correctPredictions: 0,
                totalPredictions: 0,
                balance: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            const modal = document.getElementById('nicknameModal');
            if (modal) modal.remove();

            const userData = (await userRef.get()).data();
            
            await this.showUserInfo(user, userData);
            this.loadUserData(user);
            this.listenAdminStatus(user.uid);

            console.log('✅ Đã bỏ qua đặt nickname, dùng:', defaultName);

        } catch (error) {
            console.error('❌ Lỗi:', error);
        }
    }

    // ============================================
    // CẬP NHẬT NICKNAME
    // ============================================
    async updateNickname(newNickname) {
        const user = auth.currentUser;
        if (!user) {
            alert('❌ Vui lòng đăng nhập!');
            return;
        }

        if (!newNickname || newNickname.trim().length < 2) {
            alert('⚠️ Tên hiển thị phải có ít nhất 2 ký tự!');
            return;
        }

        try {
            const nickname = newNickname.trim();

            const existingUser = await db.collection('users')
                .where('nickname', '==', nickname)
                .get();

            if (!existingUser.empty) {
                let isOwn = false;
                existingUser.forEach(doc => {
                    if (doc.id === user.uid) isOwn = true;
                });
                if (!isOwn) {
                    alert('⚠️ Tên hiển thị này đã được sử dụng!');
                    return;
                }
            }

            const userRef = db.collection('users').doc(user.uid);
            await userRef.update({
                nickname: nickname,
                name: nickname,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const userData = (await userRef.get()).data();
            await this.showUserInfo(user, userData);
            window.currentUserName = nickname;

            alert('✅ Đã cập nhật tên hiển thị thành: ' + nickname);

        } catch (error) {
            console.error('❌ Lỗi cập nhật nickname:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    // ============================================
    // THÊM NÚT ĐỔI TÊN
    // ============================================
    addChangeNameButton() {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;
        
        let changeBtn = document.getElementById('changeNameBtn');
        
        if (!changeBtn) {
            changeBtn = document.createElement('button');
            changeBtn.id = 'changeNameBtn';
            changeBtn.className = 'btn-change-name';
            changeBtn.innerHTML = '✏️ Đổi tên';
            changeBtn.onclick = () => this.showChangeNameModal();
            userInfo.appendChild(changeBtn);
        }
    }

    // ============================================
    // HIỂN THỊ MODAL ĐỔI TÊN
    // ============================================
    showChangeNameModal() {
        const modalHtml = `
            <div id="changeNameModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 400px;">
                    <span class="close" onclick="document.getElementById('changeNameModal').remove()">&times;</span>
                    <h2 style="text-align:center;margin-bottom:20px;">✏️ Đổi Tên Hiển Thị</h2>
                    <div class="form-group">
                        <label>Tên hiển thị mới</label>
                        <input type="text" id="newNicknameInput" placeholder="Nhập tên mới..." 
                               style="width:100%;padding:12px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                        <small style="color:#888;font-size:12px;margin-top:5px;display:block;">
                            Tên sẽ hiển thị trên bảng xếp hạng
                        </small>
                    </div>
                    <button onclick="authManager.confirmChangeName()" 
                            style="width:100%;padding:14px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:10px;">
                        ✅ Cập nhật
                    </button>
                    <button onclick="document.getElementById('changeNameModal').remove()" 
                            style="width:100%;padding:10px;margin-top:10px;background:#f0f0f0;color:#666;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
                        ❌ Hủy
                    </button>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        setTimeout(() => {
            const input = document.getElementById('newNicknameInput');
            if (input) input.focus();
        }, 100);

        const newNicknameInput = document.getElementById('newNicknameInput');
        if (newNicknameInput) {
            newNicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.confirmChangeName();
                }
            });
        }
    }

    // ============================================
    // XÁC NHẬN ĐỔI TÊN
    // ============================================
    async confirmChangeName() {
        const input = document.getElementById('newNicknameInput');
        if (!input) return;
        
        const newName = input.value.trim();
        if (!newName) {
            alert('⚠️ Vui lòng nhập tên mới!');
            return;
        }
        await this.updateNickname(newName);
        const modal = document.getElementById('changeNameModal');
        if (modal) modal.remove();
    }

    // ============================================
    // RESET MẬT KHẨU
    // ============================================
    async resetPassword() {
        const emailInput = document.getElementById('loginEmail');
        if (!emailInput) {
            alert('⚠️ Vui lòng nhập email!');
            return;
        }
        
        const email = emailInput.value.trim();
        if (!email) {
            alert('⚠️ Vui lòng nhập email để reset mật khẩu!');
            return;
        }
        
        if (!confirm(`Bạn có chắc muốn gửi email reset mật khẩu đến ${email}?`)) {
            return;
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            alert(`✅ Đã gửi email reset mật khẩu đến ${email}.\nVui lòng kiểm tra hộp thư (cả spam).`);
        } catch (error) {
            console.error('❌ Lỗi reset mật khẩu:', error);
            let message = 'Lỗi reset mật khẩu: ';
            if (error.code === 'auth/user-not-found') {
                message += 'Email chưa được đăng ký.';
            } else if (error.code === 'auth/network-request-failed') {
                message += 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
            } else {
                message += error.message;
            }
            alert('❌ ' + message);
        }
    }

    // ============================================
    // HIỂN THỊ LOGIN SECTION
    // ============================================
    showLoginSection() {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        
        if (userInfo) userInfo.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
        
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) welcomeMsg.style.display = 'none';
        
        const adminLink = document.getElementById('adminLink');
        if (adminLink) adminLink.style.display = 'none';
        
        const historyLink = document.getElementById('historyLink');
        if (historyLink) historyLink.style.display = 'none';
        
        this.enablePrediction(false);
    }

    // ============================================
    // RESET FORMS
    // ============================================
    resetForms() {
        const emailForm = document.getElementById('emailLoginForm');
        const registerForm = document.getElementById('registerForm');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const registerName = document.getElementById('registerName');
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');
        
        if (emailForm) emailForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (registerName) registerName.value = '';
        if (registerEmail) registerEmail.value = '';
        if (registerPassword) registerPassword.value = '';
        
        const passwordInputs = document.querySelectorAll('.password-wrapper input[type="password"]');
        passwordInputs.forEach(input => {
            const wrapper = input.closest('.password-wrapper');
            if (wrapper) {
                const toggleBtn = wrapper.querySelector('.toggle-password');
                if (toggleBtn) {
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-eye-slash');
                        icon.classList.add('fa-eye');
                    }
                }
            }
        });
    }

    // ============================================
    // ĐĂNG NHẬP GOOGLE
    // ============================================
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            console.log('✅ Đăng nhập Google thành công:', result.user.email);
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng nhập Google:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                return;
            }
            alert('❌ Đăng nhập thất bại: ' + error.message);
        }
    }

    // ============================================
    // ĐĂNG NHẬP EMAIL
    // ============================================
    async loginWithEmail() {
        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        
        if (!emailInput || !passwordInput) {
            alert('⚠️ Lỗi: Không tìm thấy form đăng nhập!');
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            alert('⚠️ Vui lòng nhập email và mật khẩu!');
            return;
        }

        if (password.length < 6) {
            alert('⚠️ Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        try {
            const submitBtn = document.getElementById('submitLogin');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Đang đăng nhập...';
            }
            
            await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Đăng nhập Email thành công:', email);
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng nhập:', error);
            let message = 'Đăng nhập thất bại: ';
            if (error.code === 'auth/user-not-found') {
                message += 'Email chưa được đăng ký. Vui lòng đăng ký tài khoản.';
            } else if (error.code === 'auth/wrong-password') {
                message += 'Mật khẩu không đúng. Vui lòng thử lại.';
            } else if (error.code === 'auth/invalid-credential') {
                message += 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
            } else if (error.code === 'auth/too-many-requests') {
                message += 'Quá nhiều lần thử sai. Vui lòng thử lại sau.';
            } else if (error.code === 'auth/network-request-failed') {
                message += 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
            } else {
                message += error.message;
            }
            alert('❌ ' + message);
        } finally {
            const submitBtn = document.getElementById('submitLogin');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Đăng Nhập';
            }
        }
    }

    // ============================================
    // ĐĂNG KÝ
    // ============================================
    async register() {
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        
        if (!nameInput || !emailInput || !passwordInput) {
            alert('⚠️ Lỗi: Không tìm thấy form đăng ký!');
            return;
        }
        
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!name || !email || !password) {
            alert('⚠️ Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (password.length < 6) {
            alert('⚠️ Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        try {
            const submitBtn = document.getElementById('submitRegister');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Đang đăng ký...';
            }
            
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({
                displayName: name
            });
            console.log('✅ Đăng ký thành công:', email);
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng ký:', error);
            let message = 'Đăng ký thất bại: ';
            if (error.code === 'auth/email-already-in-use') {
                message += 'Email đã được sử dụng. Vui lòng đăng nhập.';
            } else if (error.code === 'auth/invalid-email') {
                message += 'Email không hợp lệ.';
            } else if (error.code === 'auth/weak-password') {
                message += 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
            } else {
                message += error.message;
            }
            alert('❌ ' + message);
        } finally {
            const submitBtn = document.getElementById('submitRegister');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Đăng Ký';
            }
        }
    }

    // ============================================
    // HIỂN THỊ MODAL ĐĂNG NHẬP
    // ============================================
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            this.resetForms();
            const emailForm = document.getElementById('emailLoginForm');
            if (emailForm) emailForm.style.display = 'block';
        }
    }

    // ============================================
    // ĐÓNG MODAL
    // ============================================
    closeModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetForms();
        }
    }

    // ============================================
    // ENABLE PREDICTION
    // ============================================
    enablePrediction(enable) {
        const predictButtons = document.querySelectorAll('.predict-btn');
        predictButtons.forEach(btn => {
            btn.disabled = !enable;
            if (!enable) {
                btn.title = 'Vui lòng đăng nhập để dự đoán';
                btn.textContent = '🔒 Đăng nhập để dự đoán';
            } else {
                btn.textContent = '📝 Dự Đoán';
            }
        });
    }

    // ============================================
    // LOAD USER DATA
    // ============================================
    async loadUserData(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                window.currentUserId = user.uid;
                window.currentUserName = data.nickname || data.name || user.displayName || user.email || 'User';
            }
        } catch (error) {
            console.error('❌ Lỗi tải dữ liệu user:', error);
        }
    }

    // ============================================
    // ĐĂNG XUẤT
    // ============================================
    async logout() {
        try {
            if (this.adminUnsubscribe) {
                this.adminUnsubscribe();
                this.adminUnsubscribe = null;
            }
            
            await auth.signOut();
            window.currentUserId = null;
            window.currentUserName = null;
            console.log('✅ Đã đăng xuất');
        } catch (error) {
            console.error('❌ Lỗi đăng xuất:', error);
        }
    }
}

// ============================================
// KHỞI TẠO AUTH MANAGER
// ============================================
let authManager;

document.addEventListener('DOMContentLoaded', function() {
    try {
        authManager = new AuthManager();
        window.authManager = authManager;
        console.log('✅ AuthManager initialized (DOM ready)');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo AuthManager:', error);
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    try {
        authManager = new AuthManager();
        window.authManager = authManager;
        console.log('✅ AuthManager initialized (immediate)');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo AuthManager:', error);
    }
}

console.log('📄 auth.js loaded');