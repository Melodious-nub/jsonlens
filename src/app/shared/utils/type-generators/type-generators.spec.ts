import { describe, expect, it } from 'vitest';
import { jsonToTypescript, jsonToZod, jsonToGo } from './index';

describe('Type Generators', () => {
  const sample = {
    userId: 101,
    username: 'developer',
    verified: true,
    profile: {
      bio: 'Coding with Angular',
      stars: 42,
    },
    skills: ['TypeScript', 'Angular', 'Tailwind'],
  };

  it('should generate valid TypeScript interfaces', () => {
    const ts = jsonToTypescript(sample, 'User');
    expect(ts).toContain('export interface User {');
    expect(ts).toContain('userId: number;');
    expect(ts).toContain('username: string;');
    expect(ts).toContain('verified: boolean;');
    expect(ts).toContain('profile: UserProfile;');
    expect(ts).toContain('skills: string[];');
    expect(ts).toContain('export interface UserProfile {');
  });

  it('should generate valid Zod schemas', () => {
    const zod = jsonToZod(sample, 'user');
    expect(zod).toContain("import { z } from 'zod';");
    expect(zod).toContain('export const userSchema = z.object({');
    expect(zod).toContain('userId: z.number(),');
    expect(zod).toContain('username: z.string(),');
    expect(zod).toContain('skills: z.array(z.string()),');
    expect(zod).toContain('export type User = z.infer<typeof userSchema>;');
  });

  it('should generate valid Go structs', () => {
    const go = jsonToGo(sample, 'User');
    expect(go).toContain('type User struct {');
    expect(go).toContain('UserId int `json:"userId"`');
    expect(go).toContain('Username string `json:"username"`');
    expect(go).toContain('Skills []string `json:"skills"`');
    expect(go).toContain('type UserProfile struct {');
  });
});
