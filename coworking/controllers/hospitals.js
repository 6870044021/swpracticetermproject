const Hospital = require('../models/Hospital');
const Appointment = require('../models/Appointment');

// @desc   List hospitals, with exact and comparison filters, projection, sorting & paging
// @route  GET /api/v1/hospitals
// @access Public
exports.getHospitals = async (req, res, next) => {
  try {
    // Query options are not MongoDB document fields.
    const { select, sort, page, limit, ...filters } = req.query;
    const allowedFields = new Set([
      '_id', 'name', 'address', 'district', 'province',
      'postalcode', 'tel', 'region'
    ]);
    const allowedOperators = new Set(['gt', 'gte', 'lt', 'lte', 'in']);

    // Map explicitly allowed user-facing comparisons into MongoDB operators.
    // Express 5 requires the 'extended' query parser for province[gt]=ง.
    const mongoFilters = {};
    for (const [field, raw] of Object.entries(filters)) {
      if (!allowedFields.has(field)) {
        return res.status(400).json({ success: false, message: `Invalid filter: ${field}` });
      }
      if (typeof raw === 'string') {
        mongoFilters[field] = raw;
      } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const clauses = {};
        for (const [operator, value] of Object.entries(raw)) {
          if (!allowedOperators.has(operator) || typeof value !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid comparison filter' });
          }
          clauses[`$${operator}`] = operator === 'in' ? value.split(',') : value;
        }
        mongoFilters[field] = clauses;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid filter value' });
      }
    }

    const parsedPage = page === undefined ? 1 : Number(page);
    const parsedLimit = limit === undefined ? 25 : Number(limit);
    if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 ||
        !Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 10000) {
      return res.status(400).json({ success: false, message: 'Invalid page or limit' });
    }

    let query = Hospital.find(mongoFilters);
    if (select !== undefined) {
      if (typeof select !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid select' });
      }
      const fields = select.split(',').map(s => s.trim()).filter(Boolean);
      if (!fields.length || fields.some(f => !allowedFields.has(f.replace(/^-/, '')))) {
        return res.status(400).json({ success: false, message: 'Invalid selected field' });
      }
      query = query.select(fields.join(' '));
    }
    if (sort !== undefined) {
      if (typeof sort !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid sort' });
      }
      const fields = sort.split(',').map(s => s.trim()).filter(Boolean);
      if (!fields.length || fields.some(f => !allowedFields.has(f.replace(/^-/, '')))) {
        return res.status(400).json({ success: false, message: 'Invalid sort field' });
      }
      query = query.sort(fields.join(' '));
    } else {
      query = query.sort('-_id');
    }

    const startIndex = (parsedPage - 1) * parsedLimit;
    const total = await Hospital.countDocuments(mongoFilters);
    query = query.skip(startIndex).limit(parsedLimit).populate('appointments');
    const hospitals = await query;

    const pagination = {};
    if (startIndex + parsedLimit < total) {
      pagination.next = { page: parsedPage + 1, limit: parsedLimit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: parsedPage - 1, limit: parsedLimit };
    }
    return res.status(200).json({
      success: true,
      count: hospitals.length,
      pagination,
      data: hospitals
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: 'Invalid hospital query' });
  }
};

// @desc   Get one hospital, including its appointments through a virtual
// @route  GET /api/v1/hospitals/:id
// @access Public
exports.getHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id).populate('appointments');
    if (!hospital) {
      return res.status(400).json({ success: false, message: 'Hospital not found' });
    }
    return res.status(200).json({ success: true, data: hospital });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid hospital ID' });
  }
};

// @desc   Create hospital
// @route  POST /api/v1/hospitals
// @access Private/admin
exports.createHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.create(req.body);
    return res.status(201).json({ success: true, data: hospital });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Cannot create hospital' });
  }
};

// @desc   Update hospital
// @route  PUT /api/v1/hospitals/:id
// @access Private/admin
exports.updateHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!hospital) return res.status(404).json({ success: false });
    return res.status(200).json({ success: true, data: hospital });
  } catch (err) {
    return res.status(400).json({ success: false });
  }
};

// @desc   Delete hospital and cascade-delete its appointments
// @route  DELETE /api/v1/hospitals/:id
// @access Private/admin
exports.deleteHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `Hospital not found with id of ${req.params.id}`
      });
    }

    // Chapter09 Cascading Delete: appointments belong to a hospital,
    // so remove the dependent appointments before removing the hospital.
    await Appointment.deleteMany({ hospital: req.params.id });
    await Hospital.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot delete Hospital'
    });
  }
};
