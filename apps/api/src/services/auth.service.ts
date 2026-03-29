import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../lib/errors';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../middlewares/auth';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 12;

function excludeSensitive(user: { id: string; name: string; email: string; password: string | null; googleId: string | null; avatar: string | null; region: string; createdAt: Date; updatedAt: Date }) {
  const { password: _, googleId: __, ...safe } = user;
  return safe;
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

    return { user: excludeSensitive(user), token, refreshToken };
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

  if (!user.password) {
    throw new UnauthorizedError('Esta conta usa login com Google. Use o botão "Entrar com Google".');
  }

  const validPassword = await bcrypt.compare(input.password, user.password);

  if (!validPassword) {
    throw new UnauthorizedError('Credenciais invalidas');
  }

  const payload = { userId: user.id, email: user.email };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { user: excludeSensitive(user), token, refreshToken };
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

export async function googleLogin(credential: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  }).catch(() => {
    throw new UnauthorizedError('Token Google invalido');
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError('Token Google invalido');
  }

  const { sub: googleId, email, name, picture } = payload;

  // Try to find by googleId first, then by email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Link Google account if not yet linked
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatar: picture || user.avatar },
      });
    }
  } else {
    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        googleId,
        avatar: picture,
      },
    });
  }

  const tokenPayload = { userId: user.id, email: user.email };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return { user: excludeSensitive(user), token, refreshToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      region: true,
      onboardingDone: true,
      createdAt: true,
      _count: { select: { listings: true, suppliers: true } },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Usuario nao encontrado');
  }

  return user;
}

export async function completeOnboarding(userId: string, region?: string) {
  const data: { onboardingDone: boolean; region?: string } = { onboardingDone: true };
  if (region) data.region = region;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      region: true,
      onboardingDone: true,
      createdAt: true,
    },
  });

  return user;
}
