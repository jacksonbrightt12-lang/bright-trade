"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const courses = await prisma_1.prisma.educationCourse.findMany({ orderBy: { createdAt: "asc" } });
    res.json({
        courses: courses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            level: c.level,
            duration: c.duration,
            lessons: c.lessons,
            progress: c.progress,
            category: c.category,
            resourceType: c.resourceType,
            resourceUrl: c.resourceUrl,
            featured: c.featured,
            author: c.author,
            tags: c.tags,
        })),
    });
});
router.post("/", auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    try {
        const { title, description, level = "Beginner", duration = "15 min", lessons = 1, category, resourceType, resourceUrl, featured = false, author, tags = [], } = req.body;
        if (!title || !description || !resourceUrl || !category || !resourceType || !author) {
            res.status(400).json({ error: "title, description, category, resourceType, author and resourceUrl are required" });
            return;
        }
        const course = await prisma_1.prisma.educationCourse.create({
            data: {
                title,
                description,
                level,
                duration,
                lessons,
                category,
                resourceType,
                resourceUrl,
                featured,
                author,
                tags,
            },
        });
        res.status(201).json({
            course: {
                id: course.id,
                title: course.title,
                description: course.description,
                level: course.level,
                duration: course.duration,
                lessons: course.lessons,
                progress: course.progress,
                category: course.category,
                resourceType: course.resourceType,
                resourceUrl: course.resourceUrl,
                featured: course.featured,
                author: course.author,
                tags: course.tags,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Unable to create education resource" });
    }
});
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, async (req, res) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    try {
        await prisma_1.prisma.educationCourse.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Unable to delete education resource' });
    }
});
exports.default = router;
