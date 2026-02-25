const router = require('express').Router();
const addressController = require('../controllers/addressController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, addressController.create);
router.get('/', authenticate, addressController.list);
router.delete('/:id', authenticate, addressController.remove);
router.get('/check-zone', addressController.checkZone);

module.exports = router;
