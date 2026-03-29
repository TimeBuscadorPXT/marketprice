import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../lib/errors';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/auth';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;

function excludePassword(user: { id: string; name: string; email: string; password: string; region: string; createdAt: Date; updatedAt: Date }) {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function register(input: RegisterInput) {
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        region: input.region,
      },
    });

    const payload = { userId: user.id, email: user.email };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return { user: excludePassword(user), token, refreshToken };
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
      throw new UnauthorizedError('Credenciais invalidas');
    }
    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new UnauthorizedError('Credenciais invalidas');
  }

  const validPassword = await bcrypt.compare(input.password, user.password);

  if (!validPassword) {
    throw new UnauthorizedError('Credenciais invalidas');
  }

  const payload = { userId: user.id, email: user.email };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { user: excludePassword(user), token, refreshToken };
}

export async function refreshAccessToken(refreshTokenStr: string) {
  const payload = verifyRefreshToken(refreshTokenStr);

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new UnauthorizedError('Usuario nao encontrado');
  }

  const newPayload = { userId: user.id, email: user.email };
  const token = generateToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  return { token, refreshToken: newRefreshToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      region: true,
      createdAt: true,
      _count: { select: { listings: true, suppliers: true } },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Usuario nao encontrado');
  }

  return user;
}
