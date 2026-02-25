function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: messages.join('; ') } });
    }
    next();
  };
}

module.exports = { validate };
