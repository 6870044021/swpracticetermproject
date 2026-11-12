const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');

// @desc   Get appointments
// @route  GET /api/v1/appointments
// @route  GET /api/v1/hospitals/:hospitalId/appointments
// @access Private
exports.getAppointments = async (req, res, next) => {
  try {
    const filter = {};

    // General users can see only their own appointments.
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    }

    // When mounted below /hospitals/:hospitalId/appointments,
    // narrow the result to that hospital as well.
    if (req.params.hospitalId) {
      filter.hospital = req.params.hospitalId;
    }

    const appointments = await Appointment.find(filter).populate({
      path: 'hospital',
      select: 'name province tel'
    });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot find appointments'
    });
  }
};

// @desc   Get single appointment
// @route  GET /api/v1/appointments/:id
// @access Private
exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({
      path: 'hospital',
      select: 'name province tel'
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    // Keep the resource private to its owner, except for admins.
    if (
      req.user.role !== 'admin' &&
      appointment.user.toString() !== req.user.id
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to access this appointment`
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot find Appointment'
    });
  }
};

// @desc   Add appointment
// @route  POST /api/v1/hospitals/:hospitalId/appointments
// @access Private
exports.addAppointment = async (req, res, next) => {
  try {
    // The hospital is determined by the nested route and the user by JWT.
    req.body.hospital = req.params.hospitalId;
    req.body.user = req.user.id;

    const hospital = await Hospital.findById(req.params.hospitalId);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: `No hospital with the id of ${req.params.hospitalId}`
      });
    }

    // Appointment ownership rule from Chapter09:
    // a normal user may have at most 3 appointments; admins are not limited.
    const existedAppointments = await Appointment.find({ user: req.user.id });
    if (existedAppointments.length >= 3 && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: `The user with ID ${req.user.id} has already made 3 appointments`
      });
    }

    const appointment = await Appointment.create(req.body);

    return res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot create Appointment'
    });
  }
};

// @desc   Update appointment
// @route  PUT /api/v1/appointments/:id
// @access Private
exports.updateAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    // Only the appointment owner or an admin may update it.
    if (
      appointment.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this appointment`
      });
    }

    // Do not allow ownership to be transferred through the request body.
    const changes = {};
    if (req.body.apptDate !== undefined) changes.apptDate = req.body.apptDate;
    if (req.body.hospital !== undefined) {
      const hospital = await Hospital.findById(req.body.hospital);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: `No hospital with the id of ${req.body.hospital}`
        });
      }
      changes.hospital = hospital._id;
    }

    appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      changes,
      {
        new: true,
        runValidators: true
      }
    );

    return res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot update Appointment'
    });
  }
};

// @desc   Delete appointment
// @route  DELETE /api/v1/appointments/:id
// @access Private
exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: `No appointment with the id of ${req.params.id}`
      });
    }

    // Only the appointment owner or an admin may delete it.
    if (
      appointment.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this appointment`
      });
    }

    await appointment.deleteOne();

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Cannot delete Appointment'
    });
  }
};
