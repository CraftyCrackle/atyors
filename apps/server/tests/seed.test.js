const bcrypt = require('bcryptjs');

jest.mock('bcryptjs');
jest.mock('../models/User');
jest.mock('../models/Address');
jest.mock('../models/ServiceCategory');
jest.mock('../models/ServiceType');

const User = require('../models/User');
const Address = require('../models/Address');
const { seedAll, DEMO_USERS } = require('../services/seedService');
const ServiceCategory = require('../models/ServiceCategory');

describe('seedAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('hashed_password');
    ServiceCategory.findOne.mockResolvedValue({ _id: 'existing_cat' });
  });

  test('creates all demo users on fresh database', async () => {
    User.findOne.mockResolvedValue(null);
    const mockSave = jest.fn();
    User.create.mockImplementation((data) =>
      Promise.resolve({ ...data, _id: `user_${data.role}`, addresses: [], save: mockSave })
    );
    Address.create.mockResolvedValue({ _id: 'addr_1', street: '123 Demo Street' });

    const result = await seedAll();

    expect(result.users).toHaveLength(3);
    expect(result.users.map(u => u.role)).toEqual(
      expect.arrayContaining(['customer', 'servicer', 'admin'])
    );
    expect(User.create).toHaveBeenCalledTimes(3);
    expect(Address.create).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledTimes(3);
  });

  test('skips users that already exist', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing', email: 'demo@atyors.com' });

    const result = await seedAll();

    expect(result.users).toHaveLength(0);
    expect(User.create).not.toHaveBeenCalled();
    expect(Address.create).not.toHaveBeenCalled();
  });

  test('only creates address for customer role', async () => {
    let callCount = 0;
    User.findOne.mockImplementation(() => {
      const demo = DEMO_USERS[callCount];
      callCount++;
      return Promise.resolve(demo.role === 'customer' ? null : { _id: 'existing' });
    });
    const mockSave = jest.fn();
    User.create.mockResolvedValue({
      _id: 'new_customer', role: 'customer', addresses: [], save: mockSave,
    });
    Address.create.mockResolvedValue({ _id: 'addr_1', street: '123 Demo Street' });

    const result = await seedAll();

    expect(result.users).toHaveLength(1);
    expect(result.users[0].role).toBe('customer');
    expect(Address.create).toHaveBeenCalledTimes(1);
    expect(Address.create).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'Boston', state: 'MA' })
    );
  });

  test('demo credentials are as documented', () => {
    const customer = DEMO_USERS.find(u => u.role === 'customer');
    const servicer = DEMO_USERS.find(u => u.role === 'servicer');
    const admin = DEMO_USERS.find(u => u.role === 'admin');

    expect(customer.email).toBe('demo@atyors.com');
    expect(customer.password).toBe('Demo1234!');
    expect(servicer.email).toBe('servicer@atyors.com');
    expect(servicer.password).toBe('Demo1234!');
    expect(admin.email).toBe('admin@atyors.com');
    expect(admin.password).toBe('Admin1234!');
  });
});
