const serviceService = require('../services/serviceService');

async function getCategories(req, res, next) {
  try {
    const categories = await serviceService.getCategories();
    res.json({ success: true, data: { categories } });
  } catch (err) { next(err); }
}

async function getTypes(req, res, next) {
  try {
    const result = await serviceService.getTypesByCategory(req.params.categorySlug);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function seed(req, res, next) {
  try {
    const result = await serviceService.seed();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { getCategories, getTypes, seed };
