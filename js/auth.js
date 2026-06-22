// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.recaptchaVerifier = null;
        this.confirmationResult = null;
        this.phoneNumber = '';
        this.initAuth();
    }

    initAuth() {
        // Theo dõi trạng thái đăng nhập
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Kiểm tra xem user đã có trong Firestore chưa
                const userRef = db.collection('users').doc(user.uid);
                const doc = await userRef.get();
                if (!doc.exists) {
                    // Nếu chưa, tạo mới với điểm số 0
                    await userRef.set({
                        name: user.displayName || user.email || user.phoneNumber || 'Người dùng',
                        email: user.email || '',
                        phoneNumber: user.phoneNumber || '',
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
                    // Cập nhật lastLogin
                    await userRef.update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                // Cập nhật UI
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
            this.resetPhoneForm();
        };
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
                this.resetPhoneForm();
            }
        };

        // Đăng nhập Google
        document.getElementById('googleLogin').addEventListener('click', () => this.loginWithGoogle());

        // Đăng nhập Email
        document.getElementById('emailLogin').addEventListener('click', () => {
            document.getElementById('emailLoginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('phoneLoginForm').style.display = 'none';
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

        // ============ PHONE AUTHENTICATION ============
        document.getElementById('phoneLogin').addEventListener('click', () => {
            document.getElementById('emailLoginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('phoneLoginForm').style.display = 'block';
            this.setupRecaptcha();
        });

        document.getElementById('switchToEmailFromPhone').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('phoneLoginForm').style.display = 'none';
            document.getElementById('emailLoginForm').style.display = 'block';
            this.resetPhoneForm();
        });

        document.getElementById('sendOTP').addEventListener('click', () => this.sendOTP());
        document.getElementById('verifyOTP').addEventListener('click', () => this.verifyOTP());
        document.getElementById('resendOTP').addEventListener('click', () => this.sendOTP());
    }

    // ============ PHONE AUTH METHODS ============
    
    setupRecaptcha() {
        // Kiểm tra xem reCAPTCHA đã được khởi tạo chưa
        if (this.recaptchaVerifier) {
            // Nếu đã tồn tại, reset lại
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('reCAPTCHA cleared');
            }
        }

        // Kiểm tra container có tồn tại không
        const container = document.getElementById('recaptcha-container');
        if (!container) {
            console.error('❌ Không tìm thấy container reCAPTCHA!');
            return;
        }

        // Đảm bảo container trống
        container.innerHTML = '';

        try {
            // Khởi tạo reCAPTCHA verifier
            this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                'size': 'normal', // 'normal' để hiển thị rõ ràng, 'invisible' để ẩn
                'callback': (response) => {
                    // reCAPTCHA solved
                    console.log('✅ reCAPTCHA solved!');
                    document.getElementById('sendOTP').disabled = false;
                },
                'expired-callback': () => {
                    // reCAPTCHA expired
                    console.log('⏰ reCAPTCHA expired, please try again');
                    document.getElementById('sendOTP').disabled = true;
                    this.setupRecaptcha(); // Khởi tạo lại
                }
            });
            console.log('✅ reCAPTCHA initialized');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo reCAPTCHA:', error);
            alert('Lỗi khởi tạo reCAPTCHA. Vui lòng tải lại trang.');
        }
    }

    async sendOTP() {
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        
        // Validate số điện thoại
        if (!phoneNumber) {
            alert('Vui lòng nhập số điện thoại!');
            return;
        }

        if (!phoneNumber.startsWith('+')) {
            alert('Số điện thoại phải bao gồm mã quốc gia (ví dụ: +8490xxxxxxx)');
            return;
        }

        // Kiểm tra reCAPTCHA đã được khởi tạo
        if (!this.recaptchaVerifier) {
            alert('Đang khởi tạo reCAPTCHA, vui lòng thử lại sau 2 giây');
            this.setupRecaptcha();
            return;
        }

        try {
            // Disable button khi đang gửi
            document.getElementById('sendOTP').disabled = true;
            document.getElementById('sendOTP').textContent = '⏳ Đang gửi...';

            this.phoneNumber = phoneNumber;
            
            // Gửi OTP
            this.confirmationResult = await auth.signInWithPhoneNumber(
                phoneNumber,
                this.recaptchaVerifier
            );

            console.log('✅ OTP đã được gửi đến', phoneNumber);
            
            // Hiển thị phần nhập OTP
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('sendOTP').textContent = '📨 Đã gửi OTP';
            document.getElementById('sendOTP').disabled = true;
            
            alert(`✅ Đã gửi mã OTP đến ${phoneNumber}`);
            
        } catch (error) {
            console.error('❌ Lỗi gửi OTP:', error);
            
            // Xử lý lỗi cụ thể
            let errorMessage = 'Lỗi gửi OTP: ';
            if (error.code === 'auth/invalid-phone-number') {
                errorMessage += 'Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (+8490xxxxxxx)';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage += 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage += 'Lỗi mạng. Vui lòng kiểm tra kết nối internet.';
            } else {
                errorMessage += error.message;
            }
            
            alert('❌ ' + errorMessage);
            
            // Reset reCAPTCHA
            this.setupRecaptcha();
            
            // Reset button
            document.getElementById('sendOTP').disabled = false;
            document.getElementById('sendOTP').textContent = '📨 Gửi mã OTP';
        }
    }

    async verifyOTP() {
        const otpCode = document.getElementById('otpCode').value.trim();
        
        if (!otpCode || otpCode.length < 6) {
            alert('Vui lòng nhập mã OTP 6 số!');
            return;
        }

        try {
            document.getElementById('verifyOTP').disabled = true;
            document.getElementById('verifyOTP').textContent = '⏳ Đang xác nhận...';

            // Xác nhận OTP
            const result = await this.confirmationResult.confirm(otpCode);
            
            console.log('✅ Đăng nhập thành công:', result.user);
            
            // Đóng modal
            this.closeModal();
            this.resetPhoneForm();
            
            // User sẽ được xử lý trong onAuthStateChanged
            
        } catch (error) {
            console.error('❌ Lỗi xác nhận OTP:', error);
            
            let errorMessage = 'Lỗi xác nhận OTP: ';
            if (error.code === 'auth/invalid-verification-code') {
                errorMessage += 'Mã OTP không hợp lệ. Vui lòng kiểm tra lại.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage += 'Quá nhiều lần thử sai. Vui lòng thử lại sau.';
            } else {
                errorMessage += error.message;
            }
            
            alert('❌ ' + errorMessage);
            
            document.getElementById('verifyOTP').disabled = false;
            document.getElementById('verifyOTP').textContent = '✅ Xác nhận';
        }
    }

    resetPhoneForm() {
        document.getElementById('phoneNumber').value = '';
        document.getElementById('otpCode').value = '';
        document.getElementById('otpSection').style.display = 'none';
        document.getElementById('sendOTP').disabled = false;
        document.getElementById('sendOTP').textContent = '📨 Gửi mã OTP';
        document.getElementById('verifyOTP').disabled = false;
        document.getElementById('verifyOTP').textContent = '✅ Xác nhận';
        
        // Reset reCAPTCHA
        if (this.recaptchaVerifier) {
            try {
                this.recaptchaVerifier.clear();
            } catch (e) {
                console.log('reCAPTCHA cleared');
            }
            this.recaptchaVerifier = null;
        }
        const container = document.getElementById('recaptcha-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    // ============ EXISTING METHODS ============

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng nhập Google:', error);
            alert('Đăng nhập thất bại: ' + error.message);
        }
    }

    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            alert('Vui lòng nhập email và mật khẩu!');
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng nhập:', error);
            alert('Đăng nhập thất bại: ' + error.message);
        }
    }

    async register() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        if (!name || !email || !password) {
            alert('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        if (password.length < 6) {
            alert('Mật khẩu phải có ít nhất 6 ký tự!');
            return;
        }

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({
                displayName: name
            });
            this.closeModal();
        } catch (error) {
            console.error('❌ Lỗi đăng ký:', error);
            alert('Đăng ký thất bại: ' + error.message);
        }
    }

    showUserInfo(user) {
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('loginSection').style.display = 'none';
        const displayName = user.displayName || user.email || user.phoneNumber || 'User';
        document.getElementById('displayName').textContent = displayName;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('welcomeMessage').style.display = 'block';
        
        // Hiển thị link admin nếu là admin
        const adminEmails = ['admin@gmail.com'];
        if (adminEmails.includes(user.email)) {
            document.getElementById('adminLink').style.display = 'inline-block';
        }
        
        // Enable predictions
        this.enablePrediction(true);
    }

    showLoginSection() {
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('welcomeMessage').style.display = 'none';
        document.getElementById('adminLink').style.display = 'none';
        this.enablePrediction(false);
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
        document.getElementById('emailLoginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('phoneLoginForm').style.display = 'none';
        this.resetPhoneForm();
    }

    closeModal() {
        document.getElementById('loginModal').style.display = 'none';
        this.resetPhoneForm();
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
            this.resetPhoneForm();
        } catch (error) {
            console.error('❌ Lỗi đăng xuất:', error);
        }
    }
}

// Khởi tạo Auth Manager
const authManager = new AuthManager();