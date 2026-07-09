import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import r2 from '../config/r2.js';
import prisma from '../config/db.js';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// The browser uploads the image directly to R2 using this presigned URL —
// the file never touches our server at all, so it costs us zero bandwidth
// and doesn't block the Node process on a big upload.
export async function getSnapshotUploadUrl(req, res) {
  const { challengeAccountId } = req.params;
  const { contentType } = req.body;

  const account = await prisma.challengeAccount.findFirst({ where: { id: challengeAccountId, userId: req.userId } });
  if (!account) return res.status(404).json({ error: 'Challenge account not found' });

  if (!ALLOWED_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'Only PNG, JPEG, or WEBP images are allowed' });
  }

  const key = `chart-snapshots/${req.userId}/${randomUUID()}.${contentType.split('/')[1]}`;

  const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min to complete the upload
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  res.json({ uploadUrl, publicUrl });
}