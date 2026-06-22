// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initAuth();
    }

    initAuth() {
        // Theo dõi trạng thái đăng nhập
        auth.onAuthStateChanged(user => {
            if (user) {
                this.currentUser = user;
                this.showUserInfo(user);
                this.loadUserData(user);
            } else {
                this.currentUser = null;
                this.showLoginSection();
            }
        });

        // Các sự kiện click
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Modal
        const modal = document.getElementById('loginModal');
        const closeBtn = document.querySelector('.close');
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = 'none';
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

        // Chuyển về login
        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('emailLoginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        });
    }

    showUserInfo(user) {
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('displayName').textContent = user.displayName || user.email;
        document.getElementById('userName').textContent = user.displayName || user.email;
        document.getElementById('welcomeMessage').style.display = 'block';
        document.querySelector('.info-message').textContent = 'Hãy dự đoán tỷ số nào!';
        
        // Enable các chức năng dự đoán
        this.enablePrediction(true);
    }

    showLoginSection() {
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';
        document.querySelector('.info-message').textContent = 'Vui lòng đăng nhập để dự đoán!';
        this.enablePrediction(false);
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
        document.getElementById('emailLoginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            await this.saveUserToFirestore(result.user);
            this.closeModal();
        } catch (error) {
            console.error('Lỗi đăng nhập Google:', error);
            alert('Đăng nhập thất bại: ' + error.message);
        }
    }

    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            await this.saveUserToFirestore(result.user);
            this.closeModal();
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            alert('Đăng nhập thất bại: ' + error.message);
        }
    }

    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            // Cập nhật profile
            await result.user.updateProfile({
                displayName: name
            });
            await this.saveUserToFirestore(result.user);
            this.closeModal();
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            alert('Đăng ký thất bại: ' + error.message);
        }
    }

    async saveUserToFirestore(user) {
        try {
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: user.displayName || user.email,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Lỗi lưu user:', error);
        }
    }

    async loadUserData(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                // Cập nhật thông tin user
                window.currentUserId = user.uid;
                window.currentUserName = data.name || user.displayName;
            }
        } catch (error) {
            console.error('Lỗi tải dữ liệu user:', error);
        }
    }

    async logout() {
        try {
            await auth.signOut();
            window.currentUserId = null;
            window.currentUserName = null;
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        }
    }

    enablePrediction(enable) {
        const predictButtons = document.querySelectorAll('.predict-btn');
        predictButtons.forEach(btn => {
            btn.disabled = !enable;
            if (!enable) {
                btn.title = 'Vui lòng đăng nhập để dự đoán';
            }
        });
    }

    closeModal() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('emailLoginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
    }
}

// Khởi tạo Auth Manager
const authManager = new AuthManager();