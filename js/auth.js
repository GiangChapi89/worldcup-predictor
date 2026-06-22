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
                    await userRef.set({
                        name: user.displayName || user.email || 'Người dùng',
                        email: user.email || '',
                        role: 'user',
                        isActive: true,
                        totalPoints: 0,
                        correctPredictions: 0,
                        totalPredictions: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log('✅ Đã tạo user mới:', user.uid);
                } else {
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                this.showUserInfo(user);
                this.loadUserData(user);
            } else {
                this.showLoginSection();
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

        // Enter key support - CẬP NHẬT với toggle password
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

    resetForms() {
        document.getElementById('emailLoginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        
        // Reset password visibility
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

    showUserInfo(user) {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        const displayName = user.displayName || user.email || 'User';
        
        userInfo.style.display = 'flex';
        loginSection.style.display = 'none';
        
        document.getElementById('displayName').textContent = displayName;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('welcomeMessage').style.display = 'block';
        
        const adminEmails = ['admin@gmail.com', 'your-email@gmail.com', 'songdaytronglong@gmail.com'];
        if (adminEmails.includes(user.email)) {
            document.getElementById('adminLink').style.display = 'inline-block';
        }
        
        this.enablePrediction(true);
    }

    showLoginSection() {
        const userInfo = document.getElementById('userInfo');
        const loginSection = document.getElementById('loginSection');
        
        userInfo.style.display = 'none';
        loginSection.style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';
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
                window.currentUserName = data.name || user.displayName || user.email || 'User';
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
}

// Khởi tạo Auth Manager
const authManager = new AuthManager();