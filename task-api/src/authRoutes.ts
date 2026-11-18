import bcrypt from "bcryptjs";
import { Router } from "express";
import { BCRYPT_COST, fakeCompare, requireAuth, signToken } from "./auth.js";
import { requireDb } from "./db.js";
import { ApiError } from "./errors.js";
import { User } from "./models/User.js";
import { loginSchema, parseBody, signupSchema } from "./validate.js";

export const authRouter = Router();
authRouter.use(requireDb);

authRouter.post("/signup", async (req, res) => {
  const { email, password } = parseBody(signupSchema, req.body);
  if ((await User.exists({ email })) !== null) throw new ApiError(409, "Email already registered");
  // Two signups at once can both pass the check; the unique index then throws, and errorHandler maps that to 409.
  const user = await User.create({ email, passwordHash: await bcrypt.hash(password, BCRYPT_COST) });
  res.status(201).json({ user, token: signToken(user.id) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = parseBody(loginSchema, req.body);
  const user = await User.findOne({ email }).select("+passwordHash");
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : await fakeCompare(password);
  if (!user || !ok) throw new ApiError(401, "Invalid email or password");
  res.json({ user, token: signToken(user.id) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (user === null) throw new ApiError(401, "Invalid token", "TOKEN_INVALID");
  res.json({ user });
});
