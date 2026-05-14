/**
 * @swagger
 * tags:
 *   name: Blood Bank Portal
 *   description: Private operations for registered blood banks
 */

/**
 * @swagger
 * /bloodbank/dashboard:
 *   get:
 *     summary: Get blood bank dashboard overview
 *     tags: [Blood Bank Portal]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */

/**
 * @swagger
 * /bloodbank/inventory:
 *   get:
 *     summary: Get current blood inventory
 *     tags: [Blood Bank Portal]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Inventory list
 * 
 *   put:
 *     summary: Bulk update inventory
 *     tags: [Blood Bank Portal]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 bloodGroup: { type: string }
 *                 units: { type: number }
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */

/**
 * @swagger
 * /bloodbank/requests:
 *   get:
 *     summary: Get all blood requests for this bank
 *     tags: [Blood Bank Portal]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of requests
 */

/**
 * @swagger
 * /bloodbank/export/all:
 *   get:
 *     summary: Export all data to Excel (Background Streamed)
 *     tags: [Blood Bank Portal]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Excel file download
 */
