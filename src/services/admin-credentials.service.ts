import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database';
import { hashPassword, verifyPassword } from '@/lib/password';

const ADMIN_CREDENTIAL_ID = 'primary';
const DEFAULT_EMAIL = process.env.DEFAULT_ADMIN_EMAIL ?? 'nick@investmentsolutions.cz';
const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? '123456';

async function createDefaultCredential() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  return prisma.adminCredential.create({
    data: {
      id: ADMIN_CREDENTIAL_ID,
      email: DEFAULT_EMAIL,
      passwordHash,
    },
  });
}

export async function ensureAdminCredentialExists() {
  const existing = await prisma.adminCredential.findUnique({
    where: { id: ADMIN_CREDENTIAL_ID },
  });

  if (existing) {
    return existing;
  }

  return createDefaultCredential();
}

export async function getAdminCredential() {
  return ensureAdminCredentialExists();
}

export async function updateAdminCredential(email: string, password?: string) {
  await ensureAdminCredentialExists();

  const data: Prisma.AdminCredentialUpdateInput = {
    email,
  };

  if (password && password.trim().length > 0) {
    data.passwordHash = await hashPassword(password);
  }

  return prisma.adminCredential.update({
    where: { id: ADMIN_CREDENTIAL_ID },
    data,
  });
}

export async function validateAdminLogin(email: string, password: string) {
  const credential = await ensureAdminCredentialExists();

  if (!credential) {
    return false;
  }

  if (credential.email.toLowerCase() !== email.toLowerCase()) {
    return false;
  }

  return verifyPassword(password, credential.passwordHash);
}
