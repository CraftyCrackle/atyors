const serviceService = require('../services/serviceService');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceType = require('../models/ServiceType');

jest.mock('../models/ServiceCategory');
jest.mock('../models/ServiceType');

describe('Service seed', () => {
  afterEach(() => jest.clearAllMocks());

  test('creates category and types when none exist', async () => {
    ServiceCategory.findOne.mockResolvedValue(null);
    const mockCategory = { _id: 'cat123' };
    ServiceCategory.create.mockResolvedValue(mockCategory);
    ServiceType.insertMany.mockResolvedValue([]);

    const result = await serviceService.seed();

    expect(result.seeded).toBe(true);
    expect(ServiceCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'trash-recycling' })
    );
    expect(ServiceType.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ slug: 'put-out' }),
        expect.objectContaining({ slug: 'bring-in' }),
        expect.objectContaining({ slug: 'both' }),
      ])
    );
  });

  test('skips seed when data already exists', async () => {
    ServiceCategory.findOne.mockResolvedValue({ _id: 'existing' });

    const result = await serviceService.seed();

    expect(result.seeded).toBe(false);
    expect(ServiceCategory.create).not.toHaveBeenCalled();
    expect(ServiceType.insertMany).not.toHaveBeenCalled();
  });
});
