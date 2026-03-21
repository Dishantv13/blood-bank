import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import {
    getAllEvents,
    createEvent,
    registerEvent,
    deleteEvent
} from '../controller/event.controller.js';

const router = Router();

// @route   GET /api/events
// @desc    Get all upcoming events (public and donors-only)
// @access  Public
router.route('/').get(cacheResponse(120), getAllEvents);

// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.route('/').post(auth, createEvent);

// @route   POST /api/events/:id/register
// @desc    Register for an event
// @access  Private
router.route('/:id/register').post(auth, registerEvent);

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private
router.route('/:id').delete(auth, deleteEvent);

export default router;
