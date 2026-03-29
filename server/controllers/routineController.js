const RoutineEvent = require('../models/RoutineEvent');

// GET /api/admin/routine – list all routine events for the authenticated admin
async function getRoutineEvents(req, res) {
  try {
    const events = await RoutineEvent.find({ adminId: req.admin.id }).sort({ day: 1, startH: 1 });
    res.json(events);
  } catch (err) {
    console.error('[Routine] Error fetching events:', err.message);
    res.status(500).json({ error: 'Failed to fetch routine events.' });
  }
}

// POST /api/admin/routine – create a new routine event
async function createRoutineEvent(req, res) {
  try {
    const { title, day, startH, endH, notes, bg, fg } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (day == null || day < 0 || day > 6) {
      return res.status(400).json({ error: 'Day must be 0-6.' });
    }
    if (startH == null || endH == null || endH <= startH) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }
    if (startH < 0 || endH > 24) {
      return res.status(400).json({ error: 'Times must be between 0 and 24.' });
    }

    const event = await RoutineEvent.create({
      title: title.trim(),
      day,
      startH,
      endH,
      notes: notes || '',
      bg: bg || '#4f98a3',
      fg: fg || '#fff',
      adminId: req.admin.id
    });

    res.status(201).json(event);
  } catch (err) {
    console.error('[Routine] Error creating event:', err.message);
    res.status(500).json({ error: 'Failed to create routine event.' });
  }
}

// PUT /api/admin/routine/:id – update a routine event
async function updateRoutineEvent(req, res) {
  try {
    const { title, day, startH, endH, notes, bg, fg } = req.body;

    const event = await RoutineEvent.findOne({ _id: req.params.id, adminId: req.admin.id });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (title !== undefined) event.title = title.trim();
    if (day !== undefined) event.day = day;
    if (startH !== undefined) event.startH = startH;
    if (endH !== undefined) event.endH = endH;
    if (notes !== undefined) event.notes = notes;
    if (bg !== undefined) event.bg = bg;
    if (fg !== undefined) event.fg = fg;

    if (event.endH <= event.startH) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    await event.save();
    res.json(event);
  } catch (err) {
    console.error('[Routine] Error updating event:', err.message);
    res.status(500).json({ error: 'Failed to update routine event.' });
  }
}

// DELETE /api/admin/routine/:id – delete a routine event
async function deleteRoutineEvent(req, res) {
  try {
    const result = await RoutineEvent.findOneAndDelete({ _id: req.params.id, adminId: req.admin.id });
    if (!result) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    console.error('[Routine] Error deleting event:', err.message);
    res.status(500).json({ error: 'Failed to delete routine event.' });
  }
}

module.exports = {
  getRoutineEvents,
  createRoutineEvent,
  updateRoutineEvent,
  deleteRoutineEvent
};
