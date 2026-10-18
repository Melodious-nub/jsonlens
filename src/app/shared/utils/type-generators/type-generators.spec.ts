import { describe, expect, it } from 'vitest';
import {
  jsonToCSharp,
  jsonToDart,
  jsonToGo,
  jsonToJava,
  jsonToJavascript,
  jsonToKotlin,
  jsonToPhp,
  jsonToPython,
  jsonToRust,
  jsonToSwift,
  jsonToTypescript,
  jsonToZod,
} from './index';

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

  it('should generate valid TypeScript interfaces with clean domain names', () => {
    const ts = jsonToTypescript(sample, 'User');
    expect(ts).toContain('export interface User {');
    expect(ts).toContain('userId: number;');
    expect(ts).toContain('username: string;');
    expect(ts).toContain('verified: boolean;');
    expect(ts).toContain('profile: Profile;');
    expect(ts).toContain('skills: string[];');
    expect(ts).toContain('export interface Profile {');
  });

  it('should generate valid Zod schemas with clean domain names', () => {
    const zod = jsonToZod(sample, 'user');
    expect(zod).toContain("import { z } from 'zod';");
    expect(zod).toContain('export const userSchema = z.object({');
    expect(zod).toContain('userId: z.number(),');
    expect(zod).toContain('username: z.string(),');
    expect(zod).toContain('profile: profileSchema,');
    expect(zod).toContain('skills: z.array(z.string()),');
    expect(zod).toContain('export type User = z.infer<typeof userSchema>;');
    expect(zod).toContain('export const profileSchema = z.object({');
  });

  it('should generate valid Go structs with clean domain names', () => {
    const go = jsonToGo(sample, 'User');
    expect(go).toContain('type User struct {');
    expect(go).toContain('UserId int `json:"userId"`');
    expect(go).toContain('Username string `json:"username"`');
    expect(go).toContain('Profile Profile `json:"profile"`');
    expect(go).toContain('Skills []string `json:"skills"`');
    expect(go).toContain('type Profile struct {');
  });

  it('should generate valid Python Pydantic models with clean domain names', () => {
    const py = jsonToPython(sample, 'User');
    expect(py).toContain('class User(BaseModel):');
    expect(py).toContain('user_id: int');
    expect(py).toContain('username: str');
    expect(py).toContain('verified: bool');
    expect(py).toContain('profile: Optional[Profile] = None');
    expect(py).toContain('skills: List[str]');
    expect(py).toContain('class Profile(BaseModel):');
  });

  it('should generate valid Java POJO classes with clean domain names', () => {
    const java = jsonToJava(sample, 'User');
    expect(java).toContain('public class User {');
    expect(java).toContain('@JsonProperty("userId")');
    expect(java).toContain('private Long userId;');
    expect(java).toContain('public Long getUserId()');
    expect(java).toContain('public void setUserId(Long userId)');
    expect(java).toContain('private Profile profile;');
    expect(java).toContain('public class Profile {');
  });

  it('should generate valid Kotlin data classes with clean domain names', () => {
    const kt = jsonToKotlin(sample, 'User');
    expect(kt).toContain('@Serializable');
    expect(kt).toContain('data class User(');
    expect(kt).toContain('@SerialName("userId")');
    expect(kt).toContain('val userId: Long');
    expect(kt).toContain('val profile: Profile? = null');
    expect(kt).toContain('data class Profile(');
  });

  it('should generate valid Dart models with clean domain names', () => {
    const dart = jsonToDart(sample, 'User');
    expect(dart).toContain('class User {');
    expect(dart).toContain('final int userId;');
    expect(dart).toContain('final Profile? profile;');
    expect(dart).toContain('factory User.fromJson(Map<String, dynamic> json)');
    expect(dart).toContain('Map<String, dynamic> toJson()');
    expect(dart).toContain('class Profile {');
  });

  it('should generate valid C# models with clean domain names', () => {
    const cs = jsonToCSharp(sample, 'User');
    expect(cs).toContain('public class User');
    expect(cs).toContain('[JsonPropertyName("userId")]');
    expect(cs).toContain('public long UserId { get; set; }');
    expect(cs).toContain('public Profile? Profile { get; set; }');
    expect(cs).toContain('public class Profile');
  });

  it('should generate valid Rust Serde structs with clean domain names', () => {
    const rust = jsonToRust(sample, 'User');
    expect(rust).toContain('#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]');
    expect(rust).toContain('pub struct User {');
    expect(rust).toContain('#[serde(rename = "userId")]');
    expect(rust).toContain('pub user_id: i64,');
    expect(rust).toContain('pub profile: Option<Profile>,');
    expect(rust).toContain('pub struct Profile {');
  });

  it('should generate valid PHP 8.2+ typed classes with clean domain names', () => {
    const php = jsonToPhp(sample, 'User');
    expect(php).toContain('class User implements \\JsonSerializable');
    expect(php).toContain('public int $userId');
    expect(php).toContain('public ?Profile $profile = null');
    expect(php).toContain('public static function fromArray(array $data): self');
    expect(php).toContain('public function jsonSerialize(): array');
    expect(php).toContain('class Profile implements \\JsonSerializable');
  });

  it('should generate valid Swift Codable structs with clean domain names', () => {
    const swift = jsonToSwift(sample, 'User');
    expect(swift).toContain('public struct User: Codable {');
    expect(swift).toContain('public let userId: Int');
    expect(swift).toContain('public let profile: Profile?');
    expect(swift).toContain('enum CodingKeys: String, CodingKey {');
    expect(swift).toContain('public struct Profile: Codable {');
  });

  it('should generate valid JavaScript JSDoc typedefs with clean domain names', () => {
    const js = jsonToJavascript(sample, 'User');
    expect(js).toContain('@typedef {Object} User');
    expect(js).toContain('@property {number} userId');
    expect(js).toContain('@property {string} username');
    expect(js).toContain('@property {Profile} [profile]');
    expect(js).toContain('@property {Array<string>} skills');
    expect(js).toContain('@typedef {Object} Profile');
  });

  it('should generate clean domain names without Root prefixes for deeply nested JSON', () => {
    const complexSample = {
      actionCode: 'APPROVE',
      permission: {
        branchId: 10,
        actionCode: 'VIEW',
      },
      surveyorMappingList: [
        {
          surveyorMappingId: 5,
          isDeleted: false,
        },
      ],
      claimsSurveyorReport: {
        victimName: 'Alice',
      },
    };

    const ts = jsonToTypescript(complexSample, 'Root');
    expect(ts).toContain('export interface Permission {');
    expect(ts).toContain('export interface SurveyorMappingList {');
    expect(ts).toContain('export interface ClaimsSurveyorReport {');
    expect(ts).toContain('export interface Root {');
    expect(ts).toContain('permission: Permission;');
    expect(ts).toContain('surveyorMappingList: SurveyorMappingList[];');
    expect(ts).toContain('claimsSurveyorReport: ClaimsSurveyorReport;');

    // Verify absence of ugly Root prefixes on child models
    expect(ts).not.toContain('RootPermission');
    expect(ts).not.toContain('RootSurveyorMappingList');
    expect(ts).not.toContain('RootClaimsSurveyorReport');
  });
});
