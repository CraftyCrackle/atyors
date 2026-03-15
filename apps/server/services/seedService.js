const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { seed: seedServices } = require('./serviceService');

const SALT_ROUNDS = 12;

const SEED_USERS = [
  {
    email: 'admin@atyors.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: '6175550300',
    role: 'admin',
    password: 'KzTwqIAqkqqKhKG52PDX!A1',
  },
];

async function seedAll() {
  const results = { services: null, users: [] };

  results.services = await seedServices();

  for (const entry of SEED_USERS) {
    const existing = await User.findOne({ email: entry.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(entry.password, SALT_ROUNDS);
    const user = await User.create({
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      phone: entry.phone,
      role: entry.role,
      passwordHash,
    });
    results.users.push({ email: user.email, role: user.role });
  }

  return results;
}

module.exports = { seedAll, SEED_USERS };
