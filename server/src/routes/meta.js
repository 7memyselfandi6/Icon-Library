import express from "express";
import Icon from "../models/Icon.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/categories", async (_req, res, next) => {
  try {
    const icons = await Icon.find({}, { mainCategory: 1, subCategory: 1, _id: 0 });
    const map = new Map();
    icons.forEach((icon) => {
      const main = icon.mainCategory;
      const sub = icon.subCategory;
      if (!map.has(main)) {
        map.set(main, new Set());
      }
      map.get(main).add(sub);
    });
    const categories = Array.from(map.entries()).map(([main, subs]) => ({
      main,
      subs: Array.from(subs)
    }));
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get("/tags", async (_req, res, next) => {
  try {
    const tags = await Icon.distinct("tags");
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", requireAuth, async (_req, res, next) => {
  try {
    const totalIcons = await Icon.countDocuments();
    const categories = await Icon.find({}, { mainCategory: 1, subCategory: 1, _id: 0 });
    const categorySet = new Set(
      categories.map((item) => `${item.mainCategory}::${item.subCategory}`)
    );
    const mainCategorySet = new Set(categories.map((item) => item.mainCategory));
    const tags = await Icon.distinct("tags");
    res.json({
      totalIcons,
      totalCategories: categorySet.size,
      totalMainCategories: mainCategorySet.size,
      totalTags: tags.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
