// Replacing req.body with the parsed result (not just validating in place)
// matters: Zod strips any keys not declared in the schema, so a client can't
// smuggle extra fields into a create/update call that the controller wasn't
// expecting — a cheap defense against mass-assignment-style bugs.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid request', details: result.error.flatten() });
  }
  req.body = result.data;
  next();
};
