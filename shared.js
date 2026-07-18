const ShopAida = (function() {
  const API_BASE = window.API_BASE || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin
  );

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (err) {
      return null;
    }
  }

  function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function formatCurrency(amount, currency = 'NGN') {
    if (amount == null || Number.isNaN(Number(amount))) return '-';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency
    }).format(Number(amount));
  }

  function signOut(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('afterLoginRedirect');
    window.location.href = 'login.html';
  }

  function updateAuthNav() {
    const user = getCurrentUser();
    const authLink = document.getElementById('auth-link');
    const authText = document.getElementById('auth-text');
    const profileLink = document.getElementById('profile-link');

    if (user) {
      if (authText) authText.textContent = 'Sign Out';
      if (authLink) {
        authLink.href = '#';
        authLink.addEventListener('click', signOut);
      }
      if (profileLink) {
        profileLink.style.display = 'inline-flex';
      }
    } else {
      if (authText) authText.textContent = 'Login';
      if (authLink) {
        authLink.href = 'login.html';
        authLink.onclick = null;
      }
      if (profileLink) {
        profileLink.style.display = 'none';
      }
    }

    updateAdminNav();
  }

  function updateAdminNav() {
    const user = getCurrentUser();
    const nav = document.querySelector('.navbar-links');
    if (!nav) return;

    let adminLink = document.getElementById('admin-link');
    if (user?.role === 'admin') {
      if (!adminLink) {
        adminLink = document.createElement('a');
        adminLink.id = 'admin-link';
        adminLink.innerHTML = '<i class="fas fa-tachometer-alt nav-icon" aria-hidden="true"></i>Admin';
        adminLink.style.display = 'inline-flex';
        const authLink = document.getElementById('auth-link');
        nav.insertBefore(adminLink, authLink || null);
      }
      adminLink.href = 'admin.html';
      adminLink.style.display = 'inline-flex';
    } else if (adminLink) {
      adminLink.style.display = 'none';
    }
  }

  function requireLogin(redirectPath = window.location.pathname) {
    if (!getCurrentUser()) {
      localStorage.setItem('afterLoginRedirect', redirectPath);
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', updateAuthNav);

  return {
    API_BASE,
    getCurrentUser,
    getAuthHeaders,
    formatCurrency,
    signOut,
    requireLogin
  };
})();
window.ShopAida = ShopAida;
