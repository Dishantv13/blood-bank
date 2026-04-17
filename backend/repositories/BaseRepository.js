export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, options = {}) {
    const { sort, skip, limit, populate, select, lean = true } = options;
    let query = this.model.find(filter);

    if (select) query = query.select(select);
    if (sort) query = query.sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);
    if (populate) query = query.populate(populate);
    
    return lean ? query.lean() : query;
  }

  async findOne(filter = {}, options = {}) {
    const { populate, select, lean = true } = options;
    let query = this.model.findOne(filter);
    
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    
    return lean ? query.lean() : query;
  }

  async findById(id, options = {}) {
    const { populate, select, lean = true } = options;
    let query = this.model.findById(id);
    
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    
    return lean ? query.lean() : query;
  }

  async create(data) {
    return this.model.create(data);
  }

  async updateOne(filter, data, options = { new: true, lean: true }) {
    let query = this.model.findOneAndUpdate(filter, data, options);
    if (options.lean) query = query.lean();
    return query;
  }

  async deleteOne(filter) {
    return this.model.findOneAndDelete(filter);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async exists(filter = {}) {
    return this.model.exists(filter);
  }

  async getCursor(filter = {}, options = {}) {
    return this.model.find(filter).select(options.select).cursor();
  }
}
