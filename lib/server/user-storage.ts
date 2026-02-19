import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "crypto"
import fs from "fs"
import path from "path"
import { writeFileAtomically } from "./report-storage"

export interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  createdAt: string
}

type UsersMap = Record<string, StoredUser>

function getContentDir(): string {
  const cwd = process.cwd()
  const primary = path.join(cwd, "content")
  if (fs.existsSync(primary)) return primary
  const fallback = path.join(cwd, "report-generation-system", "content")
  if (fs.existsSync(fallback)) return fallback
  return primary
}

function getUsersFilePath(): string {
  const dir = path.join(getContentDir(), "users")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, "users.json")
}

function readUsers(): UsersMap {
  const filePath = getUsersFilePath()
  if (!fs.existsSync(filePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } catch {
    return {}
  }
}

function writeUsers(users: UsersMap): void {
  const filePath = getUsersFilePath()
  writeFileAtomically(filePath, JSON.stringify(users, null, 2))
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex")
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const inputHash = scryptSync(password, salt, 64)
  const expectedHash = Buffer.from(storedHash, "hex")
  if (inputHash.length !== expectedHash.length) return false
  return timingSafeEqual(inputHash, expectedHash)
}

export function findUserByEmail(email: string): StoredUser | null {
  const users = readUsers()
  return users[email.toLowerCase()] ?? null
}

export function createUser(email: string, password: string, name: string): StoredUser {
  const users = readUsers()
  const emailLower = email.toLowerCase()
  if (users[emailLower]) throw new Error("EMAIL_EXISTS")

  const salt = randomBytes(16).toString("hex")
  const user: StoredUser = {
    id: randomUUID(),
    email: emailLower,
    name,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  }
  users[emailLower] = user
  writeUsers(users)
  return user
}

export function authenticateUser(email: string, password: string): StoredUser | null {
  const user = findUserByEmail(email)
  if (!user) return null
  if (!verifyPassword(password, user.salt, user.passwordHash)) return null
  return user
}

export function toPublicUser(user: StoredUser) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt }
}
