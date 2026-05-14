/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: System-wide management and reports
 */

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: System-wide analytics for Admin
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Manage all users
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of users
 */

/**
 * @swagger
 * /admin/blood-banks/{bankId}/status:
 *   patch:
 *     summary: Verify or Suspend a Blood Bank
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: bankId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalStatus: { type: string, enum: [approved, rejected, pending] }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Status updated successfully
 */

/**
 * @swagger
 * /admin/export/all:
 *   get:
 *     summary: Enterprise-wide Data Export (Excel)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: XLSX File stream
 */
