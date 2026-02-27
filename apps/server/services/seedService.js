const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Address = require('../models/Address');
const { seed: seedServices } = require('./serviceService');

const SALT_ROUNDS = 12;

const DEMO_USERS = [
  {
    email: 'demo@atyors.com',
    firstName: 'Demo',
    lastName: 'Customer',
    phone: '6175550100',
    role: 'customer',
    password: 'Demo1234!',
  },
  {
    email: 'servicer@atyors.com',
    firstName: 'Demo',
    lastName: 'Servicer',
    phone: '6175550200',
    role: 'servicer',
    password: 'Demo1234!',
  },
  {
    email: 'admin@atyors.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: '6175550300',
    role: 'admin',
    password: 'Admin1234!',
  },
];

const DEMO_ADDRESS = {
  street: '123 Demo Street',
  city: 'Boston',
  state: 'MA',
  zip: '02101',
  formatted: '123 Demo Street, Boston, MA 02101',
  location: { type: 'Point', coordinates: [-71.0589, 42.3601] },
  barrelCount: 2,
  barrelLocation: 'Left side of garage',
  barrelPlacementInstructions: 'End of driveway by the mailbox',
  barrelReturnInstructions: 'Back by the garage door',
  trashDay: 'Wednesday',
  isDefault: true,
};

async function seedAll() {
  const results = { services: null, users: [], address: null };

  results.services = await seedServices();

  for (const demo of DEMO_USERS) {
    const existing = await User.findOne({ email: demo.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(demo.password, SALT_ROUNDS);
    const user = await User.create({
      email: demo.email,
      firstName: demo.firstName,
      lastName: demo.lastName,
      phone: demo.phone,
      role: demo.role,
      passwordHash,
    });
    results.users.push({ email: user.email, role: user.role });

    if (demo.role === 'customer') {
      const addr = await Address.create({ ...DEMO_ADDRESS, userId: user._id });
      user.addresses = [addr._id];
      user.defaultAddressId = addr._id;
      await user.save();
      results.address = addr.street;
    }
  }

  return results;
}

module.exports = { seedAll, DEMO_USERS };
