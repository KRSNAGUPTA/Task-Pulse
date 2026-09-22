import { Router } from "express";
import {
  addSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getAllTask,
  getTaskById,
  getTaskStats,
  updateSubtask,
  updateTask,
} from "../controllers/task.controller.js";

const router = Router();

router.post("/", createTask);
router.get("/", getAllTask);
router.get("/stats", getTaskStats); // must stay above "/:taskId"

router.get("/:taskId", getTaskById);
router.patch("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

router.post("/:taskId/subtasks", addSubtask);
router.patch("/:taskId/subtasks/:subtaskId", updateSubtask);
router.delete("/:taskId/subtasks/:subtaskId", deleteSubtask);

export default router;