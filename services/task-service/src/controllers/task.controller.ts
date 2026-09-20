    import type { Request, Response } from "express";
    import { Task } from "../models/task.model.js";
    import { CreateTaskSchema, UpdateTaskSchema } from "../schemas/task.schema.js";
    import z from "zod";
    import { redisUtil, RedisUtility } from "../utility/redisUtility.js";


    export const createTask = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = CreateTaskSchema.safeParse(req.body);

            if (!result.success) {
                res.status(422).json({
                    message: "Validation failed",
                    errors: z.flattenError(result.error),
                });
                return;
            }

            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({
                    message: "Unauthorized: User ID missing",
                });
                return;
            }

            const newTask = await Task.create({
                ...result.data,
                userId,
            });

            const key = `${userId}:${newTask._id}`;
            await redisUtil.set(key, JSON.stringify(newTask));
            await redisUtil.del(`${userId}:allTask`);
            res.status(201).json({
                message: "Task Created",
                data: newTask,
            });
        } catch (error: any) {
            console.error(`Error while creating task: ${error?.message || error}`);
            res.status(500).json({
                message: "Create Task: Internal Server Error",
            });
        }
    };

    export const updateTask = async (req: Request, res: Response): Promise<void> => {
        try {
            const { taskId } = req.params;
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({ message: "Unauthorized: User ID missing" });
                return;
            }

            const result = UpdateTaskSchema.safeParse(req.body);
            if (!result.success) {
                res.status(422).json({
                    message: "Validation failed",
                    errors: z.flattenError(result.error),
                });
                return;
            }

            const updatedTask = await Task.findOneAndUpdate(
                { _id: taskId as string, userId },
                { $set: result.data },
                { new: true, runValidators: true }
            );

            if (!updatedTask) {
                res.status(404).json({
                    message: "Task not found or unauthorized",
                });
                return;
            }
            const key = `${userId}:${updatedTask._id}`;
            await redisUtil.del(`${userId}:allTask`)
            await redisUtil.set(key, JSON.stringify(updatedTask));

            res.status(200).json({
                message: "Task updated",
                data: updatedTask,
            });
        } catch (error: any) {
            console.error(`Update Task Error: ${error?.message || error}`);
            res.status(500).json({
                message: "Internal Server Error",
            });
        }
    };

    // GET ALL TASKS
    export const getAllTask = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any)?.user?.userId;

            if (!userId) {
                res.status(401).json({ message: "Unauthorized: User ID missing" });
                return;
            }

            //redis check
            const redisKey = `${userId}:allTask`;

            const cacheTask = await redisUtil.get(redisKey);

            if (cacheTask) {
                res.status(200).json({
                    message: "All tasks fetched from cache",
                    data: JSON.parse(cacheTask),
                });
                return;
            }

            const allDBTask = await Task.find({ userId });

            await redisUtil.set(redisKey, JSON.stringify(allDBTask));

            res.status(200).json({
                message: "All tasks fetched from DB",
                data: allDBTask,
            });
        } catch (error: any) {
            console.error(`Get All Tasks Error: ${error?.message || error}`);
            res.status(500).json({
                message: "Internal Server Error",
            });
        }
    };

    export const getTaskById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { taskId } = req.params;
            const userId = (req as any)?.user?.userId;

            if (!userId) {
                res.status(401).json({ message: "Unauthorized: User ID missing" });
                return;
            }
            const key = `${userId}:${taskId}`;

            const cache = await redisUtil.get(key);
            if(cache){
                res.status(200).json({
                    message: "Fetched Task From Cache",
                    data: JSON.parse(cache)
                })
                return;
            }


            const task = await Task.findOne({ _id: taskId as string, userId });

            if (!task) {
                res.status(404).json({
                    message: "Task not found",
                });
                return;
            }

            await redisUtil.set(key, JSON.stringify(task));

            res.status(200).json({
                message: "Fetched the task",
                data: task,
            });
        } catch (error: any) {
            console.error(`Get Task By ID Error: ${error?.message || error}`);
            res.status(500).json({
                message: "Internal Server Error",
            });
        }
    };

    export const deleteTask = async (req: Request, res: Response): Promise<void> => {
        try {
            const { taskId } = req.params;
            const userId = (req as any)?.user?.userId;

            if (!userId) {
                res.status(401).json({ message: "Unauthorized: User ID missing" });
                return;
            }

            const deletedTask = await Task.findOneAndDelete({ _id: taskId as string, userId });


            if (!deletedTask) {
                res.status(404).json({ message: "Task not found or unauthorized" });
                return;
            }

            const key = `${userId}:${taskId}`;

            await redisUtil.del(key);
            await redisUtil.del(`${userId}:allTask`)

            res.status(200).json({
                message: "Task deleted successfully",
            });
        } catch (error: any) {
            console.error(`Delete Task Error: ${error?.message || error}`);
            res.status(500).json({ message: "Internal Server Error" });
        }
    };