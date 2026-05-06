export const maskData = (data, fieldsQuery) => {
  if (!fieldsQuery || !data) return data;

  const fields = fieldsQuery.split(",").map((f) => f.trim());

  // Internal helper to pick fields from a single object
  const pick = (obj) => {
    if (typeof obj !== "object" || obj === null) return obj;

    const result = {};
    let found = false;

    fields.forEach((field) => {
      // Support dot notation (e.g., "address.city")
      const parts = field.split(".");
      let source = obj;
      let target = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (source && Object.prototype.hasOwnProperty.call(source, part)) {
          if (i === parts.length - 1) {
            target[part] = source[part];
            found = true;
          } else {
            target[part] = target[part] || {};
            source = source[part];
            target = target[part];
          }
        }
      }
    });

    return found ? result : obj;
  };

  if (Array.isArray(data)) {
    return data.map(pick);
  }

  return pick(data);
};

export const partialResponse = (req, res, next) => {
  const fields = req.query.fields;

  if (!fields) return next();

  // Override the res.json method
  const originalJson = res.json;
  res.json = function (body) {
    if (body && body.success && body.data) {
      body.data = maskData(body.data, fields);

      // Add a meta flag to indicate the response was masked
      body.meta = {
        ...body.meta,
        isMasked: true,
        requestedFields: fields.split(","),
      };
    }
    return originalJson.call(this, body);
  };

  next();
};
