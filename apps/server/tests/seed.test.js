const bcrypt = require('bcryptjs');

jest.mock('bcryptjs');
jest.mock('../models/User');
jest.mock('../models/ServiceCategory');
jest.mock('../models/ServiceType');

const User = require('../models/User');
const { seedAll, SEED_USERS } = require('../services/seedService');
const ServiceCategory = require('../models/ServiceCategory');

describe('seedAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed_password');
    ServiceCategory.findOne.mockResolvedValue({ _id: 'existing_cat' });
  });

  test('creates admin user on fresh database', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation((data) =>
      Promise.resolve({ ...data, _id: `user_${data.role}` })
    );

    const result = await seedAll();

    expect(result.users).toHaveLength(1);
    expect(result.users[0].role).toBe('admin');
    expect(User.create).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
  });

  test('skips users that already exist', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing', email: 'admin@atyors.com' });

    const result = await seedAll();

    expect(result.users).toHaveLength(0);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('admin credentials are as documented', () => {
    const admin = SEED_USERS.find(u => u.role === 'admin');

    expect(admin.email).toBe('admin@atyors.com');
    expect(admin.password).toBe('KzTwqIAqkqqKhKG52PDX!A1');
  });
});
