import { Router, Request, Response } from 'express';
import { BannerService } from 'server/services/banner.service';
import { createMultiUploader } from 'server/utils/upload';

const router = Router();

/* ================= CREATE ================= */
router.post(
  '/',
  createMultiUploader('banner', [{ name: 'image', maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const files: any = req.files;

      if (!files?.image?.[0]) {
        return res.status(400).json({ success: false, message: 'Banner image is required' });
      }

      const imageUrl = `/api/uploads/banner/${files.image[0].filename}`;
      const banner = await BannerService.create({
        title: req.body.title,
        description: req.body.description || null,
        position: req.body.position !== undefined ? Number(req.body.position) : 1,
        isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
        packageId: req.body.packageId || null,
        imageUrl,
      });
      res.status(201).json({ success: true, message: 'Banner created successfully', data: banner });
    } catch (error: any) {
      console.error('Create Banner Error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create banner' });
    }
  },
);

/* ================= GET ALL ================= */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await BannerService.getAllB();

    return res.json({
      success: true,
      message: data.length ? 'Banner fetched successfully' : 'No banners found',
      data,
    });
  } catch (error) {
    console.error('Get All Banners Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
    });
  }
});

/* ================= GET SINGLE ================= */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await BannerService.getById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Banner not found' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get Banner Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banner' });
  }
});

/* ================= UPDATE ================= */
router.put(
  '/:id',
  createMultiUploader('banner', [{ name: 'image', maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const files: any = req.files;

      const updateData: any = {};

      // text fields
      if (req.body.title !== undefined) updateData.title = req.body.title;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.position !== undefined) updateData.position = Number(req.body.position);
      if (req.body.packageId !== undefined) updateData.packageId = req.body.packageId;

      // boolean (important)
      if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === 'true';
      }

      // image ONLY if uploaded
      if (files?.image?.[0]) {
        updateData.imageUrl = `/api/uploads/banner/${files.image[0].filename}`;
      }

      // 🚫 If nothing to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided for update',
        });
      }

      const data = await BannerService.update(req.params.id, updateData);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found',
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error('Update Banner Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update banner',
      });
    }
  },
);

/* ================= DELETE ================= */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const data = await BannerService.delete(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Banner not found' });

    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Delete Banner Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

export default router;
