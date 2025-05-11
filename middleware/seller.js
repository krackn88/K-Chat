const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Check if user is a seller
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    if (!user.isSeller && !user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied. Seller privileges required.' });
    }
    
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};