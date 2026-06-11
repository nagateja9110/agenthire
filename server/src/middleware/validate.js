const { fail } = require('../utils/response');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return fail(res, 400, 'Validation failed', details);
    }
    req[source === 'body' ? 'body' : 'validatedQuery'] = result.data;
    return next();
  };
}

module.exports = validate;
