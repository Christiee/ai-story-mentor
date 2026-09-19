export interface AbilityScores {
  imagination: number;
  expression: number;
  logic: number;
  curiosity: number;
}

export interface AbilityGrowth {
  imagination?: number;
  expression?: number;
  logic?: number;
  curiosity?: number;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  avatar?: string;
  interests: string[];
  languageStyle: string;
  lastExcitement?: string;
  personalityNotes?: string;
  userId?: string;
  visitorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptWork {
  id: string;
  childId: string;
  title: string;
  protagonist: string;
  wish: string;
  difficulty: string;
  solution: string;
  ending: string;
  goldenQuote?: string;
  status: 'draft' | 'completed';
  totalPages: number;
  coverImage?: string;
  audioUrl?: string;
  abilityScores?: AbilityScores;
  isPublic: boolean;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ScriptPage {
  id: string;
  scriptId: string;
  pageNumber: number;
  content: string;
  imageUrl?: string;
  narration?: string;
  createdAt: string;
}

export interface AchievementBadge {
  id: string;
  childId: string;
  badgeType: string;
  badgeName: string;
  description: string;
  icon?: string;
  unlockedAt: string;
  scriptId?: string;
}

export interface AbilityRadarRecord {
  id: string;
  childId: string;
  imagination: number;
  expression: number;
  logic: number;
  curiosity: number;
  recordedAt: string;
  scriptId?: string;
}

export interface ParentDaily {
  id: string;
  childId: string;
  reportDate: string;
  highlight: string;
  goldenQuote?: string;
  abilityGrowth?: AbilityGrowth;
  scriptId?: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  childId: string;
  scriptId?: string;
  role: 'mentor' | 'child';
  content: string;
  stepNumber?: number;
  createdAt: string;
}

export type NarrativeStep = 'protagonist' | 'wish' | 'difficulty' | 'solution' | 'ending';

export interface ScriptCreationState {
  scriptId: string;
  currentStep: NarrativeStep;
  stepNumber: number;
  collected: {
    protagonist?: string;
    wish?: string;
    difficulty?: string;
    solution?: string;
    ending?: string;
  };
  isComplete: boolean;
}

// ============ 请求/响应类型 ============

export interface ListChildrenResponse {
  items: ChildProfile[];
}

export interface CreateChildRequest {
  name: string;
  age: number;
  avatar?: string;
  interests?: string[];
}

export interface UpdateChildRequest {
  name?: string;
  age?: number;
  avatar?: string;
  interests?: string[];
  lastExcitement?: string;
  personalityNotes?: string;
}

export interface StartScriptRequest {
  childId: string;
}

export interface MentorChatRequest {
  scriptId: string;
  childId: string;
  childInput: string;
}

export interface MentorChatResponse {
  mentorReply: string;
  currentStep: NarrativeStep;
  stepNumber: number;
  isComplete: boolean;
  scriptId: string;
}

export interface ListScriptsRequest {
  childId: string;
  status?: 'draft' | 'completed';
  page?: number;
  pageSize?: number;
}

export interface ListScriptsResponse {
  items: ScriptWork[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScriptDetailResponse {
  script: ScriptWork;
  pages: ScriptPage[];
}

export interface GeneratePagesRequest {
  scriptId: string;
}

export interface GeneratePagesResponse {
  scriptId: string;
  pages: ScriptPage[];
  status: 'completed';
}

export interface GenerateAudioRequest {
  scriptId: string;
  voiceGender?: 'female' | 'male';
  playbackSpeed?: string;
}

export interface GenerateAudioResponse {
  scriptId: string;
  audioUrl: string;
}

export interface ListBadgesResponse {
  items: AchievementBadge[];
}

export interface LatestRadarResponse {
  current: AbilityRadarRecord;
  previous?: AbilityRadarRecord;
}

export interface ListDailyRequest {
  childId: string;
  page?: number;
  pageSize?: number;
}

export interface ListDailyResponse {
  items: ParentDaily[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TodayDailyResponse {
  daily?: ParentDaily;
  childName: string;
}

export interface AppUser {
  id: string;
  phone: string;
  createdAt: string;
}

export interface SendCodeRequest {
  phone: string;
}

export interface SendCodeResponse {
  success: boolean;
  devMode: boolean;
  devCode?: string;
  message: string;
}

export interface SmsCodeLoginRequest {
  phone: string;
  code: string;
  visitorId?: string;
}

export interface PasswordLoginRequest {
  phone: string;
  password: string;
  visitorId?: string;
}

export interface LoginResponse {
  token: string;
  user: AppUser;
  mergedChildrenCount: number;
}

export interface LogoutResponse {
  success: boolean;
}

export interface CurrentUserResponse {
  user: AppUser | null;
}

export interface VoiceConfigResponse {
  asrEngine: 'volcengine' | 'browser' | 'none';
  ttsEngine: 'volcengine' | 'browser' | 'none';
}

export interface AsrRecognizeResponse {
  text: string;
  engine: 'volcengine' | 'browser';
}

export interface TtsSynthesizeRequest {
  text: string;
  voiceType?: string;
  speedRatio?: string;
}

export interface TtsSynthesizeResponse {
  audioUrl: string;
  engine: 'volcengine' | 'browser';
}

export interface SpeechToTextRequest {
  file: Blob;
}

export interface SpeechToTextResponse {
  text: string;
}

export interface SpeechSynthesisRequest {
  text: string;
  voiceGender?: 'female' | 'male';
  speed?: string;
}

export interface SpeechSynthesisResponse {
  audioUrl: string;
}
