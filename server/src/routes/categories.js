import express from "express";
import Category from "../models/Category.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all categories
router.get("/", async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const categories = await Category.find().sort({ main: 1, sub: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// Create a new category
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { main, sub } = req.body;
    const category = await Category.create({ main, sub });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update a category
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { main, sub } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { main, sub },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Delete a category
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
