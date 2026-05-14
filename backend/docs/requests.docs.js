/**
 * @swagger
 * tags:
 *   name: Blood Requests
 *   description: Handling of emergency and routine blood requests
 */

/**
 * @swagger
 * /requests:
 *   post:
 *     summary: Create a new blood request
 *     tags: [Blood Requests]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientName
 *               - bloodGroup
 *               - units
 *               - hospital
 *               - requiredBy
 *             properties:
 *               patientName: { type: string }
 *               bloodGroup: { type: string }
 *               units: { type: number }
 *               urgency: { type: string, enum: [normal, urgent, critical] }
 *               hospital: { type: object }
 *               requiredBy: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Request created successfully
 */

/**
 * @swagger
 * /requests/my-requests:
 *   get:
 *     summary: Get requests created by the current user
 *     tags: [Blood Requests]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user requests
 */

/**
 * @swagger
 * /requests/{id}/status:
 *   patch:
 *     summary: Update request status (Fullfillment)
 *     tags: [Blood Requests]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [open, fulfilled, cancelled, expired] }
 *     responses:
 *       200:
 *         description: Status updated
 */
