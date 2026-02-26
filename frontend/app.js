// Authentication Functions
function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
    
    // Clear any existing messages
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                password: password
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.access_token);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('registerName').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const location = document.getElementById('registerLocation').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                phone: phone,
                password: password,
                location_name: location || null
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showMessage('Registration successful! Please login.', 'success');
            setTimeout(() => {
                toggleForm('login');
            }, 1500);
        } else {
            const error = await response.json();
            showMessage(error.detail || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Registration error:', error);
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

// Helper Functions
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 3000);
        }
    } else {
        // Create a temporary message element if not exists
        const tempMessage = document.createElement('div');
        tempMessage.className = `message ${type}`;
        tempMessage.textContent = message;
        tempMessage.style.position = 'fixed';
        tempMessage.style.top = '20px';
        tempMessage.style.right = '20px';
        tempMessage.style.zIndex = '10000';
        tempMessage.style.padding = '15px 25px';
        tempMessage.style.borderRadius = '8px';
        tempMessage.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        
        if (type === 'success') {
            tempMessage.style.backgroundColor = '#d4edda';
            tempMessage.style.color = '#155724';
        } else {
            tempMessage.style.backgroundColor = '#f8d7da';
            tempMessage.style.color = '#721c24';
        }
        
        document.body.appendChild(tempMessage);
        
        setTimeout(() => {
            document.body.removeChild(tempMessage);
        }, 3000);
    }
}

// Format date to readable string
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get authorization headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// API Call Wrappers
async function apiGet(endpoint, useAuth = false) {
    const headers = useAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`API Error: ${response.status}`);
        }
    } catch (error) {
        console.error('API GET Error:', error);
        throw error;
    }
}

async function apiPost(endpoint, data, useAuth = false) {
    const headers = useAuth ? getAuthHeaders() : { 'Content-Type': 'application/json' };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }
    } catch (error) {
        console.error('API POST Error:', error);
        throw error;
    }
}

// Prevent back navigation to login page when logged in
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname;
    
    // If on index.html and logged in, redirect to dashboard
    if (currentPage.includes('index.html') && token) {
        window.location.href = 'dashboard.html';
    }
});
