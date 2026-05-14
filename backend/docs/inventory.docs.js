/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Tracking of blood units across all banks
 */

/**
 * @swagger
 * /blood-unit/stats:
 *   get:
 *     summary: Get overall system-wide blood availability
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: Aggregated inventory stats
 */

/**
 * @swagger
 * /blood-unit/nearby:
 *   get:
 *     summary: Find nearby blood units (Geospatial)
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: bloodGroup
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: latitude
 *         schema: { type: number }
 *       - in: query
 *         name: longitude
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: List of nearby blood banks with stock
 */
