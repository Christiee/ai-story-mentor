// ---- plugin:script_picture_book_illustration_generator_1 ----
// ============================================================
// 插件 script_picture_book_illustration_generator_1 (剧本绘本式分页插图生成器) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ScriptPictureBookIllustrationGeneratorOneInput {
  /** 图片比例，支持的值：1:1、4:3、3:4、16:9、9:16、3:2、2:3 */
  image_ratio?: string;
  /** 剧本单页内容描述，包含场景、人物、动作等关键信息 */
  script_content: string;
}

/**
 * capabilityClient.load('script_picture_book_illustration_generator_1').call<ScriptPictureBookIllustrationGeneratorOneOutput>('textToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export interface ScriptPictureBookIllustrationGeneratorOneOutput {
  /** [object Object] */
  images: string[];
}
// ---- end:script_picture_book_illustration_generator_1 ----

// ---- plugin:ai_script_tutor_generate_1 ----
// ============================================================
// 插件 ai_script_tutor_generate_1 (AI剧本导师文本生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiScriptTutorGenerateOneInput {
  /** 用户输入的需求内容、剧本片段或相关素材 */
  user_input: string;
  /** 额外的生成要求（可选） */
  additional_requirements?: string;
  /** 使用场景类型：引导式对话/剧本结构化生成/亮点日报生成 */
  scene_type: string;
}

/**
 * capabilityClient.load('ai_script_tutor_generate_1').callStream<AiScriptTutorGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AiScriptTutorGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"response":"示例文本","content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.response ?? ''; }
 */
export interface AiScriptTutorGenerateOneOutput {
  /** [object Object] */
  response?: string;
  /** [object Object] */
  content: string;
}
// ---- end:ai_script_tutor_generate_1 ----

// ---- plugin:child_script_voice_synthesis_1 ----
// ============================================================
// 插件 child_script_voice_synthesis_1 (儿童剧本语音合成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ChildScriptVoiceSynthesisOneInput {
  /** 需要合成语音的儿童剧本完整内容 */
  script_content: string;
  /** 配音音色性别，可选值：female（女声）、male（男声） */
  voice_gender?: string;
  /** 语音播放速度，可选值：0.2（极慢）、0.5（慢速）、0.8（稍慢）、1.0（正常）、1.2（稍快）、1.5（快速）、2.0（极快） */
  playback_speed?: string;
}

/**
 * capabilityClient.load('child_script_voice_synthesis_1').call<ChildScriptVoiceSynthesisOneOutput>('speechSynthesis', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { audioUrl } = result;
 * 返回值形如：
 *   {"audioUrl":"示例文本"}
 */
export interface ChildScriptVoiceSynthesisOneOutput {
  /** [object Object] */
  audioUrl: string;
}
// ---- end:child_script_voice_synthesis_1 ----

// ---- plugin:child_voice_speech_to_text_1 ----
// ============================================================
// 插件 child_voice_speech_to_text_1 (孩子语音录制识别为中文) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ChildVoiceSpeechToTextOneInput {
  /** 孩子录制的语音音频文件 */
  audio_file: string[];
}

/**
 * capabilityClient.load('child_voice_speech_to_text_1').call<ChildVoiceSpeechToTextOneOutput>('speechToText', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { text } = result;
 * 返回值形如：
 *   {"text":"示例文本"}
 */
export interface ChildVoiceSpeechToTextOneOutput {
  /** [object Object] */
  text: string;
}
// ---- end:child_voice_speech_to_text_1 ----