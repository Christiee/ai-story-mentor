import React from 'react';
import { Sparkles, Volume2, BookOpen, CheckCircle2, Star } from 'lucide-react';
import type { ChildProfile, NarrativeStep } from '@shared/api.interface';

interface ChatMessage {
  id: string;
  role: 'mentor' | 'child';
  content: string;
  audioUrl?: string;
  playFailed?: boolean;
}

const STEPS: { key: NarrativeStep; label: string; stepNumber: number }[] = [
  { key: 'protagonist', label: '主角', stepNumber: 1 },
  { key: 'wish', label: '愿望', stepNumber: 2 },
  { key: 'difficulty', label: '困难', stepNumber: 3 },
  { key: 'solution', label: '办法', stepNumber: 4 },
  { key: 'ending', label: '结局', stepNumber: 5 },
];

interface ChatMessageListProps {
  messages: ChatMessage[];
  children: ChildProfile[];
  childName: string;
  isListening: boolean;
  recognizedText: string;
  transcript: string;
  sending: boolean;
  starting: boolean;
  isComplete: boolean;
  currentStep: NarrativeStep;
  scriptId?: string;
  childAvatar?: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onReplayMessage: (msg: ChatMessage) => void;
  onTapToPlay: (msg: ChatMessage) => void;
  onViewBook: () => void;
  onRestart: () => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  childName,
  isListening,
  recognizedText,
  transcript,
  sending,
  starting,
  isComplete,
  currentStep,
  scriptId,
  childAvatar,
  messagesEndRef,
  onReplayMessage,
  onTapToPlay,
  onViewBook,
  onRestart,
}) => {
  const displayRecognizedText = recognizedText || transcript;

  const currentStepInfo = STEPS.find((s) => s.key === currentStep);
  const stepIndex = currentStepInfo ? currentStepInfo.stepNumber - 1 : 0;
  const progressPercent = isComplete ? 100 : (stepIndex / STEPS.length) * 100;
  const displayNameChar = childName?.[0] || '我';

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {messages.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#5f6368]">
              {isComplete
                ? '🎉 故事完成啦！'
                : `第 ${stepIndex + 1} 步：${currentStepInfo?.label || ''}`}
            </span>
            <span className="text-sm text-[#0F6E56] font-medium">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#e5e7eb] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0F6E56] to-[#BA7517] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => {
              const isDone = step.stepNumber <= stepIndex + 1 || isComplete;
              const isCurrent = step.stepNumber === stepIndex + 1 && !isComplete;
              return (
                <div
                  key={step.key}
                  className={`flex flex-col items-center gap-1 flex-1 ${
                    isDone ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-[#0F6E56] text-white'
                        : 'bg-[#e5e7eb] text-[#5f6368]'
                    } ${isCurrent ? 'ring-2 ring-[#0F6E56]/30 ring-offset-1' : ''}`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      step.stepNumber
                    )}
                  </div>
                  <span
                    className={`text-[11px] ${
                      isDone ? 'text-[#0F6E56] font-medium' : 'text-[#9ca3af]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {starting && (
        <div className="flex gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0F6E56] to-[#085041] flex-shrink-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="bg-[#E1F5EE] px-6 py-4 rounded-3xl rounded-tl-sm">
            <div className="flex items-center gap-2 text-[#0F6E56] font-medium">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/60 animate-bounce" />
              </div>
              <span className="ml-2">导师正在准备故事...</span>
            </div>
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === 'child' ? 'flex-row-reverse' : ''}`}
        >
          <div
            className={`w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-xl ${
              msg.role === 'mentor'
                ? 'bg-gradient-to-br from-[#0F6E56] to-[#085041]'
                : 'bg-[#FAEEDA]'
            }`}
          >
            {msg.role === 'mentor' ? (
              <Sparkles className="w-7 h-7 text-white" />
            ) : (
              <span className="text-lg font-semibold text-[#BA7517]">
                {displayNameChar}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 max-w-[75%]">
            <div
              className={`px-5 py-3.5 rounded-3xl text-lg leading-relaxed ${
                msg.role === 'mentor'
                  ? 'bg-[#E1F5EE] text-[#085041] rounded-tl-sm'
                  : 'bg-white border-2 border-[#e5e7eb] text-[#1a1d1f] rounded-tr-sm'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'mentor' && msg.playFailed && (
              <button
                onClick={() => onTapToPlay(msg)}
                className="self-start inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#085041] rounded-xl transition-colors shadow-md shadow-green-200 animate-pulse"
              >
                <Volume2 className="w-4 h-4" />
                <span>点击听导师说话</span>
              </button>
            )}
            {msg.role === 'mentor' && !msg.playFailed && (
              <button
                onClick={() => onReplayMessage(msg)}
                className="self-start inline-flex items-center gap-1 text-sm text-[#5f6368] hover:text-[#0F6E56] transition-colors px-1"
                title="再听一遍"
              >
                <Volume2 className="w-4 h-4" />
                <span>再听一遍</span>
              </button>
            )}
          </div>
        </div>
      ))}

      {isListening && (
        <div className="flex flex-row-reverse gap-3">
          <div className="w-14 h-14 rounded-full bg-[#FAEEDA] flex-shrink-0 flex items-center justify-center text-xl">
            <span className="text-lg font-semibold text-[#BA7517]">
              {displayNameChar}
            </span>
          </div>
          <div className="px-5 py-3.5 rounded-3xl rounded-tr-sm bg-[#fff8f0] border-2 border-dashed border-[#BA7517]/40 text-lg text-[#BA7517] max-w-[75%] leading-relaxed italic">
            {displayRecognizedText || '在听你说呢...'}
          </div>
        </div>
      )}

      {sending && (
        <div className="flex gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0F6E56] to-[#085041] flex-shrink-0 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="bg-[#E1F5EE] px-6 py-4 rounded-3xl rounded-tl-sm">
            <div className="flex flex-col items-start gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/40 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6E56]/40 animate-bounce" />
              </div>
              <span className="text-sm text-[#0F6E56]/70">
                导师在认真思考...
              </span>
            </div>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mt-6 p-6 bg-gradient-to-br from-[#E1F5EE] to-[#FAEEDA] rounded-2xl text-center relative overflow-hidden">
          <div className="absolute top-2 left-4 text-2xl animate-bounce">
            🌟
          </div>
          <div className="absolute top-4 right-6 text-xl animate-pulse">
            ⭐
          </div>
          <div className="absolute bottom-2 left-8 text-lg">
            ✨
          </div>
          <div className="absolute bottom-4 right-4 text-2xl">
            🎈
          </div>
          <div className="relative z-10">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-[#085041] mb-2">
              太棒了！你的故事完成啦
            </h3>
            <p className="text-[#5f6368] text-base mb-5">
              每一个故事，都是独一无二的宝贝
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={onViewBook}
                disabled={!scriptId}
                className="inline-flex items-center gap-2 bg-[#0F6E56] hover:bg-[#085041] text-white font-medium px-6 py-3 rounded-xl transition-all text-lg disabled:opacity-50 shadow-md shadow-[#0F6E56]/20"
              >
                <BookOpen className="w-5 h-5" />
                看看我的绘本
              </button>
              <button
                onClick={onRestart}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-[#1a1d1f] font-medium px-6 py-3 rounded-xl border-2 border-[#e5e7eb] transition-all text-lg"
              >
                <Sparkles className="w-5 h-5" />
                再造一个
              </button>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessageList;
