import { Router } from "express";
import { authOrBloodBank } from "../middleware/auth.js";
import * as searchController from "../controller/search.controller.js";

const router = Router();

router.get(
  "/availability",
  authOrBloodBank,
  searchController.searchAvailability,
);

export default router;
