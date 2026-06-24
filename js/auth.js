// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initAuth();
    }

    initAuth() {
        // Theo dõi trạng thái đăng nhập
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (!doc.exists) {
                    // Hiển thị form đặt nickname cho user mới
                    this.showNicknameSetup(user);
                } else {
                    const userData = doc.data();
                    // Kiểm tra nếu chưa có nickname thì yêu cầu đặt
                    if (!userData.nickname) {
                        this.showNicknameSetup(user);
                    } else {
                        // 🔧 GỌI showUserInfo VỚI userData
                        await this.showUserInfo(user, userData);
                        this.loadUserData(user);

                        // 🔥 THÊM: Lắng nghe thay đổi quyền admin real-time
                        this.listenAdminStatus(user.uid);
                    }
                }
            } else {
                this.showLoginSection();
                // Hủy lắng nghe khi logout
                if (this.adminUnsubscribe) {
                    this.adminUnsubscribe();
                    this.adminUnsubscribe = null;
                }
            }
        });

        // Các sự kiện click
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Modal
        const modal = document.getElementById('loginModal');
        const closeBtn = document.querySelector('.close');
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

        // Đăng nhập Google
        document.getElementById('googleLogin').addEventListener('click', () => this.loginWithGoogle());

        // Đăng nhập Email
        document.getElementById('emailLogin').addEventListener('click', () => {
            document.getElementById('emailLoginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        });

        document.getElementById('submitLogin').addEventListener('click', () => this.loginWithEmail());

        // Đăng ký
        document.getElementById('switchToRegister').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('emailLoginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        });

        document.getElementById('submitRegister').addEventListener('click', () => this.register());

        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('emailLoginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        });

        // Enter key support
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const registerName = document.getElementById('registerName');
        const registerEmail = document.getElementById('registerEmail');
        const registerPassword = document.getElementById('registerPassword');

        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginPassword.focus();
            }
        });
        
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.loginWithEmail();
            }
        });

        registerName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                registerEmail.focus();
            }
        });
        
        registerEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                registerPassword.focus();
            }
        });
        
        registerPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.register();
            }
        });
    }

    // ============================================
    // HIỂN THỊ FORM ĐẶT NICKNAME
    // ============================================
    showNicknameSetup(user) {
        // Tạo modal đặt nickname
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

        // Focus vào input
        setTimeout(() => {
            document.getElementById('nicknameInput').focus();
        }, 100);

        // Enter key để submit
        document.getElementById('nicknameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveNickname();
            }
        });
    }

    // ============================================
    // LƯU NICKNAME
    // ============================================
    async saveNickname() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        
        if (!nickname) {
            alert('⚠️ Vui lòng nhập tên hiển thị!');
            document.getElementById('nicknameInput').focus();
            return;
        }

        if (nickname.length < 2) {
            alert('⚠️ Tên hiển thị phải có ít nhất 2 ký tự!');
            document.getElementById('nicknameInput').focus();
            return;
        }

        if (nickname.length > 30) {
            alert('⚠️ Tên hiển thị không được quá 30 ký tự!');
            document.getElementById('nicknameInput').focus();
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                alert('❌ Vui lòng đăng nhập lại!');
                return;
            }

            // Kiểm tra nickname đã tồn tại chưa
            const existingUser = await db.collection('users')
                .where('nickname', '==', nickname)
                .get();

            if (!existingUser.empty) {
                // Kiểm tra xem nickname đó có phải của user hiện tại không
                let isOwnNickname = false;
                existingUser.forEach(doc => {
                    if (doc.id === user.uid) {
                        isOwnNickname = true;
                    }
                });

                if (!isOwnNickname) {
                    alert('⚠️ Tên hiển thị này đã được sử dụng! Vui lòng chọn tên khác.');
                    document.getElementById('nicknameInput').focus();
                    return;
                }
            }

            // Lưu nickname vào Firestore
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

            // Đóng modal
            const modal = document.getElementById('nicknameModal');
            if (modal) modal.remove();

            // Cập nhật UI
            this.showUserInfo(user, { nickname: nickname });
            this.loadUserData(user);

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

            this.showUserInfo(user, { nickname: defaultName });
            this.loadUserData(user);

            console.log('✅ Đã bỏ qua đặt nickname, dùng:', defaultName);

        } catch (error) {
            console.error('❌ Lỗi:', error);
        }
    }

    // ============================================
    // CẬP NHẬT NICKNAME (CHO NGƯỜI DÙNG ĐÃ CÓ)
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

            // Kiểm tra trùng tên
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

            // Cập nhật UI
            const userData = (await userRef.get()).data();
            this.showUserInfo(user, userData);
            window.currentUserName = nickname;

            alert('✅ Đã cập nhật tên hiển thị thành: ' + nickname);

        } catch (error) {
            console.error('❌ Lỗi cập nhật nickname:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    // ============================================
    // HIỂN THỊ THÔNG TIN USER
    // ============================================
    async showUserInfo(user, userData) {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        
        // Lấy nickname từ userData hoặc dùng displayName/email
        const displayName = userData?.nickname || userData?.name || user.displayName || user.email || 'User';
        
        userInfo.style.display = 'flex';
        loginSection.style.display = 'none';
        
        document.getElementById('displayName').textContent = displayName;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('welcomeMessage').style.display = 'block';
        
        // Thêm nút đổi tên
        this.addChangeNameButton();

        // 🔧 KIỂM TRA QUYỀN ADMIN TỪ FIRESTORE
        try {
            const userRef = db.collection('users').doc(user.uid);
            const doc = await userRef.get();
            if (doc.exists) {
                const data = doc.data();
                // Kiểm tra role hoặc isAdmin trong Firestore
                const isAdmin = data.role === 'admin' || data.isAdmin === true;
                
                if (isAdmin) {
                    console.log('👑 User có quyền admin, hiển thị nút Admin');
                    document.getElementById('adminLink').style.display = 'inline-block';
                } else {
                    console.log('👤 User không có quyền admin, ẩn nút Admin');
                    document.getElementById('adminLink').style.display = 'none';
                }
            } else {
                // Nếu chưa có document user, ẩn nút admin
                document.getElementById('adminLink').style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Lỗi kiểm tra quyền admin:', error);
            // Mặc định ẩn nút admin nếu có lỗi
            document.getElementById('adminLink').style.display = 'none';
        }
        
        this.enablePrediction(true);
    }

    // ============================================
    // THÊM NÚT ĐỔI TÊN
    // ============================================
    addChangeNameButton() {
        const userInfo = document.getElementById('userInfo');
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
            document.getElementById('newNicknameInput').focus();
        }, 100);

        document.getElementById('newNicknameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.confirmChangeName();
            }
        });
    }

    // ============================================
    // XÁC NHẬN ĐỔI TÊN
    // ============================================
    async confirmChangeName() {
        const newName = document.getElementById('newNicknameInput').value.trim();
        if (!newName) {
            alert('⚠️ Vui lòng nhập tên mới!');
            return;
        }
        await this.updateNickname(newName);
        const modal = document.getElementById('changeNameModal');
        if (modal) modal.remove();
    }

    // ============================================
    // CÁC HÀM KHÁC GIỮ NGUYÊN
    // ============================================
    resetForms() {
        document.getElementById('emailLoginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        
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

    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            alert('⚠️ Vui lòng nhập email và mật khẩu!');
            return;
        }

        try {
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
            } else if (error.code === 'auth/too-many-requests') {
                message += 'Quá nhiều lần thử sai. Vui lòng thử lại sau.';
            } else {
                message += error.message;
            }
            alert('❌ ' + message);
        }
    }

    async register() {
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        if (!name || !email || !password) {
            alert('⚠️ Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (password.length < 6) {
            alert('⚠️ Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        try {
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
        }
    }

    showLoginSection() {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        
        userInfo.style.display = 'none';
        loginSection.style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';
        
        // Ẩn nút admin khi chưa đăng nhập
        document.getElementById('adminLink').style.display = 'none';
        
        this.enablePrediction(false);
    }

    showLoginModal() {
        const modal = document.getElementById('loginModal');
        modal.style.display = 'block';
        this.resetForms();
        document.getElementById('emailLoginForm').style.display = 'block';
    }

    closeModal() {
        document.getElementById('loginModal').style.display = 'none';
        this.resetForms();
    }

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

    async logout() {
        try {
            await auth.signOut();
            window.currentUserId = null;
            window.currentUserName = null;
            console.log('✅ Đã đăng xuất');
        } catch (error) {
            console.error('❌ Lỗi đăng xuất:', error);
        }
    }

    // ============================================
    // KIỂM TRA QUYỀN ADMIN REAL-TIME
    // ============================================
    function listenAdminStatus(userId) {
        if (!userId) return;
        
        // Lắng nghe thay đổi của user document
        db.collection('users').doc(userId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    const isAdmin = data.role === 'admin' || data.isAdmin === true;
                    const adminLink = document.getElementById('adminLink');
                    
                    if (isAdmin) {
                        adminLink.style.display = 'inline-block';
                        console.log('👑 Quyền admin đã được cập nhật (real-time)');
                    } else {
                        adminLink.style.display = 'none';
                        console.log('👤 Quyền admin đã bị thu hồi (real-time)');
                    }
                }
            }, (error) => {
                console.error('❌ Lỗi lắng nghe quyền admin:', error);
            });
    }

    // Gọi trong onAuthStateChanged sau khi user đăng nhập
    // Thêm vào cuối hàm xử lý khi user đã đăng nhập:
    // this.listenAdminStatus(user.uid);
    }

// Khởi tạo Auth Manager
const authManager = new AuthManager();