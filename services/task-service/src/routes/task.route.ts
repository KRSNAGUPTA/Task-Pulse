import { Router } from "express";
import { 
  createTask, 
  deleteTask, 
  getAllTask, 
  getTaskById, 
  updateTask 
} from "../controllers/task.controller.js";

const router = Router();

router.post("/", createTask);
router.get("/", getAllTask);
router.get("/:taskId", getTaskById);
router.patch("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

export default router;