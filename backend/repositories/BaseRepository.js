export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, options = {}) {
    const {
      sort,
      skip,
      limit,
      populate,
      select,
      lean = true,
      session,
    } = options;
    let query = this.model.find(filter);

    if (select) query = query.select(select);
    if (sort) query = query.sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);
    if (populate) query = query.populate(populate);
    if (session) query = query.session(session);

    return lean ? query.lean() : query;
  }

  async findOne(filter = {}, options = {}) {
    const { populate, select, lean = true, session } = options;
    let query = this.model.findOne(filter);

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (session) query = query.session(session);

    return lean ? query.lean() : query;
  }

  async findById(id, options = {}) {
    const { populate, select, lean = true, session } = options;
    let query = this.model.findById(id);

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (session) query = query.session(session);

    return lean ? query.lean() : query;
  }

  async create(data, options = {}) {
    const { session } = options;
    if (session) {
      const doc = new this.model(data);
      return doc.save({ session });
    }
    return this.model.create(data);
  }

  async insertMany(docs, options = {}) {
    const { session } = options;
    return this.model.insertMany(docs, { session });
  }

  async updateOne(filter, data, options = { new: true, lean: true }) {
    const { session, lean = true } = options;
    let query = this.model.findOneAndUpdate(filter, data, options);

    if (session) query = query.session(session);
    if (lean) query = query.lean();

    return query;
  }

  async deleteOne(filter, options = {}) {
    const { session } = options;
    let query = this.model.findOneAndDelete(filter);
    if (session) query = query.session(session);
    return query;
  }

  async count(filter = {}, options = {}) {
    const { session } = options;
    let query = this.model.countDocuments(filter);
    if (session) query = query.session(session);
    return query;
  }

  async exists(filter = {}, options = {}) {
    const { session } = options;
    let query = this.model.exists(filter);
    if (session) query = query.session(session);
    return query;
  }

  async getCursor(filter = {}, options = {}) {
    return this.model.find(filter).select(options.select).cursor();
  }

  async aggregate(pipeline = [], options = {}) {
    const { session } = options;
    let aggregation = this.model.aggregate(pipeline);
    if (session) aggregation = aggregation.session(session);
    return aggregation;
  }

  async findPaginated(filter = {}, options = {}) {
    const { 
      sort = { createdAt: -1 }, 
      skip = 0, 
      limit = 10, 
      session,
      select,
      populate,
      lean = true 
    } = options;
    
    const [data, total] = await Promise.all([
      this.find(filter, { sort, skip, limit, session, select, populate, lean }),
      this.count(filter, { session })
    ]);

    return {
      data,
      total
    };
  }
}
