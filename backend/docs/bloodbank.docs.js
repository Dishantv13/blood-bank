/**
 * @swagger
 * tags:
 *   name: Blood Banks
 *   description: Public blood bank discovery and details
 */

/**
 * @swagger
 * /blood-banks:
 *   get:
 *     summary: List all verified blood banks
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: bloodGroup
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of blood banks
 */

/**
 * @swagger
 * /blood-banks/{id}:
 *   get:
 *     summary: Get blood bank details by ID
 *     tags: [Blood Banks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blood bank details
 *       404:
 *         description: Blood bank not found
 */

/**
 * @swagger
 * /blood-banks/login:
 *   post:
 *     summary: Blood Bank Portal Login
 *     tags: [Blood Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
