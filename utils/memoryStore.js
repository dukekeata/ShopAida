// utils/memoryStore.js - In-memory storage for development without MongoDB
const bcrypt = require('bcryptjs');

class MemoryStore {
  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.loginAttempts = new Map();
    this.enabled = process.env.ALLOW_NO_DB === 'true' && process.env.NODE_ENV === 'development';
  }

  isEnabled() {
    return this.enabled;
  }

  // User operations
  async createUser(userData) {
    const userId = Date.now().toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const user = {
      _id: userId,
      id: userId,
      email: userData.email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      oauthProvider: 'local',
      role: userData.role || 'user',
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(user.email, user);
    return user;
  }

  async findUserByEmail(email) {
    return this.users.get(email.toLowerCase().trim()) || null;
  }

  async findUserById(id) {
    for (const user of this.users.values()) {
      if (user._id === id || user.id === id) {
        return user;
      }
    }
    return null;
  }

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Order operations
  async createOrder(orderData) {
    const orderId = Date.now().toString();
    const order = {
      _id: orderId,
      id: orderId,
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.orders.set(orderId, order);
    return order;
  }

  async findOrdersByUserId(userId, limit = 10, skip = 0) {
    const userOrders = Array.from(this.orders.values())
      .filter(order => order.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);
    
    return userOrders;
  }

  async countOrdersByUserId(userId) {
    return Array.from(this.orders.values())
      .filter(order => order.userId === userId).length;
  }

  async findOrderById(orderId) {
    return this.orders.get(orderId) || null;
  }

  async createLoginAttempt(attemptData) {
    const attemptId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const attempt = {
      _id: attemptId,
      id: attemptId,
      email: (attemptData.email || '').toLowerCase().trim(),
      userId: attemptData.userId || null,
      success: Boolean(attemptData.success),
      ip: attemptData.ip || '',
      userAgent: attemptData.userAgent || '',
      timestamp: attemptData.timestamp || new Date()
    };
    this.loginAttempts.set(attemptId, attempt);
    return attempt;
  }

  async findLoginAttempts({ limit = 10, skip = 0, filter = () => true } = {}) {
    return Array.from(this.loginAttempts.values())
      .filter(filter)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + limit);
  }

  async countLoginAttempts(filter = () => true) {
    return Array.from(this.loginAttempts.values()).filter(filter).length;
  }

  // Utility
  getUserData(user) {
    if (!user) return null;
    const { password, ...userData } = user;
    void password;
    return userData;
  }
}

// Singleton instance
const memoryStore = new MemoryStore();

module.exports = memoryStore;
