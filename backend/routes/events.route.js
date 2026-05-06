import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { cacheResponse } from "../middleware/cache.js";
import * as eventControllers from "../controller/event.controller.js";
import * as eventValidation from "../validations/event.validation.js";

const router = Router();

router.route("/").get(cacheResponse(120), eventControllers.getAllEvents);

router
  .route("/")
  .post(
    auth,
    eventValidation.createEventValidation,
    eventControllers.createEvent,
  );

router.route("/:id/register").post(auth, eventControllers.registerEvent);

router.route("/:id").delete(auth, eventControllers.deleteEvent);

export default router;
