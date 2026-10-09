import { prisma } from '../lib/prisma.js';

const listSelect = {
  id: true,
  title: true,
  fileName: true,
  fileType: true,
  sizeBytes: true,
  status: true,
  error: true,
  chunkCount: true,
  createdAt: true,
  updatedAt: true,
};

export const documentRepository = {
  create: (data) => prisma.document.create({ data, select: listSelect }),

  list: () => prisma.document.findMany({ orderBy: { createdAt: 'desc' }, select: listSelect }),

  findById: (id) => prisma.document.findUnique({ where: { id }, select: { ...listSelect, content: true } }),

  exists: async (id) => (await prisma.document.count({ where: { id } })) > 0,

  update: (id, data) => prisma.document.update({ where: { id }, data, select: listSelect }),

  remove: (id) => prisma.document.delete({ where: { id } }),

  count: () => prisma.document.count(),
};
